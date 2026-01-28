from django.urls import path

from apps.api.views import (
    # Auth
    LoginView,
    ManagerLoginView,
    ManagerSignupView,

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
    ManagerJobsHistoryView,
    ManagerPerformanceView,

    # Create Job
    ManagerMetaView,
    ManagerJobsCreateView,

    # Company & Cleaners
    ManagerCompanyView,
    ManagerCompanyLogoUploadView,
    ManagerCleanersListCreateView,
    ManagerCleanerDetailView,

    # Reports
    ManagerWeeklyReportView,
    ManagerMonthlyReportView,
    ManagerWeeklyReportPdfView,    
    ManagerMonthlyReportPdfView,     
)

# 👉 ВАЖНО: импортируем из apps.locations.app.views, а НЕ из apps.locations.api.views
from apps.locations.app.views import (
    ManagerLocationsListCreateView,
    ManagerLocationDetailView,
)

urlpatterns = [
    # =====================
    # Auth
    # =====================
    path("auth/login/", LoginView.as_view(), name="api-login"),
    path("manager/auth/login/", ManagerLoginView.as_view(), name="api-manager-login"),
    path(
        "auth/signup/",
        ManagerSignupView.as_view(),
        name="api-auth-signup",
    ),

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

    # Jobs history
    path(
        "manager/jobs/history/",
        ManagerJobsHistoryView.as_view(),
        name="manager-jobs-history",
    ),

    # Manager performance
    path(
        "manager/performance/",
        ManagerPerformanceView.as_view(),
        name="manager-performance",
    ),

    # Jobs planning
    path(
        "manager/jobs/planning/",
        ManagerPlanningJobsView.as_view(),
        name="manager-jobs-planning",
    ),

    # =====================
    # Locations
    # =====================
    path(
        "manager/locations/",
        ManagerLocationsListCreateView.as_view(),
        name="manager-locations",
    ),
    path(
        "manager/locations/<int:pk>/",
        ManagerLocationDetailView.as_view(),
        name="manager-location-detail",
    ),

    # =====================
    # Reports
    # =====================
    path(
        "manager/reports/weekly/",
        ManagerWeeklyReportView.as_view(),
        name="manager-reports-weekly",
    ),
    path(
        "manager/reports/monthly/",
        ManagerMonthlyReportView.as_view(),
        name="manager-reports-monthly",
    ),
        path(
        "manager/reports/weekly/pdf/",
        ManagerWeeklyReportPdfView.as_view(),
        name="manager-reports-weekly-pdf",
    ),
    path(
        "manager/reports/monthly/pdf/",
        ManagerMonthlyReportPdfView.as_view(),
        name="manager-reports-monthly-pdf",
    ),
]