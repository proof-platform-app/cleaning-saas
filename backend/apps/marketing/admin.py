from django.contrib import admin
from .models import DemoRequest, ContactMessage, ReportEmailLog


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


@admin.register(ReportEmailLog)
class ReportEmailLogAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "company_id",
        "kind",
        "target_object",
        "to_email",
        "status",
    )
    list_filter = (
        "company_id",
        "kind",
        "status",
        "created_at",
    )
    search_fields = (
        "to_email",
        "subject",
        "job_id",
        "user__email",
        "user__full_name",
    )
    # company / job больше не FK, поэтому из autocomplete убираем,
    # оставляем только user (AUTH_USER_MODEL).
    autocomplete_fields = ("user",)
    date_hierarchy = "created_at"
    ordering = ("-created_at",)

    def target_object(self, obj: ReportEmailLog):
        if obj.kind == obj.KIND_JOB_REPORT and obj.job_id:
            return f"Job #{obj.job_id}"
        if obj.period_from and obj.period_to:
            return f"{obj.period_from}–{obj.period_to}"
        return "—"

    target_object.short_description = "Target"
