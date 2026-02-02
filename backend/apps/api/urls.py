# backend/apps/api/urls.py
from django.urls import path
from apps.marketing.views import DemoRequestCreateView, ContactMessageCreateView
from . import analytics_views

from apps.api.views import (
    # Auth
    LoginView,
    CleanerPinLoginView,
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
    ManagerJobReportEmailLogListView,
    # Manager jobs
    ManagerJobsTodayView,
    ManagerJobDetailView,
    ManagerPlanningJobsView,
    ManagerJobsHistoryView,
    ManagerJobForceCompleteView,
    ManagerPerformanceView,
    # Create Job
    ManagerMetaView,
    ManagerJobsCreateView,
    # Company & Cleaners
    ManagerCompanyView,
    ManagerCompanyLogoUploadView,
    ManagerCleanersListCreateView,
    ManagerCleanerDetailView,
    ManagerCleanerResetPinView,
    # Reports
    ManagerWeeklyReportView,
    ManagerMonthlyReportView,
    ManagerWeeklyReportPdfView,
    ManagerMonthlyReportPdfView,
    WeeklyReportEmailView,
    MonthlyReportEmailView,
    ManagerViolationJobsView,
    ManagerReportEmailLogListView,
    # Owner
    OwnerOverviewView,
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
    path(
        "auth/cleaner-login/",
        CleanerPinLoginView.as_view(),
        name="api-cleaner-login",
    ),
    path(
        "manager/auth/login/",
        ManagerLoginView.as_view(),
        name="api-manager-login",
    ),
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
    path(
        "jobs/<int:pk>/check-in/",
        JobCheckInView.as_view(),
        name="job-check-in",
    ),
    path(
        "jobs/<int:pk>/check-out/",
        JobCheckOutView.as_view(),
        name="job-check-out",
    ),
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
    # Manager: email PDF
    path(
        "manager/jobs/<int:pk>/report/email/",
        ManagerJobPdfEmailView.as_view(),
        name="manager-job-report-email",
    ),
    # Manager: email history for Job PDF
    path(
        "manager/jobs/<int:pk>/report/emails/",
        ManagerJobReportEmailLogListView.as_view(),
        name="manager-job-report-email-log-list",
    ),
    # =====================
    # Marketing
    # =====================
    path(
        "public/demo-requests/",
        DemoRequestCreateView.as_view(),
        name="public-demo-request-create",
    ),
    path(
        "public/contact-messages/",
        ContactMessageCreateView.as_view(),
        name="public-contact-message-create",
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
    path(
        "manager/cleaners/<int:pk>/reset-pin/",
        ManagerCleanerResetPinView.as_view(),
        name="manager-cleaner-reset-pin",
    ),
    # Meta for Create Job Drawer
    path("manager/meta/", ManagerMetaView.as_view(), name="manager-meta"),
    # Create job
    path(
        "manager/jobs/",
        ManagerJobsCreateView.as_view(),
        name="manager-jobs-create",
    ),
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
        "manager/jobs/<int:pk>/force-complete/",
        ManagerJobForceCompleteView.as_view(),
        name="manager-job-force-complete",
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
    path(
        "manager/reports/weekly/email/",
        WeeklyReportEmailView.as_view(),
    ),
    path(
        "manager/reports/monthly/email/",
        MonthlyReportEmailView.as_view(),
    ),
    path(
        "manager/reports/violations/jobs/",
        ManagerViolationJobsView.as_view(),
        name="manager-violations-jobs",
    ),
    path(
        "manager/report-emails/",
        ManagerReportEmailLogListView.as_view(),
        name="manager-report-email-logs",
    ),

    # =====================
    # Analytics
    # =====================
    path(
        "manager/analytics/summary/",
        analytics_views.analytics_summary,
        name="manager-analytics-summary",
    ),
    path(  # без слэша в конце
        "manager/analytics/summary",
        analytics_views.analytics_summary,
        name="manager-analytics-summary-noslash",
    ),
    path(
        "manager/analytics/jobs-completed/",
        analytics_views.analytics_jobs_completed,
        name="manager-analytics-jobs-completed",
    ),
    path(
        "manager/analytics/jobs-completed",
        analytics_views.analytics_jobs_completed,
        name="manager-analytics-jobs-completed-noslash",
    ),
    path(
        "manager/analytics/job-duration/",
        analytics_views.analytics_job_duration,
        name="manager-analytics-job-duration",
    ),
    path(
        "manager/analytics/job-duration",
        analytics_views.analytics_job_duration,
        name="manager-analytics-job-duration-noslash",
    ),
    path(
        "manager/analytics/proof-completion/",
        analytics_views.analytics_proof_completion,
        name="manager-analytics-proof-completion",
    ),
    path(
        "manager/analytics/proof-completion",
        analytics_views.analytics_proof_completion,
        name="manager-analytics-proof-completion-noslash",
    ),
    path(
        "manager/analytics/cleaners-performance/",
        analytics_views.analytics_cleaners_performance,
        name="manager-analytics-cleaners-performance",
    ),
    path(
        "manager/analytics/cleaners-performance",
        analytics_views.analytics_cleaners_performance,
        name="manager-analytics-cleaners-performance-noslash",
    ),

    # =====================
    # Owner
    # =====================
    path(
        "owner/overview/",
        OwnerOverviewView.as_view(),
        name="owner-overview",
    ),
]
