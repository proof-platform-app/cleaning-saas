import json
from datetime import date

from django.core.exceptions import ValidationError
from django.db.models import Prefetch
from django.http import JsonResponse, HttpResponseNotAllowed
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from apps.jobs.models import Job, JobCheckEvent, JobChecklistItem
from apps.jobs.utils import distance_m
from apps.locations.models import Location, ChecklistTemplate
from apps.accounts.models import User


def _json_error(message: str, status: int = 400):
    return JsonResponse({"ok": False, "error": message}, status=status)


def _parse_json_body(request):
    try:
        body = request.body.decode("utf-8") if request.body else "{}"
        return json.loads(body)
    except Exception:
        raise ValidationError("Invalid JSON body")


def _job_to_dict(job: Job):
    checklist = [
        {
            "id": item.id,
            "order": item.order,
            "text": item.text,
            "is_required": item.is_required,
            "is_completed": item.is_completed,
        }
        for item in job.checklist_items.all()
    ]

    events = [
        {
            "id": ev.id,
            "event_type": ev.event_type,
            "created_at": ev.created_at.isoformat(),
            "latitude": ev.latitude,
            "longitude": ev.longitude,
            "distance_m": ev.distance_m,
            "user_id": ev.user_id,
        }
        for ev in job.check_events.all()
    ]

    return {
        "id": job.id,
        "company_id": job.company_id,
        "location": {
            "id": job.location_id,
            "name": getattr(job.location, "name", ""),
            "address": getattr(job.location, "address", ""),
            "latitude": float(getattr(job.location, "latitude", 0.0)),
            "longitude": float(getattr(job.location, "longitude", 0.0)),
        },
        "cleaner": {
            "id": job.cleaner_id,
            "full_name": getattr(job.cleaner, "full_name", ""),
            "phone": getattr(job.cleaner, "phone", None),
        },
        "scheduled_date": job.scheduled_date.isoformat(),
        "scheduled_start_time": job.scheduled_start_time.isoformat() if job.scheduled_start_time else None,
        "scheduled_end_time": job.scheduled_end_time.isoformat() if job.scheduled_end_time else None,
        "actual_start_time": job.actual_start_time.isoformat() if job.actual_start_time else None,
        "actual_end_time": job.actual_end_time.isoformat() if job.actual_end_time else None,
        "status": job.status,
        "manager_notes": job.manager_notes,
        "cleaner_notes": job.cleaner_notes,
        "checklist_items": checklist,
        "check_events": events,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
    }


def _job_list_item(job: Job):
    return {
        "id": job.id,
        "location": getattr(job.location, "name", ""),
        "cleaner": getattr(job.cleaner, "full_name", ""),
        "scheduled_date": job.scheduled_date.isoformat(),
        "scheduled_time": (
            f"{job.scheduled_start_time.strftime('%H:%M')} - {job.scheduled_end_time.strftime('%H:%M')}"
            if job.scheduled_start_time and job.scheduled_end_time
            else None
        ),
        "status": job.status,
        "proof": "available" if job.status == Job.STATUS_COMPLETED else None,
    }


@csrf_exempt
def jobs_list(request):
    """
    GET /jobs?filter=today|upcoming|completed
    """
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    f = request.GET.get("filter", "today").lower()
    today = timezone.localdate()

    qs = (
        Job.objects.select_related("location", "cleaner")
        .order_by("scheduled_date", "scheduled_start_time", "id")
    )

    # MVP: пока без полноценной auth/permissions, но уже закладываем место:
    # TODO: фильтровать по request.user.company_id (manager)
    # if request.user.is_authenticated: qs = qs.filter(company_id=request.user.company_id)

    if f == "today":
        qs = qs.filter(scheduled_date=today)
    elif f == "upcoming":
        qs = qs.filter(scheduled_date__gt=today).exclude(status=Job.STATUS_CANCELLED)
    elif f == "completed":
        qs = qs.filter(status=Job.STATUS_COMPLETED)
    else:
        return _json_error("Invalid filter. Use today|upcoming|completed", 400)

    data = [_job_list_item(j) for j in qs[:200]]
    return JsonResponse({"ok": True, "items": data})


@csrf_exempt
def jobs_create(request):
    """
    POST /jobs/create
    Body:
    {
      "company_id": 1,
      "location_id": 1,
      "cleaner_id": 10,
      "scheduled_date": "2026-01-15",
      "scheduled_start_time": "09:00",
      "scheduled_end_time": "12:00",
      "checklist_template_id": 5,        (optional)
      "manager_notes": "..."              (optional)
    }
    """
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    try:
        payload = _parse_json_body(request)
        company_id = int(payload["company_id"])
        location_id = int(payload["location_id"])
        cleaner_id = int(payload["cleaner_id"])
        scheduled_date = payload["scheduled_date"]
        scheduled_start_time = payload.get("scheduled_start_time")
        scheduled_end_time = payload.get("scheduled_end_time")
        checklist_template_id = payload.get("checklist_template_id")
        manager_notes = payload.get("manager_notes", "")

        # NOTE: Company модель у тебя в accounts. Я не тяну Company напрямую тут,
        # чтобы не раздувать код — достаём через Job.create_with_checklist в models.
        # Но нам всё равно нужен объект company/location/cleaner.
        from apps.accounts.models import Company  # локальный импорт, чтобы не циклило

        company = get_object_or_404(Company, id=company_id)
        location = get_object_or_404(Location, id=location_id)
        cleaner = get_object_or_404(User, id=cleaner_id)

        checklist_template = None
        if checklist_template_id:
            checklist_template = get_object_or_404(ChecklistTemplate, id=int(checklist_template_id))

        # Парс дат/времени
        y, m, d = [int(x) for x in scheduled_date.split("-")]
        sched_date_obj = date(y, m, d)

        # Time из "HH:MM"
        def _parse_time(s):
            if not s:
                return None
            hh, mm = [int(x) for x in s.split(":")]
            return timezone.datetime(2000, 1, 1, hh, mm).time()

        start_t = _parse_time(scheduled_start_time)
        end_t = _parse_time(scheduled_end_time)

        job = Job.create_with_checklist(
            company=company,
            location=location,
            cleaner=cleaner,
            scheduled_date=sched_date_obj,
            scheduled_start_time=start_t,
            scheduled_end_time=end_t,
            checklist_template=checklist_template,
            manager_notes=manager_notes,
        )

        # Подгружаем связи для ответа
        job = (
            Job.objects.select_related("location", "cleaner")
            .prefetch_related("checklist_items", "check_events")
            .get(id=job.id)
        )

        return JsonResponse({"ok": True, "job": _job_to_dict(job)}, status=201)

    except KeyError as e:
        return _json_error(f"Missing field: {str(e)}", 400)
    except ValidationError as e:
        return _json_error(str(e), 400)
    except Exception as e:
        return _json_error(f"Unexpected error: {e}", 500)


@csrf_exempt
def job_detail(request, job_id: int):
    """
    GET /jobs/<id>
    """
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    job = get_object_or_404(
        Job.objects.select_related("location", "cleaner")
        .prefetch_related("checklist_items", "check_events"),
        id=job_id,
    )
    return JsonResponse({"ok": True, "job": _job_to_dict(job)})


@csrf_exempt
def checklist_item_toggle(request, job_id: int, item_id: int):
    """
    POST /jobs/<id>/checklist/<item_id>/toggle
    Body: { "user_id": 10, "is_completed": true/false }
    """
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    try:
        payload = _parse_json_body(request)
        user_id = int(payload["user_id"])
        is_completed = bool(payload.get("is_completed", True))

        job = get_object_or_404(Job, id=job_id)
        user = get_object_or_404(User, id=user_id)

        # только назначенный клинер
        if user.id != job.cleaner_id:
            return _json_error("Forbidden", 403)

        # чеклист можно трогать только когда job в работе
        if job.status != Job.STATUS_IN_PROGRESS:
            return _json_error("Checklist can be updated only when job is in progress", 400)

        item = get_object_or_404(JobChecklistItem, id=item_id, job_id=job_id)
        item.is_completed = is_completed
        item.save(update_fields=["is_completed"])

        return JsonResponse(
            {
                "ok": True,
                "item": {
                    "id": item.id,
                    "job_id": item.job_id,
                    "is_completed": item.is_completed,
                },
            }
        )

    except KeyError as e:
        return _json_error(f"Missing field: {str(e)}", 400)
    except ValidationError as e:
        return _json_error(str(e), 400)
    except Exception as e:
        return _json_error(f"Unexpected error: {e}", 500)


@csrf_exempt
def job_check_in(request, job_id: int):
    """
    POST /jobs/<id>/check-in
    Body: { "user_id": 10, "latitude": 25.2048, "longitude": 55.2708, "distance_m": 12.3 (optional) }
    """
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    try:
        payload = _parse_json_body(request)
        user_id = int(payload["user_id"])
        latitude = payload.get("latitude")
        longitude = payload.get("longitude")

        job = get_object_or_404(Job.objects.select_related("location", "cleaner"), id=job_id)
        user = get_object_or_404(User, id=user_id)

        # MVP-permission: только назначенный клинер
        if user.id != job.cleaner_id:
            return _json_error("Forbidden", 403)

        dist = None
        if latitude is not None and longitude is not None:
            if job.location.latitude is None or job.location.longitude is None:
                return _json_error("Location has no coordinates", 400)

            dist = distance_m(
                latitude,
                longitude,
                job.location.latitude,
                job.location.longitude,
            )

            if dist > 100:
                return _json_error("Too far from location (max 100m)", 403)

        # Меняем статус
        job.check_in()

        # Пишем событие
        JobCheckEvent.objects.create(
            job=job,
            user=user,
            event_type=JobCheckEvent.TYPE_CHECK_IN,
            latitude=latitude,
            longitude=longitude,
            distance_m=dist,
        )

        job = get_object_or_404(
            Job.objects.select_related("location", "cleaner")
            .prefetch_related("checklist_items", "check_events"),
            id=job_id,
        )
        return JsonResponse({"ok": True, "job": _job_to_dict(job)})

    except KeyError as e:
        return _json_error(f"Missing field: {str(e)}", 400)
    except ValidationError as e:
        return _json_error(str(e), 400)
    except Exception as e:
        return _json_error(f"Unexpected error: {e}", 500)


@csrf_exempt
def job_check_out(request, job_id: int):
    """
    POST /jobs/<id>/check-out
    Body: { "user_id": 10, "latitude": ..., "longitude": ..., "distance_m": ... (optional) }
    """
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    try:
        payload = _parse_json_body(request)
        user_id = int(payload["user_id"])
        latitude = payload.get("latitude")
        longitude = payload.get("longitude")

        job = get_object_or_404(
            Job.objects.select_related("location", "cleaner")
            .prefetch_related("checklist_items"),
            id=job_id,
        )
        user = get_object_or_404(User, id=user_id)

        # MVP-permission
        if user.id != job.cleaner_id:
            return _json_error("Forbidden", 403)

        dist = None
        if latitude is not None and longitude is not None:
            if job.location.latitude is None or job.location.longitude is None:
                return _json_error("Location has no coordinates", 400)

            dist = distance_m(
                latitude,
                longitude,
                job.location.latitude,
                job.location.longitude,
            )

            if dist > 100:
                return _json_error("Too far from location (max 100m)", 403)

        # check_out валидирует чеклист
        job.check_out()

        JobCheckEvent.objects.create(
            job=job,
            user=user,
            event_type=JobCheckEvent.TYPE_CHECK_OUT,
            latitude=latitude,
            longitude=longitude,
            distance_m=dist,
        )

        job = get_object_or_404(
            Job.objects.select_related("location", "cleaner")
            .prefetch_related("checklist_items", "check_events"),
            id=job_id,
        )
        return JsonResponse({"ok": True, "job": _job_to_dict(job)})

    except KeyError as e:
        return _json_error(f"Missing field: {str(e)}", 400)
    except ValidationError as e:
        return _json_error(str(e), 400)
    except Exception as e:
        return _json_error(f"Unexpected error: {e}", 500)


@csrf_exempt
def checklist_bulk_update(request, job_id: int):
    """
    POST /jobs/<id>/checklist/bulk
    Body:
    {
      "user_id": 10,
      "items": [
        {"id": 111, "is_completed": true},
        {"id": 112, "is_completed": true}
      ]
    }
    """
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    try:
        payload = _parse_json_body(request)
        user_id = int(payload["user_id"])
        items = payload.get("items", [])

        if not isinstance(items, list) or len(items) == 0:
            return _json_error("items must be a non-empty list", 400)

        job = get_object_or_404(Job, id=job_id)
        user = get_object_or_404(User, id=user_id)

        if user.id != job.cleaner_id:
            return _json_error("Forbidden", 403)

        if job.status != Job.STATUS_IN_PROGRESS:
            return _json_error("Checklist can be updated only when job is in progress", 400)

        ids = []
        updates = {}
        for it in items:
            iid = int(it["id"])
            val = bool(it.get("is_completed", True))
            ids.append(iid)
            updates[iid] = val

        qs = JobChecklistItem.objects.filter(job_id=job_id, id__in=ids)
        found = {obj.id: obj for obj in qs}

        if len(found) != len(set(ids)):
            return _json_error("One or more checklist items not found for this job", 400)

        for iid, obj in found.items():
            obj.is_completed = updates[iid]

        JobChecklistItem.objects.bulk_update(found.values(), ["is_completed"])

        return JsonResponse({"ok": True, "updated_count": len(found)})

    except KeyError as e:
        return _json_error(f"Missing field: {str(e)}", 400)
    except ValidationError as e:
        return _json_error(str(e), 400)
    except Exception as e:
        return _json_error(f"Unexpected error: {e}", 500)
