# backend/apps/locations/views.py

from rest_framework import viewsets, mixins, permissions
from .models import Location
from .serializers import LocationSerializer


class ManagerLocationViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    /api/manager/locations/
    /api/manager/locations/<id>/
    Работает только с локациями компании текущего менеджера.
    Сейчас этот viewset не подключён в urls.py.
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
