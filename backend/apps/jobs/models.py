# backend/apps/jobs/models.py
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from apps.accounts.models import Company, User
from apps.locations.models import Location, ChecklistTemplate


class Job(models.Model):
    """
    Уборка на конкретной локации, в конкретный день, за конкретным клинером.
    """

    STATUS_SCHEDULED = "scheduled"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_IN_PROGRESS, "In progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="jobs",
    )

    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
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

    scheduled_date = models.DateField()
    scheduled_start_time = models.TimeField(null=True, blank=True)
    scheduled_end_time = models.TimeField(null=True, blank=True)

    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_SCHEDULED,
    )

    manager_notes = models.TextField(blank=True)
    cleaner_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "jobs"

    def __str__(self) -> str:
        return f"Job #{self.id} – {self.location} – {self.scheduled_date}"

    def clean(self):
        if self.scheduled_start_time and self.scheduled_end_time:
            if self.scheduled_end_time <= self.scheduled_start_time:
                raise ValidationError("scheduled_end_time must be after scheduled_start_time")

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

            if checklist_template:
                items_qs = checklist_template.items.all()

                for item in items_qs:
                    order_val = getattr(item, "order", None)
                    if order_val is None:
                        order_val = getattr(item, "order_index", 1)

                    is_required_val = getattr(item, "is_required", True)

                    JobChecklistItem.objects.create(
                        job=job,
                        order=int(order_val),
                        text=item.text,
                        is_required=bool(is_required_val),
                    )

            return job

    def check_in(self):
        if self.status != self.STATUS_SCHEDULED:
            raise ValidationError("Job is not in scheduled state")

        self.status = self.STATUS_IN_PROGRESS
        self.actual_start_time = timezone.now()
        self.save(update_fields=["status", "actual_start_time"])

    def check_out(self):
        if self.status != self.STATUS_IN_PROGRESS:
            raise ValidationError("Job is not in progress")

        required_qs = self.checklist_items.filter(is_required=True)
        if required_qs.exists() and required_qs.filter(is_completed=False).exists():
            raise ValidationError("Cannot check out: required checklist items are not completed")

        self.status = self.STATUS_COMPLETED
        self.actual_end_time = timezone.now()
        self.save(update_fields=["status", "actual_end_time"])


class JobCheckEvent(models.Model):
    """
    Событие check-in / check-out для job.
    """

    TYPE_CHECK_IN = "check_in"
    TYPE_CHECK_OUT = "check_out"

    EVENT_TYPES = (
        (TYPE_CHECK_IN, "Check-in"),
        (TYPE_CHECK_OUT, "Check-out"),
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
