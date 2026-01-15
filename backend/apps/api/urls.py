# backend/apps/api/urls.py
from django.urls import path

from .views import (
    LoginView,
    ManagerLoginView,
    TodayJobsView,
    JobDetailView,
    JobCheckInView,
    JobCheckOutView,
    ChecklistItemToggleView,
    ChecklistBulkUpdateView,
    JobPdfReportView,
    JobPhotosView,
    JobPhotoDeleteView,
    ManagerJobsTodayView,
    ManagerJobDetailView,
)

urlpatterns = [
    # Auth
    path("auth/login/", LoginView.as_view(), name="api-login"),
    path("manager/auth/login/", ManagerLoginView.as_view(), name="api-manager-login"),

    # Cleaner jobs
    path("jobs/today/", TodayJobsView.as_view(), name="api-jobs-today"),
    path("jobs/<int:pk>/", JobDetailView.as_view(), name="api-job-detail"),
    path("jobs/<int:pk>/check-in/", JobCheckInView.as_view(), name="api-job-check-in"),
    path("jobs/<int:pk>/check-out/", JobCheckOutView.as_view(), name="api-job-check-out"),

    # Checklist
    path(
        "jobs/<int:job_id>/checklist/<int:item_id>/toggle/",
        ChecklistItemToggleView.as_view(),
        name="api-job-checklist-toggle",
    ),
    path(
        "jobs/<int:job_id>/checklist/bulk/",
        ChecklistBulkUpdateView.as_view(),
        name="api-job-checklist-bulk",
    ),

    # Reports
    path(
        "jobs/<int:pk>/report/pdf/",
        JobPdfReportView.as_view(),
        name="api-job-report-pdf",
    ),

    # Photos (before / after) — cleaner side
    path(
        "jobs/<int:pk>/photos/",
        JobPhotosView.as_view(),
        name="api-job-photos",
    ),
    path(
        "jobs/<int:pk>/photos/<str:photo_type>/",
        JobPhotoDeleteView.as_view(),
        name="api-job-photo-delete",
    ),

    # Manager dashboard
    path(
        "manager/jobs/today/",
        ManagerJobsTodayView.as_view(),
        name="api-manager-jobs-today",
    ),
    path(
        "manager/jobs/<int:pk>/",
        ManagerJobDetailView.as_view(),
        name="api-manager-job-detail",
    ),
]
