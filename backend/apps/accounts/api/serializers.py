# apps/accounts/api/serializers.py
from rest_framework import serializers

from apps.accounts.models import Company


class TrialStatusSerializer(serializers.Serializer):
    plan = serializers.CharField()
    trial_started_at = serializers.DateTimeField(allow_null=True)
    trial_expires_at = serializers.DateTimeField(allow_null=True)
    is_trial_active = serializers.BooleanField()
    is_trial_expired = serializers.BooleanField()
    days_left = serializers.IntegerField(allow_null=True)