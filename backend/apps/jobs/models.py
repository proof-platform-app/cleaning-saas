# backend/apps/jobs/models.py
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from apps.accounts.models import Company, User
from apps.locations.models import Location, ChecklistTemplate
# Note: Asset import deferred to avoid circular import - see asset FK below


class Job(models.Model):
    """
    Уборка на конкретной локации, в конкретный день, за конкретным клинером.

    Context field determines which product context this job belongs to:
    - "cleaning": Standard cleaning jobs (CleanProof)
    - "maintenance": Service visits (MaintainProof)
    """

    # Context choices - determines which product this job belongs to
    CONTEXT_CLEANING = "cleaning"
    CONTEXT_MAINTENANCE = "maintenance"

    CONTEXT_CHOICES = [
        (CONTEXT_CLEANING, "Cleaning"),
        (CONTEXT_MAINTENANCE, "Maintenance"),
    ]

    STATUS_SCHEDULED = "scheduled"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_COMPLETED_UNVERIFIED = "completed_unverified"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_IN_PROGRESS, "In progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_COMPLETED_UNVERIFIED, "Completed (Unverified)"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    # Priority choices (Stage 4: SLA & Priority Layer)
    PRIORITY_LOW = "low"
    PRIORITY_MEDIUM = "medium"
    PRIORITY_HIGH = "high"

    PRIORITY_CHOICES = [
        (PRIORITY_LOW, "Low"),
        (PRIORITY_MEDIUM, "Medium"),
        (PRIORITY_HIGH, "High"),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="jobs",
    )

    # Context separation: cleaning vs maintenance
    # IMPORTANT: Context separation MUST NOT rely on asset nullability
    context = models.CharField(
        max_length=32,
        choices=CONTEXT_CHOICES,
        default=CONTEXT_CLEANING,
        db_index=True,
        help_text="Product context: cleaning (CleanProof) or maintenance (MaintainProof)",
    )

    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="jobs",
    )

    cleaner = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="jobs",
    )

    checklist_template = models.ForeignKey(
        ChecklistTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
    )

    # Maintenance Context V1: optional asset link for service visits
    # See: docs/product/MAINTENANCE_CONTEXT_V1_SCOPE.md Section 4.2
    asset = models.ForeignKey(
        "apps_maintenance.Asset",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
        help_text="Optional link to asset for maintenance service visits",
    )

    # Maintenance Context V1: optional category for service visits
    maintenance_category = models.ForeignKey(
        "apps_maintenance.MaintenanceCategory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
        help_text="Optional category for maintenance service visits (e.g., Preventive, Corrective)",
    )

    # Stage 4: Priority & SLA Layer
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default=PRIORITY_LOW,
        db_index=True,
        help_text="Priority level: low, medium, high",
    )
    sla_deadline = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Deadline for SLA compliance. Visual timer shows time remaining.",
    )

    scheduled_date = models.DateField()
    scheduled_start_time = models.TimeField(null=True, blank=True)
    scheduled_end_time = models.TimeField(null=True, blank=True)

    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_SCHEDULED,
    )

    manager_notes = models.TextField(blank=True)
    cleaner_notes = models.TextField(blank=True)

    # Force-complete audit fields (AUDIT FIX: Critical Risk #4)
    verification_override = models.BooleanField(
        default=False,
        help_text="True if job was force-completed without full proof verification",
    )
    force_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when manager force-completed this job",
    )
    force_completed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="force_completed_jobs",
        help_text="Manager who force-completed this job",
    )
    force_complete_reason = models.TextField(
        blank=True,
        help_text="Reason provided by manager for force-completing this job",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "jobs"

    def __str__(self) -> str:
        return f"Job #{self.id} – {self.location} – {self.scheduled_date}"

    def clean(self):
        # AUDIT FIX: Medium Risk #11 - validate scheduled_end_time
        if self.scheduled_start_time and self.scheduled_end_time:
            if self.scheduled_end_time <= self.scheduled_start_time:
                raise ValidationError(
                    {"scheduled_end_time": "scheduled_end_time must be after scheduled_start_time"}
                )

        # Шаблон чеклиста должен быть из той же компании, что и job
        if self.checklist_template and self.company_id:
            if self.checklist_template.company_id != self.company_id:
                raise ValidationError("Checklist template must belong to the same company as the job")

    def _get_template_items_qs(self):
        """
        Пытаемся найти связанные пункты шаблона чеклиста, не зная точный related_name.
        Поддерживаем несколько вариантов, чтобы не утыкаться в странный related_name.
        """
        template = self.checklist_template
        if template is None:
            return None

        # самые вероятные варианты
        candidates = [
            "items",
            "template_items",
            "checklist_items",
            "checklisttemplateitem_set",
        ]

        for attr in candidates:
            if hasattr(template, attr):
                qs = getattr(template, attr)
                try:
                    # manager / related manager
                    return qs.all()
                except Exception:
                    continue

        print(f"[Job.save] No related items manager found on ChecklistTemplate(id={template.id})")
        return None

    def save(self, *args, **kwargs):
        """
        ВАЖНО для MVP:
        - Django admin создаёт Job через обычный save()
        - create_with_checklist() может не использоваться
        Поэтому: если у Job есть checklist_template и нет checklist_items,
        автоматически делаем snapshot в JobChecklistItem.
        """
        is_new = self.pk is None

        super().save(*args, **kwargs)

        # Если шаблон не задан — нечего снимать
        if not self.checklist_template_id:
            return

        # Уже есть checklist_items — ничего не делаем
        if self.checklist_items.exists():
            return

        # На всякий случай ещё раз проверим company
        if self.company_id and self.checklist_template.company_id != self.company_id:
            print(
                f"[Job.save] ChecklistTemplate(id={self.checklist_template_id}) "
                f"company mismatch for Job(id={self.id})"
            )
            return

        items_qs = self._get_template_items_qs()
        if items_qs is None:
            print(f"[Job.save] No template items for checklist_template={self.checklist_template_id}")
            return

        with transaction.atomic():
            created_count = 0
            for item in items_qs:
                order_val = getattr(item, "order", None)
                if order_val is None:
                    order_val = getattr(item, "order_index", 1)

                is_required_val = getattr(item, "is_required", True)

                JobChecklistItem.objects.create(
                    job=self,
                    order=int(order_val),
                    text=item.text,
                    is_required=bool(is_required_val),
                )
                created_count += 1

        print(
            f"[Job.save] Created {created_count} checklist items for Job(id={self.id}), "
            f"template={self.checklist_template_id}"
        )

    @classmethod
    def create_with_checklist(
        cls,
        *,
        company: Company,
        location: Location,
        cleaner: User,
        scheduled_date,
        scheduled_start_time=None,
        scheduled_end_time=None,
        checklist_template: ChecklistTemplate | None = None,
        manager_notes: str = "",
    ) -> "Job":
        """
        Создаёт Job и копирует пункты checklist_template в JobChecklistItem.
        Теперь snapshot гарантирован в save(), но метод оставляем
        для явного использования из API/сервисов.
        """
        with transaction.atomic():
            job = cls.objects.create(
                company=company,
                location=location,
                cleaner=cleaner,
                checklist_template=checklist_template,
                scheduled_date=scheduled_date,
                scheduled_start_time=scheduled_start_time,
                scheduled_end_time=scheduled_end_time,
                manager_notes=manager_notes,
            )
            return job

    def check_in(self):
        if self.status != self.STATUS_SCHEDULED:
            raise ValidationError("Job is not in scheduled state")

        self.status = self.STATUS_IN_PROGRESS
        self.actual_start_time = timezone.now()
        self.save(update_fields=["status", "actual_start_time"])

    def check_out(self):
        """
        Complete the job (check-out).

        Raises ValidationError with structured format:
        {
            "code": "JOB_COMPLETION_BLOCKED",
            "message": "Cannot check out: missing required items",
            "fields": {"photos.before": "required", ...}
        }
        """
        if self.status != self.STATUS_IN_PROGRESS:
            raise ValidationError({
                "code": "JOB_COMPLETION_BLOCKED",
                "message": "Cannot complete job",
                "fields": {"status": "must_be_in_progress"}
            })

        # Collect all blockers
        blockers = {}

        # 1) Фото до/после обязательны
        has_before = self.photos.filter(photo_type=JobPhoto.TYPE_BEFORE).exists()
        has_after = self.photos.filter(photo_type=JobPhoto.TYPE_AFTER).exists()
        if not has_before:
            blockers["photos.before"] = "required"
        if not has_after:
            blockers["photos.after"] = "required"

        # 2) Обязательные пункты чек-листа должны быть выполнены
        required_incomplete = self.checklist_items.filter(is_required=True, is_completed=False)
        if required_incomplete.exists():
            blockers["checklist.required"] = list(required_incomplete.values_list("id", flat=True))

        if blockers:
            raise ValidationError({
                "code": "JOB_COMPLETION_BLOCKED",
                "message": "Cannot complete job",
                "fields": blockers
            })

        self.status = self.STATUS_COMPLETED
        self.actual_end_time = timezone.now()
        self.save(update_fields=["status", "actual_end_time"])


class JobCheckEvent(models.Model):
    """
    Событие check-in / check-out для job.

    AUDIT FIX: High Risk #6 - Events are immutable after creation.
    """

    TYPE_CHECK_IN = "check_in"
    TYPE_CHECK_OUT = "check_out"
    TYPE_FORCE_COMPLETE = "force_complete"

    EVENT_TYPES = (
        (TYPE_CHECK_IN, "Check-in"),
        (TYPE_CHECK_OUT, "Check-out"),
        (TYPE_FORCE_COMPLETE, "Force Complete"),
    )

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="check_events",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="job_check_events_events",
        null=True,
        blank=True,
    )

    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    distance_m = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "job_check_events"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.job_id} {self.event_type} at {self.created_at}"

    def save(self, *args, **kwargs):
        """
        AUDIT FIX: High Risk #6 - Make JobCheckEvent immutable.

        Events can only be created, never updated.
        This protects the audit trail from tampering.
        """
        if self.pk is not None:
            raise ValidationError(
                "JobCheckEvent records are immutable and cannot be modified after creation. "
                "Create a new event instead."
            )
        super().save(*args, **kwargs)


class JobChecklistItem(models.Model):
    """
    Снимок пункта чек-листа на момент создания задания.
    Привязан к Job (обязательно для MVP).
    """

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="checklist_items",
        null=True,
        blank=True,
    )

    order = models.PositiveIntegerField(default=1)
    text = models.CharField(max_length=255)
    is_required = models.BooleanField(default=True)
    is_completed = models.BooleanField(default=False)

    created_at = models.DateTimeField(
        auto_now_add=True,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "job_checklist_items"
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"{self.job_id} — {self.order}. {self.text}"


# --- Photos (Phase 9) ---


class File(models.Model):
    """
    Метаданные загруженного файла.
    Хранение: file_url — источник правды (локально или S3/Spaces).
    """
    file_url = models.URLField(max_length=1000)
    original_name = models.CharField(max_length=255, blank=True)
    content_type = models.CharField(max_length=100, blank=True)
    size_bytes = models.PositiveIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "files"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.original_name or self.file_url


class JobPhoto(models.Model):
    """
    Фото до/после уборки, привязано к Job.
    EXIF поля — если есть, сохраняем.
    """
    TYPE_BEFORE = "before"
    TYPE_AFTER = "after"

    PHOTO_TYPES = (
        (TYPE_BEFORE, "Before"),
        (TYPE_AFTER, "After"),
    )

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="photos",
    )

    file = models.OneToOneField(
        File,
        on_delete=models.CASCADE,
        related_name="job_photo",
    )

    photo_type = models.CharField(max_length=10, choices=PHOTO_TYPES)

    # EXIF (optional)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    photo_timestamp = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "job_photos"
        constraints = [
            models.UniqueConstraint(
                fields=["job", "photo_type"],
                name="uniq_job_photo_type",
            )
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Job {self.job_id} {self.photo_type}"
