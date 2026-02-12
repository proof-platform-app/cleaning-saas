# apps/accounts/api/views_settings.py
"""
Settings API views for Account and Billing (MVP v1.1)
"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.accounts.models import Company
from .serializers import (
    CurrentUserSerializer,
    UpdateProfileSerializer,
    ChangePasswordSerializer,
    NotificationPreferencesSerializer,
    BillingSummarySerializer,
)

User = get_user_model()


class CurrentUserView(APIView):
    """
    GET /api/me - Get current authenticated user
    PATCH /api/me - Update current user profile
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = CurrentUserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UpdateProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save(updated_at=timezone.now())
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UpdateProfileView(APIView):
    """
    DEPRECATED: Use CurrentUserView instead
    PATCH /api/me - Update current user profile
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = UpdateProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save(updated_at=timezone.now())
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """
    POST /api/me/change-password - Change user password
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        # Check if user is SSO
        if user.auth_type == User.AUTH_TYPE_SSO:
            return Response(
                {"detail": "Password change not allowed for SSO users"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ChangePasswordSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Verify current password
        if not user.check_password(serializer.validated_data['current_password']):
            return Response(
                {"current_password": ["Current password is incorrect"]},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set new password
        user.set_password(serializer.validated_data['new_password'])
        user.updated_at = timezone.now()
        user.save(update_fields=['password', 'updated_at'])

        return Response(
            {"detail": "Password updated successfully"},
            status=status.HTTP_200_OK
        )


class NotificationPreferencesView(APIView):
    """
    GET/PATCH /api/me/notification-preferences - Manage notification settings
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        prefs = request.user.get_notification_preferences()
        serializer = NotificationPreferencesSerializer(prefs)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = NotificationPreferencesSerializer(data=request.data, partial=True)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Update preferences
        request.user.update_notification_preferences(**serializer.validated_data)

        # Return updated preferences
        updated_prefs = request.user.get_notification_preferences()
        response_serializer = NotificationPreferencesSerializer(updated_prefs)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class BillingSummaryView(APIView):
    """
    GET /api/settings/billing - Get billing summary
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.role

        # RBAC: Staff users cannot access billing
        if role == User.ROLE_STAFF or role == User.ROLE_CLEANER:
            return Response(
                {"detail": "Billing access restricted to administrators"},
                status=status.HTTP_403_FORBIDDEN
            )

        company: Company = user.company

        # Determine if user can manage billing
        can_manage = role == User.ROLE_OWNER

        # Plan status
        plan_status = "active"
        if company.plan == Company.PLAN_TRIAL:
            if company.is_trial_active:
                plan_status = "trial"
            elif company.is_trial_expired():
                plan_status = "past_due"
        elif company.plan == Company.PLAN_BLOCKED:
            plan_status = "cancelled"

        # Usage summary
        from apps.jobs.models import Job

        # Count active users (managers/staff, excluding cleaners)
        users_count = User.objects.filter(
            company=company,
            is_active=True,
            role__in=[User.ROLE_OWNER, User.ROLE_MANAGER, User.ROLE_STAFF]
        ).count()

        # Count locations
        from apps.locations.models import Location
        locations_count = Location.objects.filter(company=company).count()

        # Count jobs this month
        now = timezone.now()
        first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        jobs_month_count = Job.objects.filter(
            company=company,
            created_at__gte=first_day_of_month
        ).count()

        # For trial, use hard limits; for active, use null (unlimited)
        users_limit = 10 if company.is_trial else None
        locations_limit = 30 if company.is_trial else None
        jobs_limit = 200 if company.is_trial else None

        usage_summary = {
            "users_count": users_count,
            "users_limit": users_limit,
            "locations_count": locations_count,
            "locations_limit": locations_limit,
            "jobs_month_count": jobs_month_count,
            "jobs_month_limit": jobs_limit,
        }

        # Payment method (mock for MVP)
        payment_method = None
        if company.plan == Company.PLAN_ACTIVE:
            payment_method = {
                "exists": True,
                "brand": "Visa",
                "last4": "4242",
                "exp_month": 12,
                "exp_year": 2026,
            }

        # Invoices (empty for MVP)
        invoices = []

        data = {
            "can_manage": can_manage,
            "plan": company.plan,
            "status": plan_status,
            "trial_expires_at": company.trial_expires_at,
            "next_billing_date": None,  # TODO: Add when real billing is implemented
            "usage_summary": usage_summary,
            "payment_method": payment_method,
            "invoices": invoices,
        }

        serializer = BillingSummarySerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class InvoiceDownloadView(APIView):
    """
    GET /api/settings/billing/invoices/:id/download - Download invoice PDF
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, invoice_id):
        user = request.user
        role = user.role

        # RBAC: Staff users cannot access billing
        if role == User.ROLE_STAFF or role == User.ROLE_CLEANER:
            return Response(
                {"detail": "Billing access restricted to administrators"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Not implemented yet (no Stripe integration)
        return Response(
            {"detail": "Invoice download not available yet. This feature requires payment processor integration."},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )
