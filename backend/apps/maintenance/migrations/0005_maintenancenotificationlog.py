# Stage 6: Notifications Layer
# Migration for MaintenanceNotificationLog model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("apps_accounts", "0001_initial"),
        ("apps_jobs", "0001_initial"),
        ("maintenance", "0004_stage5_contracts_and_warranty"),
    ]

    operations = [
        migrations.CreateModel(
            name="MaintenanceNotificationLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("visit_reminder", "Visit Reminder"),
                            ("sla_warning", "SLA Warning"),
                            ("assignment", "Assignment Alert"),
                            ("completion", "Completion Notification"),
                        ],
                        max_length=30,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("sent", "Sent"), ("failed", "Failed")],
                        max_length=10,
                    ),
                ),
                ("to_email", models.EmailField(max_length=254)),
                ("subject", models.CharField(max_length=200)),
                ("error_message", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="maintenance_notifications",
                        to="apps_accounts.company",
                    ),
                ),
                (
                    "job",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="maintenance_notifications",
                        to="apps_jobs.job",
                    ),
                ),
                (
                    "recipient_user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="received_maintenance_notifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "triggered_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="triggered_maintenance_notifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Maintenance Notification Log",
                "verbose_name_plural": "Maintenance Notification Logs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="maintenancenotificationlog",
            index=models.Index(
                fields=["company", "kind", "created_at"],
                name="maintenance_company_d0c8e3_idx",
            ),
        ),
    ]
