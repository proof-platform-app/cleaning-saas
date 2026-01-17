# backend/apps/locations/admin.py
from django.contrib import admin

from .models import (
    Location,
    ChecklistTemplate,
    ChecklistTemplateItem,
    LocationChecklistTemplate,
)

admin.site.register(Location)
admin.site.register(ChecklistTemplate)
admin.site.register(ChecklistTemplateItem)
admin.site.register(LocationChecklistTemplate)
