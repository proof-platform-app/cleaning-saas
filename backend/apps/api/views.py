# backend/apps/api/views.py
import os
import uuid

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date  # ✅ NEW

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Company, User
from apps.jobs.models import File, Job, JobCheckEvent, JobChecklistItem, JobPhoto
from apps.jobs.utils import distance_m, extract_exif_data
from apps.jobs.image_utils import normalize_job_photo_to_jpeg
from apps.locations.models import Location, ChecklistTemplate

from .pdf import generate_job_report_pdf
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
)


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


class ManagerMetaView(APIView):
    """
    Справочники для Create Job Drawer (одним запросом).

    GET /api/manager/meta/

    Response:
    {
      "cleaners": [{ "id": 2, "full_name": "...", "phone": "+971..." }],
      "locations": [{ "id": 1, "name": "...", "address": "..." }],
      "checklist_templates": [{ "id": 1, "name": "Standard Cleaning" }]
    }
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can access meta."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = user.company
        if not company:
            return Response(
                {"detail": "Manager has no company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cleaners_qs = User.objects.filter(
            company=company,
            role=User.ROLE_CLEANER,
            is_active=True,
        ).order_by("id")

        locations_qs = Location.objects.filter(
            company=company,
        ).order_by("id")

        templates_qs = ChecklistTemplate.objects.filter(
            company=company,
        ).order_by("id")

        return Response(
            {
                "cleaners": [
                    {
                        "id": c.id,
                        "full_name": c.full_name,
                        "phone": c.phone,
                    }
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
                "checklist_templates": [
                    {
                        "id": t.id,
                        "name": getattr(t, "name", "") or "",
                    }
                    for t in templates_qs
                ],
            },
            status=status.HTTP_200_OK,
        )


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
            {"detail": "Check in successful.", "job_id": job.id, "job_status": job.status},
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
            {"detail": "Check out successful.", "job_id": job.id, "job_status": job.status},
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
    Stub-эндпоинт для отправки PDF-отчёта на email менеджера.

    POST /api/manager/jobs/<id>/report/email/
    Body (опционально): { "email": "manager@example.com" }

    В MVP НИЧЕГО не шлёт, только возвращает 202 Accepted.
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

        job = get_object_or_404(
            Job.objects.filter(company=user.company),
            pk=pk,
        )

        # email можно явно передать в body, иначе берём email текущего юзера
        email = (request.data.get("email") or user.email or "").strip()
        if not email:
            return Response(
                {"detail": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ⚠️ ВАЖНО: реальную отправку письма в MVP НЕ делаем.
        # Здесь можно было бы:
        #   - сгенерировать PDF,
        #   - положить в очередь,
        #   - или отправить напрямую.
        # Сейчас просто возвращаем "ок, запланировали".
        return Response(
            {
                "detail": "Email scheduled (MVP stub, not actually sent).",
                "job_id": job.id,
                "target_email": email,
            },
            status=status.HTTP_202_ACCEPTED,
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

        # Можно добавить базовую валидацию размера/типа, если нужно
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

        full_name = request.data.get("full_name")
        email = request.data.get("email")
        phone = request.data.get("phone")
        is_active = request.data.get("is_active", True)

        if not full_name or not str(full_name).strip():
            return Response(
                {"full_name": ["Full name is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not email and not phone:
            return Response(
                {
                    "non_field_errors": [
                        "Either email or phone must be provided."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

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

        cleaner = User.objects.create(
            company=company,
            role=User.ROLE_CLEANER,
            full_name=full_name,
            email=email,
            phone=phone,
            is_active=bool(is_active),
        )

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
    """
    Создание job менеджером.

    POST /api/manager/jobs/

    Request:
    {
      "scheduled_date": "2026-01-19",
      "scheduled_start_time": "09:00:00",
      "scheduled_end_time": "12:00:00",
      "location_id": 1,
      "cleaner_id": 2,
      "checklist_template_id": 1
    }
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.role != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can create jobs."},
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

        return Response(data, status=status.HTTP_200_OK)


class ManagerPlanningJobsView(APIView):
    """
    Job Planning list для менеджера (read-only).

    GET /api/manager/jobs/planning/?date=YYYY-MM-DD

    Возвращает jobs за дату с агрегированными данными:
    - job (schedule, status)
    - location (id, name, address)
    - cleaner (id, full_name)
    - proof (before/after/checklist) — только флаги
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

        data = []
        for job in qs:
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
            checklist_completed = False  # ✅ по умолчанию НЕ ок, пока не докажем обратное
            try:
                items = list(job.checklist_items.all())
            except Exception:
                items = []

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
                    required_items = [
                        it
                        for it in items
                        if bool(getattr(it, required_attr, False))
                    ]
                    # ✅ Если required_items пустой (все required-флаги False) — считаем required ВСЕ
                    if not required_items:
                        required_items = items
                else:
                    required_items = items

                checklist_completed = all(
                    bool(getattr(it, "is_completed", False)) for it in required_items
                )

            data.append(
                {
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

                        # ✅ алиасы под UI / lovable
                        "before_photo": bool(before_uploaded),
                        "after_photo": bool(after_uploaded),
                        "checklist": bool(checklist_completed),
                    },
                }
            )

        return Response(data, status=status.HTTP_200_OK)
