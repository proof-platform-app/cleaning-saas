# backend/config/urls.py

from django.contrib import admin
from django.urls import path, include

# >>> добавь эти два импорта <<<
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.api.urls")),
]

# >>> а вот это добавь в самый низ файла <<<
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
