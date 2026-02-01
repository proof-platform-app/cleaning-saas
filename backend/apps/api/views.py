import os
import uuid
import random
import logging
from collections import Counter, defaultdict
from datetime import timedelta, date, datetime
from typing import List, Tuple, Iterable

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.mail import EmailMessage
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.contrib.auth.hashers import make_password, check_password

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Company, User
from apps.jobs.image_utils import normalize_job_photo_to_jpeg
from apps.jobs.models import (
    File,
    Job,
    JobCheckEvent,
    JobChecklistItem,
    JobPhoto,
)
from apps.jobs.utils import distance_m, extract_exif_data
from apps.locations.models import (
    Location,
    ChecklistTemplate,
    ChecklistTemplateItem,
)

from apps.marketing.models import ReportEmailLog

from .pdf import generate_job_report_pdf, generate_company_sla_report_pdf
from .serializers import (
    ChecklistBulkUpdateSerializer,
    ChecklistToggleSerializer,
    JobCheckInSerializer,
    JobChecklistItemSerializer,
    JobCheckEventSerializer,
    JobDetailSerializer,
    JobPhotoUploadSerializer,
    ManagerJobCreateSerializer,
    PlanningJobSerializer,
    ManagerViolationJobSerializer,
    compute_sla_status_for_job,
    compute_sla_reasons_for_job,
)

logger = logging.getLogger(__name__)

# === Default checklist templates for new companies ===

DEFAULT_CHECKLIST_TEMPLATES = [
    {
        "name": "Apartment – Standard (6 items)",
        "description": "Regular maintenance cleaning for occupied apartments.",
        "items": [
            {"text": "Vacuum all floors", "is_required": True},
            {"text": "Mop hard floors", "is_required": True},
            {"text": "Dust all surfaces", "is_required": True},
            {"text": "Clean bathroom fixtures", "is_required": True},
            {"text": "Wipe kitchen surfaces", "is_required": True},
            {"text": "Empty all trash bins", "is_required": True},
        ],
    },
    {
        "name": "Apartment – Deep (12 items)",
        "description": "Deep cleaning for move-in / move-out or periodic general cleaning.",
        "items": [
            {"text": "Vacuum all floors", "is_required": True},
            {"text": "Mop hard floors", "is_required": True},
            {"text": "Dust all reachable surfaces", "is_required": True},
            {"text": "Dust high surfaces (tops of wardrobes, shelves)", "is_required": True},
            {"text": "Clean bathroom fixtures (sink, toilet, shower, bathtub)", "is_required": True},
            {"text": "Descale taps and shower heads (if needed)", "is_required": False},
            {"text": "Wipe kitchen countertops and backsplash", "is_required": True},
            {"text": "Clean outside of kitchen appliances (fridge, oven, microwave)", "is_required": False},
            {"text": "Clean inside microwave and oven (where applicable)", "is_required": False},
            {"text": "Clean windows and mirrors (reachable from inside)", "is_required": True},
            {"text": "Disinfect door handles and light switches", "is_required": True},
            {"text": "Empty all trash bins and replace liners", "is_required": True},
        ],
    },
    {
        "name": "Office – Standard (8 items)",
        "description": "Core office cleaning for work areas, meeting rooms, toilets and kitchen.",
        "items": [
            {"text": "Vacuum carpets and hard floors in work areas", "is_required": True},
            {"text": "Wipe desks and work surfaces (without moving personal items)", "is_required": True},
            {"text": "Clean meeting room tables and chairs", "is_required": True},
            {"text": "Empty all office trash bins", "is_required": True},
            {"text": "Sanitize high-touch points (door handles, switches, railings)", "is_required": True},
            {"text": "Clean and restock toilets (sinks, toilets, supplies)", "is_required": True},
            {"text": "Clean kitchen / coffee area surfaces (countertops, sink, tables)", "is_required": True},
            {"text": "Tidy reception / entrance area (floor, desk, glass surfaces)", "is_required": True},
        ],
    },
    {
        "name": "Villa – Full (12 items)",
        "description": "Full villa cleaning: living areas, bedrooms, bathrooms and terraces.",
        "items": [
            {"text": "Vacuum all floors in living areas", "is_required": True},
            {"text": "Mop hard floors (hallways, kitchen, bathrooms)", "is_required": True},
            {"text": "Dust furniture and decor in living areas", "is_required": True},
            {"text": "Clean glass tables and mirrors", "is_required": True},
            {"text": "Clean and disinfect all bathrooms (toilets, sinks, showers, bathtubs)", "is_required": True},
            {"text": "Wipe kitchen countertops and backsplash", "is_required": True},
            {"text": "Clean outside of kitchen appliances", "is_required": True},
            {"text": "Tidy and dust bedrooms (nightstands, dressers, headboards)", "is_required": True},
            {"text": "Change bed linen (if requested)", "is_required": False},
            {"text": "Clean and sweep balconies / terraces (if accessible)", "is_required": False},
            {"text": "Sanitize door handles, switches and railings (stairs)", "is_required": True},
            {"text": "Empty all trash bins (indoor and outdoor where applicable)", "is_required": True},
        ],
    },
]

def create_default_checklist_templates_for_company(company: Company) -> None:
    """
    Гарантирует, что у company есть базовые шаблоны чек-листов.

    Идемпотентная функция:
    - если у компании уже есть шаблоны с пунктами, ничего не делает;
    - если нужных шаблонов нет, создаёт их;
    - если шаблон есть, но без description, аккуратно дописывает его;
    - не создаёт дубликаты пунктов.
    """

    # Уже есть хоть какие-то шаблоны с пунктами? Тогда считаем, что компания
    # сама всё настроила — и ничего не трогаем.
    has_any_templates = ChecklistTemplate.objects.filter(
        company=company,
        items__isnull=False,  # related_name="items"
    ).exists()

    if has_any_templates:
        return

    for tmpl_spec in DEFAULT_CHECKLIST_TEMPLATES:
        # 1) создаём или находим шаблон по имени
        template, created = ChecklistTemplate.objects.get_or_create(
            company=company,
            name=tmpl_spec["name"],
            defaults={
                "description": tmpl_spec.get("description", "") or "",
                "is_active": True,
            },
        )

        # если шаблон уже был, но без описания — аккуратно его добавим
        updated_fields: list[str] = []
        new_description = tmpl_spec.get("description", "") or ""
        if not template.description and new_description:
            template.description = new_description
            updated_fields.append("description")

        if not template.is_active:
            template.is_active = True
            updated_fields.append("is_active")

        if updated_fields:
            template.save(update_fields=updated_fields)

        # 2) создаём пункты, если их ещё нет
        if not template.items.exists():
            for order, item_spec in enumerate(tmpl_spec["items"], start=1):
                if isinstance(item_spec, str):
                    text = item_spec
                    is_required = True
                else:
                    text = item_spec.get("text", "").strip()
                    is_required = bool(item_spec.get("is_required", True))

                if not text:
                    continue

                ChecklistTemplateItem.objects.get_or_create(
                    template=template,
                    text=text,
                    defaults={
                        "order": order,
                        "is_required": is_required,
                    },
                )

VALID_SLA_REASONS = {
    "missing_before_photo",
    "missing_after_photo",
    "checklist_not_completed",
    "missing_check_in",
    "missing_check_out",
}
class LoginView(APIView):
    """
    MVP Login.
    Авторизация по email + password (cleaner).
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        email = (request.data.get("email") or "").strip()
        password = (request.data.get("password") or "")

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 🔴 ВАЖНО: тут убираем фильтр по role
        try:
            user = User.objects.get(
                email__iexact=email,
                is_active=True,
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(password):
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
            },
            status=status.HTTP_200_OK,
        )

class CleanerPinLoginView(APIView):
    """
    Login для клинера по phone + PIN.
    Используется мобильным приложением.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        phone = (request.data.get("phone") or "").strip()
        pin = request.data.get("pin") or ""

        if not phone or not pin:
            return Response(
                {"detail": "Phone and PIN are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(
                phone=phone,
                role=User.ROLE_CLEANER,
                is_active=True,
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.pin_hash:
            return Response(
                {"detail": "PIN login is not configured for this user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not check_password(str(pin), user.pin_hash):
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
            },
            status=status.HTTP_200_OK,
        )


class ManagerLoginView(APIView):
    """
    Login для менеджера (web dashboard).
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(
                email__iexact=email,
                role=User.ROLE_MANAGER,
                is_active=True,
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,  
            },
            status=status.HTTP_200_OK,
        )


class ManagerSignupView(APIView):
    """
    Public signup endpoint.

    Создаёт новую компанию + первого менеджера.
    Не требует аутентификации.
    """

    authentication_classes: list = []
    permission_classes: list = []

    def post(self, request, *args, **kwargs):
        company_name = (request.data.get("company_name") or "").strip()
        full_name = (request.data.get("full_name") or "").strip()
        email = (request.data.get("email") or "").strip()
        password = request.data.get("password") or ""

        errors: dict[str, list[str]] = {}

        if not company_name:
            errors.setdefault("company_name", []).append("This field is required.")
        if not full_name:
            errors.setdefault("full_name", []).append("This field is required.")
        if not email:
            errors.setdefault("email", []).append("This field is required.")
        if not password:
            errors.setdefault("password", []).append("This field is required.")

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # Проверяем уникальность email среди менеджеров
        if User.objects.filter(
            email__iexact=email,
            role=User.ROLE_MANAGER,
        ).exists():
            return Response(
                {"email": ["A manager with this email already exists."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Создаём компанию (остальные поля по умолчанию)
        company = Company.objects.create(
            name=company_name,
            contact_email=email,
        )

        # Создаём менеджера
        manager = User.objects.create(
            company=company,
            role=User.ROLE_MANAGER,
            email=email,
            full_name=full_name,
            is_active=True,
        )
        manager.set_password(password)
        manager.save(update_fields=["password"])

        data = {
            "company": {
                "id": company.id,
                "name": company.name,
            },
            "user": {
                "id": manager.id,
                "email": manager.email,
                "full_name": manager.full_name,
            },
        }
        return Response(data, status=status.HTTP_201_CREATED)

class ManagerMetaView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        company = getattr(user, "company", None)

        if not company:
            return Response(
                {"detail": "Manager has no company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1) гарантируем, что у компании есть дефолтные шаблоны
        create_default_checklist_templates_for_company(company)

        # 2) клинеры
        cleaners_qs = (
            User.objects.filter(
                company=company,
                role=User.ROLE_CLEANER,
                is_active=True,
            )
            .order_by("full_name", "id")
        )

        # 3) локации
        locations_qs = (
            Location.objects.filter(company=company)
            .order_by("name", "id")
        )

        # 4) шаблоны с пунктами
        templates_qs = (
            ChecklistTemplate.objects.filter(
                company=company,
                items__isnull=False,
            )
            .distinct()
            .order_by("id")
        )

        payload = {
            "cleaners": [
                {"id": c.id, "full_name": c.full_name, "phone": c.phone}
                for c in cleaners_qs
            ],
            "locations": [
                {
                    "id": l.id,
                    "name": l.name,
                    "address": getattr(l, "address", "") or "",
                }
                for l in locations_qs
            ],
            "checklist_templates": [],
        }

        for t in templates_qs:
            # все пункты чек-листа в правильном порядке
            items_qs = t.items.order_by("order", "id")
            all_items = [item.text for item in items_qs]

            payload["checklist_templates"].append(
                {
                    "id": t.id,
                    "name": t.name,
                    # Краткое описание шаблона — можно править в админке.
                    "description": getattr(t, "description", "") or "",
                    # Полный список пунктов (для раскрытия в UI).
                    "items": all_items,
                    # Первые несколько пунктов — превью для списков.
                    "items_preview": all_items[:4],
                    # Общее количество пунктов.
                    "items_count": len(all_items),
                }
            )

        return Response(payload, status=status.HTTP_200_OK)

class TodayJobsView(APIView):
    """
    Список задач клинера на сегодня.
    Требует токен (Authorization: Token <ключ>).
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role != User.ROLE_CLEANER:
            return Response(
                {"detail": "Only cleaners can view today jobs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()

        jobs = list(
            Job.objects.filter(
                cleaner=user,
                scheduled_date=today,
            ).values(
                "id",
                "location__name",
                "scheduled_date",
                "scheduled_start_time",
                "scheduled_end_time",
                "status",
            )
        )

        return Response(jobs, status=status.HTTP_200_OK)


class JobDetailView(APIView):
    """
    Job details для клинера.

    GET /api/jobs/<id>/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        user = request.user

        if user.role != User.ROLE_CLEANER:
            return Response(
                {"detail": "Only cleaners can view job details."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = get_object_or_404(
            Job.objects.select_related("location").prefetch_related(
                "checklist_items",
                "check_events",
                "photos__file",
            ),
            pk=pk,
            cleaner=user,
        )

        # сериализатор сам отдаст photos, checklist, events
        data = JobDetailSerializer(job).data

        # на всякий случай нормализуем file_url в абсолютный вид, если нужно
        photos = data.get("photos") or []
        for p in photos:
            file_url = p.get("file_url")
            if file_url and isinstance(file_url, str) and file_url.startswith("/"):
                p["file_url"] = request.build_absolute_uri(file_url)

        return Response(data, status=status.HTTP_200_OK)


class JobCheckInView(APIView):
    """
    Check in клинера на задачу.

    POST /api/jobs/<id>/check-in/
    Body: { "latitude": 25.2048, "longitude": 55.2708 }
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        user = request.user

        if user.role != User.ROLE_CLEANER:
            return Response(
                {"detail": "Only cleaners can check in."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = get_object_or_404(
            Job.objects.select_related("location"),
            pk=pk,
            cleaner=user,
        )

        if job.status != Job.STATUS_SCHEDULED:
            return Response(
                {"detail": "Check in allowed only for scheduled jobs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = JobCheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        lat = serializer.validated_data["latitude"]
        lon = serializer.validated_data["longitude"]

        location = job.location
        if location.latitude is None or location.longitude is None:
            return Response(
                {"detail": "Job location has no coordinates."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dist = distance_m(lat, lon, location.latitude, location.longitude)

        if dist > 100:
            return Response(
                {"detail": "Too far from job location.", "distance_m": round(dist, 2)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job.check_in()

        JobCheckEvent.objects.create(
            job=job,
            user=user,
            event_type=JobCheckEvent.TYPE_CHECK_IN,
            latitude=lat,
            longitude=lon,
            distance_m=dist,
        )

        return Response(
            {
                "detail": "Check in successful.",
                "job_id": job.id,
                "job_status": job.status,
            },
            status=status.HTTP_200_OK,
        )


class JobCheckOutView(APIView):
    """
    Check out клинера с задачи.

    POST /api/jobs/<id>/check-out/
    Body: { "latitude": 25.2048, "longitude": 55.2708 }
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        user = request.user

        if user.role != User.ROLE_CLEANER:
            return Response(
                {"detail": "Only cleaners can check out."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = get_object_or_404(
            Job.objects.select_related("location").prefetch_related("checklist_items"),
            pk=pk,
            cleaner=user,
        )

        if job.status != Job.STATUS_IN_PROGRESS:
            return Response(
                {"detail": "Check out allowed only for in_progress jobs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = JobCheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        lat = serializer.validated_data["latitude"]
        lon = serializer.validated_data["longitude"]

        location = job.location
        if location.latitude is None or location.longitude is None:
            return Response(
                {"detail": "Job location has no coordinates."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dist = distance_m(lat, lon, location.latitude, location.longitude)

        if dist > 100:
            return Response(
                {"detail": "Too far from job location.", "distance_m": round(dist, 2)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            job.check_out()
        except DjangoValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        JobCheckEvent.objects.create(
            job=job,
            user=user,
            event_type=JobCheckEvent.TYPE_CHECK_OUT,
            latitude=lat,
            longitude=lon,
            distance_m=dist,
        )

        return Response(
            {
                "detail": "Check out successful.",
                "job_id": job.id,
                "job_status": job.status,
            },
            status=status.HTTP_200_OK,
        )


class ChecklistItemToggleView(APIView):
    """
    Toggle одного пункта чеклиста.

    POST /api/jobs/<job_id>/checklist/<item_id>/toggle/
    Body: { "is_completed": true/false }  (опционально, по умолчанию true)
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, job_id: int, item_id: int):
        user = request.user

        if user.role != User.ROLE_CLEANER:
            return Response(
                {"detail": "Only cleaners can update checklist."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = get_object_or_404(Job, id=job_id, cleaner=user)

        if job.status != Job.STATUS_IN_PROGRESS:
            return Response(
                {"detail": "Checklist can be updated only when job is in progress"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item = get_object_or_404(JobChecklistItem, id=item_id, job=job)

        serializer = ChecklistToggleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item.is_completed = serializer.validated_data["is_completed"]
        item.save(update_fields=["is_completed"])

        return Response(
            {"id": item.id, "job_id": job.id, "is_completed": item.is_completed},
            status=status.HTTP_200_OK,
        )


class ChecklistBulkUpdateView(APIView):
    """
    Bulk update чеклиста.
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, job_id: int):
        user = request.user

        if user.role != User.ROLE_CLEANER:
            return Response(
                {"detail": "Only cleaners can update checklist."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = get_object_or_404(Job, id=job_id, cleaner=user)

        if job.status != Job.STATUS_IN_PROGRESS:
            return Response(
                {"detail": "Checklist can be updated only when job is in progress"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ChecklistBulkUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items = serializer.validated_data["items"]
        ids = [it["id"] for it in items]
        updates = {it["id"]: it.get("is_completed", True) for it in items}

        qs = JobChecklistItem.objects.filter(job=job, id__in=ids)
        found = {obj.id: obj for obj in qs}

        if len(found) != len(set(ids)):
            return Response(
                {"detail": "One or more checklist items not found for this job"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for iid, obj in found.items():
            obj.is_completed = bool(updates[iid])

        JobChecklistItem.objects.bulk_update(found.values(), ["is_completed"])

        return Response({"updated_count": len(found)}, status=status.HTTP_200_OK)


class JobPdfReportView(APIView):
    """
    Генерация PDF отчета по job.

    Доступно:
    - клинеру (по своим job)
    - менеджеру (по job своей компании)
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        user = request.user

        if user.role not in (User.ROLE_CLEANER, User.ROLE_MANAGER):
            return Response(
                {"detail": "Only cleaners and managers can generate PDF reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        base_qs = Job.objects.select_related("location", "cleaner").prefetch_related(
            "checklist_items",
            "check_events",
            "photos__file",
        )

        if user.role == User.ROLE_CLEANER:
            job = get_object_or_404(base_qs, pk=pk, cleaner=user)
        else:
            job = get_object_or_404(base_qs, pk=pk, company=user.company)

        pdf_bytes = generate_job_report_pdf(job)

        filename = f"job_report_{job.id}.pdf"
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp

class ManagerJobPdfEmailView(APIView):
    """
    Реальная отправка PDF-отчёта на email менеджера.

    POST /api/manager/jobs/<id>/report/email/
    Body (опционально): { "email": "manager@example.com" }

    Если email в body не передан — используем email текущего менеджера.
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        user = request.user

        if user.role != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can email PDF reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # job только внутри компании менеджера
        job = get_object_or_404(
            Job.objects.filter(company=user.company),
            pk=pk,
        )

        # email можно явно передать в body, иначе берём email текущего юзера
        target_email = (request.data.get("email") or user.email or "").strip()
        if not target_email:
            return Response(
                {"detail": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # генерируем PDF тем же helper'ом, что и download-эндпоинт
        try:
            pdf_bytes = generate_job_report_pdf(job)
        except Exception:
            return Response(
                {"detail": "Failed to generate PDF report."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not pdf_bytes:
            return Response(
                {"detail": "PDF generation returned empty content."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # собираем письмо
        subject = f"Job report #{job.id}"
        body_lines = [
            "Attached is the verified job report (PDF).",
            "",
            f"Job ID: {job.id}",
            f"Location: {getattr(getattr(job, 'location', None), 'name', '')}",
        ]
        body = "\n".join(body_lines)

        from_email = getattr(
            settings,
            "DEFAULT_FROM_EMAIL",
            getattr(settings, "FOUNDER_DEMO_EMAIL", None),
        ) or target_email

        message = EmailMessage(
            subject=subject,
            body=body,
            from_email=from_email,
            to=[target_email],
        )
        message.attach(
            f"job_report_{job.id}.pdf",
            pdf_bytes,
            "application/pdf",
        )

        try:
            # отправляем письмо
            message.send(fail_silently=False)

            # ✅ логируем успешную отправку
            try:
                ReportEmailLog.objects.create(
                    company_id=job.company_id,
                    user=user,
                    kind=ReportEmailLog.KIND_JOB_REPORT,
                    job_id=job.id,
                    period_from=None,
                    period_to=None,
                    to_email=target_email,
                    subject=subject,
                    status=ReportEmailLog.STATUS_SENT,
                    error_message="",
                )
            except Exception as log_exc:
                # лог не должен завалить основной флоу
                logger.exception("Failed to log sent job report email", exc_info=log_exc)

        except Exception as exc:
            # ❌ логируем неудачную попытку
            try:
                ReportEmailLog.objects.create(
                    company_id=job.company_id,
                    user=user,
                    kind=ReportEmailLog.KIND_JOB_REPORT,
                    job_id=job.id,
                    period_from=None,
                    period_to=None,
                    to_email=target_email,
                    subject=subject,
                    status=ReportEmailLog.STATUS_FAILED,
                    error_message=str(exc),
                )
            except Exception as log_exc:
                logger.exception(
                    "Failed to log failed job report email",
                    exc_info=log_exc,
                )

            return Response(
                {"detail": "Failed to send email."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "detail": "PDF report emailed.",
                "job_id": job.id,
                "target_email": target_email,
            },
            status=status.HTTP_200_OK,
        )

class JobPhotosView(APIView):
    """
    Upload + list job photos (before/after).

    POST /api/jobs/<id>/photos/
      multipart: photo_type=before|after, file=<file>

    GET /api/jobs/<id>/photos/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        user = request.user

        if user.role != User.ROLE_CLEANER:
            return Response(
                {"detail": "Only cleaners can view job photos."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = get_object_or_404(Job, pk=pk, cleaner=user)

        photos = (
            JobPhoto.objects.filter(job=job)
            .select_related("file")
            .order_by("photo_type", "id")
        )

        data = []
        for p in photos:
            file_url = p.file.file_url if p.file else None
            if file_url and file_url.startswith("/"):
                file_url = request.build_absolute_uri(file_url)

            data.append(
                {
                    "photo_type": p.photo_type,
                    "file_url": file_url,
                    "latitude": p.latitude,
                    "longitude": p.longitude,
                    "photo_timestamp": p.photo_timestamp,
                    "created_at": p.created_at,
                }
            )

        return Response(data, status=status.HTTP_200_OK)

    def post(self, request, pk: int):
        user = request.user

        if user.role != User.ROLE_CLEANER:
            return Response(
                {"detail": "Only cleaners can upload photos."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = get_object_or_404(
            Job.objects.select_related("location"), pk=pk, cleaner=user
        )

        if job.status != Job.STATUS_IN_PROGRESS:
            return Response(
                {"detail": "Photos can be uploaded only when job is in progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = JobPhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        photo_type = serializer.validated_data["photo_type"]
        uploaded = serializer.validated_data["file"]

        # AFTER требует BEFORE
        if photo_type == JobPhoto.TYPE_AFTER:
            if not JobPhoto.objects.filter(
                job=job, photo_type=JobPhoto.TYPE_BEFORE
            ).exists():
                return Response(
                    {"detail": "Cannot upload after photo before before photo."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # максимум одно фото каждого типа
        if JobPhoto.objects.filter(job=job, photo_type=photo_type).exists():
            return Response(
                {"detail": f"{photo_type} photo already exists for this job."},
                status=status.HTTP_409_CONFLICT,
            )

        # EXIF и валидация
        exif_lat, exif_lon, exif_dt, exif_missing = extract_exif_data(uploaded)

        loc = job.location
        if exif_lat is not None and exif_lon is not None:
            if loc.latitude is not None and loc.longitude is not None:
                dist = distance_m(exif_lat, exif_lon, loc.latitude, loc.longitude)
                if dist > 100:
                    return Response(
                        {
                            "detail": "Photo too far from job location.",
                            "distance_m": round(dist, 2),
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # нормализация формата в JPEG
        try:
            normalized_file = normalize_job_photo_to_jpeg(uploaded)
        except Exception as exc:
            return Response(
                {"detail": f"Unsupported image format: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ext = ".jpg"
        key = (
            f"company/{job.company_id}/jobs/{job.id}/photos/"
            f"{photo_type}/{uuid.uuid4().hex}{ext}"
        )

        try:
            normalized_file.seek(0)
        except Exception:
            pass

        saved_path = default_storage.save(
            key,
            ContentFile(normalized_file.read()),
        )
        file_url = default_storage.url(saved_path)

        db_file = File.objects.create(
            file_url=file_url,
            original_name=uploaded.name or "",
            content_type=getattr(normalized_file, "content_type", "")
            or getattr(uploaded, "content_type", "")
            or "",
            size_bytes=getattr(normalized_file, "size", None)
            or getattr(uploaded, "size", None),
        )

        job_photo = JobPhoto.objects.create(
            job=job,
            file=db_file,
            photo_type=photo_type,
            latitude=exif_lat,
            longitude=exif_lon,
            photo_timestamp=exif_dt,
        )

        out_file_url = db_file.file_url
        if out_file_url and out_file_url.startswith("/"):
            out_file_url = request.build_absolute_uri(out_file_url)

        out = {
            "photo_type": job_photo.photo_type,
            "file_url": out_file_url,
            "latitude": job_photo.latitude,
            "longitude": job_photo.longitude,
            "photo_timestamp": job_photo.photo_timestamp,
            "created_at": job_photo.created_at,
            "exif_missing": bool(exif_missing),
        }

        return Response(out, status=status.HTTP_201_CREATED)


class JobPhotoDeleteView(APIView):
    """
    Удаление фото (before / after) для клинера.

    DELETE /api/jobs/<id>/photos/<photo_type>/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk: int, photo_type: str):
        user = request.user

        if user.role != User.ROLE_CLEANER:
            return Response(
                {"detail": "Only cleaners can delete photos."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if photo_type not in (JobPhoto.TYPE_BEFORE, JobPhoto.TYPE_AFTER):
            return Response(
                {"detail": "Invalid photo_type."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job = get_object_or_404(Job, pk=pk, cleaner=user)

        if job.status != Job.STATUS_IN_PROGRESS:
            return Response(
                {"detail": "Photos can be deleted only when job is in progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # нельзя удалять BEFORE, если есть AFTER
        if photo_type == JobPhoto.TYPE_BEFORE and JobPhoto.objects.filter(
            job=job,
            photo_type=JobPhoto.TYPE_AFTER,
        ).exists():
            return Response(
                {"detail": "Cannot delete before photo while after photo exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            photo = JobPhoto.objects.select_related("file").get(
                job=job, photo_type=photo_type
            )
        except JobPhoto.DoesNotExist:
            return Response(
                {"detail": "Photo not found."}, status=status.HTTP_404_NOT_FOUND
            )

        file_obj = photo.file
        storage_path = None
        if file_obj and file_obj.file_url:
            prefix = "/media/"
            if file_obj.file_url.startswith(prefix):
                storage_path = file_obj.file_url[len(prefix) :]

        photo.delete()
        if file_obj:
            file_obj.delete()

        if storage_path:
            try:
                default_storage.delete(storage_path)
            except Exception:
                pass

        return Response(status=status.HTTP_204_NO_CONTENT)


class ManagerCompanyView(APIView):
    """
    Профиль компании менеджера.

    GET /api/manager/company/
    PATCH /api/manager/company/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _ensure_manager(self, request):
        user = request.user
        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return None, Response(
                {"detail": "Only managers can access company profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        company = getattr(user, "company", None)
        if company is None:
            return None, Response(
                {"detail": "Company not found for this manager."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return company, None

    def get(self, request):
        company, error_response = self._ensure_manager(request)
        if error_response is not None:
            return error_response

        data = {
            "id": company.id,
            "name": company.name,
            "contact_email": company.contact_email,
            "contact_phone": company.contact_phone,
            "logo_url": company.logo_url,
        }
        return Response(data, status=status.HTTP_200_OK)

    def patch(self, request):
        company, error_response = self._ensure_manager(request)
        if error_response is not None:
            return error_response

        name = request.data.get("name", company.name)
        contact_email = request.data.get("contact_email", company.contact_email)
        contact_phone = request.data.get("contact_phone", company.contact_phone)

        if name is not None and not str(name).strip():
            return Response(
                {"name": ["Company name cannot be empty."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        company.name = name
        company.contact_email = contact_email
        company.contact_phone = contact_phone
        company.save(update_fields=["name", "contact_email", "contact_phone"])

        data = {
            "id": company.id,
            "name": company.name,
            "contact_email": company.contact_email,
            "contact_phone": company.contact_phone,
            "logo_url": company.logo_url,
        }
        return Response(data, status=status.HTTP_200_OK)


class ManagerCompanyLogoUploadView(APIView):
    """
    Загрузка логотипа компании.

    POST /api/manager/company/logo/
    multipart/form-data, поле "file"
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user
        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can upload company logo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if company is None:
            return Response(
                {"detail": "Company not found for this manager."},
                status=status.HTTP_404_NOT_FOUND,
            )

        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"detail": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file_name = file_obj.name
        path = f"company_logos/{company.id}/{file_name}"

        saved_path = default_storage.save(path, ContentFile(file_obj.read()))
        logo_url = default_storage.url(saved_path)

        company.logo_url = logo_url
        company.save(update_fields=["logo_url"])

        return Response({"logo_url": logo_url}, status=status.HTTP_200_OK)


class ManagerCleanersListCreateView(APIView):
    """
    Список и создание клинеров.

    GET  /api/manager/cleaners/
    POST /api/manager/cleaners/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _ensure_manager(self, request):
        user = request.user
        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return None, Response(
                {"detail": "Only managers can manage cleaners."},
                status=status.HTTP_403_FORBIDDEN,
            )
        company = getattr(user, "company", None)
        if company is None:
            return None, Response(
                {"detail": "Company not found for this manager."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return company, None

    def get(self, request):
        company, error_response = self._ensure_manager(request)
        if error_response is not None:
            return error_response

        cleaners = (
            User.objects.filter(company=company, role=User.ROLE_CLEANER)
            .order_by("full_name", "id")
        )

        data = []
        for cleaner in cleaners:
            data.append(
                {
                    "id": cleaner.id,
                    "full_name": cleaner.full_name,
                    "email": cleaner.email,
                    "phone": cleaner.phone,
                    "is_active": cleaner.is_active,
                }
            )
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        company, error_response = self._ensure_manager(request)
        if error_response is not None:
            return error_response

        # ⛔ Компания заблокирована
        if company.is_blocked():
            code = "trial_expired" if company.is_trial_expired() else "company_blocked"
            if code == "trial_expired":
                detail = (
                    "Your free trial has ended. You can still view existing jobs and "
                    "download reports, but adding new cleaners requires an upgrade."
                )
            else:
                detail = "Your account is currently blocked. Please contact support."

            return Response(
                {"code": code, "detail": detail},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ⛔ Trial-лимит по клинерам
        if company.is_trial_active and company.trial_cleaners_limit_reached():
            return Response(
                {
                    "code": "trial_cleaners_limit_reached",
                    "detail": (
                        "Your free trial allows up to "
                        f"{Company.TRIAL_MAX_CLEANERS} active cleaners. "
                        "Deactivate an existing cleaner or upgrade to add more."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        full_name = request.data.get("full_name")
        email = request.data.get("email")
        phone = request.data.get("phone")
        is_active = request.data.get("is_active", True)
        pin = request.data.get("pin")

        # --- базовая валидация полей ---

        if not full_name:
            return Response(
                {"full_name": ["Full name is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not phone and not email:
            return Response(
                {"detail": "Phone or email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pin_str = (str(pin) or "").strip()
        if not pin_str:
            return Response(
                {"pin": ["PIN is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not pin_str.isdigit() or len(pin_str) != 4:
            return Response(
                {"pin": ["PIN must be exactly 4 digits."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- уникальность телефона / email среди клинеров компании ---

        qs = User.objects.filter(company=company, role=User.ROLE_CLEANER)

        if email and qs.filter(email__iexact=email).exists():
            return Response(
                {"email": ["Cleaner with this email already exists."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if phone and qs.filter(phone=phone).exists():
            return Response(
                {"phone": ["Cleaner with this phone already exists."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- создаём пользователя-клинера ---

        cleaner = User.objects.create_user(
            email=email or None,
            phone=phone or None,
            password=None,  # основной пароль не используем для клинера
            role=User.ROLE_CLEANER,
            company=company,
            full_name=full_name,
            is_active=is_active,
        )

        # сохраняем PIN как хеш
        cleaner.pin_hash = make_password(pin_str)
        cleaner.save(update_fields=["pin_hash"])

        data = {
            "id": cleaner.id,
            "full_name": cleaner.full_name,
            "email": cleaner.email,
            "phone": cleaner.phone,
            "is_active": cleaner.is_active,
        }
        return Response(data, status=status.HTTP_201_CREATED)


class ManagerCleanerDetailView(APIView):
    """
    Обновление одного клинера.

    PATCH /api/manager/cleaners/<id>/
    (GET тоже будет работать при желании)
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_cleaner(self, request, pk: int):
        user = request.user
        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return None, Response(
                {"detail": "Only managers can manage cleaners."},
                status=status.HTTP_403_FORBIDDEN,
            )
        company = getattr(user, "company", None)
        if company is None:
            return None, Response(
                {"detail": "Company not found for this manager."},
                status=status.HTTP_404_NOT_FOUND,
            )

        cleaner = get_object_or_404(
            User,
            pk=pk,
            company=company,
            role=User.ROLE_CLEANER,
        )
        return cleaner, None

    def get(self, request, pk: int):
        cleaner, error_response = self._get_cleaner(request, pk)
        if error_response is not None:
            return error_response

        data = {
            "id": cleaner.id,
            "full_name": cleaner.full_name,
            "email": cleaner.email,
            "phone": cleaner.phone,
            "is_active": cleaner.is_active,
        }
        return Response(data, status=status.HTTP_200_OK)

    def patch(self, request, pk: int):
        cleaner, error_response = self._get_cleaner(request, pk)
        if error_response is not None:
            return error_response

        full_name = request.data.get("full_name", cleaner.full_name)
        email = request.data.get("email", cleaner.email)
        phone = request.data.get("phone", cleaner.phone)
        is_active = request.data.get("is_active", cleaner.is_active)

        if not full_name or not str(full_name).strip():
            return Response(
                {"full_name": ["Full name cannot be empty."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = User.objects.filter(
            company=cleaner.company,
            role=User.ROLE_CLEANER,
        ).exclude(pk=cleaner.pk)

        if email and qs.filter(email__iexact=email).exists():
            return Response(
                {"email": ["Cleaner with this email already exists."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if phone and qs.filter(phone=phone).exists():
            return Response(
                {"phone": ["Cleaner with this phone already exists."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cleaner.full_name = full_name
        cleaner.email = email
        cleaner.phone = phone
        cleaner.is_active = bool(is_active)
        cleaner.save(update_fields=["full_name", "email", "phone", "is_active"])

        data = {
            "id": cleaner.id,
            "full_name": cleaner.full_name,
            "email": cleaner.email,
            "phone": cleaner.phone,
            "is_active": cleaner.is_active,
        }
        return Response(data, status=status.HTTP_200_OK)
    
class ManagerCleanerResetPinView(APIView):
    """
    Сброс PIN для клинера.

    POST /api/manager/cleaners/<id>/reset-pin/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_cleaner(self, request, pk: int):
        user = request.user
        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return None, Response(
                {"detail": "Only managers can reset cleaner PIN."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if company is None:
            return None, Response(
                {"detail": "Company not found for this manager."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            cleaner = User.objects.get(
                pk=pk,
                company=company,
                role=User.ROLE_CLEANER,
            )
        except User.DoesNotExist:
            return None, Response(
                {"detail": "Cleaner not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return cleaner, None

    def post(self, request, pk: int):
        cleaner, error_response = self._get_cleaner(request, pk)
        if error_response is not None:
            return error_response

        # Генерим новый 4-значный PIN
        new_pin = f"{random.randint(0, 9999):04d}"

        # Сохраняем только хеш PIN
        cleaner.pin_hash = make_password(new_pin)
        cleaner.save(update_fields=["pin_hash"])

        data = {
            "id": cleaner.id,
            "full_name": cleaner.full_name,
            "phone": cleaner.phone,
            # ВОЗВРАЩАЕМ PIN только в ответе менеджеру один раз
            "pin": new_pin,
        }
        return Response(data, status=status.HTTP_200_OK)


class ManagerJobsTodayView(APIView):
    """
    Today jobs для менеджера (dashboard).

    GET /api/manager/jobs/today/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can view jobs overview."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()

        qs = (
            Job.objects.filter(company=user.company, scheduled_date=today)
            .select_related("location", "cleaner")
            .order_by("scheduled_start_time", "id")
        )

        data = []
        for job in qs:
            location = job.location
            cleaner = job.cleaner
            data.append(
                {
                    "id": job.id,
                    "status": job.status,
                    "scheduled_date": job.scheduled_date,
                    "scheduled_start_time": job.scheduled_start_time,
                    "scheduled_end_time": job.scheduled_end_time,
                    "location": {
                        "id": getattr(location, "id", None),
                        "name": getattr(location, "name", None),
                        "address": getattr(location, "address", None),
                    },
                    "cleaner": {
                        "id": getattr(cleaner, "id", None),
                        "full_name": getattr(cleaner, "full_name", None),
                        "phone": getattr(cleaner, "phone", None),
                    },
                }
            )

        return Response(data, status=status.HTTP_200_OK)


class ManagerJobsCreateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.role != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can create jobs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = user.company

        # ⛔ Компания заблокирована (истёк trial или явно заблокирована)
        if company.is_blocked():
            code = "trial_expired" if company.is_trial_expired() else "company_blocked"
            detail = (
                "Your free trial has ended. You can still view existing jobs and "
                "download reports, but creating new jobs requires an upgrade."
                if code == "trial_expired"
                else "Your account is currently blocked. Please contact support."
            )
            return Response(
                {"code": code, "detail": detail},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ⛔ Trial-лимит по количеству jobs
        if company.is_trial_active and company.trial_jobs_limit_reached():
            return Response(
                {
                    "code": "trial_jobs_limit_reached",
                    "detail": (
                        "Your free trial allows up to "
                        f"{Company.TRIAL_MAX_JOBS} jobs. "
                        "Please upgrade your plan to create more jobs."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ManagerJobCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        job = serializer.save()
        out = PlanningJobSerializer(job).data
        return Response(out, status=status.HTTP_201_CREATED)



class ManagerJobDetailView(APIView):
    """
    Детали job для менеджера + фото, чеклист, события.

    GET /api/manager/jobs/<id>/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        user = request.user

        if user.role != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can view job details."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = get_object_or_404(
            Job.objects.select_related("location", "cleaner").prefetch_related(
                "checklist_items",
                "check_events",
                "photos__file",
            ),
            pk=pk,
            company=user.company,
        )

        location = job.location
        cleaner = job.cleaner

        photos_data = []
        for p in job.photos.all().select_related("file").order_by("photo_type", "id"):
            file_url = p.file.file_url if p.file else None
            if file_url and file_url.startswith("/"):
                file_url = request.build_absolute_uri(file_url)

            photos_data.append(
                {
                    "photo_type": p.photo_type,
                    "file_url": file_url,
                    "latitude": p.latitude,
                    "longitude": p.longitude,
                    "photo_timestamp": p.photo_timestamp,
                    "created_at": p.created_at,
                }
            )

        checklist_data = JobChecklistItemSerializer(
            job.checklist_items.all(), many=True
        ).data
        events_data = JobCheckEventSerializer(
            job.check_events.all().order_by("created_at"),
            many=True,
        ).data

        data = {
            "id": job.id,
            "status": job.status,
            "scheduled_date": job.scheduled_date,
            "scheduled_start_time": job.scheduled_start_time,
            "scheduled_end_time": job.scheduled_end_time,
            "actual_start_time": job.actual_start_time,
            "actual_end_time": job.actual_end_time,
            "location": {
                "id": getattr(location, "id", None),
                "name": getattr(location, "name", None),
                "address": getattr(location, "address", None),
                "latitude": getattr(location, "latitude", None),
                "longitude": getattr(location, "longitude", None),
            },
            "cleaner": {
                "id": getattr(cleaner, "id", None),
                "full_name": getattr(cleaner, "full_name", None),
                "phone": getattr(cleaner, "phone", None),
            },
            "manager_notes": job.manager_notes,
            "cleaner_notes": job.cleaner_notes,
            "photos": photos_data,
            "checklist_items": checklist_data,
            "check_events": events_data,
        }

        # SLA-слой: статус и причины нарушений для этой job
        data["sla_status"] = compute_sla_status_for_job(job)
        data["sla_reasons"] = compute_sla_reasons_for_job(job)

        return Response(data, status=status.HTTP_200_OK)


def build_planning_job_payload(job: Job):
    """
    Helper: единый payload для planning/history (один и тот же формат).
    """
    location = job.location
    cleaner = job.cleaner

    # proof: photos
    before_uploaded = False
    after_uploaded = False
    try:
        photos = list(job.photos.all())
    except Exception:
        photos = []

    for p in photos:
        if p.photo_type == JobPhoto.TYPE_BEFORE:
            before_uploaded = True
        elif p.photo_type == JobPhoto.TYPE_AFTER:
            after_uploaded = True

    # proof: checklist (required)
    checklist_completed = False  # по умолчанию НЕ ok, пока не докажем обратное
    try:
        items = list(job.checklist_items.all())
    except Exception:
        items = []

    # полный список текстов пунктов для UI (JobSidePanel, бейджи)
    checklist_items_texts = [getattr(it, "text", "").strip() for it in items if getattr(it, "text", "").strip()]

    if not items:
        checklist_completed = False
    else:
        # Поле required в модели может называться по-разному или отсутствовать.
        required_attr = None
        sample = items[0]
        if hasattr(sample, "required"):
            required_attr = "required"
        elif hasattr(sample, "is_required"):
            required_attr = "is_required"

        if required_attr:
            required_items = [it for it in items if bool(getattr(it, required_attr, False))]
            # Если required_items пустой (все required-флаги False) — считаем required ВСЕ
            if not required_items:
                required_items = items
        else:
            required_items = items

        checklist_completed = all(
            bool(getattr(it, "is_completed", False)) for it in required_items
        )

    # --- SLA: статус + причины на основе proof-флагов ---
    sla_reasons: list[str] = []

    if job.status == Job.STATUS_COMPLETED:
        if not before_uploaded:
            sla_reasons.append("missing_before_photo")
        if not after_uploaded:
            sla_reasons.append("missing_after_photo")
        if not checklist_completed:
            sla_reasons.append("checklist_not_completed")

    sla_status = "violated" if sla_reasons else "ok"

    # Пытаемся вытащить шаблон чек-листа (если job его хранит)
    checklist_template = getattr(job, "checklist_template", None)

    checklist_template_payload = None
    if checklist_template is not None:
        checklist_template_payload = {
            "id": checklist_template.id,
            "name": checklist_template.name,
        }

    return {
        "id": job.id,
        "scheduled_date": job.scheduled_date,
        "scheduled_start_time": job.scheduled_start_time,
        "scheduled_end_time": job.scheduled_end_time,
        "status": job.status,
        "location": {
            "id": getattr(location, "id", None),
            "name": getattr(location, "name", None),
            "address": getattr(location, "address", None),
        },
        "cleaner": {
            "id": getattr(cleaner, "id", None),
            "full_name": getattr(cleaner, "full_name", None),
        },
        "proof": {
            # текущие (как сейчас)
            "before_uploaded": bool(before_uploaded),
            "after_uploaded": bool(after_uploaded),
            "checklist_completed": bool(checklist_completed),
            # алиасы под UI / lovable
            "before_photo": bool(before_uploaded),
            "after_photo": bool(after_uploaded),
            "checklist": bool(checklist_completed),
        },
        "sla_status": sla_status,
        "sla_reasons": sla_reasons,
        # 🔹 Новый блок: «что за чек-лист» + список пунктов
        "checklist_template": checklist_template_payload,
        "checklist_items": checklist_items_texts,
    }

class ManagerPlanningJobsView(APIView):
    """
    Job Planning list для менеджера (read-only).

    GET /api/manager/jobs/planning/?date=YYYY-MM-DD
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can view planning jobs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ---- date parsing (FIX: accept 19.01.2026) ----
        date_str = (request.query_params.get("date") or "").strip()
        if not date_str:
            return Response(
                {"detail": "date query param is required: YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1) YYYY-MM-DD
        day = parse_date(date_str)

        # 2) DD.MM.YYYY (из твоего UI)
        if not day:
            try:
                day = timezone.datetime.strptime(date_str, "%d.%m.%Y").date()
            except Exception:
                day = None

        # 3) ISO datetime (на всякий)
        if not day and "T" in date_str:
            day = parse_date(date_str.split("T", 1)[0])

        if not day:
            return Response(
                {"detail": "Invalid date format. Expected YYYY-MM-DD or DD.MM.YYYY"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # ---- end date parsing ----

        qs = (
            Job.objects.filter(company=user.company, scheduled_date=day)
            .select_related("location", "cleaner")
            .prefetch_related("photos", "checklist_items")
            .order_by("scheduled_start_time", "id")
        )

        data = [build_planning_job_payload(job) for job in qs]
        return Response(data, status=status.HTTP_200_OK)


class ManagerJobsHistoryView(APIView):
    """
    Job History list для менеджера (read-only).

    GET /api/manager/jobs/history/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    Optional:
      - status
      - cleaner_id
      - location_id

    Payload: такой же, как в /api/manager/jobs/planning/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user

        # защита: только менеджер
        if getattr(user, "role", None) not in (User.ROLE_MANAGER, "manager"):
            return Response(
                {"detail": "Only managers can access job history."},
                status=status.HTTP_403_FORBIDDEN,
            )

        date_from_str = request.query_params.get("date_from")
        date_to_str = request.query_params.get("date_to")

        if not date_from_str or not date_to_str:
            return Response(
                {"detail": "date_from and date_to are required in format YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # парсим даты
        try:
            date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
            date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"detail": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # базовый queryset: только по компании менеджера + диапазон дат
        qs = (
            Job.objects.filter(
                company=user.company,
                scheduled_date__gte=date_from,
                scheduled_date__lte=date_to,
            )
            .select_related("location", "cleaner")
            .prefetch_related("photos", "checklist_items")
            .order_by("-scheduled_date", "-scheduled_start_time", "-id")
        )

        # опциональные фильтры
        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        cleaner_id = request.query_params.get("cleaner_id")
        if cleaner_id:
            qs = qs.filter(cleaner_id=cleaner_id)

        location_id = request.query_params.get("location_id")
        if location_id:
            qs = qs.filter(location_id=location_id)

        data = [build_planning_job_payload(job) for job in qs]
        return Response(data, status=status.HTTP_200_OK)
    
def _get_company_report(company, days: int) -> dict:
    """
    Собирает weekly/monthly report по SLA для компании.
    days=7 -> weekly, days=30 -> monthly.
    Работает напрямую с моделью Job через compute_sla_status_and_reasons_for_job.
    """
    # Период
    date_to = timezone.localdate()
    date_from = date_to - timedelta(days=days - 1)

    qs = (
        Job.objects.filter(
            company=company,
            scheduled_date__range=(date_from, date_to),
        )
        .select_related("cleaner", "location")
        .prefetch_related("photos", "checklist_items")
    )

    jobs_count = qs.count()

    cleaners_stats: dict[object, dict] = defaultdict(
        lambda: {"id": None, "name": "—", "jobs_count": 0, "violations_count": 0}
    )
    locations_stats: dict[object, dict] = defaultdict(
        lambda: {"id": None, "name": "—", "jobs_count": 0, "violations_count": 0}
    )

    reasons_counter: Counter[str] = Counter()
    violations_count = 0

    for job in qs:
        # Новый helper, который работает с Job-моделью
        sla_status, reasons = compute_sla_status_and_reasons_for_job(job)
        violated = sla_status == "violated"

        if isinstance(reasons, str):
            reasons = [reasons]
        elif not isinstance(reasons, (list, tuple)):
            reasons = []

        # --- Cleaner bucket (включая None) ---
        cleaner = getattr(job, "cleaner", None)
        cleaner_id = getattr(cleaner, "id", None)
        c = cleaners_stats[cleaner_id]
        c["id"] = cleaner_id
        c["name"] = (
            getattr(cleaner, "full_name", None)
            or getattr(cleaner, "email", None)
            or "—"
        )
        c["jobs_count"] += 1

        # --- Location bucket (включая None) ---
        location = getattr(job, "location", None)
        location_id = getattr(location, "id", None)
        l = locations_stats[location_id]
        l["id"] = location_id
        l["name"] = getattr(location, "name", None) or "—"
        l["jobs_count"] += 1

        if not violated:
            continue

        violations_count += 1
        c["violations_count"] += 1
        l["violations_count"] += 1

        for code in reasons:
            if code:
                reasons_counter[str(code)] += 1

    issue_rate = float(violations_count) / float(jobs_count) if jobs_count else 0.0

    cleaners = sorted(
        list(cleaners_stats.values()),
        key=lambda x: (-x["violations_count"], -x["jobs_count"], str(x["name"])),
    )
    locations = sorted(
        list(locations_stats.values()),
        key=lambda x: (-x["violations_count"], -x["jobs_count"], str(x["name"])),
    )

    top_reasons = [
        {"code": code, "count": count}
        for code, count in reasons_counter.most_common(5)
    ]

    return {
        "period": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "summary": {
            "jobs_count": jobs_count,
            "violations_count": violations_count,
            "issue_rate": issue_rate,
        },
        "cleaners": cleaners,
        "locations": locations,
        "top_reasons": top_reasons,
    }
def _build_report_pdf(report_data: dict) -> bytes:
    """
    ВАЖНО:
    Если у тебя уже есть функция генерации PDF для менеджерских отчётов —
    используй её вместо этого stub-хедера.

    Например, если Weekly/Monthly PDF делают что-то вроде:
        pdf_bytes = build_company_report_pdf(report_data)

    просто переименуй вызов ниже под своё имя.

    Здесь предполагаем, что именно _build_report_pdf(report_data)
    возвращает bytes готового PDF.
    """
    from .report_pdf import build_report_pdf  # пример, подставь свой модуль/функцию

    return build_report_pdf(report_data)


def compute_sla_status_and_reasons_for_job(job: Job) -> tuple[str, list[str]]:
    """
    Вариант SLA-логики, который работает прямо с моделью Job.

    Возвращает:
    - sla_status: "ok" или "violated"
    - reasons: список строковых кодов причин нарушения
      ("missing_before_photo", "missing_after_photo", "checklist_not_completed")
    """
    # Фотографии
    before_exists = JobPhoto.objects.filter(
        job=job,
        photo_type=JobPhoto.TYPE_BEFORE,
    ).exists()

    after_exists = JobPhoto.objects.filter(
        job=job,
        photo_type=JobPhoto.TYPE_AFTER,
    ).exists()

    # Чеклист
    checklist_qs = JobChecklistItem.objects.filter(job=job)

    if hasattr(JobChecklistItem, "is_required"):
        required_qs = checklist_qs.filter(is_required=True)
        # На случай, если флагов is_required нет — считаем все обязательными
        if not required_qs.exists():
            required_qs = checklist_qs
    else:
        required_qs = checklist_qs

    if required_qs.exists():
        checklist_completed = all(bool(item.is_completed) for item in required_qs)
    else:
        # если чеклиста нет вообще — считаем, что по чеклисту всё ок
        checklist_completed = True

    reasons: list[str] = []

    # SLA считаем только для completed jobs
    if job.status == Job.STATUS_COMPLETED:
        if not before_exists:
            reasons.append("missing_before_photo")
        if not after_exists:
            reasons.append("missing_after_photo")
        if not checklist_completed:
            reasons.append("checklist_not_completed")

    sla_status = "violated" if reasons else "ok"
    return sla_status, reasons

class OwnerOverviewView(APIView):
    """
    High-level business overview для владельца компании.

    GET /api/owner/overview/?days=30

    Использует тот же SLA-отчёт, что и weekly/monthly, но возвращает
    только агрегаты и топы, нужные для управленческих решений.
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Пока владельца представляем как manager-аккаунт компании
        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can access owner overview."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if not company:
            return Response(
                {"detail": "No company associated with user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Параметр периода в днях (дефолт 30 — месяц)
        days_param = (request.query_params.get("days") or "").strip()
        try:
            days = int(days_param) if days_param else 30
        except ValueError:
            days = 30

        # Не даём ставить совсем странные значения
        if days < 7:
            days = 7
        if days > 90:
            days = 90

        report = _get_company_report(company, days=days)

        overview = {
            "period": report.get("period", {}),
            "summary": report.get("summary", {}),
            # Топ-5 проблемных локаций и клинеров
            "top_locations": report.get("locations", [])[:5],
            "top_cleaners": report.get("cleaners", [])[:5],
            "top_reasons": report.get("top_reasons", []),
        }

        return Response(overview, status=status.HTTP_200_OK)

class ManagerPerformanceView(APIView):
    """
    SLA performance summary для менеджера.

    GET /api/manager/performance/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

    Возвращает агрегаты по SLA-нарушениям для клинеров и локаций:
    - только completed jobs
    - только за указанный период
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        company = getattr(user, "company", None)

        if not company:
            return Response(
                {"detail": "Manager has no company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        date_from_str = (request.query_params.get("date_from") or "").strip()
        date_to_str = (request.query_params.get("date_to") or "").strip()

        if not date_from_str or not date_to_str:
            return Response(
                {
                    "detail": "date_from and date_to query params are required: YYYY-MM-DD"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
            date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"detail": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if date_from > date_to:
            return Response(
                {"detail": "date_from cannot be greater than date_to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # только completed jobs компании за период
        qs = (
            Job.objects.filter(
                company=company,
                status="completed",
                scheduled_date__gte=date_from,
                scheduled_date__lte=date_to,
            )
            .select_related("cleaner", "location")
        )

        # агрегаты по клинерам и локациям
        cleaners_stats: dict[int, dict] = defaultdict(
            lambda: {
                "jobs_total": 0,
                "jobs_with_sla_violations": 0,
                "reason_counts": defaultdict(int),
                "cleaner": None,
            }
        )
        locations_stats: dict[int, dict] = defaultdict(
            lambda: {
                "jobs_total": 0,
                "jobs_with_sla_violations": 0,
                "reason_counts": defaultdict(int),
                "location": None,
            }
        )

        for job in qs:
            sla_status, reasons = compute_sla_status_and_reasons_for_job(job)
            violated = sla_status == "violated"

            cleaner = job.cleaner
            location = job.location

            # клинер
            if cleaner is not None:
                c_stats = cleaners_stats[cleaner.id]
                c_stats["cleaner"] = cleaner
                c_stats["jobs_total"] += 1

            # локация
            if location is not None:
                l_stats = locations_stats[location.id]
                l_stats["location"] = location
                l_stats["jobs_total"] += 1

            if not violated:
                continue

            # если есть нарушение — учитываем его и по клинеру, и по локации
            reasons = reasons or []

            if cleaner is not None:
                c_stats = cleaners_stats[cleaner.id]
                c_stats["jobs_with_sla_violations"] += 1
                for r in reasons:
                    c_stats["reason_counts"][r] += 1

            if location is not None:
                l_stats = locations_stats[location.id]
                l_stats["jobs_with_sla_violations"] += 1
                for r in reasons:
                    l_stats["reason_counts"][r] += 1

        # формируем ответ по клинерам
        cleaners_list: list[dict] = []
        for stats in cleaners_stats.values():
            cleaner = stats.get("cleaner")
            if not cleaner:
                continue

            jobs_total = stats["jobs_total"]
            violations = stats["jobs_with_sla_violations"]

            violation_rate = violations / jobs_total if jobs_total else 0.0
            has_repeated_violations = any(
                count >= 2 for count in stats["reason_counts"].values()
            )

            cleaners_list.append(
                {
                    "id": cleaner.id,
                    "name": getattr(cleaner, "full_name", None)
                    or getattr(cleaner, "email", ""),
                    "jobs_total": jobs_total,
                    "jobs_with_sla_violations": violations,
                    "violation_rate": violation_rate,
                    "has_repeated_violations": has_repeated_violations,
                }
            )

        # формируем ответ по локациям
        locations_list: list[dict] = []
        for stats in locations_stats.values():
            location = stats.get("location")
            if not location:
                continue

            jobs_total = stats["jobs_total"]
            violations = stats["jobs_with_sla_violations"]

            violation_rate = violations / jobs_total if jobs_total else 0.0
            has_repeated_violations = any(
                count >= 2 for count in stats["reason_counts"].values()
            )

            locations_list.append(
                {
                    "id": location.id,
                    "name": getattr(location, "name", ""),
                    "jobs_total": jobs_total,
                    "jobs_with_sla_violations": violations,
                    "violation_rate": violation_rate,
                    "has_repeated_violations": has_repeated_violations,
                }
            )

        # сортировка: сначала по количеству нарушений, потом по общему числу jobs
        cleaners_list = sorted(
            cleaners_list,
            key=lambda x: (-x["jobs_with_sla_violations"], -x["jobs_total"]),
        )
        locations_list = sorted(
            locations_list,
            key=lambda x: (-x["jobs_with_sla_violations"], -x["jobs_total"]),
        )

        payload = {
            "date_from": date_from.isoformat(),
            "date_to": date_to.isoformat(),
            "cleaners": cleaners_list,
            "locations": locations_list,
        }

        return Response(payload, status=status.HTTP_200_OK)
    
class ManagerViolationJobsView(APIView):
    """
    GET /api/manager/reports/violations/jobs/
    ?reason=...&period_start=YYYY-MM-DD&period_end=YYYY-MM-DD
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        company = getattr(user, "company", None)

        if not company:
            return Response(
                {"detail": "Manager has no company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = (request.query_params.get("reason") or "").strip()
        period_start_str = (request.query_params.get("period_start") or "").strip()
        period_end_str = (request.query_params.get("period_end") or "").strip()

        VALID_SLA_REASONS = {
            "missing_before_photo",
            "missing_after_photo",
            "checklist_not_completed",
            "missing_check_in",
            "missing_check_out",
        }

        if not reason or reason not in VALID_SLA_REASONS:
            return Response(
                {"detail": "Invalid or missing 'reason' parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not period_start_str or not period_end_str:
            return Response(
                {"detail": "Both 'period_start' and 'period_end' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            period_start = datetime.strptime(period_start_str, "%Y-%m-%d").date()
            period_end = datetime.strptime(period_end_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"detail": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if period_start > period_end:
            return Response(
                {"detail": "'period_start' must be <= 'period_end'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = (
            Job.objects.filter(
                company=company,
                status="completed",
                scheduled_date__gte=period_start,
                scheduled_date__lte=period_end,
            )
            .select_related("location", "cleaner")
            .order_by("-scheduled_date", "-id")
        )

        jobs_payload = []

        for job in qs:
            sla_status, reasons = compute_sla_status_and_reasons_for_job(job)
            reasons = reasons or []

            if reason not in reasons:
                continue

            jobs_payload.append(
                {
                    "id": job.id,
                    "scheduled_date": job.scheduled_date.isoformat()
                    if job.scheduled_date
                    else None,
                    "scheduled_start_time": job.scheduled_start_time.isoformat()
                    if job.scheduled_start_time
                    else None,
                    "status": job.status,
                    "location_id": job.location.id if job.location else None,
                    "location_name": job.location.name if job.location else "",
                    "cleaner_id": job.cleaner.id if job.cleaner else None,
                    "cleaner_name": getattr(job.cleaner, "full_name", "")
                    if job.cleaner
                    else "",
                    "sla_status": sla_status,
                    "sla_reasons": reasons,
                }
            )

        reason_labels = {
            "missing_before_photo": "Missing before photo",
            "missing_after_photo": "Missing after photo",
            "checklist_not_completed": "Checklist not completed",
            "missing_check_in": "Missing check-in",
            "missing_check_out": "Missing check-out",
        }

        payload = {
            "reason": reason,
            "reason_label": reason_labels[reason],
            "period": {
                "start": period_start_str,
                "end": period_end_str,
            },
            "pagination": {
                "page": 1,
                "page_size": len(jobs_payload),
                "total_items": len(jobs_payload),
                "total_pages": 1,
            },
            "jobs": jobs_payload,
        }

        return Response(payload, status=status.HTTP_200_OK)


class ManagerWeeklyReportView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can access reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if not company:
            return Response(
                {"detail": "No company associated with user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = _get_company_report(company, days=7)
        return Response(data, status=status.HTTP_200_OK)


class ManagerMonthlyReportView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can access reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if not company:
            return Response(
                {"detail": "No company associated with user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = _get_company_report(company, days=30)
        return Response(data, status=status.HTTP_200_OK)

class ManagerWeeklyReportPdfView(APIView):
    """
    PDF-снимок weekly-отчёта по SLA.
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can access reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if not company:
            return Response(
                {"detail": "No company associated with user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report_data = _get_company_report(company, days=7)
        pdf_bytes = generate_company_sla_report_pdf(company, report_data)

        period = report_data.get("period", {}) or {}
        date_from = period.get("from", "")
        date_to = period.get("to", "")

        filename = f"weekly_report_{date_from}_to_{date_to}.pdf"
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename=\"{filename}\"'
        return resp


class ManagerMonthlyReportPdfView(APIView):
    """
    PDF-снимок monthly-отчёта по SLA.
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can access reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if not company:
            return Response(
                {"detail": "No company associated with user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report_data = _get_company_report(company, days=30)
        pdf_bytes = generate_company_sla_report_pdf(company, report_data)

        period = report_data.get("period", {}) or {}
        date_from = period.get("from", "")
        date_to = period.get("to", "")

        filename = f"monthly_report_{date_from}_to_{date_to}.pdf"
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename=\"{filename}\"'
        return resp

def _send_company_report_email(company: Company, days: int, target_email: str, frequency_label: str) -> dict:
    """
    Общий helper для weekly / monthly email-отчётов.

    Генерирует SLA-отчёт, PDF, отправляет письмо и возвращает полезный payload
    для API-ответа.
    """
    # Берём те же данные, что и для PDF-эндпоинтов
    report_data = _get_company_report(company, days=days)
    pdf_bytes = generate_company_sla_report_pdf(company, report_data)

    period = report_data.get("period", {}) or {}
    date_from = period.get("from", "")
    date_to = period.get("to", "")

    subject = f"[CleanProof] {frequency_label} SLA report {date_from} – {date_to}"
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@cleanproof.local")

    message = (
        f"Your {frequency_label.lower()} SLA performance report for "
        f"{company.name} is attached as a PDF.\n\n"
        f"Period: {date_from} – {date_to}."
    )

    email = EmailMessage(
        subject=subject,
        body=message,
        from_email=from_email,
        to=[target_email],
    )
    filename = f"{frequency_label.lower()}_report_{date_from}_to_{date_to}.pdf"
    email.attach(filename, pdf_bytes, "application/pdf")
    email.send(fail_silently=False)

    return {
        "target_email": target_email,
        "period": {
            "from": date_from,
            "to": date_to,
        },
    }

class MonthlyReportEmailView(APIView):
    """
    Отправка monthly SLA-отчёта менеджеру по email.

    POST /api/manager/reports/monthly/email/
    Body (опционально): { "email": "owner@example.com" }
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can email reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if not company:
            return Response(
                {"detail": "No company associated with user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = (request.data.get("email") or user.email or "").strip()
        if not email:
            return Response(
                {"detail": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = _send_company_report_email(
                company=company,
                days=30,
                target_email=email,
                frequency_label="Monthly",
            )
        except Exception as exc:
            logger.exception("Failed to send monthly report email", exc_info=exc)
            return Response(
                {"detail": "Failed to send monthly report email."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ✅ логируем успешную отправку
        try:
            period = (payload.get("period") or {}) if isinstance(payload, dict) else {}
            date_from_str = period.get("from")
            date_to_str = period.get("to")

            date_from = parse_date(date_from_str) if date_from_str else None
            date_to = parse_date(date_to_str) if date_to_str else None

            subject = (
                f"[CleanProof] Monthly SLA report {date_from_str} – {date_to_str}"
            )

            ReportEmailLog.objects.create(
                company_id=company.id,
                user=user,
                kind=ReportEmailLog.KIND_MONTHLY_REPORT,
                job_id=None,
                period_from=date_from,
                period_to=date_to,
                to_email=payload.get("target_email", email),
                subject=subject,
                status=ReportEmailLog.STATUS_SENT,
                error_message="",
            )
        except Exception as log_exc:
            logger.exception("Failed to log monthly report email", exc_info=log_exc)

        return Response(
            {
                "detail": "Monthly report emailed.",
                **payload,
            },
            status=status.HTTP_200_OK,
        )
class WeeklyReportEmailView(APIView):
    """
    Отправка weekly SLA-отчёта менеджеру по email.

    POST /api/manager/reports/weekly/email/
    Body (опционально): { "email": "owner@example.com" }
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can email reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if not company:
            return Response(
                {"detail": "No company associated with user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Можно передать email в body, иначе берём email менеджера
        email = (request.data.get("email") or user.email or "").strip()
        if not email:
            return Response(
                {"detail": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = _send_company_report_email(
                company=company,
                days=7,
                target_email=email,
                frequency_label="Weekly",
            )
        except Exception as exc:
            logger.exception("Failed to send weekly report email", exc_info=exc)
            return Response(
                {"detail": "Failed to send weekly report email."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ✅ логируем успешную отправку
        try:
            period = (payload.get("period") or {}) if isinstance(payload, dict) else {}
            date_from_str = period.get("from")
            date_to_str = period.get("to")

            date_from = parse_date(date_from_str) if date_from_str else None
            date_to = parse_date(date_to_str) if date_to_str else None

            subject = (
                f"[CleanProof] Weekly SLA report {date_from_str} – {date_to_str}"
            )

            ReportEmailLog.objects.create(
                company_id=company.id,
                user=user,
                kind=ReportEmailLog.KIND_WEEKLY_REPORT,
                job_id=None,
                period_from=date_from,
                period_to=date_to,
                to_email=payload.get("target_email", email),
                subject=subject,
                status=ReportEmailLog.STATUS_SENT,
                error_message="",
            )
        except Exception as log_exc:
            logger.exception("Failed to log weekly report email", exc_info=log_exc)

        return Response(
            {
                "detail": "Weekly report emailed.",
                **payload,
            },
            status=status.HTTP_200_OK,
        )
