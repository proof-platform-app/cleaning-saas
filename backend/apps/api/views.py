# backend/apps/api/views.py
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError as DjangoValidationError

from .pdf import generate_job_report_pdf
from django.http import HttpResponse


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

from apps.accounts.models import User
from apps.jobs.models import Job, JobCheckEvent, JobChecklistItem
from apps.jobs.utils import distance_m

from .serializers import (
    JobCheckInSerializer,
    JobDetailSerializer,
    ChecklistToggleSerializer,
    ChecklistBulkUpdateSerializer,
)


class LoginView(APIView):
    """
    MVP Login.
    Авторизация по email + password.
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

        # доменная логика
        job.check_in()

        # audit
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
            return Response({"detail": "Only cleaners can update checklist."}, status=status.HTTP_403_FORBIDDEN)

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

    POST /api/jobs/<job_id>/checklist/bulk/
    Body:
    {
      "items": [
        {"id": 111, "is_completed": true},
        {"id": 112, "is_completed": true}
      ]
    }
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, job_id: int):
        user = request.user

        if user.role != User.ROLE_CLEANER:
            return Response({"detail": "Only cleaners can update checklist."}, status=status.HTTP_403_FORBIDDEN)

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
    
    # backend/apps/api/views.py
class JobPdfReportView(APIView):
    """
    Генерация PDF отчёта по job.

    POST /api/jobs/<id>/report/pdf/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        user = request.user

        if user.role != User.ROLE_CLEANER:
            return Response(
                {"detail": "Only cleaners can generate PDF reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        job = get_object_or_404(
            Job.objects.select_related("location", "cleaner").prefetch_related(
                "checklist_items",
                "check_events",
            ),
            pk=pk,
            cleaner=user,
        )

        pdf_bytes = generate_job_report_pdf(job)

        filename = f"job_report_{job.id}.pdf"
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp

