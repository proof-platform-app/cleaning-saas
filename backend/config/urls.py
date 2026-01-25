from django.contrib import admin
from django.urls import path, include

# static / media
from django.conf import settings
from django.conf.urls.static import static

# cleanproof trial endpoint + usage summary
from apps.accounts.api.views import StartStandardTrialView, UsageSummaryView


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

    path("admin/", admin.site.urls),
    path("api/", include("apps.api.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
