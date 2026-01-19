from django.urls import path

from apps.api.views import (
    LoginView,
    ManagerLoginView,
    TodayJobsView,
    JobDetailView,
    JobCheckInView,
    JobCheckOutView,
    ChecklistBulkUpdateView,
    ChecklistItemToggleView,
    JobPhotosView,
    JobPhotoDeleteView,
    JobPdfReportView,
    ManagerJobsTodayView,
    ManagerJobDetailView,
    ManagerPlanningJobsView,
)

urlpatterns = [
    # Auth
    path("auth/login/", LoginView.as_view(), name="api-login"),
    path("manager/auth/login/", ManagerLoginView.as_view(), name="api-manager-login"),

    # Cleaner jobs
    path("jobs/today/", TodayJobsView.as_view(), name="jobs-today"),
    path("jobs/<int:pk>/", JobDetailView.as_view(), name="job-detail"),

    # Check-in / check-out
    path("jobs/<int:pk>/check-in/", JobCheckInView.as_view(), name="job-check-in"),
    path("jobs/<int:pk>/check-out/", JobCheckOutView.as_view(), name="job-check-out"),

    # Checklist
    path(
        "jobs/<int:job_id>/checklist/bulk-update/",
        ChecklistBulkUpdateView.as_view(),
        name="job-checklist-bulk-update",
    ),
    path(
        "jobs/<int:job_id>/checklist/<int:item_id>/toggle/",
        ChecklistItemToggleView.as_view(),
        name="job-checklist-toggle",
    ),

    # Photos
    path("jobs/<int:pk>/photos/", JobPhotosView.as_view(), name="job-photos"),
    path(
        "jobs/<int:pk>/photos/<str:photo_type>/",
        JobPhotoDeleteView.as_view(),
        name="job-photo-delete",
    ),

    # PDF report
    path("jobs/<int:pk>/report/pdf/", JobPdfReportView.as_view(), name="job-pdf-report"),

    # ===== Manager =====
    path("manager/jobs/today/", ManagerJobsTodayView.as_view(), name="manager-jobs-today"),
    path("manager/jobs/<int:pk>/", ManagerJobDetailView.as_view(), name="manager-job-detail"),
    path("manager/jobs/planning/", ManagerPlanningJobsView.as_view(), name="manager-jobs-planning"),
]
