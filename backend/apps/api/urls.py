# backend/apps/api/urls.py
from django.urls import path
from django.http import JsonResponse

from apps.marketing.views import DemoRequestCreateView, ContactMessageCreateView
from . import analytics_views
from . import views

# NOTE:
# apps.api.views is a thin entry point that re-exports public API views
# from split modules:
# - views_auth.py
# - views_cleaner.py
# - views_manager_company.py
# - views_manager_jobs.py
# - views_reports.py
from apps.api import views as api_views

# 👉 ВАЖНО: импортируем из apps.locations.app.views, а НЕ из apps.locations.api.views
from apps.locations.app.views import (
    ManagerLocationsListCreateView,
    ManagerLocationDetailView,
)


def health_view(request):
  return JsonResponse({"status": "ok"})


urlpatterns = [
    # =====================
    # Health (no auth, no DB — for load balancer/nginx health checks)
    # Full path: /api/health/ (included under /api/ prefix)
    # =====================
    path("health/", health_view, name="api-health"),

    # =====================
    # Auth
    # =====================
    path(
        "auth/login/",
        api_views.LoginView.as_view(),
        name="api-login",
    ),
    path(
        "auth/cleaner-login/",
        api_views.CleanerPinLoginView.as_view(),
        name="api-cleaner-login",
    ),
    path(
        "manager/auth/login/",
        api_views.ManagerLoginView.as_view(),
        name="api-manager-login",
    ),
    path(
        "auth/signup/",
        api_views.ManagerSignupView.as_view(),
        name="api-auth-signup",
    ),

    # =====================
    # Cleaner jobs
    # =====================
    path(
        "jobs/today/",
        api_views.TodayJobsView.as_view(),
        name="jobs-today",
    ),
    path(
        "jobs/<int:pk>/",
        api_views.JobDetailView.as_view(),
        name="job-detail",
    ),
    # Check-in / check-out
    path(
        "jobs/<int:pk>/check-in/",
        api_views.JobCheckInView.as_view(),
        name="job-check-in",
    ),
    path(
        "jobs/<int:pk>/check-out/",
        api_views.JobCheckOutView.as_view(),
        name="job-check-out",
    ),
    # Checklist
    path(
        "jobs/<int:job_id>/checklist/bulk-update/",
        api_views.ChecklistBulkUpdateView.as_view(),
        name="job-checklist-bulk-update",
    ),
    path(
        "jobs/<int:job_id>/checklist/<int:item_id>/toggle/",
        api_views.ChecklistItemToggleView.as_view(),
        name="job-checklist-toggle",
    ),
    # Photos
    path(
        "jobs/<int:pk>/photos/",
        api_views.JobPhotosView.as_view(),
        name="job-photos",
    ),
    path(
        "jobs/<int:pk>/photos/<str:photo_type>/",
        api_views.JobPhotoDeleteView.as_view(),
        name="job-photo-delete",
    ),
    # PDF report
    path(
        "jobs/<int:pk>/report/pdf/",
        api_views.JobPdfReportView.as_view(),
        name="job-pdf-report",
    ),
    # Manager: email PDF
    path(
        "manager/jobs/<int:pk>/report/email/",
        api_views.ManagerJobPdfEmailView.as_view(),
        name="manager-job-report-email",
    ),
    # Manager: email history for Job PDF
    path(
        "manager/jobs/<int:pk>/report/emails/",
        api_views.ManagerJobReportEmailLogListView.as_view(),
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
        api_views.ManagerCompanyView.as_view(),
        name="manager-company",
    ),
    path(
        "manager/company/logo/",
        api_views.ManagerCompanyLogoUploadView.as_view(),
        name="manager-company-logo",
    ),
    # Team / Cleaners
    path(
        "manager/cleaners/",
        api_views.ManagerCleanersListCreateView.as_view(),
        name="manager-cleaners",
    ),
    path(
        "manager/cleaners/<int:pk>/",
        api_views.ManagerCleanerDetailView.as_view(),
        name="manager-cleaner-detail",
    ),
    path(
        "manager/cleaners/<int:pk>/reset-pin/",
        api_views.ManagerCleanerResetPinView.as_view(),
        name="manager-cleaner-reset-pin",
    ),
    # Meta for Create Job Drawer
    path(
        "manager/meta/",
        api_views.ManagerMetaView.as_view(),
        name="manager-meta",
    ),
    # Create job
    path(
        "manager/jobs/",
        api_views.ManagerJobsCreateView.as_view(),
        name="manager-jobs-create",
    ),
    path(
        "manager/jobs/today/",
        api_views.ManagerJobsTodayView.as_view(),
        name="manager-jobs-today",
    ),
    path(
        "manager/jobs/active/",
        api_views.ManagerJobsActiveView.as_view(),
        name="manager-jobs-active",
    ),
    path(
        "manager/jobs/<int:pk>/",
        api_views.ManagerJobDetailView.as_view(),
        name="manager-job-detail",
    ),
    path(
        "manager/jobs/<int:pk>/force-complete/",
        api_views.ManagerJobForceCompleteView.as_view(),
        name="manager-job-force-complete",
    ),
    # Jobs history
    path(
        "manager/jobs/history/",
        api_views.ManagerJobsHistoryView.as_view(),
        name="manager-jobs-history",
    ),
    # Manager performance
    path(
        "manager/performance/",
        api_views.ManagerPerformanceView.as_view(),
        name="manager-performance",
    ),
    # Jobs planning
    path(
        "manager/jobs/planning/",
        api_views.ManagerPlanningJobsView.as_view(),
        name="manager-jobs-planning",
    ),
    
    path(
        "manager/jobs/export/",
        views.ManagerJobsExportView.as_view(),
        name="manager-jobs-export",
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
        api_views.ManagerWeeklyReportView.as_view(),
        name="manager-reports-weekly",
    ),
    path(
        "manager/reports/monthly/",
        api_views.ManagerMonthlyReportView.as_view(),
        name="manager-reports-monthly",
    ),
    path(
        "manager/reports/weekly/pdf/",
        api_views.ManagerWeeklyReportPdfView.as_view(),
        name="manager-reports-weekly-pdf",
    ),
    path(
        "manager/reports/monthly/pdf/",
        api_views.ManagerMonthlyReportPdfView.as_view(),
        name="manager-reports-monthly-pdf",
    ),
    path(
        "manager/reports/weekly/email/",
        api_views.WeeklyReportEmailView.as_view(),
        name="manager-reports-weekly-email",
    ),
    path(
        "manager/reports/monthly/email/",
        api_views.MonthlyReportEmailView.as_view(),
        name="manager-reports-monthly-email",
    ),
    path(
        "manager/reports/violations/jobs/",
        api_views.ManagerViolationJobsView.as_view(),
        name="manager-violations-jobs",
    ),
    path(
        "manager/report-emails/",
        api_views.ManagerReportEmailLogListView.as_view(),
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
    path(
        "manager/analytics/locations-performance/",
        analytics_views.analytics_locations_performance,
        name="manager-analytics-locations-performance",
    ),
    path(
        "manager/analytics/locations-performance",
        analytics_views.analytics_locations_performance,
        name="manager-analytics-locations-performance-noslash",
    ),
    path(
        "manager/analytics/sla-breakdown/",
        analytics_views.analytics_sla_breakdown,
        name="manager-analytics-sla-breakdown",
    ),
    path(
        "manager/analytics/sla-breakdown",
        analytics_views.analytics_sla_breakdown,
        name="manager-analytics-sla-breakdown-noslash",
    ),
    path(
        "manager/analytics/violations-trend/",
        analytics_views.analytics_violations_trend,
        name="manager-analytics-violations-trend",
    ),
    path(
        "manager/analytics/sla-violations-trend/",
        analytics_views.analytics_violations_trend,
        name="manager-analytics-sla-violations-trend",
    ),
    path(
        "manager/analytics/sla-violations-trend",
        analytics_views.analytics_violations_trend,
        name="manager-analytics-sla-violations-trend-noslash",
    ),


    # =====================
    # Company (Org-scope, Owner/Manager)
    # =====================
    path(
        "company/",
        api_views.CompanyView.as_view(),
        name="company-profile",
    ),
    path(
        "company/logo/",
        api_views.CompanyLogoUploadView.as_view(),
        name="company-logo",
    ),
    path(
        "company/cleaners/",
        api_views.CompanyCleanersView.as_view(),
        name="company-cleaners",
    ),
    path(
        "company/cleaners/<int:pk>/reset-access/",
        api_views.CompanyCleanerResetAccessView.as_view(),
        name="company-cleaner-reset-access",
    ),
    path(
        "company/cleaners/<int:pk>/audit-log/",
        api_views.CompanyCleanerAuditLogView.as_view(),
        name="company-cleaner-audit-log",
    ),
    # Console users (team members: owner, manager, staff)
    path(
        "company/users/",
        api_views.CompanyUsersView.as_view(),
        name="company-users",
    ),
    path(
        "company/users/<int:pk>/",
        api_views.CompanyUserDetailView.as_view(),
        name="company-user-detail",
    ),
    path(
        "company/users/<int:pk>/reset-password/",
        api_views.CompanyUserResetPasswordView.as_view(),
        name="company-user-reset-password",
    ),

    # =====================
    # Owner
    # =====================
    path(
        "owner/overview/",
        api_views.OwnerOverviewView.as_view(),
        name="owner-overview",
    ),

    # =====================
    # Maintenance Context (Assets)
    # See: docs/product/MAINTENANCE_CONTEXT_V1_SCOPE.md
    # =====================
    path(
        "manager/asset-types/",
        api_views.AssetTypeListCreateView.as_view(),
        name="manager-asset-types",
    ),
    path(
        "manager/asset-types/<int:pk>/",
        api_views.AssetTypeDetailView.as_view(),
        name="manager-asset-type-detail",
    ),
    path(
        "manager/assets/",
        api_views.AssetListCreateView.as_view(),
        name="manager-assets",
    ),
    path(
        "manager/assets/<int:pk>/",
        api_views.AssetDetailView.as_view(),
        name="manager-asset-detail",
    ),
]
