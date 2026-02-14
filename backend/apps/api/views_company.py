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

# Console roles that can access the manager dashboard
CONSOLE_ROLES = {User.ROLE_OWNER, User.ROLE_MANAGER, User.ROLE_STAFF}

# Roles that can be invited (Owner is assigned on signup, cannot be invited)
INVITABLE_ROLES = {User.ROLE_MANAGER, User.ROLE_STAFF}


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


class CompanyUsersView(APIView):
    """
    Console users (team members) management.

    GET  /api/company/users/     - List all console users (owner, manager, staff)
    POST /api/company/users/     - Invite new user (manager or staff only)

    RBAC: Owner/Manager can view, only Owner can invite
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _ensure_company_admin(self, request):
        """Check if user is Owner or Manager and return company."""
        user = request.user
        role = getattr(user, "role", None)

        if role not in [User.ROLE_OWNER, User.ROLE_MANAGER]:
            return None, Response(
                {
                    "code": "access_denied",
                    "message": "Team management is restricted to administrators",
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
        """Get list of console users (owner, manager, staff)."""
        company, error_response = self._ensure_company_admin(request)
        if error_response is not None:
            return error_response

        users = (
            User.objects.filter(company=company, role__in=CONSOLE_ROLES)
            .order_by("role", "full_name", "id")
        )

        data = []
        for user in users:
            data.append(
                {
                    "id": user.id,
                    "full_name": user.full_name or "",
                    "email": user.email or "",
                    "phone": user.phone or "",
                    "role": user.role,
                    "is_active": user.is_active,
                    "is_current_user": user.id == request.user.id,
                }
            )
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        """Invite new console user (manager or staff)."""
        company, error_response = self._ensure_company_admin(request)
        if error_response is not None:
            return error_response

        # Only Owner can invite new users
        if request.user.role != User.ROLE_OWNER:
            return Response(
                {
                    "code": "access_denied",
                    "message": "Only account owner can invite new team members",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Extract fields
        full_name = (request.data.get("full_name") or "").strip()
        email = (request.data.get("email") or "").strip().lower()
        role = (request.data.get("role") or "").strip()

        # Validation
        errors = {}

        if not full_name:
            errors["full_name"] = ["Full name is required"]

        if not email:
            errors["email"] = ["Email is required"]
        elif "@" not in email:
            errors["email"] = ["Invalid email format"]

        if not role:
            errors["role"] = ["Role is required"]
        elif role not in INVITABLE_ROLES:
            errors["role"] = [f"Invalid role. Must be one of: {', '.join(INVITABLE_ROLES)}"]

        # Check email uniqueness (across all console users in all companies)
        if email and User.objects.filter(
            email__iexact=email,
            role__in=CONSOLE_ROLES,
        ).exists():
            errors["email"] = ["A user with this email already exists"]

        if errors:
            return Response(
                {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "fields": errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate temporary password (8 chars: letters + digits)
        temp_password = "".join(
            random.choice(string.ascii_letters + string.digits) for _ in range(8)
        )

        # Create user
        new_user = User.objects.create(
            email=email,
            full_name=full_name,
            role=role,
            company=company,
            is_active=True,
        )
        new_user.set_password(temp_password)
        new_user.must_change_password = True
        new_user.save(update_fields=["password", "must_change_password"])

        data = {
            "id": new_user.id,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "role": new_user.role,
            "is_active": new_user.is_active,
            "temp_password": temp_password,
        }
        return Response(data, status=status.HTTP_201_CREATED)


class CompanyUserDetailView(APIView):
    """
    Individual console user management.

    GET    /api/company/users/{id}/  - Get user details
    PATCH  /api/company/users/{id}/  - Update user (role, is_active)
    DELETE /api/company/users/{id}/  - Remove user from company

    RBAC:
    - GET: Owner/Manager can view
    - PATCH/DELETE: Only Owner can modify (except can't modify themselves or other owners)
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _ensure_company_admin(self, request):
        """Check if user is Owner or Manager and return company."""
        user = request.user
        role = getattr(user, "role", None)

        if role not in [User.ROLE_OWNER, User.ROLE_MANAGER]:
            return None, Response(
                {
                    "code": "access_denied",
                    "message": "Team management is restricted to administrators",
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

    def get(self, request, pk):
        """Get user details."""
        company, error_response = self._ensure_company_admin(request)
        if error_response is not None:
            return error_response

        target_user = get_object_or_404(
            User,
            pk=pk,
            company=company,
            role__in=CONSOLE_ROLES,
        )

        data = {
            "id": target_user.id,
            "full_name": target_user.full_name or "",
            "email": target_user.email or "",
            "phone": target_user.phone or "",
            "role": target_user.role,
            "is_active": target_user.is_active,
            "is_current_user": target_user.id == request.user.id,
        }
        return Response(data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        """Update user (role, is_active)."""
        company, error_response = self._ensure_company_admin(request)
        if error_response is not None:
            return error_response

        # Only Owner can modify users
        if request.user.role != User.ROLE_OWNER:
            return Response(
                {
                    "code": "access_denied",
                    "message": "Only account owner can modify team members",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        target_user = get_object_or_404(
            User,
            pk=pk,
            company=company,
            role__in=CONSOLE_ROLES,
        )

        # Can't modify Owner role
        if target_user.role == User.ROLE_OWNER:
            return Response(
                {
                    "code": "access_denied",
                    "message": "Cannot modify account owner",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Can't modify yourself
        if target_user.id == request.user.id:
            return Response(
                {
                    "code": "access_denied",
                    "message": "Cannot modify your own account here. Use Account Settings.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Extract fields
        update_fields = []

        if "role" in request.data:
            new_role = request.data["role"]
            if new_role not in INVITABLE_ROLES:
                return Response(
                    {
                        "code": "validation_error",
                        "message": f"Invalid role. Must be one of: {', '.join(INVITABLE_ROLES)}",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            target_user.role = new_role
            update_fields.append("role")

        if "is_active" in request.data:
            target_user.is_active = bool(request.data["is_active"])
            update_fields.append("is_active")

        if "full_name" in request.data:
            target_user.full_name = request.data["full_name"]
            update_fields.append("full_name")

        if update_fields:
            target_user.save(update_fields=update_fields)

        data = {
            "id": target_user.id,
            "full_name": target_user.full_name or "",
            "email": target_user.email or "",
            "phone": target_user.phone or "",
            "role": target_user.role,
            "is_active": target_user.is_active,
        }
        return Response(data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        """Remove user from company (deactivate, not delete)."""
        company, error_response = self._ensure_company_admin(request)
        if error_response is not None:
            return error_response

        # Only Owner can remove users
        if request.user.role != User.ROLE_OWNER:
            return Response(
                {
                    "code": "access_denied",
                    "message": "Only account owner can remove team members",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        target_user = get_object_or_404(
            User,
            pk=pk,
            company=company,
            role__in=CONSOLE_ROLES,
        )

        # Can't remove Owner
        if target_user.role == User.ROLE_OWNER:
            return Response(
                {
                    "code": "access_denied",
                    "message": "Cannot remove account owner",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Can't remove yourself
        if target_user.id == request.user.id:
            return Response(
                {
                    "code": "access_denied",
                    "message": "Cannot remove yourself from the team",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Deactivate user (don't delete to preserve audit trail)
        target_user.is_active = False
        target_user.save(update_fields=["is_active"])

        return Response(status=status.HTTP_204_NO_CONTENT)


class CompanyUserResetPasswordView(APIView):
    """
    Reset password for a console user.

    POST /api/company/users/{id}/reset-password/

    RBAC: Only Owner can reset passwords
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        role = getattr(user, "role", None)

        # Only Owner can reset passwords
        if role != User.ROLE_OWNER:
            return Response(
                {
                    "code": "access_denied",
                    "message": "Only account owner can reset passwords",
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

        # Get user from same company
        target_user = get_object_or_404(
            User,
            pk=pk,
            company=company,
            role__in=CONSOLE_ROLES,
        )

        # Can't reset Owner password (they should use "forgot password")
        if target_user.role == User.ROLE_OWNER:
            return Response(
                {
                    "code": "access_denied",
                    "message": "Cannot reset owner password. Use 'Forgot Password' instead.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Generate temporary password
        temp_password = "".join(
            random.choice(string.ascii_letters + string.digits) for _ in range(8)
        )

        # Set password and must_change_password flag
        target_user.set_password(temp_password)
        target_user.must_change_password = True
        target_user.save(update_fields=["password", "must_change_password"])

        return Response(
            {
                "temp_password": temp_password,
                "must_change_password": True,
            },
            status=status.HTTP_200_OK,
        )
