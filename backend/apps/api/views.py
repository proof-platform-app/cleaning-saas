from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

from apps.accounts.models import User
from apps.jobs.models import Job

from apps.jobs.utils import distance_m


class LoginView(APIView):
    """
    MVP Login.
    Авторизация по email + password.
    """

    authentication_classes = []  # без DRF-авторизации
    permission_classes = []      # доступен всем

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""

        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ищем активного клинера по email
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

        # Проверяем пароль
        if not user.check_password(password):
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Создаём или берём токен
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


class JobCheckInView(APIView):
    """
    Check-in клинера на задачу.

    POST /api/jobs/<id>/check-in/
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

        if job.status != "scheduled":
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

        distance = distance_m(
            lat,
            lon,
            location.latitude,
            location.longitude,
        )

        if distance > 100:
            return Response(
                {
                    "detail": "Too far from job location.",
                    "distance_m": round(distance, 2),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        job.actual_start_time = timezone.now()
        job.status = "in_progress"
        job.save(update_fields=["actual_start_time", "status"])

        return Response(
            {
                "detail": "Check-in successful.",
                "job_id": job.id,
                "job_status": job.status,
            },
            status=status.HTTP_200_OK,
        )
