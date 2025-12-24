from django.urls import path

from .views import (
    LoginView,
    TodayJobsView,
    JobCheckInView,
)

urlpatterns = [
    path(
        "auth/login/",
        LoginView.as_view(),
        name="api-login",
    ),
    path(
        "jobs/today/",
        TodayJobsView.as_view(),
        name="api-jobs-today",
    ),
    path(
        "jobs/<int:pk>/check-in/",
        JobCheckInView.as_view(),
        name="api-job-check-in",
    ),
]
