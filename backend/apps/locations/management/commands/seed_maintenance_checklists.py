"""
Seed maintenance-specific checklist templates.

Creates standard maintenance checklist templates for a company.
These templates are marked with context='maintenance' to isolate
them from cleaning templates.

Usage:
    # Seed for a specific company
    python manage.py seed_maintenance_checklists --company-id 1

    # Seed for all companies
    python manage.py seed_maintenance_checklists --all

    # Preview without creating (dry run)
    python manage.py seed_maintenance_checklists --company-id 1 --dry-run
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import Company
from apps.locations.models import ChecklistTemplate, ChecklistTemplateItem


# Maintenance checklist templates with context=maintenance
MAINTENANCE_TEMPLATES = [
    {
        "name": "HVAC — Preventive Visit",
        "description": "Routine HVAC system preventive maintenance checklist",
        "items": [
            ("Verify unit model and serial number", True),
            ("Inspect air filters, replace if needed", True),
            ("Check refrigerant levels", True),
            ("Inspect condenser coils for debris", True),
            ("Verify thermostat operation", True),
            ("Check electrical connections", True),
            ("Lubricate fan motor bearings", False),
            ("Test system cycle operation", True),
            ("Clean drain pan and condensate line", True),
            ("Document findings and recommendations", True),
        ],
    },
    {
        "name": "Electrical — Safety Inspection",
        "description": "Electrical system safety inspection checklist",
        "items": [
            ("Inspect main panel for damage or corrosion", True),
            ("Verify breaker labels match circuits", True),
            ("Check for loose connections", True),
            ("Test GFCI outlets functionality", True),
            ("Inspect outlet covers for damage", True),
            ("Check emergency lighting operation", True),
            ("Verify grounding integrity", True),
            ("Thermal scan for hot spots", False),
            ("Document any code violations", True),
            ("Provide safety recommendations", True),
        ],
    },
    {
        "name": "Plumbing — Leak / Pressure Check",
        "description": "Plumbing system inspection and pressure testing",
        "items": [
            ("Visual inspection of exposed pipes", True),
            ("Check for active leaks or moisture", True),
            ("Test water pressure at fixtures", True),
            ("Inspect water heater condition", True),
            ("Check shut-off valve operation", True),
            ("Inspect drain flow and condition", True),
            ("Check toilet fill and flush mechanism", True),
            ("Test backflow preventer (if present)", False),
            ("Document findings and photos", True),
        ],
    },
    {
        "name": "Generator — Monthly Test",
        "description": "Monthly generator operational test checklist",
        "items": [
            ("Check fuel level and quality", True),
            ("Inspect battery condition and connections", True),
            ("Check coolant level", True),
            ("Inspect oil level and condition", True),
            ("Check air filter condition", True),
            ("Verify automatic transfer switch operation", True),
            ("Run generator under load for 30 minutes", True),
            ("Record runtime hours", True),
            ("Check exhaust system for leaks", True),
            ("Document operational parameters", True),
            ("Schedule next service if needed", False),
        ],
    },
    {
        "name": "Elevator — Routine Check",
        "description": "Elevator safety and operational inspection",
        "items": [
            ("Verify cab lighting and ventilation", True),
            ("Check door operation and safety edge", True),
            ("Test emergency phone operation", True),
            ("Inspect cab interior for damage", True),
            ("Check floor leveling accuracy", True),
            ("Verify emergency stop functionality", True),
            ("Inspect machine room equipment", True),
            ("Check safety certificates current", True),
            ("Document any issues found", True),
        ],
    },
    {
        "name": "Fire Safety — Inspection",
        "description": "Fire safety equipment inspection checklist",
        "items": [
            ("Inspect fire extinguisher condition", True),
            ("Verify extinguisher service dates", True),
            ("Test smoke detector operation", True),
            ("Check emergency exit signs", True),
            ("Verify exit paths clear", True),
            ("Inspect sprinkler heads (visual)", True),
            ("Check fire alarm panel status", True),
            ("Document inspection findings", True),
        ],
    },
    {
        "name": "Water Tank — Maintenance",
        "description": "Water storage tank inspection and maintenance",
        "items": [
            ("Inspect tank exterior for damage", True),
            ("Check tank level indicator", True),
            ("Inspect inlet/outlet valves", True),
            ("Check for sediment buildup", True),
            ("Test overflow drain operation", True),
            ("Inspect pump operation (if present)", True),
            ("Verify water quality acceptable", False),
            ("Clean tank interior if scheduled", False),
            ("Document maintenance performed", True),
        ],
    },
    {
        "name": "General Equipment — Service",
        "description": "General equipment service visit checklist",
        "items": [
            ("Confirm asset identification", True),
            ("Review previous service history", False),
            ("Perform visual inspection", True),
            ("Check operational status", True),
            ("Perform required service tasks", True),
            ("Test functionality after service", True),
            ("Clean work area", True),
            ("Document findings and actions", True),
        ],
    },
]


class Command(BaseCommand):
    help = "Seed maintenance-specific checklist templates (context=maintenance)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            help="Company ID to seed templates for",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Seed templates for all companies",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview without creating",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Create even if templates with same names exist",
        )

    def handle(self, *args, **options):
        company_id = options.get("company_id")
        seed_all = options.get("all")
        dry_run = options.get("dry_run")
        force = options.get("force")

        if not company_id and not seed_all:
            raise CommandError("Provide --company-id or --all")

        if company_id and seed_all:
            raise CommandError("Cannot use both --company-id and --all")

        # Get companies to seed
        if seed_all:
            companies = Company.objects.all()
        else:
            try:
                companies = [Company.objects.get(id=company_id)]
            except Company.DoesNotExist:
                raise CommandError(f"Company with ID {company_id} not found")

        if not companies:
            self.stdout.write(self.style.WARNING("No companies found"))
            return

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("  SEED MAINTENANCE CHECKLIST TEMPLATES")
        self.stdout.write("  (context=maintenance)")
        if dry_run:
            self.stdout.write("  (DRY RUN - no changes will be made)")
        self.stdout.write("=" * 60 + "\n")

        total_created = 0
        total_skipped = 0

        for company in companies:
            self.stdout.write(f"\n  Company: {company.name} (ID: {company.id})")
            self.stdout.write("  " + "-" * 50)

            created, skipped = self._seed_for_company(company, dry_run, force)
            total_created += created
            total_skipped += skipped

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(f"  Total templates created: {total_created}")
        self.stdout.write(f"  Total templates skipped: {total_skipped}")
        self.stdout.write("=" * 60 + "\n")

        if dry_run:
            self.stdout.write(
                self.style.WARNING("  DRY RUN completed. No changes made.\n")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS("  Seeding completed successfully!\n")
            )

    def _seed_for_company(self, company, dry_run, force):
        created = 0
        skipped = 0

        for template_data in MAINTENANCE_TEMPLATES:
            name = template_data["name"]

            # Check if template already exists (with context=maintenance)
            existing = ChecklistTemplate.objects.filter(
                company=company,
                name=name,
                context=ChecklistTemplate.CONTEXT_MAINTENANCE,
            ).first()

            if existing and not force:
                self.stdout.write(f"    SKIP: {name} (already exists)")
                skipped += 1
                continue

            if dry_run:
                self.stdout.write(f"    WOULD CREATE: {name}")
                created += 1
                continue

            # Create template with items
            with transaction.atomic():
                if existing and force:
                    existing.delete()

                template = ChecklistTemplate.objects.create(
                    company=company,
                    name=name,
                    description=template_data["description"],
                    context=ChecklistTemplate.CONTEXT_MAINTENANCE,  # KEY: Set context
                    is_active=True,
                )

                for order, (text, is_required) in enumerate(
                    template_data["items"], start=1
                ):
                    ChecklistTemplateItem.objects.create(
                        template=template,
                        order=order,
                        text=text,
                        is_required=is_required,
                    )

                self.stdout.write(
                    self.style.SUCCESS(
                        f"    CREATED: {name} ({len(template_data['items'])} items)"
                    )
                )
                created += 1

        return created, skipped
