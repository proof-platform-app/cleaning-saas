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
