from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import Company

User = get_user_model()


class TrialFlowTestCase(TestCase):
    """Test trial lifecycle: start, active status, expiration, upgrade"""

    def setUp(self):
        """Create test company and user"""
        self.client = APIClient()

        # Create company
        self.company = Company.objects.create(
            name="Test Company",
            plan=Company.PLAN_ACTIVE,  # Start with active plan
        )

        # Create user
        self.user = User.objects.create_user(
            email="manager@test.com",
            password="testpass123",
            full_name="Test Manager",
            company=self.company,
            role="manager",
        )

        # Authenticate
        self.client.force_authenticate(user=self.user)

    def test_start_trial_success(self):
        """Test starting a trial successfully"""
        # Arrange: company with active plan (no trial yet)
        self.assertEqual(self.company.plan, Company.PLAN_ACTIVE)

        # Act: start trial
        response = self.client.post("/api/cleanproof/trials/start/")

        # Assert: trial started
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data["plan"], Company.PLAN_TRIAL)
        self.assertTrue(data["is_trial_active"])
        self.assertFalse(data["is_trial_expired"])
        self.assertEqual(data["days_left"], 7)

        # Verify database
        self.company.refresh_from_db()
        self.assertEqual(self.company.plan, Company.PLAN_TRIAL)
        self.assertIsNotNone(self.company.trial_started_at)
        self.assertIsNotNone(self.company.trial_expires_at)

    def test_start_trial_idempotent(self):
        """Test starting trial multiple times is idempotent"""
        # Arrange: start trial once
        self.client.post("/api/cleanproof/trials/start/")
        self.company.refresh_from_db()
        original_start = self.company.trial_started_at

        # Act: start trial again
        response = self.client.post("/api/cleanproof/trials/start/")

        # Assert: same trial returned, not restarted
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.company.refresh_from_db()
        self.assertEqual(self.company.trial_started_at, original_start)

    def test_trial_days_left_calculation(self):
        """Test days_left calculation"""
        # Arrange: set trial to expire in 3 days
        now = timezone.now()
        self.company.plan = Company.PLAN_TRIAL
        self.company.trial_started_at = now - timedelta(days=4)
        self.company.trial_expires_at = now + timedelta(days=3)
        self.company.save()

        # Act: get usage summary
        response = self.client.get("/api/cleanproof/usage-summary/")

        # Assert: days_left is 3
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data["is_trial_active"])
        self.assertEqual(data["days_left"], 3)

    def test_trial_expired_detection(self):
        """Test trial expiration detection"""
        # Arrange: set trial to have expired 1 day ago
        now = timezone.now()
        self.company.plan = Company.PLAN_TRIAL
        self.company.trial_started_at = now - timedelta(days=8)
        self.company.trial_expires_at = now - timedelta(days=1)
        self.company.save()

        # Act: get usage summary
        response = self.client.get("/api/cleanproof/usage-summary/")

        # Assert: trial is expired
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertFalse(data["is_trial_active"])
        self.assertTrue(data["is_trial_expired"])
        self.assertIsNone(data["days_left"])

    def test_company_blocked_when_trial_expired(self):
        """Test company.is_blocked() returns True when trial expired"""
        # Arrange: expired trial
        now = timezone.now()
        self.company.plan = Company.PLAN_TRIAL
        self.company.trial_started_at = now - timedelta(days=8)
        self.company.trial_expires_at = now - timedelta(days=1)
        self.company.save()

        # Assert: company is blocked
        self.assertTrue(self.company.is_blocked())
        self.assertTrue(self.company.is_trial_expired())

    def test_upgrade_to_active_success(self):
        """Test upgrading from trial to active plan"""
        # Arrange: active trial
        now = timezone.now()
        self.company.plan = Company.PLAN_TRIAL
        self.company.trial_started_at = now - timedelta(days=3)
        self.company.trial_expires_at = now + timedelta(days=4)
        self.company.save()

        # Act: upgrade to active
        response = self.client.post("/api/cleanproof/upgrade-to-active/")

        # Assert: plan is now active
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["plan"], Company.PLAN_ACTIVE)
        self.assertFalse(data["is_trial_active"])
        self.assertFalse(data["is_trial_expired"])

        # Verify database
        self.company.refresh_from_db()
        self.assertEqual(self.company.plan, Company.PLAN_ACTIVE)

    def test_upgrade_to_active_idempotent(self):
        """Test upgrading when already active is idempotent"""
        # Arrange: already active
        self.company.plan = Company.PLAN_ACTIVE
        self.company.save()

        # Act: upgrade to active
        response = self.client.post("/api/cleanproof/upgrade-to-active/")

        # Assert: still active, no errors
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["plan"], Company.PLAN_ACTIVE)

    def test_upgrade_from_expired_trial(self):
        """Test upgrading after trial has expired"""
        # Arrange: expired trial
        now = timezone.now()
        self.company.plan = Company.PLAN_TRIAL
        self.company.trial_started_at = now - timedelta(days=8)
        self.company.trial_expires_at = now - timedelta(days=1)
        self.company.save()

        # Act: upgrade to active
        response = self.client.post("/api/cleanproof/upgrade-to-active/")

        # Assert: successfully upgraded
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["plan"], Company.PLAN_ACTIVE)

        self.company.refresh_from_db()
        self.assertEqual(self.company.plan, Company.PLAN_ACTIVE)
        self.assertFalse(self.company.is_blocked())

    def test_usage_summary_structure(self):
        """Test usage summary response structure"""
        response = self.client.get("/api/cleanproof/usage-summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Assert required fields present
        self.assertIn("plan", data)
        self.assertIn("is_trial_active", data)
        self.assertIn("is_trial_expired", data)
        self.assertIn("days_left", data)
        self.assertIn("jobs_today_count", data)
        self.assertIn("jobs_today_soft_limit", data)
        self.assertIn("cleaners_count", data)
        self.assertIn("cleaners_soft_limit", data)


class TrialLimitsTestCase(TestCase):
    """Test trial limits enforcement"""

    def setUp(self):
        """Create test company with active trial"""
        self.client = APIClient()

        # Create company with active trial
        now = timezone.now()
        self.company = Company.objects.create(
            name="Test Company",
            plan=Company.PLAN_TRIAL,
            trial_started_at=now,
            trial_expires_at=now + timedelta(days=7),
        )

        # Create manager user
        self.user = User.objects.create_user(
            email="manager@test.com",
            password="testpass123",
            full_name="Test Manager",
            company=self.company,
            role="manager",
        )

        self.client.force_authenticate(user=self.user)

    def test_trial_cleaner_limit_reached(self):
        """Test cleaner limit enforcement during trial"""
        # Arrange: create max cleaners (2)
        for i in range(Company.TRIAL_MAX_CLEANERS):
            User.objects.create_user(
                email=f"cleaner{i}@test.com",
                phone=f"+971501234{i:02d}",
                password="testpass123",
                full_name=f"Cleaner {i}",
                company=self.company,
                role="cleaner",
            )

        # Act: try to create one more cleaner
        response = self.client.post(
            "/api/manager/cleaners/",
            {
                "email": "cleaner3@test.com",
                "phone": "+971501234567",
                "full_name": "Cleaner 3",
                "pin": "1234",
            },
        )

        # Assert: rejected with trial limit error
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        data = response.json()
        self.assertEqual(data["code"], "trial_cleaners_limit_reached")

    def test_trial_job_limit_not_enforced_on_active_plan(self):
        """Test that limits are not enforced on active plan"""
        # Arrange: upgrade to active
        self.company.plan = Company.PLAN_ACTIVE
        self.company.save()

        # Create max trial jobs (10)
        from apps.jobs.models import Job, Location

        location = Location.objects.create(
            name="Test Location",
            company=self.company,
            latitude=25.0,
            longitude=55.0,
        )

        for i in range(Company.TRIAL_MAX_JOBS):
            Job.objects.create(
                company=self.company,
                location=location,
                cleaner=self.user,
                scheduled_date=timezone.now().date(),
                scheduled_start_time="09:00",
                scheduled_end_time="10:00",
            )

        # Act: try to create one more job (should succeed on active plan)
        # Note: This would require mocking job creation endpoint
        # For now, just verify the model method
        self.assertFalse(self.company.trial_jobs_limit_reached())
