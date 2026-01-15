from django.contrib import admin

from .models import Job, JobCheckEvent

from .models import File, JobPhoto



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

@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ("id", "original_name", "content_type", "size_bytes", "created_at")
    search_fields = ("original_name", "file_url")
    readonly_fields = ("created_at",)


@admin.register(JobPhoto)
class JobPhotoAdmin(admin.ModelAdmin):
    list_display = ("id", "job", "photo_type", "created_at")
    list_filter = ("photo_type",)
    search_fields = ("job__id",)
    readonly_fields = ("created_at",)
