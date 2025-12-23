from datetime import date

from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token

from apps.jobs.models import Job
from .serializers import JobSerializer

User = get_user_model()


class LoginView(APIView):
    """
    MVP Login.
    Авторизация по email + password.
    Без authenticate(), напрямую через check_password().
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"detail": "Email and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {"detail": "Wrong password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "User is inactive"},
                status=status.HTTP_403_FORBIDDEN,
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
    Авторизация вручную по заголовку Authorization: Token <key>.
    """

    authentication_classes = []  # не используем встроенную TokenAuthentication
    permission_classes = []

    def get(self, request):
        # 1. Достаём токен из заголовка
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Token "):
            return Response(
                {"detail": "Authorization token required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token_key = auth_header.replace("Token ", "").strip()

        # 2. Находим пользователя по токену
        try:
            token = Token.objects.select_related("user").get(key=token_key)
        except Token.DoesNotExist:
            return Response(
                {"detail": "Invalid token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = token.user

        # 3. Фильтруем задания по этому пользователю и сегодняшней дате
        jobs = (
            Job.objects.filter(
                cleaner=user,
                scheduled_date=date.today(),
            )
            .select_related("company", "location")
            .prefetch_related("checklist_items")
            .order_by("scheduled_start_time", "id")
        )

        serializer = JobSerializer(jobs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
