# backend/dev_seed_reports.py

from datetime import date, time, timedelta
from django.utils import timezone

from apps.companies.models import Company
from apps.users.models import User
from apps.locations.models import Location
from apps.jobs.models import Job


DEV_EMAIL = "manager@test.com"
DEV_PASSWORD = "Test1234!"
today = date.today()


def main():
    # --- Company ---
    company, _ = Company.objects.get_or_create(
        name="Demo Cleaning",
        defaults={"contact_email": DEV_EMAIL},
    )

    # --- Manager ---
    manager, created = User.objects.get_or_create(
        email=DEV_EMAIL,
        defaults={
            "company": company,
            "role": "manager",
            "full_name": "Demo Manager",
            "is_active": True,
        },
    )
    if created:
        manager.set_password(DEV_PASSWORD)
        manager.save()

    # --- Cleaners ---
    cleaner1, _ = User.objects.get_or_create(
        email="cleaner1@demo.com",
        defaults={
            "company": company,
            "role": "cleaner",
            "full_name": "Dev Cleaner 1",
            "is_active": True,
        },
    )

    cleaner2, _ = User.objects.get_or_create(
        email="cleaner2@demo.com",
        defaults={
            "company": company,
            "role": "cleaner",
            "full_name": "Dev Cleaner 2",
            "is_active": True,
        },
    )

    # --- Locations ---
    loc1, _ = Location.objects.get_or_create(
        company=company,
        name="Dubai Marina Tower",
        defaults={
            "address": "Dubai Marina, Dubai, UAE",
            "latitude": 25.0800,
            "longitude": 55.1400,
        },
    )

    loc2, _ = Location.objects.get_or_create(
        company=company,
        name="Downtown Business Bay",
        defaults={
            "address": "Business Bay, Dubai, UAE",
            "latitude": 25.1850,
            "longitude": 55.2750,
        },
    )

    def create_demo_job(days_ago: int, cleaner: User, location: Location, violated: bool = False) -> Job:
        scheduled_date = today - timedelta(days=days_ago)
        start_t = time(9, 0)
        end_t = time(11, 0)

        status = "completed" if violated else "scheduled"

        job = Job.objects.create(
            company=company,
            location=location,
            cleaner=cleaner,
            status=status,
            scheduled_date=scheduled_date,
            scheduled_start_time=start_t,
            scheduled_end_time=end_t,
        )

        if status == "completed":
            now = timezone.now()
            job.actual_start_time = now - timedelta(hours=2)
            job.actual_end_time = now - timedelta(hours=1)
            job.save(update_fields=["actual_start_time", "actual_end_time"])

        print("Created job", job.id, scheduled_date, status)
        return job

    # --- Jobs (часть у тебя уже может быть создана, ничего страшного) ---
    create_demo_job(1, cleaner1, loc1, violated=True)
    create_demo_job(3, cleaner1, loc1, violated=True)
    create_demo_job(5, cleaner1, loc1, violated=False)

    create_demo_job(2, cleaner2, loc2, violated=True)
    create_demo_job(4, cleaner2, loc2, violated=False)

    total = Job.objects.filter(company=company).count()
    print("Total jobs for company:", total)


if __name__ == "__main__":
    main()
