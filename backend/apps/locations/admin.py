from django.contrib import admin

from .models import (
    Location,
    ChecklistTemplate,
    ChecklistTemplateItem,
    LocationChecklistTemplate,
)


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company", "is_active", "created_at")
    list_filter = ("company", "is_active")
    search_fields = ("name", "address", "company__name")


class ChecklistTemplateItemInline(admin.TabularInline):
    model = ChecklistTemplateItem
    extra = 1


@admin.register(ChecklistTemplate)
class ChecklistTemplateAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company", "is_active", "created_at")
    list_filter = ("company", "is_active")
    search_fields = ("name", "description", "company__name")
    inlines = [ChecklistTemplateItemInline]


@admin.register(LocationChecklistTemplate)
class LocationChecklistTemplateAdmin(admin.ModelAdmin):
    list_display = ("id", "location", "template", "is_default", "created_at")
    list_filter = ("location__company", "is_default")
    search_fields = ("location__name", "template__name")
