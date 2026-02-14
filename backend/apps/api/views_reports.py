# backend/apps/api/views_reports.py

import logging
from collections import Counter, defaultdict
from datetime import timedelta, datetime

from django.conf import settings
from django.core.mail import EmailMessage
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Company, User
from apps.jobs.models import Job, JobChecklistItem, JobPhoto
from apps.marketing.models import ReportEmailLog

from .pdf import generate_company_sla_report_pdf

logger = logging.getLogger(__name__)

# Console roles that have access to reports
CONSOLE_ROLES = {User.ROLE_OWNER, User.ROLE_MANAGER, User.ROLE_STAFF}


def _get_company_report(company: Company, days: int) -> dict:
    """
    Собирает weekly/monthly report по SLA для компании.

    ВАЖНО:
    - Период считается по дате ФАКТИЧЕСКОГО завершения задачи
      (actual_end_time.date), а не по scheduled_date.
    - В отчёт попадают только completed jobs.
    - Семантика совпадает с Analytics API v1:
      job-based метрики завязаны на actual_end_time.
    """

    # Период по календарным дням, включая today
    date_to = timezone.localdate()
    date_from = date_to - timedelta(days=days - 1)

    # Только завершённые задачи компании за период
    qs = (
        Job.objects.filter(
            company=company,
            status=Job.STATUS_COMPLETED,
            actual_end_time__date__gte=date_from,
            actual_end_time__date__lte=date_to,
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

    # 0) Явный override SLA (например, после force-complete)
    # Если в job.sla_reasons уже что-то лежит — считаем это источником истины.
    explicit_reasons = getattr(job, "sla_reasons", None)

    normalized_explicit: list[str] = []
    if explicit_reasons:
        if isinstance(explicit_reasons, str):
            normalized_explicit = [explicit_reasons]
        elif isinstance(explicit_reasons, (list, tuple)):
            normalized_explicit = [str(r) for r in explicit_reasons if r]
        else:
            normalized_explicit = [str(explicit_reasons)]

    if normalized_explicit:
        # если явно записали причины — это всегда нарушение
        return "violated", normalized_explicit

    # 1) Фотографии
    before_exists = JobPhoto.objects.filter(
        job=job,
        photo_type=JobPhoto.TYPE_BEFORE,
    ).exists()

    after_exists = JobPhoto.objects.filter(
        job=job,
        photo_type=JobPhoto.TYPE_AFTER,
    ).exists()

    # 2) Чеклист
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
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Пока владельца представляем как manager-аккаунт компании
        if user.role not in CONSOLE_ROLES:
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

        days_param = (request.query_params.get("days") or "").strip()
        try:
            days = int(days_param) if days_param else 30
        except ValueError:
            days = 30

        if days < 7:
            days = 7
        if days > 90:
            days = 90

        report = _get_company_report(company, days=days)

        overview = {
            "period": report.get("period", {}),
            "summary": report.get("summary", {}),
            "top_locations": report.get("locations", [])[:5],
            "top_cleaners": report.get("cleaners", [])[:5],
            "top_reasons": report.get("top_reasons", []),
        }

        return Response(overview, status=status.HTTP_200_OK)


class ManagerPerformanceView(APIView):
    """
    SLA performance summary для менеджера.

    GET /api/manager/performance/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
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

        qs = (
            Job.objects.filter(
                company=company,
                status="completed",
                scheduled_date__gte=date_from,
                scheduled_date__lte=date_to,
            )
            .select_related("cleaner", "location")
        )

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

            if cleaner is not None:
                c_stats = cleaners_stats[cleaner.id]
                c_stats["cleaner"] = cleaner
                c_stats["jobs_total"] += 1

            if location is not None:
                l_stats = locations_stats[location.id]
                l_stats["location"] = location
                l_stats["jobs_total"] += 1

            if not violated:
                continue

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
    &cleaner_id=...&location_id=...
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
        cleaner_id_str = (request.query_params.get("cleaner_id") or "").strip()
        location_id_str = (request.query_params.get("location_id") or "").strip()

        VALID_SLA_REASONS = {
            "missing_before_photo",
            "missing_after_photo",
            "checklist_not_completed",
            "missing_check_in",
            "missing_check_out",
        }

        # reason теперь опциональный, но если он есть — должен быть валидным
        if reason and reason not in VALID_SLA_REASONS:
            return Response(
                {"detail": "Invalid 'reason' parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # хотя бы один фильтр: reason / cleaner_id / location_id
        if not (reason or cleaner_id_str or location_id_str):
            return Response(
                {
                    "detail": (
                        "At least one of 'reason', 'cleaner_id' or "
                        "'location_id' must be provided."
                    )
                },
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

        # парсим cleaner_id / location_id, если есть
        cleaner_id = None
        if cleaner_id_str:
            try:
                cleaner_id = int(cleaner_id_str)
            except ValueError:
                return Response(
                    {"detail": "Invalid 'cleaner_id' parameter. Must be integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        location_id = None
        if location_id_str:
            try:
                location_id = int(location_id_str)
            except ValueError:
                return Response(
                    {"detail": "Invalid 'location_id' parameter. Must be integer."},
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

            # фильтрация по reason, если он задан
            if reason and reason not in reasons:
                continue

            # фильтрация по cleaner_id, если задан
            if cleaner_id is not None:
                if not job.cleaner or job.cleaner.id != cleaner_id:
                    continue

            # фильтрация по location_id, если задан
            if location_id is not None:
                if not job.location or job.location.id != location_id:
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

        # reason может быть пустым → аккуратно берём label
        reason_label = reason_labels.get(reason, reason or "")

        payload = {
            "reason": reason,
            "reason_label": reason_label,
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

class ManagerReportEmailLogListView(APIView):
    """
    Глобальная таблица email-логов для менеджера.

    GET /api/manager/report-emails/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        company = getattr(user, "company", None)

        if user.role not in CONSOLE_ROLES:
            return Response(
                {"detail": "Only managers can view report email logs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not company:
            return Response(
                {"detail": "Manager has no company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = (
            ReportEmailLog.objects.filter(company_id=company.id)
            .select_related("user")
            .order_by("-created_at")
        )

        date_from_str = (request.query_params.get("date_from") or "").strip()
        date_to_str = (request.query_params.get("date_to") or "").strip()

        if date_from_str:
            try:
                date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
                qs = qs.filter(created_at__date__gte=date_from)
            except ValueError:
                return Response(
                    {"detail": "Invalid date_from. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if date_to_str:
            try:
                date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()
                qs = qs.filter(created_at__date__lte=date_to)
            except ValueError:
                return Response(
                    {"detail": "Invalid date_to. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        status_param = (request.query_params.get("status") or "").strip()
        if status_param in (
            ReportEmailLog.STATUS_SENT,
            ReportEmailLog.STATUS_FAILED,
        ):
            qs = qs.filter(status=status_param)

        kind = (request.query_params.get("kind") or "").strip()
        valid_kinds = {
            ReportEmailLog.KIND_JOB_REPORT,
            ReportEmailLog.KIND_WEEKLY_REPORT,
            ReportEmailLog.KIND_MONTHLY_REPORT,
        }
        if kind:
            if kind not in valid_kinds:
                return Response(
                    {
                        "detail": (
                            "Invalid kind. Use job_report, weekly_report "
                            "or monthly_report."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(kind=kind)

        job_id_str = (request.query_params.get("job_id") or "").strip()
        if job_id_str:
            try:
                job_id = int(job_id_str)
                qs = qs.filter(job_id=job_id)
            except ValueError:
                return Response(
                    {"detail": "Invalid job_id. Must be integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        email_substring = (request.query_params.get("email") or "").strip()
        if email_substring:
            qs = qs.filter(to_email__icontains=email_substring)

        try:
            page = int(request.query_params.get("page", "1"))
        except ValueError:
            page = 1

        try:
            page_size = int(request.query_params.get("page_size", "50"))
        except ValueError:
            page_size = 50

        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 50
        if page_size > 200:
            page_size = 200

        total_count = qs.count()
        start = (page - 1) * page_size
        end = start + page_size

        logs = list(qs[start:end])

        job_ids = [log.job_id for log in logs if log.job_id]
        jobs_map = {
            job.id: job
            for job in Job.objects.filter(id__in=job_ids).select_related(
                "company", "location", "cleaner"
            )
        }

        results = []
        for log in logs:
            job = jobs_map.get(log.job_id)

            sent_at = log.created_at.isoformat() if log.created_at else None

            if log.kind == ReportEmailLog.KIND_JOB_REPORT and job:
                job_period = f"Job #{job.id}"
                company_name = getattr(job.company, "name", "") or ""
                location_name = getattr(job.location, "name", "") or ""
                cleaner_name = (
                    getattr(job.cleaner, "full_name", "")
                    or getattr(job.cleaner, "email", "")
                    or ""
                )
            else:
                if log.period_from and log.period_to:
                    job_period = f"{log.period_from} – {log.period_to}"
                else:
                    job_period = ""
                company_name = getattr(company, "name", "") or ""
                location_name = ""
                cleaner_name = ""

            sent_by = (
                getattr(log.user, "full_name", None)
                or getattr(log.user, "email", None)
                or ""
            )

            results.append(
                {
                    "id": log.id,
                    "kind": log.kind,
                    "sent_at": sent_at,
                    "job_id": log.job_id,
                    "job_period": job_period,
                    "company_name": company_name,
                    "location_name": location_name,
                    "cleaner_name": cleaner_name,
                    "target_email": log.to_email or "",
                    "status": log.status,
                    "sent_by": sent_by,
                }
            )

        next_page = page + 1 if end < total_count else None
        previous_page = page - 1 if page > 1 else None

        payload = {
            "count": total_count,
            "page": page,
            "page_size": page_size,
            "next_page": next_page,
            "previous_page": previous_page,
            "results": results,
        }

        return Response(payload, status=status.HTTP_200_OK)


class ManagerWeeklyReportView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role not in CONSOLE_ROLES:
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

        if user.role not in CONSOLE_ROLES:
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

        if user.role not in CONSOLE_ROLES:
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

        if user.role not in CONSOLE_ROLES:
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


def _send_company_report_email(
    company: Company, days: int, target_email: str, frequency_label: str
) -> dict:
    """
    Общий helper для weekly / monthly email-отчётов.
    """

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
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.role not in CONSOLE_ROLES:
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
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.role not in CONSOLE_ROLES:
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
