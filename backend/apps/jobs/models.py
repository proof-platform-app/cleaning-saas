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
    События чек-ин / чек-аут с GPS.
    """

    EVENT_CHECK_IN = "check_in"
    EVENT_CHECK_OUT = "check_out"

    EVENT_CHOICES = [
        (EVENT_CHECK_IN, "Check-in"),
        (EVENT_CHECK_OUT, "Check-out"),
    ]

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="check_events",
    )

    event_type = models.CharField(max_length=20, choices=EVENT_CHOICES)
    event_time = models.DateTimeField(default=timezone.now)

    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "job_check_events"

    def __str__(self) -> str:
        return f"{self.job} – {self.event_type} at {self.event_time}"

    def clean(self):
        # Нельзя добавлять события к завершённой задаче
        if self.job.status == Job.STATUS_COMPLETED:
            raise ValidationError("Job is already completed. No more events allowed.")

        # Check-in только из scheduled
        if self.event_type == self.EVENT_CHECK_IN:
            if self.job.status != Job.STATUS_SCHEDULED:
                raise ValidationError("Cannot check in: job must be in 'scheduled' status.")

        # Check-out только из in_progress
        if self.event_type == self.EVENT_CHECK_OUT:
            if self.job.status != Job.STATUS_IN_PROGRESS:
                raise ValidationError("Cannot check out: job must be in 'in_progress' status.")

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        # сначала валидируем
        self.full_clean()
        super().save(*args, **kwargs)

        if not is_new:
            return

        if self.event_type == self.EVENT_CHECK_IN:
            self.job.check_in()

        if self.event_type == self.EVENT_CHECK_OUT:
            self.job.check_out()


class JobChecklistItem(models.Model):
    """
    Снапшот пункта чек-листа на момент создания задания.
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
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "job_checklist_items"
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"{self.job} – {self.order}. {self.text}"
