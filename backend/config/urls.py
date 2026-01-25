from django.contrib import admin
from django.urls import path, include

# static / media
from django.conf import settings
from django.conf.urls.static import static

# cleanproof trial endpoint
from apps.accounts.api.views import StartStandardTrialView


urlpatterns = [
    # CleanProof trial start (must be BEFORE generic api include)
    path(
        "api/cleanproof/trials/start/",
        StartStandardTrialView.as_view(),
        name="cleanproof-start-trial",
    ),

    path("admin/", admin.site.urls),
    path("api/", include("apps.api.urls")),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
