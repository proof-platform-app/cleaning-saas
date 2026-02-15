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
from apps.api.views_reports import compute_sla_status_and_reasons_for_job


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

        data = []
        for visit in visits:
            # Handle optional asset (maintenance jobs may not have asset linked)
            asset_data = None
            if visit.asset:
                asset_data = {
                    "id": visit.asset.id,
                    "name": visit.asset.name,
                    "asset_type": {
                        "id": visit.asset.asset_type.id,
                        "name": visit.asset.asset_type.name,
                    } if visit.asset.asset_type else None,
                }

            # Compute SLA status for this visit
            sla_status, _ = compute_sla_status_and_reasons_for_job(visit)

            data.append({
                "id": visit.id,
                "scheduled_date": visit.scheduled_date.isoformat(),
                "scheduled_start_time": visit.scheduled_start_time.isoformat() if visit.scheduled_start_time else None,
                "scheduled_end_time": visit.scheduled_end_time.isoformat() if visit.scheduled_end_time else None,
                "status": visit.status,
                "sla_status": sla_status,
                "priority": visit.priority,
                "sla_deadline": visit.sla_deadline.isoformat() if visit.sla_deadline else None,
                "location": {
                    "id": visit.location.id,
                    "name": visit.location.name,
                },
                "technician": {
                    "id": visit.cleaner.id,
                    "name": visit.cleaner.full_name or visit.cleaner.email,
                },
                "asset": asset_data,
                "category": {
                    "id": visit.maintenance_category.id,
                    "name": visit.maintenance_category.name,
                } if visit.maintenance_category else None,
                "manager_notes": visit.manager_notes,
                "actual_start_time": visit.actual_start_time.isoformat() if visit.actual_start_time else None,
                "actual_end_time": visit.actual_end_time.isoformat() if visit.actual_end_time else None,
                "created_at": visit.created_at.isoformat(),
            })

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


# =============================================================================
# Service Visit PDF Report (P5)
# =============================================================================

class ServiceVisitReportView(MaintenancePermissionMixin, APIView):
    """
    Generate PDF report for a maintenance service visit.

    GET /api/maintenance/visits/<id>/report/

    Returns: application/pdf

    Requirements:
    - Visit must be maintenance context (Job.context == "maintenance")
    - Visit must be completed (status == "completed")

    Uses maintenance-specific PDF template with:
    - Neutral gray color scheme
    - "Technician" terminology (not "Cleaner")
    - Asset information (name, type, serial)
    - Maintenance category
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from django.http import HttpResponse
        from apps.api.pdf import generate_maintenance_visit_report_pdf

        company, error = self._check_read_access(request)
        if error:
            return error

        # Get the visit (job)
        try:
            visit = Job.objects.select_related(
                "location",
                "cleaner",
                "asset",
                "maintenance_category",
            ).prefetch_related(
                "photos__file",
                "checklist_items",
                "check_events",
            ).get(pk=pk)
        except Job.DoesNotExist:
            return Response(
                {"code": "NOT_FOUND", "message": "Service visit not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Verify visit belongs to user's company
        if visit.company_id != company.id:
            return Response(
                {"code": "NOT_FOUND", "message": "Service visit not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Verify visit is maintenance context
        if visit.context != Job.CONTEXT_MAINTENANCE:
            return Response(
                {"code": "INVALID_CONTEXT", "message": "This endpoint is for maintenance visits only."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify visit is completed
        if visit.status != Job.STATUS_COMPLETED:
            return Response(
                {"code": "INVALID_STATUS", "message": "PDF report can only be generated for completed visits."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate PDF using maintenance-specific function
        pdf_bytes = generate_maintenance_visit_report_pdf(visit)

        # Return PDF response
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="maintenance_visit_{visit.id}.pdf"'
        return response


# =============================================================================
# Asset History PDF Report (P6)
# =============================================================================

class AssetHistoryReportView(MaintenancePermissionMixin, APIView):
    """
    Generate PDF report for asset service history.

    GET /api/maintenance/assets/<id>/history/report/

    Returns: application/pdf

    Requirements:
    - Asset must belong to user's company
    - Asset is included regardless of is_active status

    RBAC:
    - owner/manager/staff: allowed
    - cleaner: 403 FORBIDDEN (asset-level reports restricted to admins)

    PDF Content:
    - Header with company logo
    - Asset info (name, type, serial, location, status)
    - Summary stats (total visits, completed, last serviced)
    - Service history table with SLA, checklist %, photos count
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from django.http import HttpResponse
        from apps.api.pdf import generate_asset_history_report_pdf

        # Check permissions - must be owner/manager/staff (not cleaner)
        user = request.user
        role = getattr(user, "role", None)

        # Cleaners cannot access asset-level reports
        if role == "cleaner":
            return Response(
                {"code": "FORBIDDEN", "message": "Asset reports are restricted to administrators."},
                status=status.HTTP_403_FORBIDDEN,
            )

        company, error = self._check_read_access(request)
        if error:
            return error

        # Get the asset (include inactive assets)
        try:
            asset = Asset.objects.select_related(
                "asset_type",
                "location",
            ).get(pk=pk, company=company)
        except Asset.DoesNotExist:
            return Response(
                {"code": "NOT_FOUND", "message": "Asset not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get all maintenance visits for this asset
        visits = list(
            Job.objects.filter(
                asset=asset,
                context=Job.CONTEXT_MAINTENANCE,
            ).select_related(
                "cleaner",
                "maintenance_category",
            ).prefetch_related(
                "checklist_items",
                "photos",
            ).order_by("-scheduled_date", "-created_at")
        )

        # Generate PDF
        pdf_bytes = generate_asset_history_report_pdf(asset, visits, company)

        # Return PDF response
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="asset_{asset.id}_history.pdf"'
        return response


# =============================================================================
# Technicians Views (S2-P1)
# =============================================================================

class MaintenanceTechniciansListView(MaintenancePermissionMixin, APIView):
    """
    List technicians (users with role=cleaner) with maintenance-specific stats.

    GET /api/maintenance/technicians/

    Returns technicians with:
    - total_visits: count of completed maintenance context jobs
    - sla_violation_rate: percentage of jobs with SLA violations (0.0 to 1.0)

    RBAC: owner, manager, staff (read-only)
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        # Get all technicians (users with role=cleaner) for this company
        technicians = User.objects.filter(
            company=company,
            role=User.ROLE_CLEANER,
        ).order_by("full_name", "id")

        # Prefetch maintenance jobs for efficient stats calculation
        # Get all completed maintenance jobs for this company
        completed_maintenance_jobs = Job.objects.filter(
            company=company,
            context=Job.CONTEXT_MAINTENANCE,
            status=Job.STATUS_COMPLETED,
        ).select_related("cleaner")

        # Build stats per technician
        tech_stats = {}
        for tech in technicians:
            tech_stats[tech.id] = {
                "total_visits": 0,
                "sla_violations": 0,
            }

        # Calculate stats from jobs
        for job in completed_maintenance_jobs:
            if job.cleaner_id in tech_stats:
                tech_stats[job.cleaner_id]["total_visits"] += 1
                # Check SLA violation
                sla_status, _ = compute_sla_status_and_reasons_for_job(job)
                if sla_status == "violated":
                    tech_stats[job.cleaner_id]["sla_violations"] += 1

        # Build response
        data = []
        for tech in technicians:
            stats = tech_stats[tech.id]
            total = stats["total_visits"]
            violations = stats["sla_violations"]

            # Calculate violation rate (0.0 to 1.0)
            sla_violation_rate = 0.0
            if total > 0:
                sla_violation_rate = round(violations / total, 4)

            data.append({
                "id": tech.id,
                "full_name": tech.full_name,
                "email": tech.email,
                "phone": tech.phone,
                "is_active": tech.is_active,
                "total_visits": total,
                "sla_violation_rate": sla_violation_rate,
            })

        return Response(data, status=status.HTTP_200_OK)


# =============================================================================
# Analytics Views (S2-P2)
# =============================================================================

from datetime import datetime, timedelta
from django.utils import timezone


def _parse_date_range(request):
    """
    Parse and validate date_from/date_to query params.
    Returns (date_from, date_to, error_response).
    """
    date_from_str = (request.query_params.get("date_from") or "").strip()
    date_to_str = (request.query_params.get("date_to") or "").strip()

    if not date_from_str or not date_to_str:
        return None, None, Response(
            {"code": "VALIDATION_ERROR", "message": "date_from and date_to query params are required (YYYY-MM-DD)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
        date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()
    except ValueError:
        return None, None, Response(
            {"code": "VALIDATION_ERROR", "message": "Invalid date format. Use YYYY-MM-DD."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if date_from > date_to:
        return None, None, Response(
            {"code": "VALIDATION_ERROR", "message": "date_from cannot be greater than date_to."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return date_from, date_to, None


def _shift_range_back(date_from, date_to):
    """
    Shift date range back by its own length for delta calculation.
    """
    days = (date_to - date_from).days + 1
    prev_to = date_from - timedelta(days=1)
    prev_from = prev_to - timedelta(days=days - 1)
    return prev_from, prev_to


def _percent_delta(current, previous):
    """
    Calculate percentage delta between current and previous values.
    Returns 0 if previous is 0 or None.
    """
    if previous is None or previous == 0:
        return 0
    return round((float(current) - float(previous)) / float(previous) * 100)


def _calculate_maintenance_summary(company, date_from, date_to):
    """
    Calculate maintenance analytics summary for a date range.
    """
    qs = Job.objects.filter(
        company=company,
        context=Job.CONTEXT_MAINTENANCE,
        status=Job.STATUS_COMPLETED,
        actual_end_time__isnull=False,
        actual_end_time__date__gte=date_from,
        actual_end_time__date__lte=date_to,
    ).prefetch_related("checklist_items")

    visits_completed = 0
    sla_ok_count = 0
    duration_sum_hours = 0.0
    duration_count = 0
    issues_detected = 0

    for job in qs:
        visits_completed += 1

        # Duration calculation
        if job.actual_start_time and job.actual_end_time:
            delta = job.actual_end_time - job.actual_start_time
            duration_sum_hours += delta.total_seconds() / 3600.0
            duration_count += 1

        # SLA check
        sla_status, _ = compute_sla_status_and_reasons_for_job(job)
        if sla_status == "ok":
            sla_ok_count += 1
        else:
            issues_detected += 1

    sla_compliance_rate = (
        float(sla_ok_count) / float(visits_completed)
        if visits_completed > 0 else 0.0
    )
    avg_visit_duration_hours = (
        float(duration_sum_hours) / float(duration_count)
        if duration_count > 0 else 0.0
    )

    return {
        "visits_completed": visits_completed,
        "sla_compliance_rate": sla_compliance_rate,
        "avg_visit_duration_hours": avg_visit_duration_hours,
        "issues_detected": issues_detected,
    }


class MaintenanceAnalyticsSummaryView(MaintenancePermissionMixin, APIView):
    """
    GET /api/maintenance/analytics/summary/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

    Returns KPI summary:
    - visits_completed: number of completed maintenance visits
    - sla_compliance_rate: ratio of visits without SLA violations (0.0 to 1.0)
    - avg_visit_duration_hours: average visit duration
    - issues_detected: number of visits with SLA violations
    - *_delta: percentage change vs previous period
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        date_from, date_to, date_error = _parse_date_range(request)
        if date_error:
            return date_error

        # Current period
        current = _calculate_maintenance_summary(company, date_from, date_to)

        # Previous period (for deltas)
        prev_from, prev_to = _shift_range_back(date_from, date_to)
        previous = _calculate_maintenance_summary(company, prev_from, prev_to)

        # Calculate deltas
        visits_delta = _percent_delta(current["visits_completed"], previous["visits_completed"])
        sla_delta = _percent_delta(current["sla_compliance_rate"], previous["sla_compliance_rate"])
        duration_delta = _percent_delta(current["avg_visit_duration_hours"], previous["avg_visit_duration_hours"])
        issues_delta = _percent_delta(current["issues_detected"], previous["issues_detected"])

        data = {
            **current,
            "visits_delta": visits_delta,
            "sla_delta": sla_delta,
            "duration_delta": duration_delta,
            "issues_delta": issues_delta,
        }

        return Response(data, status=status.HTTP_200_OK)


class MaintenanceAnalyticsVisitsTrendView(MaintenancePermissionMixin, APIView):
    """
    GET /api/maintenance/analytics/visits-trend/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

    Returns daily visits trend:
    [
      { "date": "2026-01-01", "visits_completed": 5 },
      ...
    ]
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        date_from, date_to, date_error = _parse_date_range(request)
        if date_error:
            return date_error

        # Completed maintenance visits in range
        qs = Job.objects.filter(
            company=company,
            context=Job.CONTEXT_MAINTENANCE,
            status=Job.STATUS_COMPLETED,
            actual_end_time__isnull=False,
            actual_end_time__date__gte=date_from,
            actual_end_time__date__lte=date_to,
        )

        # Aggregate by day
        by_day = {}
        for job in qs:
            day = job.actual_end_time.date()
            by_day[day] = by_day.get(day, 0) + 1

        # Build response with all days (no gaps)
        data = []
        current = date_from
        while current <= date_to:
            data.append({
                "date": current.isoformat(),
                "visits_completed": by_day.get(current, 0),
            })
            current += timedelta(days=1)

        return Response(data, status=status.HTTP_200_OK)


class MaintenanceAnalyticsSlaTrendView(MaintenancePermissionMixin, APIView):
    """
    GET /api/maintenance/analytics/sla-trend/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

    Returns daily SLA violations trend:
    [
      {
        "date": "2026-01-01",
        "visits_completed": 5,
        "visits_with_violations": 1,
        "violation_rate": 0.2
      },
      ...
    ]
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        date_from, date_to, date_error = _parse_date_range(request)
        if date_error:
            return date_error

        # Completed maintenance visits in range
        qs = Job.objects.filter(
            company=company,
            context=Job.CONTEXT_MAINTENANCE,
            status=Job.STATUS_COMPLETED,
            actual_end_time__isnull=False,
            actual_end_time__date__gte=date_from,
            actual_end_time__date__lte=date_to,
        ).prefetch_related("photos", "checklist_items")

        # Aggregate by day
        by_day = {}
        for job in qs:
            day = job.actual_end_time.date()
            if day not in by_day:
                by_day[day] = {"visits_completed": 0, "visits_with_violations": 0}

            by_day[day]["visits_completed"] += 1

            sla_status, _ = compute_sla_status_and_reasons_for_job(job)
            if sla_status == "violated":
                by_day[day]["visits_with_violations"] += 1

        # Build response with all days (no gaps)
        data = []
        current = date_from
        while current <= date_to:
            bucket = by_day.get(current, {"visits_completed": 0, "visits_with_violations": 0})
            visits = bucket["visits_completed"]
            violations = bucket["visits_with_violations"]
            violation_rate = float(violations) / float(visits) if visits > 0 else 0.0

            data.append({
                "date": current.isoformat(),
                "visits_completed": visits,
                "visits_with_violations": violations,
                "violation_rate": violation_rate,
            })
            current += timedelta(days=1)

        return Response(data, status=status.HTTP_200_OK)


class MaintenanceAnalyticsAssetsPerformanceView(MaintenancePermissionMixin, APIView):
    """
    GET /api/maintenance/analytics/assets-performance/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

    Returns assets ranked by violations (most problematic first):
    [
      {
        "asset_id": 1,
        "asset_name": "HVAC Unit #3",
        "asset_type_name": "HVAC",
        "location_name": "Building A",
        "visits_completed": 10,
        "violations_count": 3,
        "violation_rate": 0.3
      },
      ...
    ]
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        date_from, date_to, date_error = _parse_date_range(request)
        if date_error:
            return date_error

        # Completed maintenance visits with assets
        qs = Job.objects.filter(
            company=company,
            context=Job.CONTEXT_MAINTENANCE,
            status=Job.STATUS_COMPLETED,
            actual_end_time__isnull=False,
            actual_end_time__date__gte=date_from,
            actual_end_time__date__lte=date_to,
            asset__isnull=False,
        ).select_related("asset", "asset__asset_type", "asset__location").prefetch_related("checklist_items")

        # Aggregate by asset
        assets_stats = {}
        for job in qs:
            asset = job.asset
            if asset.id not in assets_stats:
                assets_stats[asset.id] = {
                    "asset_id": asset.id,
                    "asset_name": asset.name,
                    "asset_type_name": asset.asset_type.name if asset.asset_type else "—",
                    "location_name": asset.location.name if asset.location else "—",
                    "visits_completed": 0,
                    "violations_count": 0,
                }

            assets_stats[asset.id]["visits_completed"] += 1

            sla_status, _ = compute_sla_status_and_reasons_for_job(job)
            if sla_status == "violated":
                assets_stats[asset.id]["violations_count"] += 1

        # Build response
        data = []
        for stats in assets_stats.values():
            visits = stats["visits_completed"]
            violations = stats["violations_count"]
            violation_rate = float(violations) / float(visits) if visits > 0 else 0.0

            data.append({
                **stats,
                "violation_rate": violation_rate,
            })

        # Sort by violations (descending), then by visits (descending)
        data.sort(key=lambda x: (-x["violations_count"], -x["visits_completed"], x["asset_name"]))

        return Response(data, status=status.HTTP_200_OK)


class MaintenanceAnalyticsTechniciansPerformanceView(MaintenancePermissionMixin, APIView):
    """
    GET /api/maintenance/analytics/technicians-performance/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

    Returns technicians ranked by performance:
    [
      {
        "technician_id": 1,
        "technician_name": "Ahmed Hassan",
        "visits_completed": 25,
        "avg_duration_hours": 1.5,
        "sla_compliance_rate": 0.96,
        "violations_count": 1
      },
      ...
    ]
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        date_from, date_to, date_error = _parse_date_range(request)
        if date_error:
            return date_error

        # Completed maintenance visits
        qs = Job.objects.filter(
            company=company,
            context=Job.CONTEXT_MAINTENANCE,
            status=Job.STATUS_COMPLETED,
            actual_end_time__isnull=False,
            actual_end_time__date__gte=date_from,
            actual_end_time__date__lte=date_to,
        ).select_related("cleaner").prefetch_related("checklist_items")

        # Aggregate by technician
        tech_stats = {}
        for job in qs:
            cleaner = job.cleaner
            if cleaner is None:
                continue

            if cleaner.id not in tech_stats:
                tech_stats[cleaner.id] = {
                    "technician_id": cleaner.id,
                    "technician_name": cleaner.full_name or cleaner.email or "—",
                    "visits_completed": 0,
                    "sum_duration_hours": 0.0,
                    "duration_count": 0,
                    "sla_ok_count": 0,
                    "violations_count": 0,
                }

            stats = tech_stats[cleaner.id]
            stats["visits_completed"] += 1

            # Duration
            if job.actual_start_time and job.actual_end_time:
                delta = job.actual_end_time - job.actual_start_time
                stats["sum_duration_hours"] += delta.total_seconds() / 3600.0
                stats["duration_count"] += 1

            # SLA
            sla_status, _ = compute_sla_status_and_reasons_for_job(job)
            if sla_status == "ok":
                stats["sla_ok_count"] += 1
            else:
                stats["violations_count"] += 1

        # Build response
        data = []
        for stats in tech_stats.values():
            visits = stats["visits_completed"]
            avg_duration = (
                stats["sum_duration_hours"] / float(stats["duration_count"])
                if stats["duration_count"] > 0 else 0.0
            )
            sla_compliance_rate = (
                float(stats["sla_ok_count"]) / float(visits)
                if visits > 0 else 0.0
            )

            data.append({
                "technician_id": stats["technician_id"],
                "technician_name": stats["technician_name"],
                "visits_completed": visits,
                "avg_duration_hours": round(avg_duration, 2),
                "sla_compliance_rate": round(sla_compliance_rate, 4),
                "violations_count": stats["violations_count"],
            })

        # Sort by violations (descending), then by visits (descending)
        data.sort(key=lambda x: (-x["violations_count"], -x["visits_completed"], x["technician_name"]))

        return Response(data, status=status.HTTP_200_OK)


# =============================================================================
# Reports Views (S2-P3)
# =============================================================================

from collections import Counter
from django.http import HttpResponse
from django.core.mail import EmailMessage


def _get_maintenance_report(company, days: int) -> dict:
    """
    Generate maintenance report data for the last N days.
    Filters by context=CONTEXT_MAINTENANCE, status=COMPLETED.

    Returns dict with:
    - period: {from, to}
    - visits_count, violations_count, issue_rate
    - technicians: [{id, name, visits, violations}, ...]
    - assets: [{id, name, type_name, visits, violations}, ...]
    - locations: [{id, name, visits, violations}, ...]
    - top_sla_reasons: [{code, count}, ...]
    """
    today = timezone.now().date()
    date_from = today - timedelta(days=days - 1)

    # Get completed maintenance visits in period
    qs = Job.objects.filter(
        company=company,
        context=Job.CONTEXT_MAINTENANCE,
        status=Job.STATUS_COMPLETED,
        actual_end_time__isnull=False,
        actual_end_time__date__gte=date_from,
        actual_end_time__date__lte=today,
    ).select_related(
        "cleaner", "location", "asset", "asset__asset_type"
    ).prefetch_related("checklist_items", "photos")

    visits_count = 0
    violations_count = 0

    # Aggregation dicts
    technician_stats = {}  # id -> {name, visits, violations}
    asset_stats = {}       # id -> {name, type_name, visits, violations}
    location_stats = {}    # id -> {name, visits, violations}
    sla_reasons = []       # list of reason codes

    for job in qs:
        visits_count += 1

        # SLA check
        sla_status, reasons = compute_sla_status_and_reasons_for_job(job)
        is_violation = (sla_status == "violated")
        if is_violation:
            violations_count += 1
            sla_reasons.extend(reasons)

        # Technician aggregation
        if job.cleaner:
            tech_id = job.cleaner.id
            if tech_id not in technician_stats:
                technician_stats[tech_id] = {
                    "id": tech_id,
                    "name": job.cleaner.full_name or job.cleaner.email or "—",
                    "visits": 0,
                    "violations": 0,
                }
            technician_stats[tech_id]["visits"] += 1
            if is_violation:
                technician_stats[tech_id]["violations"] += 1

        # Asset aggregation
        if job.asset:
            asset_id = job.asset.id
            if asset_id not in asset_stats:
                asset_stats[asset_id] = {
                    "id": asset_id,
                    "name": job.asset.name,
                    "type_name": job.asset.asset_type.name if job.asset.asset_type else "—",
                    "visits": 0,
                    "violations": 0,
                }
            asset_stats[asset_id]["visits"] += 1
            if is_violation:
                asset_stats[asset_id]["violations"] += 1

        # Location aggregation
        if job.location:
            loc_id = job.location.id
            if loc_id not in location_stats:
                location_stats[loc_id] = {
                    "id": loc_id,
                    "name": job.location.name,
                    "visits": 0,
                    "violations": 0,
                }
            location_stats[loc_id]["visits"] += 1
            if is_violation:
                location_stats[loc_id]["violations"] += 1

    # Calculate issue rate
    issue_rate = float(violations_count) / float(visits_count) if visits_count > 0 else 0.0

    # Sort by violations desc, then visits desc
    technicians_list = sorted(
        technician_stats.values(),
        key=lambda x: (-x["violations"], -x["visits"], x["name"])
    )
    assets_list = sorted(
        asset_stats.values(),
        key=lambda x: (-x["violations"], -x["visits"], x["name"])
    )
    locations_list = sorted(
        location_stats.values(),
        key=lambda x: (-x["violations"], -x["visits"], x["name"])
    )

    # Top SLA reasons (most common first)
    reason_counts = Counter(sla_reasons)
    top_reasons = [
        {"code": code, "count": count}
        for code, count in reason_counts.most_common(5)
    ]

    return {
        "period": {
            "from": date_from.isoformat(),
            "to": today.isoformat(),
        },
        "visits_count": visits_count,
        "violations_count": violations_count,
        "issue_rate": round(issue_rate, 4),
        "technicians": technicians_list,
        "assets": assets_list,
        "locations": locations_list,
        "top_sla_reasons": top_reasons,
    }


class MaintenanceWeeklyReportView(MaintenancePermissionMixin, APIView):
    """
    GET /api/maintenance/reports/weekly/

    Returns weekly maintenance report (last 7 days).
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        report = _get_maintenance_report(company, days=7)
        return Response(report, status=status.HTTP_200_OK)


class MaintenanceMonthlyReportView(MaintenancePermissionMixin, APIView):
    """
    GET /api/maintenance/reports/monthly/

    Returns monthly maintenance report (last 30 days).
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        report = _get_maintenance_report(company, days=30)
        return Response(report, status=status.HTTP_200_OK)


class MaintenanceWeeklyReportPdfView(MaintenancePermissionMixin, APIView):
    """
    GET /api/maintenance/reports/weekly/pdf/

    Returns weekly maintenance report as PDF download.
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        from apps.api.pdf import generate_maintenance_report_pdf

        report = _get_maintenance_report(company, days=7)
        pdf_bytes = generate_maintenance_report_pdf(company, report, "Weekly")

        filename = f"maintenance_weekly_report_{report['period']['from']}_to_{report['period']['to']}.pdf"

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class MaintenanceMonthlyReportPdfView(MaintenancePermissionMixin, APIView):
    """
    GET /api/maintenance/reports/monthly/pdf/

    Returns monthly maintenance report as PDF download.
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        from apps.api.pdf import generate_maintenance_report_pdf

        report = _get_maintenance_report(company, days=30)
        pdf_bytes = generate_maintenance_report_pdf(company, report, "Monthly")

        filename = f"maintenance_monthly_report_{report['period']['from']}_to_{report['period']['to']}.pdf"

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


def _send_maintenance_report_email(company, user, report: dict, frequency: str, to_email: str) -> bool:
    """
    Send maintenance report PDF via email.
    Returns True on success, False on failure.
    """
    from apps.api.pdf import generate_maintenance_report_pdf
    from apps.marketing.models import ReportEmailLog

    period_from = report["period"]["from"]
    period_to = report["period"]["to"]

    subject = f"[MaintainProof] {frequency} maintenance report {period_from} – {period_to}"
    body = (
        f"Your {frequency.lower()} maintenance report for {company.name} is attached as a PDF.\n\n"
        f"Period: {period_from} – {period_to}."
    )

    pdf_bytes = generate_maintenance_report_pdf(company, report, frequency)
    filename = f"maintenance_{frequency.lower()}_report_{period_from}_to_{period_to}.pdf"

    # Create email
    email_msg = EmailMessage(
        subject=subject,
        body=body,
        from_email=None,  # Uses DEFAULT_FROM_EMAIL
        to=[to_email],
    )
    email_msg.attach(filename, pdf_bytes, "application/pdf")

    # Determine log kind
    log_kind = (
        ReportEmailLog.KIND_WEEKLY_REPORT
        if frequency.lower() == "weekly"
        else ReportEmailLog.KIND_MONTHLY_REPORT
    )

    try:
        email_msg.send(fail_silently=False)

        # Log success
        ReportEmailLog.objects.create(
            company=company,
            user=user,
            kind=log_kind,
            period_from=period_from,
            period_to=period_to,
            to_email=to_email,
            subject=subject,
            status=ReportEmailLog.STATUS_SENT,
        )
        return True
    except Exception as e:
        # Log failure
        ReportEmailLog.objects.create(
            company=company,
            user=user,
            kind=log_kind,
            period_from=period_from,
            period_to=period_to,
            to_email=to_email,
            subject=subject,
            status=ReportEmailLog.STATUS_FAILED,
            error_message=str(e)[:500],
        )
        return False


class MaintenanceWeeklyReportEmailView(MaintenancePermissionMixin, APIView):
    """
    POST /api/maintenance/reports/weekly/email/

    Sends weekly maintenance report PDF via email.
    Body (optional): { "email": "custom@example.com" }
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        user = request.user
        to_email = (request.data.get("email") or "").strip() or user.email

        if not to_email:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "No email address provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report = _get_maintenance_report(company, days=7)
        success = _send_maintenance_report_email(company, user, report, "Weekly", to_email)

        if success:
            return Response(
                {"message": f"Report sent to {to_email}"},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"code": "EMAIL_FAILED", "message": "Failed to send email. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MaintenanceMonthlyReportEmailView(MaintenancePermissionMixin, APIView):
    """
    POST /api/maintenance/reports/monthly/email/

    Sends monthly maintenance report PDF via email.
    Body (optional): { "email": "custom@example.com" }
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        user = request.user
        to_email = (request.data.get("email") or "").strip() or user.email

        if not to_email:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "No email address provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report = _get_maintenance_report(company, days=30)
        success = _send_maintenance_report_email(company, user, report, "Monthly", to_email)

        if success:
            return Response(
                {"message": f"Report sent to {to_email}"},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"code": "EMAIL_FAILED", "message": "Failed to send email. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =============================================================================
# Recurring Visit Templates (Stage 3)
# =============================================================================

from apps.maintenance.models import RecurringVisitTemplate, GeneratedVisitLog
from apps.locations.models import ChecklistTemplate


class RecurringTemplateListCreateView(MaintenancePermissionMixin, APIView):
    """
    List and create recurring visit templates.

    GET /api/maintenance/recurring-templates/
    POST /api/maintenance/recurring-templates/

    RBAC:
    - owner, manager: full CRUD
    - staff: read-only
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _serialize_template(self, template):
        return {
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "asset": {
                "id": template.asset.id,
                "name": template.asset.name,
            } if template.asset else None,
            "location": {
                "id": template.location.id,
                "name": template.location.name,
            },
            "frequency": template.frequency,
            "frequency_display": template.get_frequency_display(),
            "interval_days": template.interval_days,
            "start_date": template.start_date.isoformat(),
            "end_date": template.end_date.isoformat() if template.end_date else None,
            "checklist_template": {
                "id": template.checklist_template.id,
                "name": template.checklist_template.name,
            } if template.checklist_template else None,
            "maintenance_category": {
                "id": template.maintenance_category.id,
                "name": template.maintenance_category.name,
            } if template.maintenance_category else None,
            "assigned_technician": {
                "id": template.assigned_technician.id,
                "full_name": template.assigned_technician.full_name or template.assigned_technician.email,
            } if template.assigned_technician else None,
            "scheduled_start_time": template.scheduled_start_time.isoformat() if template.scheduled_start_time else None,
            "scheduled_end_time": template.scheduled_end_time.isoformat() if template.scheduled_end_time else None,
            "manager_notes": template.manager_notes,
            "is_active": template.is_active,
            "created_at": template.created_at.isoformat(),
        }

    def get(self, request):
        company, error = self._check_read_access(request)
        if error:
            return error

        templates = RecurringVisitTemplate.objects.filter(
            company=company
        ).select_related(
            "asset", "location", "checklist_template",
            "maintenance_category", "assigned_technician"
        ).order_by("-is_active", "name")

        # Optional filtering
        is_active = request.query_params.get("is_active")
        if is_active is not None:
            is_active_bool = is_active.lower() in ("true", "1", "yes")
            templates = templates.filter(is_active=is_active_bool)

        location_id = request.query_params.get("location_id")
        if location_id:
            templates = templates.filter(location_id=location_id)

        data = [self._serialize_template(t) for t in templates]
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

        # Required fields
        name = (request.data.get("name") or "").strip()
        location_id = request.data.get("location_id")
        start_date = request.data.get("start_date")
        frequency = request.data.get("frequency", RecurringVisitTemplate.FREQUENCY_MONTHLY)

        errors = {}

        if not name:
            errors["name"] = ["Name is required."]

        if not location_id:
            errors["location_id"] = ["Location is required."]

        if not start_date:
            errors["start_date"] = ["Start date is required."]

        if errors:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Validation failed.", "fields": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate location
        try:
            location = Location.objects.get(pk=location_id, company=company)
        except Location.DoesNotExist:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Location not found.", "fields": {"location_id": ["Invalid location."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parse start_date
        try:
            from datetime import datetime as dt
            start_date_parsed = dt.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Invalid start_date format.", "fields": {"start_date": ["Use YYYY-MM-DD format."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Optional fields
        description = (request.data.get("description") or "").strip()
        asset_id = request.data.get("asset_id")
        end_date = request.data.get("end_date")
        interval_days = request.data.get("interval_days", 30)
        checklist_template_id = request.data.get("checklist_template_id")
        maintenance_category_id = request.data.get("maintenance_category_id")
        assigned_technician_id = request.data.get("assigned_technician_id")
        scheduled_start_time = request.data.get("scheduled_start_time")
        scheduled_end_time = request.data.get("scheduled_end_time")
        manager_notes = (request.data.get("manager_notes") or "").strip()

        # Validate optional FKs
        asset = None
        if asset_id:
            try:
                asset = Asset.objects.get(pk=asset_id, company=company)
            except Asset.DoesNotExist:
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Asset not found.", "fields": {"asset_id": ["Invalid asset."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        checklist_template = None
        if checklist_template_id:
            try:
                checklist_template = ChecklistTemplate.objects.get(pk=checklist_template_id, company=company)
            except ChecklistTemplate.DoesNotExist:
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Checklist template not found.", "fields": {"checklist_template_id": ["Invalid checklist template."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        maintenance_category = None
        if maintenance_category_id:
            try:
                maintenance_category = MaintenanceCategory.objects.get(pk=maintenance_category_id, company=company)
            except MaintenanceCategory.DoesNotExist:
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Category not found.", "fields": {"maintenance_category_id": ["Invalid category."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        assigned_technician = None
        if assigned_technician_id:
            try:
                assigned_technician = User.objects.get(pk=assigned_technician_id, company=company, role=User.ROLE_CLEANER)
            except User.DoesNotExist:
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Technician not found.", "fields": {"assigned_technician_id": ["Invalid technician."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Parse end_date
        end_date_parsed = None
        if end_date:
            try:
                from datetime import datetime as dt
                end_date_parsed = dt.strptime(end_date, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Invalid end_date format.", "fields": {"end_date": ["Use YYYY-MM-DD format."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Parse times
        scheduled_start_time_parsed = None
        if scheduled_start_time:
            try:
                from datetime import datetime as dt
                scheduled_start_time_parsed = dt.strptime(scheduled_start_time, "%H:%M").time()
            except ValueError:
                pass  # Optional, ignore invalid

        scheduled_end_time_parsed = None
        if scheduled_end_time:
            try:
                from datetime import datetime as dt
                scheduled_end_time_parsed = dt.strptime(scheduled_end_time, "%H:%M").time()
            except ValueError:
                pass  # Optional, ignore invalid

        # Validate frequency
        valid_frequencies = [c[0] for c in RecurringVisitTemplate.FREQUENCY_CHOICES]
        if frequency not in valid_frequencies:
            frequency = RecurringVisitTemplate.FREQUENCY_MONTHLY

        # Create template
        template = RecurringVisitTemplate.objects.create(
            company=company,
            name=name,
            description=description,
            asset=asset,
            location=location,
            frequency=frequency,
            interval_days=int(interval_days) if interval_days else 30,
            start_date=start_date_parsed,
            end_date=end_date_parsed,
            checklist_template=checklist_template,
            maintenance_category=maintenance_category,
            assigned_technician=assigned_technician,
            scheduled_start_time=scheduled_start_time_parsed,
            scheduled_end_time=scheduled_end_time_parsed,
            manager_notes=manager_notes,
            is_active=True,
            created_by=request.user,
        )

        # Reload with relations
        template = RecurringVisitTemplate.objects.select_related(
            "asset", "location", "checklist_template",
            "maintenance_category", "assigned_technician"
        ).get(pk=template.pk)

        return Response(self._serialize_template(template), status=status.HTTP_201_CREATED)


class RecurringTemplateDetailView(MaintenancePermissionMixin, APIView):
    """
    Retrieve, update, delete recurring visit template.

    GET /api/maintenance/recurring-templates/<id>/
    PATCH /api/maintenance/recurring-templates/<id>/
    DELETE /api/maintenance/recurring-templates/<id>/
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def _get_template(self, company, pk):
        return get_object_or_404(
            RecurringVisitTemplate.objects.select_related(
                "asset", "location", "checklist_template",
                "maintenance_category", "assigned_technician"
            ),
            pk=pk,
            company=company,
        )

    def _serialize_template(self, template):
        return {
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "asset": {
                "id": template.asset.id,
                "name": template.asset.name,
            } if template.asset else None,
            "location": {
                "id": template.location.id,
                "name": template.location.name,
            },
            "frequency": template.frequency,
            "frequency_display": template.get_frequency_display(),
            "interval_days": template.interval_days,
            "start_date": template.start_date.isoformat(),
            "end_date": template.end_date.isoformat() if template.end_date else None,
            "checklist_template": {
                "id": template.checklist_template.id,
                "name": template.checklist_template.name,
            } if template.checklist_template else None,
            "maintenance_category": {
                "id": template.maintenance_category.id,
                "name": template.maintenance_category.name,
            } if template.maintenance_category else None,
            "assigned_technician": {
                "id": template.assigned_technician.id,
                "full_name": template.assigned_technician.full_name or template.assigned_technician.email,
            } if template.assigned_technician else None,
            "scheduled_start_time": template.scheduled_start_time.isoformat() if template.scheduled_start_time else None,
            "scheduled_end_time": template.scheduled_end_time.isoformat() if template.scheduled_end_time else None,
            "manager_notes": template.manager_notes,
            "is_active": template.is_active,
            "created_at": template.created_at.isoformat(),
        }

    def get(self, request, pk):
        company, error = self._check_read_access(request)
        if error:
            return error

        template = self._get_template(company, pk)
        return Response(self._serialize_template(template), status=status.HTTP_200_OK)

    def patch(self, request, pk):
        company, error = self._check_write_access(request)
        if error:
            return error

        template = self._get_template(company, pk)
        update_fields = []

        # Name
        name = request.data.get("name")
        if name is not None:
            name = name.strip()
            if not name:
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Name cannot be empty.", "fields": {"name": ["Name cannot be empty."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            template.name = name
            update_fields.append("name")

        # Description
        description = request.data.get("description")
        if description is not None:
            template.description = description.strip()
            update_fields.append("description")

        # Location
        location_id = request.data.get("location_id")
        if location_id is not None:
            try:
                location = Location.objects.get(pk=location_id, company=company)
                template.location = location
                update_fields.append("location")
            except Location.DoesNotExist:
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Location not found.", "fields": {"location_id": ["Invalid location."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Asset (nullable)
        if "asset_id" in request.data:
            asset_id = request.data.get("asset_id")
            if asset_id is None:
                template.asset = None
                update_fields.append("asset")
            else:
                try:
                    asset = Asset.objects.get(pk=asset_id, company=company)
                    template.asset = asset
                    update_fields.append("asset")
                except Asset.DoesNotExist:
                    return Response(
                        {"code": "VALIDATION_ERROR", "message": "Asset not found.", "fields": {"asset_id": ["Invalid asset."]}},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Frequency
        frequency = request.data.get("frequency")
        if frequency is not None:
            valid_frequencies = [c[0] for c in RecurringVisitTemplate.FREQUENCY_CHOICES]
            if frequency in valid_frequencies:
                template.frequency = frequency
                update_fields.append("frequency")

        # Interval days
        interval_days = request.data.get("interval_days")
        if interval_days is not None:
            template.interval_days = int(interval_days)
            update_fields.append("interval_days")

        # Start date
        start_date = request.data.get("start_date")
        if start_date is not None:
            try:
                from datetime import datetime as dt
                template.start_date = dt.strptime(start_date, "%Y-%m-%d").date()
                update_fields.append("start_date")
            except ValueError:
                return Response(
                    {"code": "VALIDATION_ERROR", "message": "Invalid start_date format.", "fields": {"start_date": ["Use YYYY-MM-DD format."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # End date (nullable)
        if "end_date" in request.data:
            end_date = request.data.get("end_date")
            if end_date is None:
                template.end_date = None
                update_fields.append("end_date")
            else:
                try:
                    from datetime import datetime as dt
                    template.end_date = dt.strptime(end_date, "%Y-%m-%d").date()
                    update_fields.append("end_date")
                except ValueError:
                    return Response(
                        {"code": "VALIDATION_ERROR", "message": "Invalid end_date format.", "fields": {"end_date": ["Use YYYY-MM-DD format."]}},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Checklist template (nullable)
        if "checklist_template_id" in request.data:
            checklist_template_id = request.data.get("checklist_template_id")
            if checklist_template_id is None:
                template.checklist_template = None
                update_fields.append("checklist_template")
            else:
                try:
                    checklist_template = ChecklistTemplate.objects.get(pk=checklist_template_id, company=company)
                    template.checklist_template = checklist_template
                    update_fields.append("checklist_template")
                except ChecklistTemplate.DoesNotExist:
                    return Response(
                        {"code": "VALIDATION_ERROR", "message": "Checklist template not found.", "fields": {"checklist_template_id": ["Invalid checklist template."]}},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Maintenance category (nullable)
        if "maintenance_category_id" in request.data:
            maintenance_category_id = request.data.get("maintenance_category_id")
            if maintenance_category_id is None:
                template.maintenance_category = None
                update_fields.append("maintenance_category")
            else:
                try:
                    maintenance_category = MaintenanceCategory.objects.get(pk=maintenance_category_id, company=company)
                    template.maintenance_category = maintenance_category
                    update_fields.append("maintenance_category")
                except MaintenanceCategory.DoesNotExist:
                    return Response(
                        {"code": "VALIDATION_ERROR", "message": "Category not found.", "fields": {"maintenance_category_id": ["Invalid category."]}},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Assigned technician (nullable)
        if "assigned_technician_id" in request.data:
            assigned_technician_id = request.data.get("assigned_technician_id")
            if assigned_technician_id is None:
                template.assigned_technician = None
                update_fields.append("assigned_technician")
            else:
                try:
                    assigned_technician = User.objects.get(pk=assigned_technician_id, company=company, role=User.ROLE_CLEANER)
                    template.assigned_technician = assigned_technician
                    update_fields.append("assigned_technician")
                except User.DoesNotExist:
                    return Response(
                        {"code": "VALIDATION_ERROR", "message": "Technician not found.", "fields": {"assigned_technician_id": ["Invalid technician."]}},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # Times (nullable)
        if "scheduled_start_time" in request.data:
            scheduled_start_time = request.data.get("scheduled_start_time")
            if scheduled_start_time is None:
                template.scheduled_start_time = None
                update_fields.append("scheduled_start_time")
            else:
                try:
                    from datetime import datetime as dt
                    template.scheduled_start_time = dt.strptime(scheduled_start_time, "%H:%M").time()
                    update_fields.append("scheduled_start_time")
                except ValueError:
                    pass

        if "scheduled_end_time" in request.data:
            scheduled_end_time = request.data.get("scheduled_end_time")
            if scheduled_end_time is None:
                template.scheduled_end_time = None
                update_fields.append("scheduled_end_time")
            else:
                try:
                    from datetime import datetime as dt
                    template.scheduled_end_time = dt.strptime(scheduled_end_time, "%H:%M").time()
                    update_fields.append("scheduled_end_time")
                except ValueError:
                    pass

        # Manager notes
        manager_notes = request.data.get("manager_notes")
        if manager_notes is not None:
            template.manager_notes = manager_notes.strip()
            update_fields.append("manager_notes")

        # is_active
        is_active = request.data.get("is_active")
        if is_active is not None:
            template.is_active = bool(is_active)
            update_fields.append("is_active")

        if update_fields:
            template.save(update_fields=update_fields)
            template.refresh_from_db()

        return Response(self._serialize_template(template), status=status.HTTP_200_OK)

    def delete(self, request, pk):
        company, error = self._check_write_access(request)
        if error:
            return error

        template = self._get_template(company, pk)

        # Check if any visits were generated
        if GeneratedVisitLog.objects.filter(template=template).exists():
            return Response(
                {"code": "CONFLICT", "message": "Cannot delete template with generated visits. Deactivate instead."},
                status=status.HTTP_409_CONFLICT,
            )

        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RecurringTemplateGenerateView(MaintenancePermissionMixin, APIView):
    """
    Generate visits from a recurring template.

    POST /api/maintenance/recurring-templates/<id>/generate/
    Body: { "date_to": "YYYY-MM-DD" }

    Generates Jobs from template.start_date up to date_to,
    respecting the frequency interval and skipping already-generated dates.

    Returns:
    {
        "generated_count": 6,
        "visits": [{ "id": 123, "scheduled_date": "2026-03-01" }, ...]
    }
    """

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
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

        # Get template
        template = get_object_or_404(
            RecurringVisitTemplate.objects.select_related(
                "asset", "location", "checklist_template",
                "maintenance_category", "assigned_technician"
            ),
            pk=pk,
            company=company,
        )

        if not template.is_active:
            return Response(
                {"code": "INVALID_STATE", "message": "Cannot generate visits from inactive template."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parse date_to
        date_to_str = (request.data.get("date_to") or "").strip()
        if not date_to_str:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "date_to is required.", "fields": {"date_to": ["date_to is required."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from datetime import datetime as dt
            date_to = dt.strptime(date_to_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "Invalid date_to format.", "fields": {"date_to": ["Use YYYY-MM-DD format."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate date_to >= start_date
        if date_to < template.start_date:
            return Response(
                {"code": "VALIDATION_ERROR", "message": "date_to cannot be before template start_date."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get already-generated dates for this template
        existing_dates = set(
            GeneratedVisitLog.objects.filter(template=template)
            .values_list("scheduled_date", flat=True)
        )

        # Calculate visit dates
        interval_days = template.get_interval_days()
        current_date = template.start_date
        end_date = date_to
        if template.end_date and template.end_date < end_date:
            end_date = template.end_date

        visit_dates = []
        while current_date <= end_date:
            if current_date not in existing_dates:
                visit_dates.append(current_date)
            current_date += timedelta(days=interval_days)

        if not visit_dates:
            return Response({
                "generated_count": 0,
                "visits": [],
                "message": "No new visits to generate. All dates already have visits."
            }, status=status.HTTP_200_OK)

        # Create Jobs and logs
        created_visits = []
        user = request.user

        for visit_date in visit_dates:
            # Create Job with context=CONTEXT_MAINTENANCE
            job = Job.objects.create(
                company=company,
                location=template.location,
                asset=template.asset,
                cleaner=template.assigned_technician,
                scheduled_date=visit_date,
                scheduled_start_time=template.scheduled_start_time,
                scheduled_end_time=template.scheduled_end_time,
                status=Job.STATUS_SCHEDULED,
                context=Job.CONTEXT_MAINTENANCE,
                maintenance_category=template.maintenance_category,
                manager_notes=template.manager_notes,
            )

            # Copy checklist items from template
            if template.checklist_template:
                from apps.jobs.models import JobChecklistItem
                template_items = template.checklist_template.items.all()
                for item in template_items:
                    JobChecklistItem.objects.create(
                        job=job,
                        label=item.label,
                        order=item.order,
                        completed=False,
                    )

            # Create log entry
            GeneratedVisitLog.objects.create(
                template=template,
                job=job,
                scheduled_date=visit_date,
                generated_by=user,
            )

            created_visits.append({
                "id": job.id,
                "scheduled_date": visit_date.isoformat(),
            })

        return Response({
            "generated_count": len(created_visits),
            "visits": created_visits,
        }, status=status.HTTP_201_CREATED)
