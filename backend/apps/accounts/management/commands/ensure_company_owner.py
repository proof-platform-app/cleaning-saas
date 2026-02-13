"""
Management command to ensure every company has exactly one Owner.

Usage:
    python manage.py ensure_company_owner          # Dry run (shows what would be changed)
    python manage.py ensure_company_owner --apply  # Actually apply changes

This command:
1. Finds all companies without an Owner
2. For each, promotes the earliest Manager to Owner
3. Reports all changes made
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Company, User


class Command(BaseCommand):
    help = "Ensure every company has exactly one Owner (promote earliest manager if missing)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually apply changes (default is dry-run)",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        mode = "APPLY" if apply_changes else "DRY-RUN"

        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"  ensure_company_owner [{mode}]")
        self.stdout.write(f"{'='*60}\n")

        # Get all companies
        companies = Company.objects.all().order_by("id")
        total_companies = companies.count()

        self.stdout.write(f"Total companies: {total_companies}\n")

        companies_without_owner = []
        companies_with_owner = []
        companies_with_multiple_owners = []

        for company in companies:
            owners = User.objects.filter(
                company=company,
                role=User.ROLE_OWNER,
                is_active=True,
            ).order_by("created_at")

            owner_count = owners.count()

            if owner_count == 0:
                companies_without_owner.append(company)
            elif owner_count == 1:
                companies_with_owner.append((company, owners.first()))
            else:
                companies_with_multiple_owners.append((company, list(owners)))

        # Report: Companies with owner (OK)
        if companies_with_owner:
            self.stdout.write(self.style.SUCCESS(f"\n[OK] Companies with exactly 1 owner: {len(companies_with_owner)}"))
            for company, owner in companies_with_owner:
                self.stdout.write(f"  - {company.name} (ID: {company.id}) -> {owner.email or owner.full_name}")

        # Report: Companies with multiple owners (WARNING)
        if companies_with_multiple_owners:
            self.stdout.write(self.style.WARNING(f"\n[WARNING] Companies with multiple owners: {len(companies_with_multiple_owners)}"))
            for company, owners in companies_with_multiple_owners:
                owner_emails = ", ".join(o.email or o.full_name for o in owners)
                self.stdout.write(f"  - {company.name} (ID: {company.id}) -> [{owner_emails}]")
            self.stdout.write(self.style.WARNING("  NOTE: Multiple owners detected. Manual review recommended."))

        # Report and fix: Companies without owner
        if companies_without_owner:
            self.stdout.write(self.style.ERROR(f"\n[FIX NEEDED] Companies without owner: {len(companies_without_owner)}"))

            fixed_count = 0
            skipped_count = 0

            for company in companies_without_owner:
                # Find earliest manager
                earliest_manager = User.objects.filter(
                    company=company,
                    role=User.ROLE_MANAGER,
                    is_active=True,
                ).order_by("created_at").first()

                if earliest_manager:
                    self.stdout.write(f"\n  Company: {company.name} (ID: {company.id})")
                    self.stdout.write(f"    Earliest manager: {earliest_manager.email or earliest_manager.full_name} (ID: {earliest_manager.id})")
                    self.stdout.write(f"    Created at: {earliest_manager.created_at}")

                    if apply_changes:
                        with transaction.atomic():
                            earliest_manager.role = User.ROLE_OWNER
                            earliest_manager.save(update_fields=["role", "updated_at"])

                        self.stdout.write(self.style.SUCCESS(f"    -> PROMOTED to Owner"))
                        fixed_count += 1
                    else:
                        self.stdout.write(self.style.WARNING(f"    -> Would be PROMOTED to Owner (dry-run)"))
                        fixed_count += 1
                else:
                    self.stdout.write(f"\n  Company: {company.name} (ID: {company.id})")
                    self.stdout.write(self.style.ERROR(f"    No active managers found! Cannot promote anyone."))
                    skipped_count += 1

            # Summary
            self.stdout.write(f"\n{'='*60}")
            if apply_changes:
                self.stdout.write(self.style.SUCCESS(f"  Fixed: {fixed_count} companies"))
            else:
                self.stdout.write(self.style.WARNING(f"  Would fix: {fixed_count} companies (dry-run)"))

            if skipped_count > 0:
                self.stdout.write(self.style.ERROR(f"  Skipped: {skipped_count} companies (no managers)"))

        else:
            self.stdout.write(self.style.SUCCESS(f"\n[OK] All companies have at least one owner."))

        # Final summary
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"  Summary:")
        self.stdout.write(f"    Total companies: {total_companies}")
        self.stdout.write(f"    With owner: {len(companies_with_owner)}")
        self.stdout.write(f"    Without owner: {len(companies_without_owner)}")
        self.stdout.write(f"    Multiple owners: {len(companies_with_multiple_owners)}")
        self.stdout.write(f"{'='*60}\n")

        if not apply_changes and companies_without_owner:
            self.stdout.write(self.style.WARNING(
                "\nTo apply changes, run with --apply flag:\n"
                "  python manage.py ensure_company_owner --apply\n"
            ))
