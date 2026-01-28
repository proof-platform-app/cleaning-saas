from django.db import models


class DemoRequest(models.Model):
    company_name = models.CharField(max_length=255)
    role = models.CharField(max_length=64, blank=True)
    cleaner_count = models.CharField(max_length=32, blank=True)
    contact = models.CharField(max_length=255)  # WhatsApp или email
    country = models.CharField(max_length=128, blank=True)
    primary_pain = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:  # type: ignore[override]
        return f"{self.company_name} ({self.contact})"

class ContactMessage(models.Model):
    name = models.CharField(max_length=255)
    company = models.CharField(max_length=255, blank=True)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:  # type: ignore[override]
        return f"{self.name} <{self.email}>"
