from django.contrib import admin

from .models import Job, JobCheckEvent, JobChecklistItem


class JobChecklistItemInline(admin.TabularInline):
    model = JobChecklistItem
    extra = 0


class JobCheckEventInline(admin.TabularInline):
    model = JobCheckEvent
    extra = 0
    readonly_fields = ("event_time", "latitude", "longitude", "created_at")


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "location",
        "cleaner",
        "scheduled_date",
        "status",
        "actual_start_time",
        "actual_end_time",
    )
    list_filter = ("company", "location", "status", "scheduled_date")
    search_fields = ("location__name", "cleaner__full_name")
    readonly_fields = ("created_at", "updated_at", "actual_start_time", "actual_end_time")
    inlines = [JobChecklistItemInline, JobCheckEventInline]


@admin.register(JobCheckEvent)
class JobCheckEventAdmin(admin.ModelAdmin):
    list_display = ("id", "job", "event_type", "event_time", "latitude", "longitude")
    list_filter = ("event_type", "event_time")
    search_fields = ("job__location__name",)


@admin.register(JobChecklistItem)
class JobChecklistItemAdmin(admin.ModelAdmin):
    list_display = ("id", "job", "order", "text", "is_required", "is_completed")
    list_filter = ("is_required", "is_completed")
    search_fields = ("text", "job__location__name")
