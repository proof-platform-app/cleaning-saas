# backend/apps/api/views_manager_company.py

import random

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.shortcuts import get_object_or_404

from django.contrib.auth.hashers import make_password

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Company, User
from apps.api.models import AccessAuditLog


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

        # ⛔ Компания заблокирована
        if company.is_blocked():
            code = "trial_expired" if company.is_trial_expired() else "company_blocked"
            if code == "trial_expired":
                detail = (
                    "Your free trial has ended. You can still view existing jobs and "
                    "download reports, but adding new cleaners requires an upgrade."
                )
            else:
                detail = "Your account is currently blocked. Please contact support."

            return Response(
                {"code": code, "detail": detail},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ⛔ Trial-лимит по клинерам
        if company.is_trial_active and company.trial_cleaners_limit_reached():
            return Response(
                {
                    "code": "trial_cleaners_limit_reached",
                    "detail": (
                        "Your free trial allows up to "
                        f"{Company.TRIAL_MAX_CLEANERS} active cleaners. "
                        "Deactivate an existing cleaner or upgrade to add more."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        full_name = request.data.get("full_name")
        email = request.data.get("email")
        phone = request.data.get("phone")
        is_active = request.data.get("is_active", True)
        pin = request.data.get("pin")

        # --- базовая валидация полей ---

        if not full_name:
            return Response(
                {"full_name": ["Full name is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not phone and not email:
            return Response(
                {"detail": "Phone or email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pin_str = (str(pin) or "").strip()
        if not pin_str:
            return Response(
                {"pin": ["PIN is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not pin_str.isdigit() or len(pin_str) != 4:
            return Response(
                {"pin": ["PIN must be exactly 4 digits."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- уникальность телефона / email среди клинеров компании ---

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

        # --- создаём пользователя-клинера ---

        cleaner = User.objects.create_user(
            email=email or None,
            phone=phone or None,
            password=None,  # основной пароль не используем для клинера
            role=User.ROLE_CLEANER,
            company=company,
            full_name=full_name,
            is_active=is_active,
        )

        # сохраняем PIN как хеш
        cleaner.pin_hash = make_password(pin_str)
        cleaner.save(update_fields=["pin_hash"])

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

        # Store old status for audit log
        old_is_active = cleaner.is_active

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

        # Log status change if it changed
        if old_is_active != cleaner.is_active:
            AccessAuditLog.objects.create(
                company=cleaner.company,
                cleaner=cleaner,
                performed_by=request.user,
                action="status_changed",
                metadata={"new_status": cleaner.is_active},
            )

        data = {
            "id": cleaner.id,
            "full_name": cleaner.full_name,
            "email": cleaner.email,
            "phone": cleaner.phone,
            "is_active": cleaner.is_active,
        }
        return Response(data, status=status.HTTP_200_OK)


class ManagerCleanerResetPinView(APIView):
    """
    Сброс PIN для клинера.

    POST /api/manager/cleaners/<id>/reset-pin/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_cleaner(self, request, pk: int):
        user = request.user
        if getattr(user, "role", None) != User.ROLE_MANAGER:
            return None, Response(
                {"detail": "Only managers can reset cleaner PIN."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if company is None:
            return None, Response(
                {"detail": "Company not found for this manager."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            cleaner = User.objects.get(
                pk=pk,
                company=company,
                role=User.ROLE_CLEANER,
            )
        except User.DoesNotExist:
            return None, Response(
                {"detail": "Cleaner not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return cleaner, None

    def post(self, request, pk: int):
        cleaner, error_response = self._get_cleaner(request, pk)
        if error_response is not None:
            return error_response

        # Генерим новый 4-значный PIN
        new_pin = f"{random.randint(0, 9999):04d}"

        # Сохраняем только хеш PIN
        cleaner.pin_hash = make_password(new_pin)
        cleaner.save(update_fields=["pin_hash"])

        data = {
            "id": cleaner.id,
            "full_name": cleaner.full_name,
            "phone": cleaner.phone,
            # ВОЗВРАЩАЕМ PIN только в ответе менеджеру один раз
            "pin": new_pin,
        }
        return Response(data, status=status.HTTP_200_OK)
