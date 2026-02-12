# apps/accounts/api/urls.py
from django.urls import path
from .views import StartStandardTrialView, UsageSummaryView
from .views_settings import (
    CurrentUserView,
    UpdateProfileView,
    ChangePasswordView,
    NotificationPreferencesView,
    BillingSummaryView,
    InvoiceDownloadView,
)

urlpatterns = [
    # Trial & Usage
    path(
        "cleanproof/trials/start/",
        StartStandardTrialView.as_view(),
        name="cleanproof-start-trial",
    ),
    path(
        "cleanproof/usage-summary/",
        UsageSummaryView.as_view(),
        name="cleanproof-usage-summary",
    ),

    # Account Settings (MVP v1.1)
    path(
        "me/",
        CurrentUserView.as_view(),
        name="current-user",
    ),
    path(
        "me/",
        UpdateProfileView.as_view(),
        name="update-profile",
    ),
    path(
        "me/change-password/",
        ChangePasswordView.as_view(),
        name="change-password",
    ),
    path(
        "me/notification-preferences/",
        NotificationPreferencesView.as_view(),
        name="notification-preferences",
    ),

    # Billing Settings (MVP v1.1)
    path(
        "settings/billing/",
        BillingSummaryView.as_view(),
        name="billing-summary",
    ),
    path(
        "settings/billing/invoices/<int:invoice_id>/download/",
        InvoiceDownloadView.as_view(),
        name="invoice-download",
    ),
]
