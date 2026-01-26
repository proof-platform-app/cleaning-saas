# backend/apps/locations/serializers.py

from rest_framework import serializers
from .models import Location


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        # минимально нужный набор полей под наш фронт и контракт
        fields = (
            "id",
            "name",
            "address",
            "latitude",
            "longitude",
            "is_active",
            "created_at",
        )
        read_only_fields = ("id", "created_at")
