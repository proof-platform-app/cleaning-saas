from rest_framework import serializers

from apps.jobs.models import Job, JobChecklistItem


class JobChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobChecklistItem
        fields = [
            "id",
            "order",
            "text",
            "is_required",
            "is_completed",
            "completed_at",
            "notes",
        ]


class JobSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source="location.name", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)
    checklist_items = JobChecklistItemSerializer(many=True, read_only=True)

    class Meta:
        model = Job
        fields = [
            "id",
            "company_name",
            "location_name",
            "scheduled_date",
            "scheduled_start_time",
            "scheduled_end_time",
            "status",
            "actual_start_time",
            "actual_end_time",
            "manager_notes",
            "cleaner_notes",
            "checklist_items",
        ]
