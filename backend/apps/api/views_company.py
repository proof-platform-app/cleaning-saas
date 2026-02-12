# backend/apps/api/views_company.py

"""
Company API endpoints — org-scope management.

RBAC: Owner/Manager allowed, Staff/Cleaner → 403 FORBIDDEN
Error format: {code, message, fields?}
"""

import random
import string

from django.contrib.auth.hashers import make_password
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Company, User
from apps.api.models import AccessAuditLog


class CompanyView(APIView):
    """
    Company profile management.

    GET /api/company
    PATCH /api/company
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _ensure_company_admin(self, request):
        """Check if user is Owner or Manager and return company."""
        user = request.user
        role = getattr(user, "role", None)

        # RBAC: only Owner and Manager allowed
        if role not in [User.ROLE_OWNER, User.ROLE_MANAGER]:
            return None, Response(
                {
                    "code": "access_denied",
                    "message": "Company management is restricted to administrators",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if company is None:
            return None, Response(
                {
                    "code": "company_not_found",
                    "message": "Company not found for this user",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return company, None

    def get(self, request):
        """Get company profile."""
        company, error_response = self._ensure_company_admin(request)
        if error_response is not None:
            return error_response

        # Build absolute URL for logo
        logo_url = None
        if company.logo:
            logo_url = request.build_absolute_uri(company.logo.url)

        data = {
            "id": company.id,
            "name": company.name,
            "contact_email": company.contact_email or "",
            "contact_phone": company.contact_phone or "",
            "logo_url": logo_url,
        }
        return Response(data, status=status.HTTP_200_OK)

    def patch(self, request):
        """Update company profile."""
        company, error_response = self._ensure_company_admin(request)
        if error_response is not None:
            return error_response

        # Extract fields
        name = request.data.get("name", company.name)
        contact_email = request.data.get("contact_email", company.contact_email)
        contact_phone = request.data.get("contact_phone", company.contact_phone)

        # Validation
        if name is not None and not str(name).strip():
            return Response(
                {
                    "code": "validation_error",
                    "message": "Company name cannot be empty",
                    "fields": {"name": ["Company name cannot be empty"]},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update company
        company.name = name
        company.contact_email = contact_email
        company.contact_phone = contact_phone
        company.save(update_fields=["name", "contact_email", "contact_phone"])

        # Build absolute URL for logo
        logo_url = None
        if company.logo:
            logo_url = request.build_absolute_uri(company.logo.url)

        data = {
            "id": company.id,
            "name": company.name,
            "contact_email": company.contact_email or "",
            "contact_phone": company.contact_phone or "",
            "logo_url": logo_url,
        }
        return Response(data, status=status.HTTP_200_OK)


class CompanyLogoUploadView(APIView):
    """
    Company logo upload.

    POST /api/company/logo
    multipart/form-data, field "file"
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user
        role = getattr(user, "role", None)

        # RBAC: only Owner and Manager allowed
        if role not in [User.ROLE_OWNER, User.ROLE_MANAGER]:
            return Response(
                {
                    "code": "access_denied",
                    "message": "Logo upload is restricted to administrators",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if company is None:
            return Response(
                {
                    "code": "company_not_found",
                    "message": "Company not found for this user",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {
                    "code": "validation_error",
                    "message": "No file provided",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size (max 2MB)
        MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
        if file_obj.size > MAX_FILE_SIZE:
            return Response(
                {
                    "code": "validation_error",
                    "message": "File size exceeds 2MB limit",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file type
        ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
        if file_obj.content_type not in ALLOWED_TYPES:
            return Response(
                {
                    "code": "validation_error",
                    "message": "Invalid file type. Allowed types: PNG, JPG, JPEG, WEBP",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Save file to ImageField
        company.logo = file_obj
        company.save(update_fields=["logo"])

        # Return URL
        logo_url = request.build_absolute_uri(company.logo.url) if company.logo else None

        return Response({"logo_url": logo_url}, status=status.HTTP_200_OK)


class CompanyCleanersView(APIView):
    """
    Company cleaners list and creation.

    GET  /api/company/cleaners
    POST /api/company/cleaners
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _ensure_company_admin(self, request):
        """Check if user is Owner or Manager and return company."""
        user = request.user
        role = getattr(user, "role", None)

        # RBAC: only Owner and Manager allowed
        if role not in [User.ROLE_OWNER, User.ROLE_MANAGER]:
            return None, Response(
                {
                    "code": "access_denied",
                    "message": "Cleaner management is restricted to administrators",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if company is None:
            return None, Response(
                {
                    "code": "company_not_found",
                    "message": "Company not found for this user",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return company, None

    def get(self, request):
        """Get list of company cleaners."""
        company, error_response = self._ensure_company_admin(request)
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
                    "full_name": cleaner.full_name or "",
                    "email": cleaner.email or "",
                    "phone": cleaner.phone or "",
                    "is_active": cleaner.is_active,
                }
            )
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        """Create new cleaner."""
        company, error_response = self._ensure_company_admin(request)
        if error_response is not None:
            return error_response

        # Check if company is blocked
        if company.is_blocked():
            code = "trial_expired" if company.is_trial_expired() else "company_blocked"
            if code == "trial_expired":
                message = (
                    "Your free trial has ended. You can still view existing jobs and "
                    "download reports, but adding new cleaners requires an upgrade."
                )
            else:
                message = "Your account is currently blocked. Please contact support."

            return Response(
                {"code": code, "message": message},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check trial cleaners limit
        if company.is_trial_active and company.trial_cleaners_limit_reached():
            return Response(
                {
                    "code": "trial_cleaners_limit_reached",
                    "message": (
                        f"Your free trial allows up to {Company.TRIAL_MAX_CLEANERS} active cleaners. "
                        "Deactivate an existing cleaner or upgrade to add more."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Extract fields
        full_name = request.data.get("full_name")
        email = request.data.get("email")
        phone = request.data.get("phone")
        is_active = request.data.get("is_active", True)
        pin = request.data.get("pin")

        # Validation
        errors = {}

        if not full_name:
            errors["full_name"] = ["Full name is required"]

        if not phone and not email:
            return Response(
                {
                    "code": "validation_error",
                    "message": "Phone or email is required",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        pin_str = (str(pin) or "").strip()
        if not pin_str:
            errors["pin"] = ["PIN is required"]
        elif not pin_str.isdigit() or len(pin_str) != 4:
            errors["pin"] = ["PIN must be exactly 4 digits"]

        # Check uniqueness
        qs = User.objects.filter(company=company, role=User.ROLE_CLEANER)

        if email and qs.filter(email__iexact=email).exists():
            errors["email"] = ["Cleaner with this email already exists"]

        if phone and qs.filter(phone=phone).exists():
            errors["phone"] = ["Cleaner with this phone already exists"]

        if errors:
            return Response(
                {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "fields": errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create cleaner
        cleaner = User.objects.create_user(
            email=email or None,
            phone=phone or None,
            password=None,  # PIN-based auth only
            role=User.ROLE_CLEANER,
            company=company,
            full_name=full_name,
            is_active=is_active,
        )

        # Save PIN hash
        cleaner.pin_hash = make_password(pin_str)
        cleaner.save(update_fields=["pin_hash"])

        # Log cleaner creation
        AccessAuditLog.objects.create(
            company=company,
            cleaner=cleaner,
            performed_by=request.user,
            action="cleaner_created",
        )

        data = {
            "id": cleaner.id,
            "full_name": cleaner.full_name or "",
            "email": cleaner.email or "",
            "phone": cleaner.phone or "",
            "is_active": cleaner.is_active,
        }
        return Response(data, status=status.HTTP_201_CREATED)


class CompanyCleanerResetAccessView(APIView):
    """
    Reset cleaner access (generate temporary password).

    POST /api/company/cleaners/{id}/reset-access/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        role = getattr(user, "role", None)

        # RBAC: only Owner and Manager allowed
        if role not in [User.ROLE_OWNER, User.ROLE_MANAGER]:
            return Response(
                {
                    "code": "access_denied",
                    "message": "Access reset is restricted to administrators",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if company is None:
            return Response(
                {
                    "code": "company_not_found",
                    "message": "Company not found for this user",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get cleaner from same company
        cleaner = get_object_or_404(
            User,
            pk=pk,
            company=company,
            role=User.ROLE_CLEANER,
        )

        # Generate temporary 4-digit PIN (consistent with cleaner registration)
        temp_password = "".join(random.choice(string.digits) for _ in range(4))

        # Set password and must_change_password flag
        cleaner.set_password(temp_password)
        cleaner.must_change_password = True
        cleaner.save(update_fields=["password", "must_change_password"])

        # Log password reset
        AccessAuditLog.objects.create(
            company=company,
            cleaner=cleaner,
            performed_by=user,
            action="password_reset",
        )

        return Response(
            {
                "temp_password": temp_password,
                "must_change_password": True,
            },
            status=status.HTTP_200_OK,
        )


class CompanyCleanerAuditLogView(APIView):
    """
    Get audit log for a cleaner (access management history).

    GET /api/company/cleaners/{id}/audit-log/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        role = getattr(user, "role", None)

        # RBAC: only Owner and Manager allowed
        if role not in [User.ROLE_OWNER, User.ROLE_MANAGER]:
            return Response(
                {
                    "code": "access_denied",
                    "message": "Audit log access is restricted to administrators",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        company = getattr(user, "company", None)
        if company is None:
            return Response(
                {
                    "code": "company_not_found",
                    "message": "Company not found for this user",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get cleaner from same company
        cleaner = get_object_or_404(
            User,
            pk=pk,
            company=company,
            role=User.ROLE_CLEANER,
        )

        # Get audit logs for this cleaner
        logs = AccessAuditLog.objects.filter(
            company=company,
            cleaner=cleaner,
        ).select_related("performed_by")

        data = []
        for log in logs:
            performer = log.performed_by.full_name if log.performed_by else "System"
            performer_email = log.performed_by.email if log.performed_by else None

            data.append(
                {
                    "action": log.get_action_display(),
                    "action_code": log.action,
                    "performed_by": performer,
                    "performed_by_email": performer_email,
                    "created_at": log.created_at.isoformat(),
                    "metadata": log.metadata,
                }
            )

        return Response(data, status=status.HTTP_200_OK)
