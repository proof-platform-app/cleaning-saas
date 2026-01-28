# backend/apps/marketing/models.py
from django.conf import settings
from django.db import models


class DemoRequest(models.Model):
    company_name = models.CharField(max_length=255)
    role = models.CharField(max_length=64, blank=True)
    cleaner_count = models.CharField(max_length=32, blank=True)
    contact = models.CharField(max_length=255)  # WhatsApp или email
    country = models.CharField(max_length=128, blank=True)
    primary_pain = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:  # type: ignore[override]
        return f"{self.company_name} ({self.contact})"


class ContactMessage(models.Model):
    name = models.CharField(max_length=255)
    company = models.CharField(max_length=255, blank=True)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:  # type: ignore[override]
        return f"{self.name} <{self.email}>"


class ReportEmailLog(models.Model):
    """
    История отправки PDF-отчётов (job / weekly / monthly).
    Лог чисто операционный, не влияет на бизнес-логику.
    """

    KIND_JOB_REPORT = "job_report"
    KIND_WEEKLY_REPORT = "weekly_report"
    KIND_MONTHLY_REPORT = "monthly_report"

    KIND_CHOICES = (
        (KIND_JOB_REPORT, "Job report"),
        (KIND_WEEKLY_REPORT, "Weekly report"),
        (KIND_MONTHLY_REPORT, "Monthly report"),
    )

    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"

    STATUS_CHOICES = (
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
    )

    # Мульти-тенанси. Здесь храним просто company_id, без FK,
    # чтобы не зависеть от конкретного Django-приложения с Company.
    company_id = models.BigIntegerField()

    # Кто инициировал отправку (может быть None, если юзера потом удалили)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="report_email_logs",
    )

    kind = models.CharField(
        max_length=20,
        choices=KIND_CHOICES,
    )

    # Для job-отчётов — тоже просто ID, без FK на jobs.Job
    job_id = models.BigIntegerField(null=True, blank=True)

    # Для weekly/monthly отчётов
    period_from = models.DateField(null=True, blank=True)
    period_to = models.DateField(null=True, blank=True)

    # Кому отправляли
    to_email = models.EmailField()

    # Тема письма на момент отправки
    subject = models.CharField(max_length=255)

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=STATUS_SENT,
    )

    # Текст ошибки, если не улетело
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Report email log"
        verbose_name_plural = "Report email logs"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("company_id", "kind", "status", "created_at")),
            models.Index(fields=("company_id", "created_at")),
        ]

    def __str__(self) -> str:
        if self.kind == self.KIND_JOB_REPORT and self.job_id:
            return f"[{self.company_id}] Job #{self.job_id} → {self.to_email}"
        if self.period_from and self.period_to:
            return (
                f"[{self.company_id}] {self.kind} "
                f"{self.period_from}–{self.period_to} → {self.to_email}"
            )
        return f"[{self.company_id}] {self.kind} → {self.to_email}"
