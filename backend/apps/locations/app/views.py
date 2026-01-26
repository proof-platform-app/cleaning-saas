# backend/apps/locations/app/views.py

from rest_framework import generics, permissions

from apps.locations.models import Location
from apps.locations.app.serializers import LocationSerializer


class ManagerLocationsListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/manager/locations/
    POST /api/manager/locations/

    Работает только с локациями компании текущего менеджера.
    """

    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        company = getattr(user, "company", None)

        qs = Location.objects.all()
        if company is not None:
            qs = qs.filter(company=company)

        return qs.order_by("id")

    def perform_create(self, serializer):
        user = self.request.user
        company = getattr(user, "company", None)
        serializer.save(company=company)


class ManagerLocationDetailView(generics.UpdateAPIView):
    """
    PATCH /api/manager/locations/<id>/
    """

    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        company = getattr(user, "company", None)

        qs = Location.objects.all()
        if company is not None:
            qs = qs.filter(company=company)

        return qs
