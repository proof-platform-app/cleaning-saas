// dubai-control/src/pages/Locations.tsx

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { LocationForm } from "@/components/locations/LocationForm";
import { useLocations } from "@/contexts/LocationsContext";
import { type Location as ApiLocation } from "@/api/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  ArrowLeft,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

type ViewMode = "list" | "create" | "edit";

// UI-тип: backend Location + опциональный createdAt в camelCase
type UILocation = ApiLocation & {
  createdAt?: string | null;
};

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "name" | "status" | "created";
type SortDirection = "asc" | "desc";

// Данные, которые реально приходят из формы
type LocationFormData = {
  name: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  // is_active пробрасывается через LocationForm как часть ApiLocation
};

function getMapsUrl(loc: ApiLocation): string | null {
  const hasCoords =
    typeof loc.latitude === "number" &&
    typeof loc.longitude === "number";

  if (hasCoords) {
    return `https://www.google.com/maps?q=${encodeURIComponent(
      `${loc.latitude},${loc.longitude}`,
    )}`;
  }

  if (loc.address) {
    return `https://www.google.com/maps?q=${encodeURIComponent(
      loc.address,
    )}`;
  }

  return null;
}

export default function Locations() {
  const { locations, addLocation, updateLocation } = useLocations();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- начальные значения из URL ---
  const initialSearch = searchParams.get("q") ?? "";

  const rawStatus = (searchParams.get("status") as StatusFilter) ?? "all";
  const initialStatus: StatusFilter =
    rawStatus === "active" || rawStatus === "inactive" || rawStatus === "all"
      ? rawStatus
      : "all";

  const rawSortKey = searchParams.get("sort") as SortKey | null;
  const initialSortKey: SortKey =
    rawSortKey === "name" ||
    rawSortKey === "status" ||
    rawSortKey === "created"
      ? rawSortKey
      : "created";

  const rawDir = searchParams.get("dir") as SortDirection | null;
  const initialDir: SortDirection =
    rawDir === "asc" || rawDir === "desc" ? rawDir : "desc";

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedLocation, setSelectedLocation] =
    useState<UILocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(initialStatus);
  const [sortKey, setSortKey] = useState<SortKey>(initialSortKey);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(initialDir);

  const handleRowClick = (location: UILocation) => {
    setSelectedLocation(location);
    setApiError(null);
    setViewMode("edit");
  };

  const handleAddNew = () => {
    setSelectedLocation(null);
    setApiError(null);
    setViewMode("create");
  };

  const handleCancel = () => {
    setViewMode("list");
    setSelectedLocation(null);
    setApiError(null);
  };

  const handleSave = async (data: LocationFormData) => {
    setIsLoading(true);
    setApiError(null);

    try {
      if (viewMode === "create") {
        await addLocation(data);
      } else if (viewMode === "edit" && selectedLocation) {
        await updateLocation(selectedLocation.id, data);
      }
      setViewMode("list");
      setSelectedLocation(null);
    } catch (error) {
      console.error("[Locations] save error", error);
      setApiError("Failed to save location. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    const params = new URLSearchParams(searchParams);
    const trimmed = value.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    setSearchParams(params, { replace: true });
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value !== "all") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    setSearchParams(params, { replace: true });
  };

  const handleSortChange = (key: SortKey) => {
    const nextDirection: SortDirection =
      sortKey === key && sortDirection === "asc" ? "desc" : "asc";

    setSortKey(key);
    setSortDirection(nextDirection);

    const params = new URLSearchParams(searchParams);
    // значение по умолчанию не тащим в URL
    if (key === "created" && nextDirection === "desc") {
      params.delete("sort");
      params.delete("dir");
    } else {
      params.set("sort", key);
      params.set("dir", nextDirection);
    }
    setSearchParams(params, { replace: true });
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSortKey("created");
    setSortDirection("desc");

    const params = new URLSearchParams(searchParams);
    params.delete("q");
    params.delete("status");
    params.delete("sort");
    params.delete("dir");
    setSearchParams(params, { replace: true });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return (
        <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/60" />
      );
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="ml-1 h-3 w-3" />;
    }
    return <ChevronDown className="ml-1 h-3 w-3" />;
  };

  const normalizeSearch = searchTerm.trim().toLowerCase();

  const getCreatedTimestamp = (loc: UILocation): number => {
    const raw = loc.createdAt ?? (loc as ApiLocation).created_at;
    if (!raw) return 0;
    const d = new Date(raw as any);
    const ts = d.getTime();
    return Number.isNaN(ts) ? 0 : ts;
  };

  const filteredAndSortedLocations: UILocation[] = [...locations]
    .filter((loc) => {
      const uiLoc = loc as UILocation;

      // фильтр по статусу
      const isActive = uiLoc.is_active ?? true;
      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "inactive" && isActive) return false;

      // поиск по имени и адресу
      if (!normalizeSearch) return true;
      const name = (loc.name ?? "").toString().toLowerCase();
      const address = (loc.address ?? "").toString().toLowerCase();

      return (
        name.includes(normalizeSearch) ||
        address.includes(normalizeSearch)
      );
    })
    .sort((a, b) => {
      const uiA = a as UILocation;
      const uiB = b as UILocation;

      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (sortKey) {
        case "name":
          aVal = (uiA.name ?? "").toLowerCase();
          bVal = (uiB.name ?? "").toLowerCase();
          break;
        case "status": {
          const aActive = uiA.is_active ?? true;
          const bActive = uiB.is_active ?? true;
          // active выше inactive
          aVal = aActive ? 1 : 0;
          bVal = bActive ? 1 : 0;
          break;
        }
        case "created":
        default:
          aVal = getCreatedTimestamp(uiA);
          bVal = getCreatedTimestamp(uiB);
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  // --- Edit/Create view ---
  if (viewMode === "create" || viewMode === "edit") {
    const isEditing = viewMode === "edit";
    const isActive =
      (selectedLocation as UILocation | null)?.is_active ?? true;

    return (
      <div className="p-8 animate-fade-in">
        <div className="max-w-2xl">
          <button
            onClick={handleCancel}
            className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Locations
          </button>

          <h1 className="mb-4 text-2xl font-semibold tracking-tight text-foreground">
            {isEditing ? "Edit Location" : "Add Location"}
          </h1>

          {isEditing && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="mb-1 font-semibold">
                Before you deactivate this location
              </div>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Deactivating will{" "}
                  <strong>remove this location</strong> from job
                  planning and dropdowns for new jobs.
                </li>
                <li>
                  All existing jobs, history, PDF reports and analytics
                  will <strong>keep pointing</strong> to this location.
                </li>
                <li>
                  Locations with job history{" "}
                  <strong>cannot be deleted</strong>; they can only be
                  deactivated / reactivated.
                </li>
              </ul>
              {!isActive && (
                <p className="mt-2 text-xs">
                  This location is currently marked as{" "}
                  <span className="font-semibold">Inactive</span>. You
                  can reactivate it later if the client comes back.
                </p>
              )}
            </div>
          )}

          <LocationForm
            location={selectedLocation}
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={isLoading}
            apiError={apiError}
          />
        </div>
      </div>
    );
  }

  // --- List view ---
  const hasInactiveLocations = locations.some(
    (loc) => (loc as UILocation).is_active === false,
  );

  const hasAnyLocations = locations.length > 0;
  const hasFilteredLocations = filteredAndSortedLocations.length > 0;
  const hasNonDefaultFilters =
    searchTerm.trim().length > 0 ||
    statusFilter !== "all" ||
    sortKey !== "created" ||
    sortDirection !== "desc";

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Locations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your work locations for cleaning jobs.
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>

      {/* Info about Active / Inactive semantics */}
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
        <div className="mb-1 font-semibold text-slate-900">
          Active vs Inactive locations
        </div>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium">Active</span> locations appear
            in job planning and can be used for new jobs.
          </li>
          <li>
            <span className="font-medium">Inactive</span> locations stay
            in job history and reports, but{" "}
            <span className="font-medium">are hidden</span> from planning
            and dropdowns.
          </li>
          <li>
            Locations with job history{" "}
            <span className="font-medium">cannot be deleted</span>; use
            deactivation instead.
          </li>
        </ul>
        {hasInactiveLocations && (
          <p className="mt-2 text-[11px] text-slate-600">
            Some locations are already inactive — they remain in reports
            but are not available for new jobs.
          </p>
        )}
      </div>

      {/* Filters row */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name or address…"
          className="max-w-sm"
        />
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status</span>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                handleStatusFilterChange(value as StatusFilter)
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasNonDefaultFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={handleClearFilters}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Locations Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSortChange("name")}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground"
                >
                  <span>Name</span>
                  {renderSortIcon("name")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSortChange("status")}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground"
                >
                  <span>Status</span>
                  {renderSortIcon("status")}
                </button>
              </TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Latitude</TableHead>
              <TableHead>Longitude</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSortChange("created")}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground"
                >
                  <span>Created</span>
                  {renderSortIcon("created")}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasFilteredLocations ? (
              filteredAndSortedLocations.map((location) => {
                const lat =
                  typeof location.latitude === "number"
                    ? location.latitude.toFixed(6)
                    : "—";
                const lng =
                  typeof location.longitude === "number"
                    ? location.longitude.toFixed(6)
                    : "—";

                const createdRaw =
                  (location as UILocation).createdAt ??
                  location.created_at;
                const createdLabel = createdRaw
                  ? format(new Date(createdRaw), "MMM d, yyyy")
                  : "—";

                const isActive =
                  (location as UILocation).is_active ?? true;

                const statusLabel = isActive
                  ? "Active"
                  : "Inactive";
                const statusClasses = isActive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-slate-50 text-slate-500 border border-slate-200";

                const mapsUrl = getMapsUrl(location);

                return (
                  <TableRow
                    key={location.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      handleRowClick(location as UILocation)
                    }
                  >
                    <TableCell className="font-medium">
                      {location.name}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses}`}
                      >
                        {statusLabel}
                      </span>
                    </TableCell>

                    <TableCell className="max-w-xs text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        <span className="line-clamp-2 whitespace-pre-line">
                          {location.address}
                        </span>
                        {mapsUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                mapsUrl,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }}
                            className="inline-flex w-fit text-[11px] font-medium text-primary hover:underline"
                          >
                            View on map
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {lat}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {lng}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {createdLabel}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {hasAnyLocations
                    ? "No locations match your search or filters."
                    : "No locations added yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
