# backend/apps/api/serializers.py
from rest_framework import serializers

from apps.jobs.models import Job, JobChecklistItem, JobCheckEvent


class JobCheckInSerializer(serializers.Serializer):
    """
    Сериализатор для check-in / check-out клинера.
    Принимаем только координаты.
    """
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()


class JobChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobChecklistItem
        fields = (
            "id",
            "order",
            "text",
            "is_required",
            "is_completed",
        )


class JobCheckEventSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = JobCheckEvent
        fields = (
            "id",
            "event_type",
            "created_at",
            "latitude",
            "longitude",
            "distance_m",
            "user_name",
        )


class JobDetailSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source="location.name", read_only=True)
    checklist_items = JobChecklistItemSerializer(many=True, read_only=True)
    check_events = JobCheckEventSerializer(many=True, read_only=True)

    class Meta:
        model = Job
        fields = (
            "id",
            "status",
            "scheduled_date",
            "scheduled_start_time",
            "scheduled_end_time",
            "actual_start_time",
            "actual_end_time",
            "location_name",
            "manager_notes",
            "cleaner_notes",
            "checklist_items",
            "check_events",
        )


class ChecklistToggleSerializer(serializers.Serializer):
    """
    POST body для toggle.
    """
    is_completed = serializers.BooleanField(required=False, default=True)


class ChecklistBulkItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    is_completed = serializers.BooleanField(required=False, default=True)


class ChecklistBulkUpdateSerializer(serializers.Serializer):
    items = ChecklistBulkItemSerializer(many=True)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("items must be a non-empty list")
        return items
