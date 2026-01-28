from rest_framework import serializers

from .models import DemoRequest, ContactMessage

class DemoRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoRequest
        fields = [
            "id",
            "company_name",
            "role",
            "cleaner_count",
            "contact",
            "country",
            "primary_pain",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        errors = {}
        if not attrs.get("company_name"):
            errors["company_name"] = "This field is required."
        if not attrs.get("contact"):
            errors["contact"] = "This field is required."

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = [
            "id",
            "name",
            "company",
            "email",
            "message",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        errors = {}
        if not attrs.get("name"):
            errors["name"] = "This field is required."
        if not attrs.get("email"):
            errors["email"] = "This field is required."
        if not attrs.get("message"):
            errors["message"] = "This field is required."

        if errors:
            raise serializers.ValidationError(errors)

        return attrs