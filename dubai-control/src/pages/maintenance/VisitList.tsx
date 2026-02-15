// dubai-control/src/pages/maintenance/VisitList.tsx
// Service Visits page - Lovable UI layout with real API data
// Layout imported from control-hub/src/pages/WorkOrdersPage.tsx
// See docs/execution/LOVABLE_UI_IMPORT_PROTOCOL.md

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, subDays } from "date-fns";
import { Loader2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listVisits,
  listAssets,
  listTechnicians,
  listCategories,
  maintenanceKeys,
  type ServiceVisit,
  type VisitFilters,
} from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import {
  VisitsLovableLayout,
  type VisitLayoutItem,
  type VisitStatus,
  type FilterOption,
} from "@/contexts/maintenance/ui/VisitsLovableLayout";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";

// ============================================================================
// RBAC
// ============================================================================

function canAccessVisits(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

function canCreateVisits(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

// ============================================================================
// Data Mapping
// ============================================================================

/**
 * Map API ServiceVisit to layout-compatible VisitLayoutItem
 */
function mapVisitToLayout(visit: ServiceVisit): VisitLayoutItem {
  return {
    id: visit.id,
    status: (visit.status as VisitStatus) || "scheduled",
    assetName: visit.asset?.name,
    locationName: visit.location?.name,
    locationAddress: visit.location?.address,
    technicianName: visit.cleaner?.full_name,
    scheduledDate: visit.scheduled_date,
    // Proof indicators from API
    hasPhotoBefore: visit.proof?.before_photo || visit.proof?.before_uploaded || false,
    hasPhotoAfter: visit.proof?.after_photo || visit.proof?.after_uploaded || false,
    checklistCompleted: 0,
    checklistTotal: 0,
    // SLA status from API
    slaStatus: visit.sla_status,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export default function VisitList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useUserRole();

  // Default date range: last 30 days
  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  // Read initial filter values from URL query params
  const getInitialFilters = useCallback(() => ({
    status: searchParams.get("status") || "all",
    asset: searchParams.get("asset_id") || "all",
    technician: searchParams.get("technician_id") || "all",
    category: searchParams.get("category_id") || "all",
    location: searchParams.get("location_id") || "all",
    slaReason: searchParams.get("sla_reason") || "",
    dateFrom: searchParams.get("date_from") || thirtyDaysAgo,
    dateTo: searchParams.get("date_to") || today,
  }), [searchParams, thirtyDaysAgo, today]);

  // Filter state - maps 1:1 to backend query params
  const [statusFilter, setStatusFilter] = useState(() => getInitialFilters().status);
  const [assetFilter, setAssetFilter] = useState(() => getInitialFilters().asset);
  const [technicianFilter, setTechnicianFilter] = useState(() => getInitialFilters().technician);
  const [categoryFilter, setCategoryFilter] = useState(() => getInitialFilters().category);
  const [locationFilter, setLocationFilter] = useState(() => getInitialFilters().location);
  const [slaReasonFilter, setSlaReasonFilter] = useState(() => getInitialFilters().slaReason);
  const [dateFrom, setDateFrom] = useState(() => getInitialFilters().dateFrom);
  const [dateTo, setDateTo] = useState(() => getInitialFilters().dateTo);

  // Sync filters FROM URL when query params change (deep link navigation)
  useEffect(() => {
    const params = getInitialFilters();
    setStatusFilter(params.status);
    setAssetFilter(params.asset);
    setTechnicianFilter(params.technician);
    setCategoryFilter(params.category);
    setLocationFilter(params.location);
    setSlaReasonFilter(params.slaReason);
    setDateFrom(params.dateFrom);
    setDateTo(params.dateTo);
  }, [searchParams, getInitialFilters]);

  // Update URL when filters change (for shareable links)
  const updateUrlParams = useCallback((updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "all" && value !== thirtyDaysAgo && value !== today) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });

    // Only update if params actually changed
    if (newParams.toString() !== searchParams.toString()) {
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, thirtyDaysAgo, today]);

  // Handlers that update both state and URL
  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    updateUrlParams({ status: value });
  }, [updateUrlParams]);

  const handleAssetChange = useCallback((value: string) => {
    setAssetFilter(value);
    updateUrlParams({ asset_id: value });
  }, [updateUrlParams]);

  const handleTechnicianChange = useCallback((value: string) => {
    setTechnicianFilter(value);
    updateUrlParams({ technician_id: value });
  }, [updateUrlParams]);

  const handleCategoryChange = useCallback((value: string) => {
    setCategoryFilter(value);
    updateUrlParams({ category_id: value });
  }, [updateUrlParams]);

  const hasAccess = canAccessVisits(user.role);
  const canCreate = canCreateVisits(user.role);

  // Build filters object for API
  const filters: VisitFilters = useMemo(() => ({
    date_from: dateFrom,
    date_to: dateTo,
    status: statusFilter !== "all" ? statusFilter : undefined,
    asset_id: assetFilter !== "all" ? Number(assetFilter) : undefined,
    technician_id: technicianFilter !== "all" ? Number(technicianFilter) : undefined,
    category_id: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
    location_id: locationFilter !== "all" ? Number(locationFilter) : undefined,
    sla_reason: slaReasonFilter || undefined,
  }), [dateFrom, dateTo, statusFilter, assetFilter, technicianFilter, categoryFilter, locationFilter, slaReasonFilter]);

  // Fetch visits using maintenance API layer
  const {
    data: visits = [],
    isLoading,
    isError,
    error: visitsError,
    refetch,
  } = useQuery({
    queryKey: maintenanceKeys.visits.list(filters),
    queryFn: () => listVisits(filters),
    enabled: hasAccess,
  });

  // Fetch assets for filter dropdown
  const { data: assets = [] } = useQuery({
    queryKey: maintenanceKeys.assets.list(),
    queryFn: () => listAssets(),
    enabled: hasAccess,
  });

  // Fetch technicians for filter dropdown
  const { data: technicians = [] } = useQuery({
    queryKey: maintenanceKeys.technicians,
    queryFn: listTechnicians,
    enabled: hasAccess,
  });

  // Fetch categories for filter dropdown
  const { data: categories = [] } = useQuery({
    queryKey: maintenanceKeys.categories.list(),
    queryFn: listCategories,
    enabled: hasAccess,
  });

  // Only valid statuses per MAINTENANCE_CONTEXT_V1_SCOPE
  // cancelled visits are excluded from display
  const VALID_STATUSES = ["scheduled", "in_progress", "completed"];

  // Map data for layout, filtering out cancelled visits
  const layoutVisits = useMemo<VisitLayoutItem[]>(
    () => visits
      .filter((v) => VALID_STATUSES.includes(v.status))
      .map(mapVisitToLayout),
    [visits]
  );

  const assetOptions = useMemo<FilterOption[]>(
    () => assets.map((a) => ({ value: String(a.id), label: a.name })),
    [assets]
  );

  const technicianOptions = useMemo<FilterOption[]>(
    () => technicians.map((t) => ({ value: String(t.id), label: t.full_name })),
    [technicians]
  );

  const categoryOptions = useMemo<FilterOption[]>(
    () => categories.filter((c) => c.is_active).map((c) => ({ value: String(c.id), label: c.name })),
    [categories]
  );

  // Handlers
  const handleCreateVisit = () => {
    navigate("/maintenance/visits/new");
  };

  const handleRowClick = (id: number | string) => {
    navigate(`/maintenance/visits/${id}`);
  };

  // Access restricted view
  if (!hasAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-8 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view service visits.
          </p>
        </div>
      </MaintenanceLayout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <MaintenanceLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MaintenanceLayout>
    );
  }

  // Error state with error banner
  if (isError) {
    const errorMessage = (visitsError as any)?.response?.data?.message
      || "Failed to load service visits. Please try again.";
    return (
      <MaintenanceLayout>
        <div className="space-y-4">
          {/* Error Banner */}
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-destructive" />
              <p className="text-sm font-medium text-destructive">Error loading data</p>
            </div>
            <p className="mt-1 text-sm text-destructive/80">{errorMessage}</p>
          </div>
          <div className="py-8 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Unable to load visits</h2>
            <p className="mt-2 text-muted-foreground">
              There was an error loading service visits.
            </p>
            <Button onClick={() => refetch()} className="mt-4" size="sm">
              Retry
            </Button>
          </div>
        </div>
      </MaintenanceLayout>
    );
  }

  // Main render with Lovable layout
  return (
    <MaintenanceLayout>
      <VisitsLovableLayout
        visits={layoutVisits}
        onCreateVisit={handleCreateVisit}
        onRowClick={handleRowClick}
        canWrite={canCreate}
        loading={false}
        emptyState={
          statusFilter !== "all" || assetFilter !== "all" || technicianFilter !== "all" || categoryFilter !== "all" || locationFilter !== "all" || slaReasonFilter
            ? {
                title: "No visits found",
                description: "Try adjusting your filters",
              }
            : {
                title: "No service visits yet",
                description: "Get started by creating your first service visit",
              }
        }
        // Filters - map 1:1 to backend query params
        // Handlers update both state and URL for shareable deep links
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusChange}
        assetFilter={assetFilter}
        onAssetFilterChange={handleAssetChange}
        assetOptions={assetOptions}
        technicianFilter={technicianFilter}
        onTechnicianFilterChange={handleTechnicianChange}
        technicianOptions={technicianOptions}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={handleCategoryChange}
        categoryOptions={categoryOptions}
      />
    </MaintenanceLayout>
  );
}
