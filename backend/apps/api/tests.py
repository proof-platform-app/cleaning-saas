# backend/apps/api/tests.py
import shutil
import tempfile

from django.test import TestCase, override_settings

from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

from apps.accounts.models import Company, User
from apps.locations.models import Location
from apps.jobs.models import Job, JobPhoto, File


# 1x1 PNG (валидная картинка, чтобы DRF ImageField не ругался)
PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\xf8\x0f"
    b"\x00\x01\x01\x01\x00\x18\xdd\x8d\xe1\x00\x00\x00\x00IEND\xaeB`\x82"
)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class JobPhotosApiTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        # подчистим MEDIA_ROOT, который создали override_settings
        media_root = cls._overridden_settings.get("MEDIA_ROOT")
        try:
            shutil.rmtree(media_root, ignore_errors=True)
        except Exception:
            pass
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()

        self.company = Company.objects.create(name="TestCo")

        self.cleaner = User.objects.create_user(
            email="cleaner@test.com",
            phone="+15550001111",
            password="pass12345",
            role=User.ROLE_CLEANER,
            company=self.company,
            is_active=True,
)
        self.token = Token.objects.create(user=self.cleaner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        self.location = Location.objects.create(
            company=self.company,
            name="Office Tower A",
            address="Somewhere",
            latitude=25.2048,
            longitude=55.2708,
        )

        self.job = Job.objects.create(
            company=self.company,
            location=self.location,
            cleaner=self.cleaner,
            scheduled_date="2026-01-15",
            status=Job.STATUS_IN_PROGRESS,
        )

    def _upload(self, photo_type: str):
        from django.core.files.uploadedfile import SimpleUploadedFile

        upload = SimpleUploadedFile(
            name="test.png",
            content=PNG_1X1,
            content_type="image/png",
        )
        url = f"/api/jobs/{self.job.id}/photos/"
        return self.client.post(url, data={"photo_type": photo_type, "file": upload}, format="multipart")

    def test_after_requires_before(self):
        resp = self._upload("after")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Cannot upload after photo before before photo.", resp.data.get("detail", ""))

    def test_upload_before_then_after_and_delete_rules(self):
        # upload before
        r1 = self._upload("before")
        self.assertEqual(r1.status_code, 201)

        # upload after
        r2 = self._upload("after")
        self.assertEqual(r2.status_code, 201)

        # cannot delete before while after exists
        del_before = self.client.delete(f"/api/jobs/{self.job.id}/photos/before/")
        self.assertEqual(del_before.status_code, 400)
        self.assertIn("Cannot delete before photo while after photo exists.", del_before.data.get("detail", ""))

        # delete after ok
        del_after = self.client.delete(f"/api/jobs/{self.job.id}/photos/after/")
        self.assertEqual(del_after.status_code, 204)

        # now delete before ok
        del_before2 = self.client.delete(f"/api/jobs/{self.job.id}/photos/before/")
        self.assertEqual(del_before2.status_code, 204)

    def test_delete_only_in_progress(self):
        # создадим фотку напрямую (чтобы не зависеть от upload)
        f = File.objects.create(file_url="/media/company/1/jobs/999/photos/before/x.png")
        JobPhoto.objects.create(job=self.job, file=f, photo_type=JobPhoto.TYPE_BEFORE)

        # сделаем job completed
        self.job.status = Job.STATUS_COMPLETED
        self.job.save(update_fields=["status"])

        resp = self.client.delete(f"/api/jobs/{self.job.id}/photos/before/")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Photos can be deleted only when job is in progress.", resp.data.get("detail", ""))


# =============================================================================
# Cross-Context Guardrail Tests
# =============================================================================

class CrossContextGuardrailTests(TestCase):
    """
    Guardrail tests to ensure Cleaning and Maintenance contexts remain isolated.

    These tests are critical for preventing regressions when modifying
    shared job infrastructure. Any breaking change here must be investigated.

    Test coverage:
    1. test_cleaning_jobs_endpoints_return_200 - Cleaning endpoints availability
    2. test_maintenance_service_visits_return_200 - Maintenance endpoint availability
    3. test_cleaning_does_not_show_maintenance_jobs - Context isolation (cleaning side)
    4. test_maintenance_does_not_show_cleaning_jobs - Context isolation (maintenance side)
    """

    @classmethod
    def setUpTestData(cls):
        """Set up test data for all tests in this class."""
        from datetime import date, timedelta

        cls.company = Company.objects.create(name="GuardrailTestCo")

        # Manager user for API access
        cls.manager = User.objects.create_user(
            email="manager@guardrail.test",
            phone="+15550009999",
            password="testpass123",
            role=User.ROLE_MANAGER,
            company=cls.company,
            is_active=True,
        )

        # Cleaner for job assignments
        cls.cleaner = User.objects.create_user(
            email="cleaner@guardrail.test",
            phone="+15550008888",
            password="testpass123",
            role=User.ROLE_CLEANER,
            company=cls.company,
            is_active=True,
        )

        # Location for jobs
        cls.location = Location.objects.create(
            company=cls.company,
            name="Test Location",
            address="123 Test St",
            latitude=25.2048,
            longitude=55.2708,
        )

        # Fixed dates for deterministic tests
        cls.today = date(2026, 2, 15)
        cls.yesterday = cls.today - timedelta(days=1)
        cls.tomorrow = cls.today + timedelta(days=1)

        # Create cleaning context job
        cls.cleaning_job = Job.objects.create(
            company=cls.company,
            location=cls.location,
            cleaner=cls.cleaner,
            scheduled_date=cls.today,
            status=Job.STATUS_SCHEDULED,
            context=Job.CONTEXT_CLEANING,
        )

        # Create maintenance context job
        cls.maintenance_job = Job.objects.create(
            company=cls.company,
            location=cls.location,
            cleaner=cls.cleaner,
            scheduled_date=cls.today,
            status=Job.STATUS_SCHEDULED,
            context=Job.CONTEXT_MAINTENANCE,
        )

    def setUp(self):
        """Set up API client with manager authentication."""
        from rest_framework.authtoken.models import Token

        self.client = APIClient()
        self.token, _ = Token.objects.get_or_create(user=self.manager)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    # -------------------------------------------------------------------------
    # Test 1: Cleaning endpoints return 200
    # -------------------------------------------------------------------------
    def test_cleaning_jobs_endpoints_return_200(self):
        """
        Verify all cleaning manager endpoints return 200 OK.

        Endpoints tested:
        - /api/manager/jobs/today/
        - /api/manager/jobs/active/
        - /api/manager/jobs/planning/?date=YYYY-MM-DD
        - /api/manager/jobs/history/?date_from=&date_to=
        - /api/manager/jobs/export/?from=&to=

        If any endpoint returns 500, the task is NOT complete.
        """
        from django.test.utils import override_settings
        from django.utils import timezone
        from unittest.mock import patch

        # Mock timezone.localdate() to return our fixed test date
        with patch('django.utils.timezone.localdate') as mock_localdate:
            mock_localdate.return_value = self.today

            # 1. Today jobs
            resp_today = self.client.get("/api/manager/jobs/today/")
            self.assertEqual(
                resp_today.status_code, 200,
                f"Today endpoint failed: {resp_today.status_code} - {resp_today.data}"
            )

            # 2. Active jobs
            resp_active = self.client.get("/api/manager/jobs/active/")
            self.assertEqual(
                resp_active.status_code, 200,
                f"Active endpoint failed: {resp_active.status_code} - {resp_active.data}"
            )

            # 3. Planning jobs (requires date param)
            resp_planning = self.client.get(
                f"/api/manager/jobs/planning/?date={self.today.isoformat()}"
            )
            self.assertEqual(
                resp_planning.status_code, 200,
                f"Planning endpoint failed: {resp_planning.status_code} - {resp_planning.data}"
            )

            # 4. History jobs (requires date_from and date_to)
            resp_history = self.client.get(
                f"/api/manager/jobs/history/?date_from={self.yesterday.isoformat()}&date_to={self.tomorrow.isoformat()}"
            )
            self.assertEqual(
                resp_history.status_code, 200,
                f"History endpoint failed: {resp_history.status_code} - {resp_history.data}"
            )

            # 5. Export jobs (requires from and to)
            resp_export = self.client.get(
                f"/api/manager/jobs/export/?from={self.yesterday.isoformat()}&to={self.tomorrow.isoformat()}"
            )
            self.assertEqual(
                resp_export.status_code, 200,
                f"Export endpoint failed: {resp_export.status_code}"
            )

    # -------------------------------------------------------------------------
    # Test 2: Maintenance service-visits endpoint returns 200
    # -------------------------------------------------------------------------
    def test_maintenance_service_visits_return_200(self):
        """
        Verify maintenance service-visits endpoint returns 200 OK.

        Endpoint tested:
        - /api/manager/service-visits/

        If this endpoint returns 500, the task is NOT complete.
        """
        resp = self.client.get("/api/manager/service-visits/")
        self.assertEqual(
            resp.status_code, 200,
            f"Service visits endpoint failed: {resp.status_code} - {resp.data}"
        )

    # -------------------------------------------------------------------------
    # Test 3: Cleaning does not show maintenance jobs
    # -------------------------------------------------------------------------
    def test_cleaning_does_not_show_maintenance_jobs(self):
        """
        Verify cleaning endpoints do NOT return maintenance context jobs.

        This is a critical invariant for context separation.
        Cleaning UI must never display maintenance service visits.
        """
        from unittest.mock import patch

        with patch('django.utils.timezone.localdate') as mock_localdate:
            mock_localdate.return_value = self.today

            # Get today jobs (cleaning context)
            resp_today = self.client.get("/api/manager/jobs/today/")
            self.assertEqual(resp_today.status_code, 200)

            job_ids_today = [job["id"] for job in resp_today.data]

            # Cleaning job MUST be present
            self.assertIn(
                self.cleaning_job.id,
                job_ids_today,
                "Cleaning job should appear in /api/manager/jobs/today/"
            )

            # Maintenance job MUST NOT be present
            self.assertNotIn(
                self.maintenance_job.id,
                job_ids_today,
                "Maintenance job should NOT appear in /api/manager/jobs/today/"
            )

            # Also verify in active jobs
            resp_active = self.client.get("/api/manager/jobs/active/")
            self.assertEqual(resp_active.status_code, 200)

            job_ids_active = [job["id"] for job in resp_active.data]

            self.assertIn(
                self.cleaning_job.id,
                job_ids_active,
                "Cleaning job should appear in /api/manager/jobs/active/"
            )

            self.assertNotIn(
                self.maintenance_job.id,
                job_ids_active,
                "Maintenance job should NOT appear in /api/manager/jobs/active/"
            )

            # Also verify in planning
            resp_planning = self.client.get(
                f"/api/manager/jobs/planning/?date={self.today.isoformat()}"
            )
            self.assertEqual(resp_planning.status_code, 200)

            job_ids_planning = [job["id"] for job in resp_planning.data]

            self.assertIn(
                self.cleaning_job.id,
                job_ids_planning,
                "Cleaning job should appear in /api/manager/jobs/planning/"
            )

            self.assertNotIn(
                self.maintenance_job.id,
                job_ids_planning,
                "Maintenance job should NOT appear in /api/manager/jobs/planning/"
            )

    # -------------------------------------------------------------------------
    # Test 4: Maintenance does not show cleaning jobs
    # -------------------------------------------------------------------------
    def test_maintenance_does_not_show_cleaning_jobs(self):
        """
        Verify maintenance endpoint does NOT return cleaning context jobs.

        This is a critical invariant for context separation.
        Maintenance UI must never display cleaning jobs.
        """
        resp = self.client.get("/api/manager/service-visits/")
        self.assertEqual(resp.status_code, 200)

        visit_ids = [visit["id"] for visit in resp.data]

        # Maintenance job MUST be present
        self.assertIn(
            self.maintenance_job.id,
            visit_ids,
            "Maintenance job should appear in /api/manager/service-visits/"
        )

        # Cleaning job MUST NOT be present
        self.assertNotIn(
            self.cleaning_job.id,
            visit_ids,
            "Cleaning job should NOT appear in /api/manager/service-visits/"
        )
