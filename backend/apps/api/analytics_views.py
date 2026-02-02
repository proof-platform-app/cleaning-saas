# apps/api/analytics_views.py

from datetime import datetime, timedelta
from collections import defaultdict

from django.utils import timezone
from django.db.models import Count
from django.db.models.functions import TruncDate

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.jobs.models import Job, JobPhoto, JobChecklistItem

from .permissions import IsManagerUser as IsManager
from .views import compute_sla_status_and_reasons_for_job


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsManager])
def analytics_summary(request):
  """
  GET /api/manager/analytics/summary/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

  Метрики:
  - jobs_completed: количество завершённых джобов за период
  - on_time_completion_rate: доля completed jobs, завершённых до planned end
  - proof_completion_rate: доля completed jobs с полным proof
  - avg_job_duration_hours: средняя длительность (по факту)
  - issues_detected: количество jobs с SLA-нарушениями
  """
  user = request.user
  company = getattr(user, "company", None)

  if not company:
    return Response(
      {"detail": "Manager has no company."},
      status=status.HTTP_400_BAD_REQUEST,
    )

  # --- разбор диапазона дат ---
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

  # --- выборка completed jobs компании за период по actual_end_time ---
  qs = (
    Job.objects.filter(
      company=company,
      status=Job.STATUS_COMPLETED,
      actual_end_time__isnull=False,
      actual_end_time__date__gte=date_from,
      actual_end_time__date__lte=date_to,
    )
    .select_related("cleaner", "location")
    .prefetch_related("photos", "checklist_items")
  )

  jobs_completed = qs.count()

  on_time_numerator = 0
  on_time_denominator = 0
  proof_ok_count = 0
  duration_sum_hours = 0.0
  duration_count = 0
  issues_detected = 0

  tz = timezone.get_current_timezone()

  for job in qs:
    # --- фактическая длительность job ---
    if job.actual_start_time and job.actual_end_time:
      delta = job.actual_end_time - job.actual_start_time
      duration_hours = delta.total_seconds() / 3600.0
      duration_sum_hours += duration_hours
      duration_count += 1

    # --- on-time: сравнение actual_end_time с planned end (scheduled_date + scheduled_end_time) ---
    if job.actual_end_time and job.scheduled_date and job.scheduled_end_time is not None:
      planned_end_naive = datetime.combine(job.scheduled_date, job.scheduled_end_time)
      if timezone.is_naive(planned_end_naive):
        planned_end = timezone.make_aware(planned_end_naive, tz)
      else:
        planned_end = planned_end_naive

      on_time_denominator += 1
      if job.actual_end_time <= planned_end:
        on_time_numerator += 1

    # --- proof flags: before/after + checklist ---
    photos = list(job.photos.all())
    before_uploaded = any(p.photo_type == JobPhoto.TYPE_BEFORE for p in photos)
    after_uploaded = any(p.photo_type == JobPhoto.TYPE_AFTER for p in photos)

    checklist_items = list(job.checklist_items.all())
    if checklist_items:
      # required: is_required=True, если нет ни одного required — считаем все обязательными
      required_items = [
        it for it in checklist_items if getattr(it, "is_required", True)
      ]
      if not required_items:
        required_items = checklist_items
      checklist_completed = all(
        bool(getattr(it, "is_completed", False)) for it in required_items
      )
    else:
      # если вообще нет чек-листа — считаем, что по чек-листу ok
      checklist_completed = True

    if before_uploaded and after_uploaded and checklist_completed:
      proof_ok_count += 1

    # --- SLA issues через существующий helper ---
    sla_status, _reasons = compute_sla_status_and_reasons_for_job(job)
    if sla_status == "violated":
      issues_detected += 1

  on_time_completion_rate = (
    float(on_time_numerator) / float(on_time_denominator)
    if on_time_denominator
    else 0.0
  )
  proof_completion_rate = (
    float(proof_ok_count) / float(jobs_completed)
    if jobs_completed
    else 0.0
  )
  avg_job_duration_hours = (
    float(duration_sum_hours) / float(duration_count)
    if duration_count
    else 0.0
  )

  data = {
    "jobs_completed": jobs_completed,
    "on_time_completion_rate": on_time_completion_rate,
    "proof_completion_rate": proof_completion_rate,
    "avg_job_duration_hours": avg_job_duration_hours,
    "issues_detected": issues_detected,
  }
  return Response(data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsManager])
def analytics_jobs_completed(request):
  # TODO: реальный расчёт
  return Response([])


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsManager])
def analytics_job_duration(request):
  """
  GET /api/manager/analytics/job-duration/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

  Возвращает массив точек по дням:
  [
    { "date": "2026-01-20", "avg_job_duration_hours": 1.75 },
    ...
  ]

  Основано на дате фактического завершения job (actual_end_time).
  В расчёт попадают только jobs, у которых есть и actual_start_time, и actual_end_time.
  """
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

  # только completed jobs с валидным интервалом времени
  qs = (
    Job.objects.filter(
      company=company,
      status=Job.STATUS_COMPLETED,
      actual_start_time__isnull=False,
      actual_end_time__isnull=False,
      actual_end_time__date__gte=date_from,
      actual_end_time__date__lte=date_to,
    )
    .only("id", "actual_start_time", "actual_end_time")
  )

  # Собираем суммы длительности и количество по дням
  by_day: dict = {}

  for job in qs:
    day = job.actual_end_time.date()
    delta = job.actual_end_time - job.actual_start_time
    duration_hours = delta.total_seconds() / 3600.0

    if day not in by_day:
      by_day[day] = {"sum_hours": 0.0, "count": 0}

    by_day[day]["sum_hours"] += duration_hours
    by_day[day]["count"] += 1

  # Формируем ответ, без дыр по датам
  data = []
  current = date_from
  while current <= date_to:
    bucket = by_day.get(current)
    if bucket and bucket["count"] > 0:
      avg_hours = float(bucket["sum_hours"]) / float(bucket["count"])
    else:
      avg_hours = 0.0

    data.append(
      {
        "date": current.isoformat(),
        "avg_job_duration_hours": avg_hours,
      }
    )
    current += timedelta(days=1)

  return Response(data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsManager])
def analytics_proof_completion(request):
  """
  GET /api/manager/analytics/proof-completion/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

  Тренд по proof:

  [
    {
      "date": "2026-01-20",
      "before_photo_rate": 0.95,
      "after_photo_rate": 0.92,
      "checklist_rate": 0.88
    },
    ...
  ]

  Основано на дате фактического завершения job (actual_end_time).
  В расчёт попадают только completed jobs.
  """
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

  # только completed jobs с реальным actual_end_time в диапазоне
  qs = (
    Job.objects.filter(
      company=company,
      status=Job.STATUS_COMPLETED,
      actual_end_time__isnull=False,
      actual_end_time__date__gte=date_from,
      actual_end_time__date__lte=date_to,
    )
    .prefetch_related("photos", "checklist_items")
  )

  # агрегаты по дням
  by_day: dict = {}

  for job in qs:
    day = job.actual_end_time.date()

    bucket = by_day.get(day)
    if bucket is None:
      bucket = {
        "total": 0,
        "with_before": 0,
        "with_after": 0,
        "checklist_ok": 0,
      }
      by_day[day] = bucket

    bucket["total"] += 1

    # --- proof: before / after ---
    photos = list(job.photos.all())
    before_uploaded = any(p.photo_type == JobPhoto.TYPE_BEFORE for p in photos)
    after_uploaded = any(p.photo_type == JobPhoto.TYPE_AFTER for p in photos)

    if before_uploaded:
      bucket["with_before"] += 1
    if after_uploaded:
      bucket["with_after"] += 1

    # --- proof: checklist ---
    checklist_items = list(job.checklist_items.all())
    if checklist_items:
      required_items = [
        it for it in checklist_items if getattr(it, "is_required", True)
      ]
      if not required_items:
        required_items = checklist_items
      checklist_completed = all(
        bool(getattr(it, "is_completed", False)) for it in required_items
      )
    else:
      # Нет чек-листа вообще — считаем, что по чек-листу ok
      checklist_completed = True

    if checklist_completed:
      bucket["checklist_ok"] += 1

  # формируем ответ, без дыр по датам
  data = []
  current = date_from
  while current <= date_to:
    bucket = by_day.get(current)

    if bucket and bucket["total"] > 0:
      total = float(bucket["total"])
      before_rate = float(bucket["with_before"]) / total
      after_rate = float(bucket["with_after"]) / total
      checklist_rate = float(bucket["checklist_ok"]) / total
    else:
      before_rate = 0.0
      after_rate = 0.0
      checklist_rate = 0.0

    data.append(
      {
        "date": current.isoformat(),
        "before_photo_rate": before_rate,
        "after_photo_rate": after_rate,
        "checklist_rate": checklist_rate,
      }
    )

    current += timedelta(days=1)

  return Response(data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsManager])
def analytics_cleaners_performance(request):
    """
    GET /api/manager/analytics/cleaners-performance/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

    Возвращает список по клинерам:

    [
      {
        "cleaner_id": 1,
        "cleaner_name": "Ahmed Hassan",
        "jobs_completed": 48,
        "avg_duration_hours": 2.2,
        "on_time_rate": 0.98,
        "proof_rate": 1.0,
        "issues": 0
      },
      ...
    ]

    Основано на completed jobs, фактически завершённых в диапазоне (actual_end_time).
    """
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

    # только completed jobs компании, завершённые в диапазоне по actual_end_time
    qs = (
        Job.objects.filter(
            company=company,
            status=Job.STATUS_COMPLETED,
            actual_end_time__isnull=False,
            actual_end_time__date__gte=date_from,
            actual_end_time__date__lte=date_to,
        )
        .select_related("cleaner")
        .prefetch_related("photos", "checklist_items")
    )

    # агрегаты по каждому клинеру
    cleaners: dict[int, dict] = {}

    for job in qs:
        cleaner = getattr(job, "cleaner", None)
        if cleaner is None:
            # джобы без клинера в рейтинг не включаем
            continue

        cleaner_id = cleaner.id
        if cleaner_id not in cleaners:
            cleaners[cleaner_id] = {
                "cleaner_id": cleaner_id,
                "cleaner_name": (
                    getattr(cleaner, "full_name", None)
                    or getattr(cleaner, "email", "")
                    or ""
                ),
                "jobs_completed": 0,
                "sum_duration_hours": 0.0,
                "jobs_with_duration": 0,
                "jobs_with_scheduled_end": 0,
                "jobs_on_time": 0,
                "jobs_with_full_proof": 0,
                "issues": 0,
            }

        stats = cleaners[cleaner_id]
        stats["jobs_completed"] += 1

        # --- длительность job (если обе точки времени есть) ---
        if job.actual_start_time and job.actual_end_time:
            delta = job.actual_end_time - job.actual_start_time
            duration_hours = delta.total_seconds() / 3600.0
            stats["sum_duration_hours"] += duration_hours
            stats["jobs_with_duration"] += 1

        # --- on-time completion ---
        if job.scheduled_date and job.scheduled_end_time and job.actual_end_time:
            stats["jobs_with_scheduled_end"] += 1

            # фактическое завершение (aware)
            actual_end = job.actual_end_time

            # плановое завершение: собираем naive и делаем aware в текущей TZ
            scheduled_end_dt = datetime.combine(
                job.scheduled_date,
                job.scheduled_end_time,
            )
            if timezone.is_naive(scheduled_end_dt):
                scheduled_end_dt = timezone.make_aware(
                    scheduled_end_dt,
                    timezone.get_current_timezone(),
                )

            on_time = actual_end <= scheduled_end_dt
            if on_time:
                stats["jobs_on_time"] += 1

        # --- proof + SLA ---
        sla_status, _reasons = compute_sla_status_and_reasons_for_job(job)
        if sla_status == "ok":
            # полные доказательства (before+after+чеклист)
            stats["jobs_with_full_proof"] += 1
        else:
            # любое нарушение SLA считаем issue
            stats["issues"] += 1

    # формируем финальный список
    results: list[dict] = []
    for stats in cleaners.values():
        jobs_completed = stats["jobs_completed"] or 0

        # средняя длительность
        if stats["jobs_with_duration"] > 0:
            avg_duration = (
                stats["sum_duration_hours"] / float(stats["jobs_with_duration"])
            )
        else:
            avg_duration = 0.0

        # on-time rate
        if stats["jobs_with_scheduled_end"] > 0:
            on_time_rate = (
                stats["jobs_on_time"] / float(stats["jobs_with_scheduled_end"])
            )
        else:
            on_time_rate = 0.0

        # proof rate (по всем completed jobs клинера)
        if jobs_completed > 0:
            proof_rate = stats["jobs_with_full_proof"] / float(jobs_completed)
        else:
            proof_rate = 0.0

        results.append(
            {
                "cleaner_id": stats["cleaner_id"],
                "cleaner_name": stats["cleaner_name"],
                "jobs_completed": jobs_completed,
                "avg_job_duration_hours": avg_duration,
                "on_time_rate": on_time_rate,
                "proof_rate": proof_rate,
                "issues": stats["issues"],
            }
        )

    # сортируем: сначала по количеству issues (убывание), потом по числу jobs (убывание)
    results.sort(
        key=lambda x: (-x["issues"], -x["jobs_completed"], x["cleaner_name"])
    )

    return Response(results, status=status.HTTP_200_OK)
