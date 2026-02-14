# backend/apps/api/serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.jobs.models import Job, JobChecklistItem, JobCheckEvent, JobPhoto
from apps.locations.models import Location, ChecklistTemplate, ChecklistTemplateItem
from apps.marketing.models import ReportEmailLog
from apps.maintenance.models import Asset

User = get_user_model()


def compute_sla_status_for_job(obj) -> str:
    """
    Минимальный SLA-слой:
    - "violated", если нет полного proof
    - иначе "ok"
    """

    # SLA считаем только для завершённых работ
    if getattr(obj, "status", None) != "completed":
        return "ok"

    # Check-in / Check-out
    has_check_in = getattr(obj, "has_check_in", None)
    has_check_out = getattr(obj, "has_check_out", None)

    if has_check_in is None:
        has_check_in = getattr(obj, "actual_start_time", None) is not None
    if has_check_out is None:
        has_check_out = getattr(obj, "actual_end_time", None) is not None

    if not has_check_in or not has_check_out:
        return "violated"

    # Фото before / after
    before_uploaded = getattr(obj, "before_uploaded", None)
    after_uploaded = getattr(obj, "after_uploaded", None)

    if before_uploaded is False or after_uploaded is False:
        return "violated"

    # Чеклист
    checklist_completed = getattr(obj, "checklist_completed", None)

    if checklist_completed is False:
        return "violated"

    if checklist_completed is None:
        qs = JobChecklistItem.objects.filter(job=obj)
        if qs.exists() and qs.filter(is_completed=False).exists():
            return "violated"

    return "ok"


# --- SLA helpers -------------------------------------------------------------


def compute_sla_reasons_for_job(job):
    """
    Возвращает список причин нарушения SLA для конкретной job.

    Кодовые значения:
    - "missing_before_photo"      — нет фото "до"
    - "missing_after_photo"       — нет фото "после"
    - "checklist_not_completed"   — чеклист не полностью закрыт

    Функция не меняет данных в БД, только читает связанные объекты.
    """

    reasons = []

    # Смотрим только завершённые работы — для остальных причин пока нет
    if getattr(job, "status", None) != "completed":
        return reasons

    # 1) Фото "до"
    has_before = JobPhoto.objects.filter(job=job, photo_type="before").exists()
    if not has_before:
        reasons.append("missing_before_photo")

    # 2) Фото "после"
    has_after = JobPhoto.objects.filter(job=job, photo_type="after").exists()
    if not has_after:
        reasons.append("missing_after_photo")

    # 3) Чеклист: обязательные пункты, которые не выполнены
    has_incomplete_required_items = JobChecklistItem.objects.filter(
        job=job,
        is_required=True,
        is_completed=False,
    ).exists()

    if has_incomplete_required_items:
        reasons.append("checklist_not_completed")

    return reasons


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
    """
    location_name = serializers.CharField(source="location.name", read_only=True)
    location = serializers.SerializerMethodField()

    checklist_items = JobChecklistItemSerializer(many=True, read_only=True)
    check_events = JobCheckEventSerializer(many=True, read_only=True)

    sla_status = serializers.SerializerMethodField()

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
            "sla_status",
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

    def get_sla_status(self, obj):
        return compute_sla_status_for_job(obj)


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
    Payload для создания Job менеджером.

    Maintenance Context V1: accepts optional asset_id for service visit tracking.
    """
    scheduled_date = serializers.DateField()
    scheduled_start_time = serializers.TimeField(required=False, allow_null=True)
    scheduled_end_time = serializers.TimeField(required=False, allow_null=True)

    location_id = serializers.IntegerField()
    cleaner_id = serializers.IntegerField()
    checklist_template_id = serializers.IntegerField(required=False, allow_null=True)

    # Maintenance Context V1: optional asset binding
    asset_id = serializers.IntegerField(required=False, allow_null=True)
    manager_notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        company = getattr(user, "company", None)

        if not company:
            raise serializers.ValidationError("Manager has no company")

        try:
            location = Location.objects.get(
                id=attrs["location_id"],
                company=company,
            )
        except Location.DoesNotExist:
            raise serializers.ValidationError({"location_id": "Invalid location"})

        try:
            cleaner = User.objects.get(
                id=attrs["cleaner_id"],
                company=company,
                role="cleaner",
            )
        except User.DoesNotExist:
            raise serializers.ValidationError({"cleaner_id": "Invalid cleaner"})

        # Block assignment of inactive cleaners
        if not cleaner.is_active:
            raise serializers.ValidationError(
                {"cleaner_id": "Cleaner is inactive and cannot be assigned to jobs"}
            )

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

        # Maintenance Context V1: validate asset_id
        asset = None
        asset_id = attrs.get("asset_id")
        if asset_id:
            try:
                asset = Asset.objects.get(
                    id=asset_id,
                    company=company,
                )
            except Asset.DoesNotExist:
                raise serializers.ValidationError({"asset_id": "Invalid asset"})

            # Optional strict: check asset.location matches job location
            if asset.location_id != location.id:
                raise serializers.ValidationError(
                    {"asset_id": "Asset location does not match job location"}
                )

        attrs["_location"] = location
        attrs["_cleaner"] = cleaner
        attrs["_template"] = template
        attrs["_asset"] = asset
        return attrs

    def create(self, validated_data):
        location = validated_data["_location"]
        cleaner = validated_data["_cleaner"]
        template = validated_data.get("_template")
        asset = validated_data.get("_asset")

        job = Job.objects.create(
            company=location.company,
            location=location,
            cleaner=cleaner,
            scheduled_date=validated_data["scheduled_date"],
            scheduled_start_time=validated_data.get("scheduled_start_time"),
            scheduled_end_time=validated_data.get("scheduled_end_time"),
            status="scheduled",
            asset=asset,
            manager_notes=validated_data.get("manager_notes") or "",
        )

        if template:
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

    Maintenance Context V1: includes asset info for service visits.
    """
    location = serializers.SerializerMethodField()
    cleaner = serializers.SerializerMethodField()
    proof = serializers.SerializerMethodField()
    asset = serializers.SerializerMethodField()

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
            "asset",
            "manager_notes",
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
        return {
            "before_photo": False,
            "after_photo": False,
            "checklist": False,
        }

    def get_asset(self, obj):
        """Maintenance Context V1: return asset info if present."""
        asset = getattr(obj, "asset", None)
        if not asset:
            return None
        return {
            "id": asset.id,
            "name": asset.name,
        }


class ManagerViolationJobSerializer(serializers.ModelSerializer):
    """
    Лёгкий ответ для таблицы нарушений SLA.
    Предполагается, что:
    - job.sla_status уже выставлен во вьюхе (через helper)
    - job.sla_reasons уже является списком кодов причин
    """
    location_id = serializers.IntegerField(source="location.id", read_only=True)
    location_name = serializers.CharField(source="location.name", read_only=True)
    cleaner_id = serializers.IntegerField(source="cleaner.id", read_only=True)
    cleaner_name = serializers.CharField(source="cleaner.full_name", read_only=True)

    sla_status = serializers.CharField()
    sla_reasons = serializers.ListField(child=serializers.CharField())

    class Meta:
        model = Job
        fields = [
            "id",
            "scheduled_date",
            "scheduled_start_time",
            "status",
            "location_id",
            "location_name",
            "cleaner_id",
            "cleaner_name",
            "sla_status",
            "sla_reasons",
        ]
class ReportEmailLogSerializer(serializers.ModelSerializer):
    """
    Лёгкий сериализатор для таблицы email-логов в разделе Reports.

    company_id оставляем как есть (это просто int, без FK),
    а по user отдаём небольшой объект с id + name.
    """

    sent_by = serializers.SerializerMethodField()

    class Meta:
        model = ReportEmailLog
        fields = [
            "id",
            "created_at",
            "kind",
            "status",
            "job_id",
            "period_from",
            "period_to",
            "to_email",
            "subject",
            "company_id",
            "sent_by",
        ]

    def get_sent_by(self, obj):
        user = getattr(obj, "user", None)
        if not user:
            return None

        full_name = getattr(user, "full_name", None) or getattr(user, "email", None)
        return {
            "id": user.id,
            "full_name": full_name,
        }
