from django.urls import path

from apps.api.views import (
    # Auth
    LoginView,
    ManagerLoginView,

    # Cleaner jobs
    TodayJobsView,
    JobDetailView,
    JobCheckInView,
    JobCheckOutView,

    # Checklist
    ChecklistBulkUpdateView,
    ChecklistItemToggleView,

    # Photos
    JobPhotosView,
    JobPhotoDeleteView,

    # PDF
    JobPdfReportView,
    ManagerJobPdfEmailView,

    # Manager jobs
    ManagerJobsTodayView,
    ManagerJobDetailView,
    ManagerPlanningJobsView,

    # Create Job
    ManagerMetaView,
    ManagerJobsCreateView,

    # Company & Cleaners (NEW)
    ManagerCompanyView,
    ManagerCompanyLogoUploadView,
    ManagerCleanersListCreateView,
    ManagerCleanerDetailView,
)

urlpatterns = [
    # =====================
    # Auth
    # =====================
    path("auth/login/", LoginView.as_view(), name="api-login"),
    path("manager/auth/login/", ManagerLoginView.as_view(), name="api-manager-login"),

    # =====================
    # Cleaner jobs
    # =====================
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
    path(
        "jobs/<int:pk>/report/pdf/",
        JobPdfReportView.as_view(),
        name="job-pdf-report",
    ),

    # Manager: email PDF (MVP stub)
    path(
        "manager/jobs/<int:pk>/report/email/",
        ManagerJobPdfEmailView.as_view(),
        name="manager-job-report-email",
    ),

    # =====================
    # Manager
    # =====================

    # Company profile & logo
    path(
        "manager/company/",
        ManagerCompanyView.as_view(),
        name="manager-company",
    ),
    path(
        "manager/company/logo/",
        ManagerCompanyLogoUploadView.as_view(),
        name="manager-company-logo",
    ),

    # Team / Cleaners
    path(
        "manager/cleaners/",
        ManagerCleanersListCreateView.as_view(),
        name="manager-cleaners",
    ),
    path(
        "manager/cleaners/<int:pk>/",
        ManagerCleanerDetailView.as_view(),
        name="manager-cleaner-detail",
    ),

    # Meta for Create Job Drawer
    path("manager/meta/", ManagerMetaView.as_view(), name="manager-meta"),

    # Create job
    path("manager/jobs/", ManagerJobsCreateView.as_view(), name="manager-jobs-create"),

    path(
        "manager/jobs/today/",
        ManagerJobsTodayView.as_view(),
        name="manager-jobs-today",
    ),
    path(
        "manager/jobs/<int:pk>/",
        ManagerJobDetailView.as_view(),
        name="manager-job-detail",
    ),
    path(
        "manager/jobs/planning/",
        ManagerPlanningJobsView.as_view(),
        name="manager-jobs-planning",
    ),
]
