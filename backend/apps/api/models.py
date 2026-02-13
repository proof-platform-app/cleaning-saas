from django.db import models
from apps.accounts.models import Company, User


class AccessAuditLog(models.Model):
    """
    Audit log for cleaner access management actions.

    Tracks:
    - Cleaner creation
    - Password resets
    - Status changes (active/inactive)
    - Login events
    """

    # Action type constants
    ACTION_CLEANER_CREATED = "cleaner_created"
    ACTION_PASSWORD_RESET = "password_reset"
    ACTION_STATUS_CHANGED = "status_changed"
    ACTION_LOGIN_SUCCESS = "login_success"
    ACTION_DEACTIVATED = "deactivated"
    ACTION_REACTIVATED = "reactivated"

    ACTION_CHOICES = [
        (ACTION_CLEANER_CREATED, "Cleaner created"),
        (ACTION_PASSWORD_RESET, "Password reset"),
        (ACTION_STATUS_CHANGED, "Cleaner status changed"),
        (ACTION_LOGIN_SUCCESS, "Login success"),
        (ACTION_DEACTIVATED, "Deactivated"),
        (ACTION_REACTIVATED, "Reactivated"),
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
