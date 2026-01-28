from django.contrib import admin
from .models import DemoRequest, ContactMessage


@admin.register(DemoRequest)
class DemoRequestAdmin(admin.ModelAdmin):
    list_display = (
        "company_name",
        "contact",
        "country",
        "primary_pain",
        "cleaner_count",
        "created_at",
    )
    list_filter = ("country", "primary_pain", "created_at")
    search_fields = ("company_name", "contact", "country")
    ordering = ("-created_at",)


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "company", "created_at")
    search_fields = ("name", "email", "company", "message")
    list_filter = ("created_at",)
    ordering = ("-created_at",)
