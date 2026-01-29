from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Company, User


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "is_active",
        "suspended_at",
        "contact_email",
        "contact_phone",
        "created_at",
    )
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "contact_email", "contact_phone")

    readonly_fields = ("suspended_at", "created_at", "updated_at")

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "name",
                    "logo",
                    "logo_url",
                    "contact_email",
                    "contact_phone",
                    "default_work_start_time",
                    "default_work_end_time",
                    "notification_email",
                    "notification_enabled",
                    "ramadan_mode_enabled",
                ),
            },
        ),
        (
            "Billing / Status",
            {
                "fields": (
                    "plan",
                    "trial_started_at",
                    "trial_expires_at",
                    "is_active",
                    "suspended_at",
                    "suspended_reason",
                ),
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User

    list_display = (
        "id",
        "full_name",
        "email",
        "phone",
        "role",
        "company",
        "is_active",
        "is_staff",
    )
    list_filter = ("role", "company", "is_active", "is_staff")
    search_fields = ("full_name", "email", "phone")
    ordering = ("id",)

    fieldsets = (
        (None, {"fields": ("email", "phone", "password", "pin_hash")}),
        ("Personal info", {"fields": ("full_name", "photo_url", "company", "role")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "phone",
                    "full_name",
                    "company",
                    "role",
                    "password1",
                    "password2",
                ),
            },
        ),
    )

    readonly_fields = ("created_at", "updated_at")
