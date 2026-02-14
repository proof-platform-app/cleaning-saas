# backend/apps/api/views_maintenance.py
"""
Maintenance Context API Views (V1)

Asset and AssetType CRUD endpoints.
See: docs/product/MAINTENANCE_CONTEXT_V1_SCOPE.md

RBAC:
- owner, manager: full CRUD
- staff: read-only
- cleaner: no access
"""

from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.maintenance.models import AssetType, Asset, MaintenanceCategory
from apps.locations.models import Location
from apps.jobs.models import Job


# =============================================================================
# Helper Mixins
# =============================================================================

class MaintenancePermissionMixin:
    """
    Common permission checks for maintenance endpoints.

    RBAC:
    - owner, manager: full access (read + write)
    - staff: read-only access
    - cleaner: no access
    """

    def _get_company(self, request):
        """Returns (company, error_response). If error_response is not None, return it."""
        user = request.user
        company = getattr(user, "company", None)
        if company is None:
            return None, Response(
                {"code": "NO_COMPANY", "message": "User has no associated company."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return company, None

    def _check_read_access(self, request):
        """
        Check if user has read access (owner, manager, staff).
        Returns (company, error_response).
        """
        user = request.user
        if user.role not in [User.ROLE_OWNER, User.ROLE_MANAGER, User.ROLE_STAFF]:
            return None, Response(
                {"code": "FORBIDDEN", "message": "Only console users can access this resource."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return self._get_company(request)

    def _check_write_access(self, request):
        """
        Check if user has write access (owner, manager only).
        Returns (company, error_response).
        """
        user = request.user
        if user.role not in [User.ROLE_OWNER, User.ROLE_MANAGER]:
            return None, Response(
                {"code": "FORBIDDEN", "message": "Only owner or manager can modify this resource."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return self._get_company(request)


# =============================================================================
# AssetType Views
# =============================================================================

class AssetTypeListCreateView(MaintenancePermissionMixin, APIView):
    """
    List and create asset types.

    GET /api/manager/asset-types/
    POST /api/manager/asset-types/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        asset_types = AssetType.objects.filter(company=company).order_by("name")

        data = [
            {
                "id": at.id,
                "name": at.name,
                "description": at.description,
                "is_active": at.is_active,
            }
            for at in asset_types
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        company, error = self._check_write_access(request)
        if error:
            return error

        # Trial/blocked checks
        if company.is_blocked():
            code = "trial_expired" if company.is_trial_expired() else "company_blocked"
            return Response(
                {"code": code, "message": "Account access restricted. Please upgrade or contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )

        name = (request.data.get("name") or "").strip()
        description = (request.data.get("description") or "").strip()

        if not name:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Name is required.", "fields": {"name": ["Name is required."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check uniqueness
        if AssetType.objects.filter(company=company, name__iexact=name).exists():
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Asset type with this name already exists.", "fields": {"name": ["Asset type with this name already exists."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        asset_type = AssetType.objects.create(
            company=company,
            name=name,
            description=description,
            is_active=True,
        )

        return Response(
            {
                "id": asset_type.id,
                "name": asset_type.name,
                "description": asset_type.description,
                "is_active": asset_type.is_active,
            },
            status=status.HTTP_201_CREATED,
        )


class AssetTypeDetailView(MaintenancePermissionMixin, APIView):
    """
    Retrieve, update, delete asset type.

    GET /api/manager/asset-types/<id>/
    PATCH /api/manager/asset-types/<id>/
    DELETE /api/manager/asset-types/<id>/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_asset_type(self, company, pk):
        return get_object_or_404(AssetType, pk=pk, company=company)

    def get(self, request, pk):
        company, error = self._check_read_access(request)
        if error:
            return error

        asset_type = self._get_asset_type(company, pk)

        return Response(
            {
                "id": asset_type.id,
                "name": asset_type.name,
                "description": asset_type.description,
                "is_active": asset_type.is_active,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk):
        company, error = self._check_write_access(request)
        if error:
            return error

        asset_type = self._get_asset_type(company, pk)

        name = request.data.get("name")
        description = request.data.get("description")
        is_active = request.data.get("is_active")

        update_fields = []

        if name is not None:
            name = name.strip()
            if not name:
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Name cannot be empty.", "fields": {"name": ["Name cannot be empty."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Check uniqueness (exclude self)
            if AssetType.objects.filter(company=company, name__iexact=name).exclude(pk=pk).exists():
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Asset type with this name already exists.", "fields": {"name": ["Asset type with this name already exists."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            asset_type.name = name
            update_fields.append("name")

        if description is not None:
            asset_type.description = description.strip()
            update_fields.append("description")

        if is_active is not None:
            asset_type.is_active = bool(is_active)
            update_fields.append("is_active")

        if update_fields:
            asset_type.save(update_fields=update_fields)

        return Response(
            {
                "id": asset_type.id,
                "name": asset_type.name,
                "description": asset_type.description,
                "is_active": asset_type.is_active,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        company, error = self._check_write_access(request)
        if error:
            return error

        asset_type = self._get_asset_type(company, pk)

        # Check if any assets reference this type
        if Asset.objects.filter(asset_type=asset_type).exists():
            return Response(
                {"code": "CONFLICT", "message": "Cannot delete asset type with linked assets. Deactivate instead."},
                status=status.HTTP_409_CONFLICT,
            )

        asset_type.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Asset Views
# =============================================================================

class AssetListCreateView(MaintenancePermissionMixin, APIView):
    """
    List and create assets.

    GET /api/manager/assets/
        Query params: location_id, asset_type_id, is_active

    POST /api/manager/assets/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        assets = Asset.objects.filter(company=company).select_related("location", "asset_type")

        # Filtering
        location_id = request.query_params.get("location_id")
        if location_id:
            assets = assets.filter(location_id=location_id)

        asset_type_id = request.query_params.get("asset_type_id")
        if asset_type_id:
            assets = assets.filter(asset_type_id=asset_type_id)

        is_active = request.query_params.get("is_active")
        if is_active is not None:
            is_active_bool = is_active.lower() in ("true", "1", "yes")
            assets = assets.filter(is_active=is_active_bool)

        assets = assets.order_by("name")

        data = [
            {
                "id": asset.id,
                "name": asset.name,
                "serial_number": asset.serial_number,
                "description": asset.description,
                "is_active": asset.is_active,
                "location": {
                    "id": asset.location.id,
                    "name": asset.location.name,
                },
                "asset_type": {
                    "id": asset.asset_type.id,
                    "name": asset.asset_type.name,
                },
                "created_at": asset.created_at.isoformat(),
                "updated_at": asset.updated_at.isoformat(),
            }
            for asset in assets
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        company, error = self._check_write_access(request)
        if error:
            return error

        # Trial/blocked checks
        if company.is_blocked():
            code = "trial_expired" if company.is_trial_expired() else "company_blocked"
            return Response(
                {"code": code, "message": "Account access restricted. Please upgrade or contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )

        name = (request.data.get("name") or "").strip()
        serial_number = (request.data.get("serial_number") or "").strip()
        description = (request.data.get("description") or "").strip()
        location_id = request.data.get("location_id")
        asset_type_id = request.data.get("asset_type_id")

        errors = {}

        if not name:
            errors["name"] = ["Name is required."]

        if not location_id:
            errors["location_id"] = ["Location is required."]

        if not asset_type_id:
            errors["asset_type_id"] = ["Asset type is required."]

        if errors:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Validation failed.", "fields": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify location belongs to company
        try:
            location = Location.objects.get(pk=location_id, company=company)
        except Location.DoesNotExist:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Location not found.", "fields": {"location_id": ["Invalid location."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify asset type belongs to company
        try:
            asset_type = AssetType.objects.get(pk=asset_type_id, company=company)
        except AssetType.DoesNotExist:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Asset type not found.", "fields": {"asset_type_id": ["Invalid asset type."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        asset = Asset.objects.create(
            company=company,
            location=location,
            asset_type=asset_type,
            name=name,
            serial_number=serial_number,
            description=description,
            is_active=True,
        )

        return Response(
            {
                "id": asset.id,
                "name": asset.name,
                "serial_number": asset.serial_number,
                "description": asset.description,
                "is_active": asset.is_active,
                "location": {
                    "id": asset.location.id,
                    "name": asset.location.name,
                },
                "asset_type": {
                    "id": asset.asset_type.id,
                    "name": asset.asset_type.name,
                },
                "created_at": asset.created_at.isoformat(),
                "updated_at": asset.updated_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class AssetDetailView(MaintenancePermissionMixin, APIView):
    """
    Retrieve, update, delete asset.

    GET /api/manager/assets/<id>/
    PATCH /api/manager/assets/<id>/
    DELETE /api/manager/assets/<id>/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_asset(self, company, pk):
        return get_object_or_404(
            Asset.objects.select_related("location", "asset_type"),
            pk=pk,
            company=company,
        )

    def _serialize_asset(self, asset):
        return {
            "id": asset.id,
            "name": asset.name,
            "serial_number": asset.serial_number,
            "description": asset.description,
            "is_active": asset.is_active,
            "location": {
                "id": asset.location.id,
                "name": asset.location.name,
            },
            "asset_type": {
                "id": asset.asset_type.id,
                "name": asset.asset_type.name,
            },
            "created_at": asset.created_at.isoformat(),
            "updated_at": asset.updated_at.isoformat(),
        }

    def get(self, request, pk):
        company, error = self._check_read_access(request)
        if error:
            return error

        asset = self._get_asset(company, pk)
        return Response(self._serialize_asset(asset), status=status.HTTP_200_OK)

    def patch(self, request, pk):
        company, error = self._check_write_access(request)
        if error:
            return error

        asset = self._get_asset(company, pk)

        update_fields = []

        name = request.data.get("name")
        if name is not None:
            name = name.strip()
            if not name:
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Name cannot be empty.", "fields": {"name": ["Name cannot be empty."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            asset.name = name
            update_fields.append("name")

        serial_number = request.data.get("serial_number")
        if serial_number is not None:
            asset.serial_number = serial_number.strip()
            update_fields.append("serial_number")

        description = request.data.get("description")
        if description is not None:
            asset.description = description.strip()
            update_fields.append("description")

        is_active = request.data.get("is_active")
        if is_active is not None:
            asset.is_active = bool(is_active)
            update_fields.append("is_active")

        location_id = request.data.get("location_id")
        if location_id is not None:
            try:
                location = Location.objects.get(pk=location_id, company=company)
                asset.location = location
                update_fields.append("location")
            except Location.DoesNotExist:
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Location not found.", "fields": {"location_id": ["Invalid location."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        asset_type_id = request.data.get("asset_type_id")
        if asset_type_id is not None:
            try:
                asset_type = AssetType.objects.get(pk=asset_type_id, company=company)
                asset.asset_type = asset_type
                update_fields.append("asset_type")
            except AssetType.DoesNotExist:
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Asset type not found.", "fields": {"asset_type_id": ["Invalid asset type."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if update_fields:
            asset.save(update_fields=update_fields)
            asset.refresh_from_db()

        return Response(self._serialize_asset(asset), status=status.HTTP_200_OK)

    def delete(self, request, pk):
        company, error = self._check_write_access(request)
        if error:
            return error

        asset = self._get_asset(company, pk)

        # Check if any jobs reference this asset
        from apps.jobs.models import Job
        if Job.objects.filter(asset=asset).exists():
            return Response(
                {"code": "CONFLICT", "message": "Cannot delete asset with linked jobs. Deactivate instead."},
                status=status.HTTP_409_CONFLICT,
            )

        asset.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# MaintenanceCategory Views
# =============================================================================

class MaintenanceCategoryListCreateView(MaintenancePermissionMixin, APIView):
    """
    List and create maintenance categories.

    GET /api/manager/maintenance-categories/
    POST /api/manager/maintenance-categories/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        categories = MaintenanceCategory.objects.filter(company=company).order_by("name")

        data = [
            {
                "id": cat.id,
                "name": cat.name,
                "description": cat.description,
                "is_active": cat.is_active,
            }
            for cat in categories
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        company, error = self._check_write_access(request)
        if error:
            return error

        # Trial/blocked checks
        if company.is_blocked():
            code = "trial_expired" if company.is_trial_expired() else "company_blocked"
            return Response(
                {"code": code, "message": "Account access restricted. Please upgrade or contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )

        name = (request.data.get("name") or "").strip()
        description = (request.data.get("description") or "").strip()

        if not name:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Name is required.", "fields": {"name": ["Name is required."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check uniqueness
        if MaintenanceCategory.objects.filter(company=company, name__iexact=name).exists():
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Category with this name already exists.", "fields": {"name": ["Category with this name already exists."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        category = MaintenanceCategory.objects.create(
            company=company,
            name=name,
            description=description,
            is_active=True,
        )

        return Response(
            {
                "id": category.id,
                "name": category.name,
                "description": category.description,
                "is_active": category.is_active,
            },
            status=status.HTTP_201_CREATED,
        )


class MaintenanceCategoryDetailView(MaintenancePermissionMixin, APIView):
    """
    Retrieve, update, delete maintenance category.

    GET /api/manager/maintenance-categories/<id>/
    PATCH /api/manager/maintenance-categories/<id>/
    DELETE /api/manager/maintenance-categories/<id>/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_category(self, company, pk):
        return get_object_or_404(MaintenanceCategory, pk=pk, company=company)

    def get(self, request, pk):
        company, error = self._check_read_access(request)
        if error:
            return error

        category = self._get_category(company, pk)

        return Response(
            {
                "id": category.id,
                "name": category.name,
                "description": category.description,
                "is_active": category.is_active,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, pk):
        company, error = self._check_write_access(request)
        if error:
            return error

        category = self._get_category(company, pk)

        name = request.data.get("name")
        description = request.data.get("description")
        is_active = request.data.get("is_active")

        update_fields = []

        if name is not None:
            name = name.strip()
            if not name:
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Name cannot be empty.", "fields": {"name": ["Name cannot be empty."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Check uniqueness (exclude self)
            if MaintenanceCategory.objects.filter(company=company, name__iexact=name).exclude(pk=pk).exists():
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Category with this name already exists.", "fields": {"name": ["Category with this name already exists."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            category.name = name
            update_fields.append("name")

        if description is not None:
            category.description = description.strip()
            update_fields.append("description")

        if is_active is not None:
            category.is_active = bool(is_active)
            update_fields.append("is_active")

        if update_fields:
            category.save(update_fields=update_fields)

        return Response(
            {
                "id": category.id,
                "name": category.name,
                "description": category.description,
                "is_active": category.is_active,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        company, error = self._check_write_access(request)
        if error:
            return error

        category = self._get_category(company, pk)

        # Check if any jobs reference this category
        if Job.objects.filter(maintenance_category=category).exists():
            return Response(
                {"code": "CONFLICT", "message": "Cannot delete category with linked service visits. Deactivate instead."},
                status=status.HTTP_409_CONFLICT,
            )

        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Service Visits Views (Jobs with asset link = maintenance visits)
# =============================================================================

class ServiceVisitsListView(MaintenancePermissionMixin, APIView):
    """
    List service visits (Jobs that have an asset linked).

    GET /api/manager/service-visits/
        Query params:
        - status: scheduled, in_progress, completed, cancelled
        - technician_id: filter by cleaner/technician
        - asset_id: filter by specific asset
        - location_id: filter by location
        - date_from: filter by scheduled_date >= date_from (YYYY-MM-DD)
        - date_to: filter by scheduled_date <= date_to (YYYY-MM-DD)
        - category_id: filter by maintenance_category
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        # Maintenance context service visits
        visits = Job.objects.filter(
            company=company,
            context=Job.CONTEXT_MAINTENANCE,  # Maintenance context (not based on asset nullability)
        ).select_related(
            "location",
            "cleaner",
            "asset",
            "asset__asset_type",
            "maintenance_category",
        ).order_by("-scheduled_date", "-created_at")

        # Filtering
        status_filter = request.query_params.get("status")
        if status_filter:
            visits = visits.filter(status=status_filter)

        technician_id = request.query_params.get("technician_id")
        if technician_id:
            visits = visits.filter(cleaner_id=technician_id)

        asset_id = request.query_params.get("asset_id")
        if asset_id:
            visits = visits.filter(asset_id=asset_id)

        location_id = request.query_params.get("location_id")
        if location_id:
            visits = visits.filter(location_id=location_id)

        category_id = request.query_params.get("category_id")
        if category_id:
            visits = visits.filter(maintenance_category_id=category_id)

        date_from = request.query_params.get("date_from")
        if date_from:
            visits = visits.filter(scheduled_date__gte=date_from)

        date_to = request.query_params.get("date_to")
        if date_to:
            visits = visits.filter(scheduled_date__lte=date_to)

        data = [
            {
                "id": visit.id,
                "scheduled_date": visit.scheduled_date.isoformat(),
                "scheduled_start_time": visit.scheduled_start_time.isoformat() if visit.scheduled_start_time else None,
                "scheduled_end_time": visit.scheduled_end_time.isoformat() if visit.scheduled_end_time else None,
                "status": visit.status,
                "location": {
                    "id": visit.location.id,
                    "name": visit.location.name,
                },
                "technician": {
                    "id": visit.cleaner.id,
                    "name": visit.cleaner.full_name or visit.cleaner.email,
                },
                "asset": {
                    "id": visit.asset.id,
                    "name": visit.asset.name,
                    "asset_type": {
                        "id": visit.asset.asset_type.id,
                        "name": visit.asset.asset_type.name,
                    },
                },
                "category": {
                    "id": visit.maintenance_category.id,
                    "name": visit.maintenance_category.name,
                } if visit.maintenance_category else None,
                "manager_notes": visit.manager_notes,
                "actual_start_time": visit.actual_start_time.isoformat() if visit.actual_start_time else None,
                "actual_end_time": visit.actual_end_time.isoformat() if visit.actual_end_time else None,
                "created_at": visit.created_at.isoformat(),
            }
            for visit in visits
        ]

        return Response(data, status=status.HTTP_200_OK)


class AssetServiceHistoryView(MaintenancePermissionMixin, APIView):
    """
    Get service history for a specific asset.

    GET /api/manager/assets/<id>/visits/
    Returns all Jobs linked to this asset, ordered by date descending.
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        company, error = self._check_read_access(request)
        if error:
            return error

        # Verify asset exists and belongs to company
        asset = get_object_or_404(
            Asset.objects.select_related("asset_type", "location"),
            pk=pk,
            company=company,
        )

        # Get all visits (jobs) for this asset
        visits = Job.objects.filter(
            asset=asset,
        ).select_related(
            "cleaner",
            "maintenance_category",
        ).order_by("-scheduled_date", "-created_at")

        visits_data = [
            {
                "id": visit.id,
                "scheduled_date": visit.scheduled_date.isoformat(),
                "scheduled_start_time": visit.scheduled_start_time.isoformat() if visit.scheduled_start_time else None,
                "status": visit.status,
                "technician": {
                    "id": visit.cleaner.id,
                    "name": visit.cleaner.full_name or visit.cleaner.email,
                },
                "category": {
                    "id": visit.maintenance_category.id,
                    "name": visit.maintenance_category.name,
                } if visit.maintenance_category else None,
                "manager_notes": visit.manager_notes,
                "cleaner_notes": visit.cleaner_notes,
                "actual_start_time": visit.actual_start_time.isoformat() if visit.actual_start_time else None,
                "actual_end_time": visit.actual_end_time.isoformat() if visit.actual_end_time else None,
            }
            for visit in visits
        ]

        return Response(
            {
                "asset": {
                    "id": asset.id,
                    "name": asset.name,
                    "serial_number": asset.serial_number,
                    "asset_type": {
                        "id": asset.asset_type.id,
                        "name": asset.asset_type.name,
                    },
                    "location": {
                        "id": asset.location.id,
                        "name": asset.location.name,
                    },
                },
                "visits": visits_data,
                "total_visits": len(visits_data),
            },
            status=status.HTTP_200_OK,
        )
