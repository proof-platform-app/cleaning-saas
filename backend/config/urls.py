from django.contrib import admin
from django.urls import path, include

# static / media
from django.conf import settings
from django.conf.urls.static import static

# cleanproof trial endpoint + usage summary
from apps.accounts.api.views import (
    StartStandardTrialView,
    UsageSummaryView,
    UpgradeToActiveView,
)

# Settings API (Account & Billing MVP v1.1)
from apps.accounts.api.views_settings import (
    CurrentUserView,
    UpdateProfileView,
    ChangePasswordView,
    NotificationPreferencesView,
    BillingSummaryView,
    InvoiceDownloadView,
)


urlpatterns = [
    # CleanProof trial start (must be BEFORE generic api include)
    path(
        "api/cleanproof/trials/start/",
        StartStandardTrialView.as_view(),
        name="cleanproof-start-trial",
    ),
    # CleanProof usage summary (trial + soft-limits), тоже до общего api include
    path(
        "api/cleanproof/usage-summary/",
        UsageSummaryView.as_view(),
        name="cleanproof-usage-summary",
    ),
    # CleanProof upgrade to active plan
    path(
        "api/cleanproof/upgrade-to-active/",
        UpgradeToActiveView.as_view(),
        name="cleanproof-upgrade-to-active",
    ),

    # Settings API: Account (MVP v1.1)
    path(
        "api/me/",
        CurrentUserView.as_view(),
        name="api-current-user-get",
    ),
    path(
        "api/me/",
        UpdateProfileView.as_view(),
        name="api-current-user-patch",
    ),
    path(
        "api/me/change-password/",
        ChangePasswordView.as_view(),
        name="api-change-password",
    ),
    path(
        "api/me/notification-preferences/",
        NotificationPreferencesView.as_view(),
        name="api-notification-preferences",
    ),

    # Settings API: Billing (MVP v1.1)
    path(
        "api/settings/billing/",
        BillingSummaryView.as_view(),
        name="api-billing-summary",
    ),
    path(
        "api/settings/billing/invoices/<int:invoice_id>/download/",
        InvoiceDownloadView.as_view(),
        name="api-invoice-download",
    ),

    path("admin/", admin.site.urls),
    path("api/", include("apps.api.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
