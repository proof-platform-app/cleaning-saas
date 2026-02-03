import logging
from collections import defaultdict
from datetime import datetime, timedelta

from django.conf import settings
from django.core.mail import EmailMessage
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.db.models import Q

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Company, User
from apps.jobs.models import (
    File,  # оставляем для совместимости
    Job,
    JobCheckEvent,
    JobChecklistItem,
    JobPhoto,
)
from apps.marketing.models import ReportEmailLog
from apps.locations.models import Location

from .pdf import generate_job_report_pdf
from .permissions import IsManagerUser as IsManager
from .serializers import (
    JobChecklistItemSerializer,
    JobCheckEventSerializer,
    JobDetailSerializer,
    ManagerJobCreateSerializer,
    PlanningJobSerializer,
    compute_sla_status_for_job,
    compute_sla_reasons_for_job,
)

logger = logging.getLogger(__name__)

VALID_SLA_REASONS = {
    "missing_before_photo",
    "missing_after_photo",
    "checklist_not_completed",
    "missing_check_in",
    "missing_check_out",
}


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
        location_obj = getattr(job, "location", None)
        location_name = getattr(location_obj, "name", "") or getattr(
            job, "location_name", ""
        ) or ""
        address = getattr(location_obj, "address", "") or getattr(
            job, "location_address", ""
        ) or ""
        scheduled_date = (
            job.scheduled_date.strftime("%Y-%m-%d")
            if getattr(job, "scheduled_date", None)
            else ""
        )
        cleaner_obj = getattr(job, "cleaner", None)
        cleaner_name = getattr(cleaner_obj, "full_name", "") or ""

        sla_status = getattr(job, "sla_status", None)
        sla_reasons = getattr(job, "sla_reasons", None) or []
        if not isinstance(sla_reasons, (list, tuple)):
            sla_reasons = [sla_reasons] if sla_reasons else []

        if sla_status == "violated" and sla_reasons:
            reasons_text = ", ".join(str(r).replace("_", " ") for r in sla_reasons)
            sla_line = f"SLA status: violated (reasons: {reasons_text})"
        elif sla_status:
            sla_line = f"SLA status: {sla_status}"
        else:
            sla_line = ""

        body_lines = [
            "Hello,",
            "",
            "Attached is the verified cleaning report for the completed job.",
            "",
            f"Job ID: {job.id}",
        ]
        if location_name:
            body_lines.append(f"Location: {location_name}")
        if address:
            body_lines.append(f"Address: {address}")
        if scheduled_date:
            body_lines.append(f"Date: {scheduled_date}")
        if cleaner_name:
            body_lines.append(f"Cleaner: {cleaner_name}")
        if sla_line:
            body_lines.append(sla_line)

        body_lines.append("")
        body_lines.append(
            "This report includes check-in/check-out verification, before/after photos, checklist and SLA status."
        )
        body_lines.append("")
        body_lines.append("Regards,")
        body_lines.append("CleanProof")

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
                logger.exception(
                    "Failed to log sent job report email", exc_info=log_exc
                )

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


class ManagerJobReportEmailLogListView(APIView):
    """
    История отправок PDF-отчёта по конкретной job.

    GET /api/manager/jobs/<id>/report/emails/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        user = request.user

        if user.role != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can view report email history."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = get_object_or_404(
            Job.objects.filter(company=user.company),
            pk=pk,
        )

        logs = (
            ReportEmailLog.objects.filter(
                company_id=user.company_id,
                kind=ReportEmailLog.KIND_JOB_REPORT,
                job_id=job.id,
            )
            .select_related("user")
            .order_by("-created_at")[:20]
        )

        payload = {
            "job_id": job.id,
            "emails": [
                {
                    "id": log.id,
                    "sent_at": log.created_at.isoformat(),
                    "target_email": log.to_email,
                    "status": log.status,
                    "sent_by": (
                        getattr(log.user, "full_name", None)
                        or getattr(log.user, "email", None)
                        if log.user
                        else None
                    ),
                    "subject": log.subject,
                    "error_message": log.error_message,
                }
                for log in logs
            ],
        }

        return Response(payload, status=status.HTTP_200_OK)


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


# Сколько дней показывать в Completed на странице Jobs
ACTIVE_COMPLETED_DAYS = 30


class ManagerJobsActiveView(APIView):
    """
    GET /api/manager/jobs/active/

    Оперативный список джоб для вкладок Jobs:
    - все НЕ completed (любая дата);
    - completed за последние ACTIVE_COMPLETED_DAYS дней.

    Остальной полный архив — через Job History.
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request):
        user = request.user
        company = getattr(user, "company", None)

        if not company:
            return Response(
                {"detail": "Manager has no company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = timezone.localdate()
        completed_from = today - timedelta(days=ACTIVE_COMPLETED_DAYS)

        qs = (
            Job.objects.filter(company=company)
            .filter(
                Q(status__in=[Job.STATUS_SCHEDULED, Job.STATUS_IN_PROGRESS])
                | Q(
                    status=Job.STATUS_COMPLETED,
                    actual_end_time__isnull=False,
                    actual_end_time__date__gte=completed_from,
                )
            )
            .select_related("location", "cleaner")
            .prefetch_related("photos")
            .order_by("scheduled_date", "scheduled_start_time", "id")
        )

        data: list[dict] = []

        for job in qs:
            location = getattr(job, "location", None)
            cleaner = getattr(job, "cleaner", None)

            photos_qs = getattr(job, "photos", None)
            photos = list(photos_qs.all()) if photos_qs is not None else []

            has_before = any(
                p.photo_type == JobPhoto.TYPE_BEFORE for p in photos
            )
            has_after = any(
                p.photo_type == JobPhoto.TYPE_AFTER for p in photos
            )

            data.append(
                {
                    "id": job.id,
                    "status": job.status,
                    "scheduled_date": job.scheduled_date.isoformat()
                    if job.scheduled_date
                    else None,
                    "scheduled_start_time": job.scheduled_start_time.strftime(
                        "%H:%M"
                    )
                    if job.scheduled_start_time
                    else None,
                    "scheduled_end_time": job.scheduled_end_time.strftime(
                        "%H:%M"
                    )
                    if job.scheduled_end_time
                    else None,
                    "location_name": getattr(location, "name", "") or "",
                    "location_address": getattr(location, "address", "") or "",
                    "cleaner_name": getattr(cleaner, "full_name", "") or "",
                    # флаги для has_proof на фронте
                    "has_before_photo": has_before,
                    "has_after_photo": has_after,
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
    checklist_completed = False
    try:
        items = list(job.checklist_items.all())
    except Exception:
        items = []

    checklist_items_texts = [
        getattr(it, "text", "").strip()
        for it in items
        if getattr(it, "text", "").strip()
    ]

    if not items:
        checklist_completed = False
    else:
        required_attr = None
        sample = items[0]
        if hasattr(sample, "required"):
            required_attr = "required"
        elif hasattr(sample, "is_required"):
            required_attr = "is_required"

        if required_attr:
            required_items = [
                it for it in items if bool(getattr(it, required_attr, False))
            ]
            if not required_items:
                required_items = items
        else:
            required_items = items

        checklist_completed = all(
            bool(getattr(it, "is_completed", False)) for it in required_items
        )

    sla_reasons: list[str] = []

    if job.status == Job.STATUS_COMPLETED:
        if not before_uploaded:
            sla_reasons.append("missing_before_photo")
        if not after_uploaded:
            sla_reasons.append("missing_after_photo")
        if not checklist_completed:
            sla_reasons.append("checklist_not_completed")

    sla_status = "violated" if sla_reasons else "ok"

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
            "before_uploaded": bool(before_uploaded),
            "after_uploaded": bool(after_uploaded),
            "checklist_completed": bool(checklist_completed),
            "before_photo": bool(before_uploaded),
            "after_photo": bool(after_uploaded),
            "checklist": bool(checklist_completed),
        },
        "sla_status": sla_status,
        "sla_reasons": sla_reasons,
        "checklist_template": checklist_template_payload,
        "checklist_items": checklist_items_texts,
    }


class ManagerJobForceCompleteView(APIView):
    """
    Force-complete job (manager override).

    POST /api/manager/jobs/<id>/force-complete/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        user = request.user

        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return Response(
                {"detail": "Only managers can force-complete jobs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if company is None:
            return Response(
                {"detail": "Manager has no company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if company.is_blocked():
            code = "trial_expired" if company.is_trial_expired() else "company_blocked"
            if code == "trial_expired":
                detail = (
                    "Your free trial has ended. You can still view existing jobs and "
                    "download reports, but overriding jobs requires an upgrade."
                )
            else:
                detail = "Your account is currently blocked. Please contact support."

            return Response(
                {"code": code, "detail": detail},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = get_object_or_404(
            Job.objects.select_related("location", "cleaner"),
            pk=pk,
            company=company,
        )

        if job.status == Job.STATUS_COMPLETED:
            return Response(
                {"detail": "Job is already completed and cannot be force-completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason_code = (request.data.get("reason_code") or "").strip()
        comment = (request.data.get("comment") or "").strip()

        allowed_reason_codes = set(VALID_SLA_REASONS) | {"other"}

        if not reason_code or reason_code not in allowed_reason_codes:
            return Response(
                {"detail": "Invalid or missing 'reason_code'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not comment:
            return Response(
                {"detail": "Comment is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()

        job.status = Job.STATUS_COMPLETED
        if not getattr(job, "actual_end_time", None):
            job.actual_end_time = now

        existing = getattr(job, "sla_reasons", None)
        if isinstance(existing, str):
            reasons_list: list[str] = [existing]
        elif isinstance(existing, (list, tuple)):
            reasons_list = [str(r) for r in existing if r]
        elif existing is None:
            reasons_list = []
        else:
            reasons_list = [str(existing)]

        if reason_code not in reasons_list:
            reasons_list.append(reason_code)

        try:
            job.sla_status = "violated"
        except Exception:
            pass

        try:
            job.sla_reasons = reasons_list
        except Exception:
            pass

        try:
            job.force_completed = True
        except Exception:
            pass
        try:
            job.force_completed_at = now
        except Exception:
            pass
        try:
            job.force_completed_by = user
        except Exception:
            pass

        job.save()

        try:
            JobCheckEvent.objects.create(
                job=job,
                user=user,
                event_type="force_complete",
            )
        except Exception as exc:
            logger.exception(
                "Failed to create force-complete JobCheckEvent", exc_info=exc
            )

        response_data = {
            "id": job.id,
            "status": job.status,
            "sla_status": getattr(job, "sla_status", None),
            "sla_reasons": reasons_list,
        }

        if hasattr(job, "force_completed"):
            response_data["force_completed"] = bool(
                getattr(job, "force_completed", False)
            )

        if hasattr(job, "force_completed_at"):
            fc_at = getattr(job, "force_completed_at", None)
            response_data["force_completed_at"] = fc_at.isoformat() if fc_at else None

        if hasattr(job, "force_completed_by"):
            by = getattr(job, "force_completed_by", None)
            if by is not None:
                response_data["force_completed_by"] = {
                    "id": by.id,
                    "full_name": getattr(by, "full_name", "") or getattr(
                        by, "email", ""
                    ),
                }

        return Response(response_data, status=status.HTTP_200_OK)


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

        date_str = (request.query_params.get("date") or "").strip()
        if not date_str:
            return Response(
                {"detail": "date query param is required: YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        day = parse_date(date_str)

        if not day:
            try:
                day = timezone.datetime.strptime(date_str, "%d.%m.%Y").date()
            except Exception:
                day = None

        if not day and "T" in date_str:
            day = parse_date(date_str.split("T", 1)[0])

        if not day:
            return Response(
                {
                    "detail": "Invalid date format. Expected YYYY-MM-DD or DD.MM.YYYY"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

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
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user

        if getattr(user, "role", None) not in (User.ROLE_MANAGER, "manager"):
            return Response(
                {"detail": "Only managers can access job history."},
                status=status.HTTP_403_FORBIDDEN,
            )

        date_from_str = request.query_params.get("date_from")
        date_to_str = request.query_params.get("date_to")

        if not date_from_str or not date_to_str:
            return Response(
                {
                    "detail": "date_from and date_to are required in format YYYY-MM-DD."
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
