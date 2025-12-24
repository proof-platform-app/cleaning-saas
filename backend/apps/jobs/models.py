from django.core.exceptions import ValidationError
from django.db import models
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
        on_delete=models.PROTECT,  # не даём удалить клинера с историей
        related_name="jobs",
    )

    checklist_template = models.ForeignKey(
        ChecklistTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="jobs",
    )

    scheduled_date = models.DateField()  # дата уборки
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

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "jobs"

    def __str__(self) -> str:
        return f"Job #{self.id} – {self.location} – {self.scheduled_date}"

    def check_in(self):
        """
        Начало работы клинера.
        """
        if self.status != self.STATUS_SCHEDULED:
            return

        self.status = self.STATUS_IN_PROGRESS
        self.actual_start_time = timezone.now()
        self.save(update_fields=["status", "actual_start_time"])

    def check_out(self):
        """
        Завершение работы клинера.
        """
        if self.status != self.STATUS_IN_PROGRESS:
            return

        self.status = self.STATUS_COMPLETED
        self.actual_end_time = timezone.now()
        self.save(update_fields=["status", "actual_end_time"])

    def save(self, *args, **kwargs):
        """
        При создании нового Job автоматически копируем пункты
        из checklist_template в JobChecklistItem.
        """
        is_new = self.pk is None
        super().save(*args, **kwargs)

        if is_new and self.checklist_template:
            items = self.checklist_template.items.all()
            for item in items:
                JobChecklistItem.objects.create(
                    job=self,
                    order=item.order,
                    text=item.text,
                    is_required=item.is_required,
                )


class JobCheckEvent(models.Model):
    """
    Событие check-in / check-out для job.
    Нужно для аудита: кто, когда, с какими координатами.
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
        related_name="job_check_events",
    )

    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    distance_m = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "job_check_events"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.job_id} {self.event_type} at {self.created_at}"


class JobCheckListItem(models.Model):
    """
    Снимок пункта чек-листа на момент создания задания.
    Эти записи привязаны к Job, а не к шаблону.
    """

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="checklist_items",
    )

    order = models.PositiveIntegerField(default=1)
    text = models.CharField(max_length=255)
    is_required = models.BooleanField(default=True)
    is_completed = models.BooleanField(default=False)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "job_checklist_items"   # ← другое имя таблицы, НЕ job_check_events
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"{self.job_id} — {self.order}. {self.text}"