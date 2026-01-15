# backend/apps/api/views.py
import os
import uuid

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.jobs.models import File, Job, JobCheckEvent, JobChecklistItem, JobPhoto
from apps.jobs.utils import distance_m, extract_exif_data

from .pdf import generate_job_report_pdf
from .serializers import (
    ChecklistBulkUpdateSerializer,
    ChecklistToggleSerializer,
    JobCheckInSerializer,
    JobChecklistItemSerializer,
    JobCheckEventSerializer,
    JobDetailSerializer,
    JobPhotoUploadSerializer,
)


class LoginView(APIView):
    """
    MVP Login.
    Авторизация по email + password (cleaner).
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
                role=User.ROLE_CLEANER,
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


class ManagerLoginView(APIView):
    """
    Login для менеджера (web-dashboard).
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


class TodayJobsView(APIView):
    """
    Список задач клинера на сегодня.
    Требует токен (Authorization: Token <ключ>)
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
    Job details для клинера (данные для страницы Job Details в lovable).

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
            ),
            pk=pk,
            cleaner=user,
        )

        return Response(JobDetailSerializer(job).data, status=status.HTTP_200_OK)


class JobCheckInView(APIView):
    """
    Check-in клинера на задачу.

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
                {"detail": "Check-in allowed only for scheduled jobs."},
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
            {"detail": "Check-in successful.", "job_id": job.id, "job_status": job.status},
            status=status.HTTP_200_OK,
        )


class JobCheckOutView(APIView):
    """
    Check-out клинера с задачи.

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
                {"detail": "Check-out allowed only for in_progress jobs."},
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
            {"detail": "Check-out successful.", "job_id": job.id, "job_status": job.status},
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
    Генерация PDF отчёта по job.

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

        photos = JobPhoto.objects.filter(job=job).select_related("file").order_by("photo_type", "id")

        data = []
        for p in photos:
            data.append(
                {
                    "photo_type": p.photo_type,
                    "file_url": p.file.file_url,
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

        job = get_object_or_404(Job.objects.select_related("location"), pk=pk, cleaner=user)

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
            if not JobPhoto.objects.filter(job=job, photo_type=JobPhoto.TYPE_BEFORE).exists():
                return Response(
                    {"detail": "Cannot upload after photo before before photo."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # one photo per type
        if JobPhoto.objects.filter(job=job, photo_type=photo_type).exists():
            return Response(
                {"detail": f"{photo_type} photo already exists for this job."},
                status=status.HTTP_409_CONFLICT,
            )

        # EXIF + валидация
        exif_lat, exif_lon, exif_dt, exif_missing = extract_exif_data(uploaded)

        loc = job.location
        if exif_lat is not None and exif_lon is not None:
            if loc.latitude is not None and loc.longitude is not None:
                dist = distance_m(exif_lat, exif_lon, loc.latitude, loc.longitude)
                if dist > 100:
                    return Response(
                        {"detail": "Photo too far from job location.", "distance_m": round(dist, 2)},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        ext = os.path.splitext(uploaded.name or "")[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            ext = ".jpg"

        key = f"company/{job.company_id}/jobs/{job.id}/photos/{photo_type}/{uuid.uuid4().hex}{ext}"

        try:
            uploaded.seek(0)
        except Exception:
            pass

        saved_path = default_storage.save(key, ContentFile(uploaded.read()))
        file_url = default_storage.url(saved_path)

        db_file = File.objects.create(
            file_url=file_url,
            original_name=uploaded.name or "",
            content_type=getattr(uploaded, "content_type", "") or "",
            size_bytes=getattr(uploaded, "size", None),
        )

        job_photo = JobPhoto.objects.create(
            job=job,
            file=db_file,
            photo_type=photo_type,
            latitude=exif_lat,
            longitude=exif_lon,
            photo_timestamp=exif_dt,
        )

        out = {
            "photo_type": job_photo.photo_type,
            "file_url": db_file.file_url,
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

        # Нельзя удалять BEFORE, если есть AFTER
        if photo_type == JobPhoto.TYPE_BEFORE and JobPhoto.objects.filter(
            job=job,
            photo_type=JobPhoto.TYPE_AFTER,
        ).exists():
            return Response(
                {"detail": "Cannot delete before photo while after photo exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            photo = JobPhoto.objects.select_related("file").get(job=job, photo_type=photo_type)
        except JobPhoto.DoesNotExist:
            return Response({"detail": "Photo not found."}, status=status.HTTP_404_NOT_FOUND)

        file_obj = photo.file
        storage_path = None
        if file_obj and file_obj.file_url:
            # dev: /media/<path>
            prefix = "/media/"
            if file_obj.file_url.startswith(prefix):
                storage_path = file_obj.file_url[len(prefix) :]

        # сначала удаляем JobPhoto, затем File
        photo.delete()
        if file_obj:
            file_obj.delete()

        if storage_path:
            try:
                default_storage.delete(storage_path)
            except Exception:
                # best-effort — не рвём запрос, если файл не удалился
                pass

        return Response(status=status.HTTP_204_NO_CONTENT)


class ManagerJobsTodayView(APIView):
    """
    Today's jobs для менеджера (dashboard).

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
            photos_data.append(
                {
                    "photo_type": p.photo_type,
                    "file_url": p.file.file_url,
                    "latitude": p.latitude,
                    "longitude": p.longitude,
                    "photo_timestamp": p.photo_timestamp,
                    "created_at": p.created_at,
                }
            )

        checklist_data = JobChecklistItemSerializer(job.checklist_items.all(), many=True).data
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
