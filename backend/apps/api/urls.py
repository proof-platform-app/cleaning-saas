# backend/apps/api/urls.py
from django.urls import path

from .views import (
    LoginView,
    TodayJobsView,
    JobDetailView,
    JobCheckInView,
    JobCheckOutView,
    ChecklistItemToggleView,
    ChecklistBulkUpdateView,
    JobPdfReportView,
)

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="api-login"),

    path("jobs/today/", TodayJobsView.as_view(), name="api-jobs-today"),
    path("jobs/<int:pk>/", JobDetailView.as_view(), name="api-job-detail"),

    path("jobs/<int:pk>/check-in/", JobCheckInView.as_view(), name="api-job-check-in"),
    path("jobs/<int:pk>/check-out/", JobCheckOutView.as_view(), name="api-job-check-out"),

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

    path(
        "jobs/<int:pk>/report/pdf/",
        JobPdfReportView.as_view(),
        name="api-job-report-pdf",
    ),
]
