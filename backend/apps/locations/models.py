from django.db import models
from django.utils import timezone

from apps.accounts.models import Company


class Location(models.Model):
    """
    Локация клиента (офис, магазин, здание).
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="locations",
    )

    name = models.CharField(max_length=100)   # название локации
    address = models.TextField(blank=True)    # адрес как простой текст
    notes = models.TextField(blank=True)      # любые заметки менеджера

    # координаты локации (для check-in)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "locations"

    def __str__(self) -> str:
        return f"{self.name} ({self.company.name})"



class ChecklistTemplate(models.Model):
    """
    Шаблон чек-листа для компании (например 'Daily Office Cleaning').
    """

    # Context choices for product separation
    CONTEXT_CLEANING = "cleaning"
    CONTEXT_MAINTENANCE = "maintenance"
    CONTEXT_CHOICES = [
        (CONTEXT_CLEANING, "Cleaning"),
        (CONTEXT_MAINTENANCE, "Maintenance"),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="checklist_templates",
    )

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Product context: cleaning or maintenance (default: cleaning for backwards compatibility)
    context = models.CharField(
        max_length=20,
        choices=CONTEXT_CHOICES,
        default=CONTEXT_CLEANING,
        db_index=True,
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "checklist_templates"

    def __str__(self) -> str:
        return f"{self.name} ({self.company.name}) [{self.context}]"


class ChecklistTemplateItem(models.Model):
    """
    Конкретный пункт в шаблоне чек-листа.
    """

    template = models.ForeignKey(
        ChecklistTemplate,
        on_delete=models.CASCADE,
        related_name="items",
    )

    order = models.PositiveIntegerField(default=1)
    text = models.CharField(max_length=255)
    is_required = models.BooleanField(default=True)

    class Meta:
        db_table = "checklist_template_items"
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"{self.order}. {self.text}"


class LocationChecklistTemplate(models.Model):
    """
    Связь локации и шаблона чек-листа.
    Например: на этой локации используется такой-то шаблон.
    """

    location = models.ForeignKey(
        Location,
        on_delete=models.CASCADE,
        related_name="location_templates",
    )
    template = models.ForeignKey(
        ChecklistTemplate,
        on_delete=models.CASCADE,
        related_name="template_locations",
    )

    is_default = models.BooleanField(default=True)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "location_checklist_templates"
        unique_together = ("location", "template")

    def __str__(self) -> str:
        return f"{self.location} → {self.template}"
