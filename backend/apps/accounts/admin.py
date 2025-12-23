from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Company, User


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "contact_email", "contact_phone", "created_at")
    search_fields = ("name", "contact_email", "contact_phone")
    list_filter = ("created_at",)


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
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
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
