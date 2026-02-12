# backend/apps/api/views_auth.py

from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Company, User


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
                role__in=[User.ROLE_OWNER, User.ROLE_MANAGER, User.ROLE_STAFF],
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
