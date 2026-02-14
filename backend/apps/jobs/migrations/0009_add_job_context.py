# Generated migration for Job.context field
# Adds context field with backfill based on asset presence

from django.db import migrations, models


def backfill_context(apps, schema_editor):
    """
    Backfill context field based on asset presence:
    - Jobs with asset != null -> context = "maintenance"
    - Jobs with asset = null -> context = "cleaning"

    This is a one-time backfill. Going forward, context is set explicitly
    at creation time and does NOT depend on asset nullability.
    """
    Job = apps.get_model("apps_jobs", "Job")

    # Set maintenance context for jobs with assets
    maintenance_count = Job.objects.filter(asset__isnull=False).update(context="maintenance")

    # Set cleaning context for jobs without assets (should already be default, but explicit)
    cleaning_count = Job.objects.filter(asset__isnull=True).update(context="cleaning")

    print(f"[0009_add_job_context] Backfilled {maintenance_count} maintenance jobs, {cleaning_count} cleaning jobs")


def reverse_backfill(apps, schema_editor):
    """Reverse migration: reset all to default (cleaning)"""
    Job = apps.get_model("apps_jobs", "Job")
    Job.objects.all().update(context="cleaning")


class Migration(migrations.Migration):

    dependencies = [
        ("apps_jobs", "0008_add_maintenance_category_fk"),
    ]

    operations = [
        # Step 1: Add field with default
        migrations.AddField(
            model_name="job",
            name="context",
            field=models.CharField(
                choices=[("cleaning", "Cleaning"), ("maintenance", "Maintenance")],
                db_index=True,
                default="cleaning",
                help_text="Product context: cleaning (CleanProof) or maintenance (MaintainProof)",
                max_length=32,
            ),
        ),
        # Step 2: Backfill based on asset presence
        migrations.RunPython(backfill_context, reverse_backfill),
    ]
