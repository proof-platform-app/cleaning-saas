# backend/apps/locations/app/serializers.py

from rest_framework import serializers
from apps.locations.models import Location


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
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
