# apps/accounts/api/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model

from apps.accounts.models import Company

User = get_user_model()


class TrialStatusSerializer(serializers.Serializer):
    plan = serializers.CharField()
    trial_started_at = serializers.DateTimeField(allow_null=True)
    trial_expires_at = serializers.DateTimeField(allow_null=True)
    is_trial_active = serializers.BooleanField()
    is_trial_expired = serializers.BooleanField()
    days_left = serializers.IntegerField(allow_null=True)


class CurrentUserSerializer(serializers.ModelSerializer):
    """
    Serializer for current user (GET /api/me)
    """
    role = serializers.CharField(read_only=True)
    company_id = serializers.IntegerField(source='company.id', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'full_name',
            'email',
            'phone',
            'auth_type',
            'role',
            'company_id',
        ]
        read_only_fields = ['id', 'auth_type', 'role', 'company_id']


class UpdateProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile (PATCH /api/me)
    """
    class Meta:
        model = User
        fields = ['full_name', 'email', 'phone']

    def validate_full_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Full name must be at least 2 characters")
        if len(value) > 100:
            raise serializers.ValidationError("Full name must be less than 100 characters")
        return value.strip()

    def validate_phone(self, value):
        if value and len(value.strip()) < 10:
            raise serializers.ValidationError("Please enter a valid phone number")
        return value

    def validate_email(self, value):
        # Check if user is SSO and trying to change email
        user = self.instance
        if user and user.auth_type == User.AUTH_TYPE_SSO and user.email != value:
            raise serializers.ValidationError("Email cannot be changed for SSO users")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change (POST /api/me/change-password)
    """
    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)

    def validate_new_password(self, value):
        # Check password strength
        if len(value) < 8:
            raise serializers.ValidationError(
                "Password must be at least 8 characters with uppercase, lowercase, number, and special character"
            )

        has_upper = any(c.isupper() for c in value)
        has_lower = any(c.islower() for c in value)
        has_digit = any(c.isdigit() for c in value)
        has_special = any(not c.isalnum() for c in value)

        if not (has_upper and has_lower and has_digit and has_special):
            raise serializers.ValidationError(
                "Password must contain uppercase, lowercase, number, and special character"
            )

        return value


class NotificationPreferencesSerializer(serializers.Serializer):
    """
    Serializer for notification preferences (GET/PATCH /api/me/notification-preferences)
    """
    email_notifications = serializers.BooleanField(default=True)
    job_assignment_alerts = serializers.BooleanField(default=True)
    weekly_summary = serializers.BooleanField(default=False)


class BillingSummarySerializer(serializers.Serializer):
    """
    Serializer for billing summary (GET /api/settings/billing)
    """
    # Metadata
    can_manage = serializers.BooleanField()

    # Plan info
    plan = serializers.CharField()
    status = serializers.CharField()
    trial_expires_at = serializers.DateTimeField(allow_null=True)
    next_billing_date = serializers.DateTimeField(allow_null=True)

    # Usage summary
    usage_summary = serializers.DictField()

    # Payment method
    payment_method = serializers.DictField(allow_null=True)

    # Invoices
    invoices = serializers.ListField()