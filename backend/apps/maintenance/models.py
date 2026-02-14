"""
Maintenance Context Models (V1)

These models support the Maintenance Context operational layer.
See: docs/product/MAINTENANCE_CONTEXT_V1_SCOPE.md

IMPORTANT: These are additive models only. They do not modify
Platform Layer invariants (roles, lifecycle, billing, RBAC).
"""

from django.db import models
from apps.accounts.models import Company
from apps.locations.models import Location


class MaintenanceCategory(models.Model):
    """
    Service category for maintenance visits.

    Examples: Preventive, Corrective, Emergency, Inspection

    Company-scoped: each company defines their own categories.
    Used to classify Jobs when they are maintenance service visits.
    """
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="maintenance_categories"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = ["company", "name"]
        verbose_name_plural = "Maintenance categories"

    def __str__(self):
        return self.name


class AssetType(models.Model):
    """
    Asset classification/category.

    Examples: HVAC, Electrical, Plumbing, Elevator, IT Infrastructure

    Company-scoped: each company manages their own asset types.
    """
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="asset_types"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = ["company", "name"]

    def __str__(self):
        return self.name


class Asset(models.Model):
    """
    Physical asset being serviced.

    Examples: "AHU-01 Main Building", "Elevator #2", "Server Rack A"

    Company-scoped with required location and asset type.
    Jobs can optionally link to an asset for service visit tracking.
    """
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="assets"
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="assets"
    )
    asset_type = models.ForeignKey(
        AssetType,
        on_delete=models.PROTECT,
        related_name="assets"
    )
    name = models.CharField(max_length=200)
    serial_number = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.asset_type.name})"
