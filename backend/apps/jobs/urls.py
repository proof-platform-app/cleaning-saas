# backend/apps/jobs/urls.py
# NOTE: internal/legacy endpoints. Do not expose via config/urls.py.
# Public API must go through apps.api.urls.

from django.urls import path

from apps.jobs import views

urlpatterns = [
    path("jobs", views.jobs_list, name="jobs_list"),
    path("jobs/create", views.jobs_create, name="jobs_create"),
    path("jobs/<int:job_id>", views.job_detail, name="job_detail"),

    path(
        "jobs/<int:job_id>/checklist/<int:item_id>/toggle",
        views.checklist_item_toggle,
        name="checklist_item_toggle",
    ),
    path(
        "jobs/<int:job_id>/checklist/bulk",
        views.checklist_bulk_update,
        name="checklist_bulk_update",
    ),

    path("jobs/<int:job_id>/check-in", views.job_check_in, name="job_check_in"),
    path("jobs/<int:job_id>/check-out", views.job_check_out, name="job_check_out"),
]
