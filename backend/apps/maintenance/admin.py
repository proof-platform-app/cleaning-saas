from django.contrib import admin
from .models import AssetType, Asset


@admin.register(AssetType)
class AssetTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "company", "is_active", "created_at"]
    list_filter = ["is_active", "company"]
    search_fields = ["name", "description"]


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ["name", "asset_type", "location", "company", "is_active", "created_at"]
    list_filter = ["is_active", "asset_type", "location", "company"]
    search_fields = ["name", "serial_number", "description"]
    raw_id_fields = ["company", "location", "asset_type"]
