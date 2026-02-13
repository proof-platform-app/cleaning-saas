"""
Management command to manually activate a paid plan for a company.

Usage:
    python manage.py activate_paid_plan --company-id 18
    python manage.py activate_paid_plan --company-id 18 --tier pro
    python manage.py activate_paid_plan --company-id 18 --deactivate
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.accounts.models import Company


class Command(BaseCommand):
    help = "Activate or deactivate a paid plan for a company"

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            required=True,
            help="Company ID to activate/deactivate",
        )
        parser.add_argument(
            "--tier",
            type=str,
            choices=["standard", "pro", "enterprise"],
            default=None,
            help="Plan tier to set (optional, keeps current tier if not specified)",
        )
        parser.add_argument(
            "--deactivate",
            action="store_true",
            help="Deactivate the company (revert to trial_expired state)",
        )

    def handle(self, *args, **options):
        company_id = options["company_id"]
        tier = options["tier"]
        deactivate = options["deactivate"]

        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            raise CommandError(f"Company with ID {company_id} not found")

        if deactivate:
            self._deactivate(company)
        else:
            self._activate(company, tier)

    def _activate(self, company: Company, tier: str | None):
        """Activate paid plan for company."""
        old_plan = company.plan
        old_tier = company.plan_tier

        # Update plan to active
        company.plan = Company.PLAN_ACTIVE
        update_fields = ["plan", "updated_at"]
        company.updated_at = timezone.now()

        # Update tier if specified
        if tier:
            company.plan_tier = tier
            update_fields.append("plan_tier")

        # Clear trial expiry for clarity (plan=active bypasses it anyway)
        if company.trial_expires_at:
            company.trial_expires_at = None
            update_fields.append("trial_expires_at")

        company.save(update_fields=update_fields)

        self.stdout.write(
            self.style.SUCCESS(
                f"\n{'=' * 50}\n"
                f"PAID PLAN ACTIVATED\n"
                f"{'=' * 50}\n"
                f"Company ID:    {company.id}\n"
                f"Company Name:  {company.name}\n"
                f"Previous Plan: {old_plan}\n"
                f"New Plan:      {company.plan}\n"
                f"Plan Tier:     {old_tier} -> {company.plan_tier}\n"
                f"Activated At:  {company.updated_at.isoformat()}\n"
                f"{'=' * 50}\n"
            )
        )

    def _deactivate(self, company: Company):
        """Deactivate company (revert to trial_expired)."""
        old_plan = company.plan

        company.plan = Company.PLAN_TRIAL
        company.trial_expires_at = timezone.now()  # Set to now = expired
        company.updated_at = timezone.now()

        company.save(update_fields=["plan", "trial_expires_at", "updated_at"])

        self.stdout.write(
            self.style.WARNING(
                f"\n{'=' * 50}\n"
                f"COMPANY DEACTIVATED\n"
                f"{'=' * 50}\n"
                f"Company ID:      {company.id}\n"
                f"Company Name:    {company.name}\n"
                f"Previous Plan:   {old_plan}\n"
                f"New Plan:        {company.plan}\n"
                f"Trial Expires:   {company.trial_expires_at.isoformat()}\n"
                f"Deactivated At:  {company.updated_at.isoformat()}\n"
                f"{'=' * 50}\n"
            )
        )
