"""
Management command for sales-assisted onboarding.

Creates a new company with an Owner user (Billing Admin).
Used when onboarding clients manually without public registration.

Usage:
    # With auto-generated password
    python manage.py create_company_with_owner \
        --company-name "Acme Cleaning LLC" \
        --owner-email "admin@acme.com"

    # With specific password
    python manage.py create_company_with_owner \
        --company-name "Acme Cleaning LLC" \
        --owner-email "admin@acme.com" \
        --owner-name "John Smith" \
        --temp-password "SecurePass123!"

    # With phone number
    python manage.py create_company_with_owner \
        --company-name "Acme Cleaning LLC" \
        --owner-email "admin@acme.com" \
        --owner-phone "+971501234567"

SECURITY:
- Temporary password is printed ONCE and not logged to files
- Owner should change password on first login (recommended)
- Send credentials via secure channel (WhatsApp, Signal, etc.)
"""
import secrets
import string
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import Company, User


def generate_temp_password(length: int = 12) -> str:
    """
    Generate a secure temporary password.
    Contains uppercase, lowercase, digits, and special chars.
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    # Ensure at least one of each type
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%"),
    ]
    # Fill the rest randomly
    password += [secrets.choice(alphabet) for _ in range(length - 4)]
    # Shuffle to avoid predictable pattern
    secrets.SystemRandom().shuffle(password)
    return "".join(password)


class Command(BaseCommand):
    help = "Create a new company with an Owner user (sales-assisted onboarding)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-name",
            required=True,
            help="Name of the company",
        )
        parser.add_argument(
            "--owner-email",
            required=True,
            help="Email address for the Owner user",
        )
        parser.add_argument(
            "--owner-name",
            default="",
            help="Full name of the Owner (default: extracted from email)",
        )
        parser.add_argument(
            "--owner-phone",
            default="",
            help="Phone number for the Owner (optional)",
        )
        parser.add_argument(
            "--temp-password",
            default="",
            help="Temporary password (auto-generated if not provided)",
        )
        parser.add_argument(
            "--plan",
            choices=["trial", "active"],
            default="active",
            help="Initial plan for the company (default: active)",
        )

    def handle(self, *args, **options):
        company_name = options["company_name"].strip()
        owner_email = options["owner_email"].strip().lower()
        owner_name = options["owner_name"].strip()
        owner_phone = options["owner_phone"].strip()
        temp_password = options["temp_password"]
        plan = options["plan"]

        # Validate inputs
        if not company_name:
            raise CommandError("Company name cannot be empty")

        if not owner_email:
            raise CommandError("Owner email cannot be empty")

        # Check email uniqueness
        if User.objects.filter(
            email__iexact=owner_email,
            role__in=[User.ROLE_OWNER, User.ROLE_MANAGER, User.ROLE_STAFF],
        ).exists():
            raise CommandError(f"A user with email '{owner_email}' already exists")

        # Generate temp password if not provided
        if not temp_password:
            temp_password = generate_temp_password()

        # Extract name from email if not provided
        if not owner_name:
            owner_name = owner_email.split("@")[0].replace(".", " ").title()

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("  CREATE COMPANY WITH OWNER")
        self.stdout.write("=" * 60 + "\n")

        try:
            with transaction.atomic():
                # Create company
                company = Company.objects.create(
                    name=company_name,
                    contact_email=owner_email,
                    plan=Company.PLAN_TRIAL if plan == "trial" else Company.PLAN_ACTIVE,
                )

                # Start trial if plan is trial
                if plan == "trial":
                    company.start_standard_trial(days=7)

                # Create owner user
                owner = User.objects.create(
                    company=company,
                    role=User.ROLE_OWNER,
                    email=owner_email,
                    full_name=owner_name,
                    phone=owner_phone if owner_phone else None,
                    is_active=True,
                    auth_type=User.AUTH_TYPE_PASSWORD,
                )
                owner.set_password(temp_password)
                owner.save(update_fields=["password"])

        except Exception as e:
            raise CommandError(f"Failed to create company: {e}")

        # Success output
        self.stdout.write(self.style.SUCCESS("  Company created successfully!\n"))

        self.stdout.write("  " + "-" * 56)
        self.stdout.write(f"  Company ID:     {company.id}")
        self.stdout.write(f"  Company Name:   {company.name}")
        self.stdout.write(f"  Plan:           {company.plan}")
        self.stdout.write("  " + "-" * 56)
        self.stdout.write(f"  Owner ID:       {owner.id}")
        self.stdout.write(f"  Owner Email:    {owner.email}")
        self.stdout.write(f"  Owner Name:     {owner.full_name}")
        if owner.phone:
            self.stdout.write(f"  Owner Phone:    {owner.phone}")
        self.stdout.write("  " + "-" * 56)

        # Print password ONCE (not logged)
        self.stdout.write("")
        self.stdout.write(self.style.WARNING("  TEMPORARY PASSWORD (shown once, not logged):"))
        self.stdout.write("")
        self.stdout.write(f"    {temp_password}")
        self.stdout.write("")
        self.stdout.write("  " + "-" * 56)

        # Login instructions
        self.stdout.write("")
        self.stdout.write("  Login URL:      https://app.cleanproof.com/login")
        self.stdout.write(f"  Email:          {owner.email}")
        self.stdout.write(f"  Password:       <see above>")
        self.stdout.write("")

        self.stdout.write(self.style.WARNING(
            "  IMPORTANT: Send credentials via secure channel (WhatsApp, Signal).\n"
            "  Recommend owner change password after first login.\n"
        ))

        self.stdout.write("=" * 60 + "\n")
