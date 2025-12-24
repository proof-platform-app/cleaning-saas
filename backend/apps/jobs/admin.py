from django.contrib import admin

from .models import Job, JobCheckEvent


class JobCheckEventInline(admin.TabularInline):
    model = JobCheckEvent
    extra = 0
    can_delete = False
    readonly_fields = (
        "event_type",
        "latitude",
        "longitude",
        "distance_m",
        "created_at",
        "user",
    )
    fields = (
        "event_type",
        "latitude",
        "longitude",
        "distance_m",
        "created_at",
        "user",
    )


@admin.register(JobCheckEvent)
class JobCheckEventAdmin(admin.ModelAdmin):
    list_display = ("id", "job", "user", "event_type", "created_at", "distance_m")
    list_filter = ("event_type", "created_at", "user")
    readonly_fields = (
        "job",
        "user",
        "event_type",
        "latitude",
        "longitude",
        "distance_m",
        "created_at",
    )


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ("id", "cleaner", "location", "scheduled_date", "status")
    inlines = [JobCheckEventInline]
