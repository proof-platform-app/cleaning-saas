from django.db import models
from apps.accounts.models import Company, User


class AccessAuditLog(models.Model):
    """
    Audit log for cleaner access management actions.

    Tracks:
    - Cleaner creation
    - Password resets
    - Status changes (active/inactive)
    """

    ACTION_CHOICES = [
        ("cleaner_created", "Cleaner created"),
        ("password_reset", "Password reset"),
        ("status_changed", "Cleaner status changed"),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="audit_logs",
        help_text="Company where the action occurred"
    )

    cleaner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="audit_logs",
        help_text="Cleaner whose access was modified"
    )

    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="performed_actions",
        help_text="Manager/Owner who performed the action"
    )

    action = models.CharField(
        max_length=50,
        choices=ACTION_CHOICES,
        help_text="Type of access action"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    metadata = models.JSONField(
        blank=True,
        null=True,
        help_text="Additional context (e.g., new_status for status changes)"
    )

    class Meta:
        db_table = "access_audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["company", "-created_at"]),
            models.Index(fields=["cleaner", "-created_at"]),
        ]

    def __str__(self) -> str:
        performer = self.performed_by.full_name if self.performed_by else "System"
        return f"{self.get_action_display()} - {self.cleaner.full_name} by {performer}"
