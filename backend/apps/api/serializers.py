# backend/apps/api/serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.jobs.models import Job, JobChecklistItem, JobCheckEvent
from apps.locations.models import Location, ChecklistTemplate, ChecklistTemplateItem

User = get_user_model()


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
    """
    Job detail для Cleaner (и частично для Mobile).

    Важно:
    - Оставляем location_name для обратной совместимости (старые клиенты).
    - Добавляем вложенный location с координатами для Mobile Navigate.
    """
    location_name = serializers.CharField(source="location.name", read_only=True)
    location = serializers.SerializerMethodField()

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
            "location",
            "manager_notes",
            "cleaner_notes",
            "checklist_items",
            "check_events",
        )

    def get_location(self, obj):
        loc = getattr(obj, "location", None)
        if not loc:
            return None

        return {
            "id": loc.id,
            "name": loc.name,
            "address": getattr(loc, "address", None),
            "latitude": getattr(loc, "latitude", None),
            "longitude": getattr(loc, "longitude", None),
        }


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


class JobPhotoUploadSerializer(serializers.Serializer):
    """
    Upload job photo (before / after).
    На уровне сериализатора принимаем любой файл.
    Валидация "это картинка + EXIF + расстояние" — в доменной логике.
    """
    photo_type = serializers.ChoiceField(choices=["before", "after"])
    file = serializers.FileField()


class JobPhotoSerializer(serializers.Serializer):
    photo_type = serializers.CharField()
    file_url = serializers.CharField()
    latitude = serializers.FloatField(allow_null=True)
    longitude = serializers.FloatField(allow_null=True)
    photo_timestamp = serializers.DateTimeField(allow_null=True)
    created_at = serializers.DateTimeField()


# ==== Manager / Planning serializers ====


class ManagerJobCreateSerializer(serializers.Serializer):
    """
    Payload для создания Job менеджером (Job Planning → Create job).
    """
    scheduled_date = serializers.DateField()
    scheduled_start_time = serializers.TimeField(required=False, allow_null=True)
    scheduled_end_time = serializers.TimeField(required=False, allow_null=True)

    location_id = serializers.IntegerField()
    cleaner_id = serializers.IntegerField()
    checklist_template_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        company = getattr(user, "company", None)

        if not company:
            raise serializers.ValidationError("Manager has no company")

        # location
        try:
            location = Location.objects.get(
                id=attrs["location_id"],
                company=company,
            )
        except Location.DoesNotExist:
            raise serializers.ValidationError({"location_id": "Invalid location"})

        # cleaner
        try:
            cleaner = User.objects.get(
                id=attrs["cleaner_id"],
                company=company,
                role="cleaner",
            )
        except User.DoesNotExist:
            raise serializers.ValidationError({"cleaner_id": "Invalid cleaner"})

        # checklist template (опционально)
        template = None
        template_id = attrs.get("checklist_template_id")
        if template_id:
            try:
                template = ChecklistTemplate.objects.get(
                    id=template_id,
                    company=company,
                )
            except ChecklistTemplate.DoesNotExist:
                raise serializers.ValidationError(
                    {"checklist_template_id": "Invalid checklist template"}
                )

        attrs["_location"] = location
        attrs["_cleaner"] = cleaner
        attrs["_template"] = template
        return attrs

    def create(self, validated_data):
        location = validated_data["_location"]
        cleaner = validated_data["_cleaner"]
        template = validated_data.get("_template")

        job = Job.objects.create(
            company=location.company,
            location=location,
            cleaner=cleaner,
            scheduled_date=validated_data["scheduled_date"],
            scheduled_start_time=validated_data.get("scheduled_start_time"),
            scheduled_end_time=validated_data.get("scheduled_end_time"),
            status="scheduled",
        )

        # Если передан checklist_template_id — создаём JobChecklistItem по TemplateItems.
        if template:
            # предполагаем, что в ChecklistTemplateItem FK называется `template`
            template_items = ChecklistTemplateItem.objects.filter(
                template=template
            ).order_by("order", "id")

            for item in template_items:
                JobChecklistItem.objects.create(
                    job=job,
                    order=getattr(item, "order", 0),
                    text=getattr(item, "text", ""),
                    is_required=getattr(item, "is_required", False),
                    is_completed=False,
                )

        return job


class PlanningJobSerializer(serializers.ModelSerializer):
    """
    Минимальный ответ для Job Planning таблицы после создания job.
    """
    location = serializers.SerializerMethodField()
    cleaner = serializers.SerializerMethodField()
    proof = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            "id",
            "scheduled_date",
            "scheduled_start_time",
            "scheduled_end_time",
            "status",
            "location",
            "cleaner",
            "proof",
        ]

    def get_location(self, obj):
        if not obj.location:
            return None
        return {
            "id": obj.location.id,
            "name": obj.location.name,
            "address": getattr(obj.location, "address", ""),
        }

    def get_cleaner(self, obj):
        if not obj.cleaner:
            return None
        full_name = getattr(obj.cleaner, "full_name", "") or obj.cleaner.email
        return {
            "id": obj.cleaner.id,
            "full_name": full_name,
            "phone": getattr(obj.cleaner, "phone", ""),
        }

    def get_proof(self, obj):
        # Для только что созданной job всё ещё не выполнено.
        return {
            "before_photo": False,
            "after_photo": False,
            "checklist": False,
        }
