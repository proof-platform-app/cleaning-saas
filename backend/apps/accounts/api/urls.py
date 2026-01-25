# apps/accounts/api/urls.py
from django.urls import path

from .views import StartStandardTrialView

urlpatterns = [
    path(
        "cleanproof/trials/start/",
        StartStandardTrialView.as_view(),
        name="cleanproof-start-trial",
    ),
]
path(
        "cleanproof/trials/start/",
        StartStandardTrialView.as_view(),
        name="cleanproof-start-trial",
    ),