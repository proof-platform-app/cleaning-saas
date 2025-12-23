from django.urls import path

from .views import (
    LoginView,
    TodayJobsView,
)

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="api-login"),
    path("jobs/today/", TodayJobsView.as_view(), name="api-jobs-today"),
]
