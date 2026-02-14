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
from apps.maintenance.models import AssetType, Asset
from apps.locations.models import Location


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
