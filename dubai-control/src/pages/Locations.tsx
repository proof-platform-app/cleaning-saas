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
import { Plus, ArrowLeft } from "lucide-react";

type ViewMode = "list" | "create" | "edit";

// UI-тип: backend Location + опциональный createdAt в camelCase
type UILocation = ApiLocation & {
  createdAt?: string | null;
};

// Данные, которые реально приходят из формы
type LocationFormData = {
  name: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  // is_active пробрасывается через LocationForm как часть ApiLocation
};

export default function Locations() {
  const { locations, addLocation, updateLocation } = useLocations();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedLocation, setSelectedLocation] = useState<UILocation | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

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
                  Deactivating will <strong>remove this location</strong> from
                  job planning and dropdowns for new jobs.
                </li>
                <li>
                  All existing jobs, history, PDF reports and analytics will{" "}
                  <strong>keep pointing</strong> to this location.
                </li>
                <li>
                  Locations with job history <strong>cannot be deleted</strong>;
                  they can only be deactivated / reactivated.
                </li>
              </ul>
              {!isActive && (
                <p className="mt-2 text-xs">
                  This location is currently marked as{" "}
                  <span className="font-semibold">Inactive</span>. You can
                  reactivate it later if the client comes back.
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
    (loc) => (loc as UILocation).is_active === false
  );

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
      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
        <div className="mb-1 font-semibold text-slate-900">
          Active vs Inactive locations
        </div>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium">Active</span> locations appear in job
            planning and can be used for new jobs.
          </li>
          <li>
            <span className="font-medium">Inactive</span> locations stay in job
            history and reports, but{" "}
            <span className="font-medium">are hidden</span> from planning and
            dropdowns.
          </li>
          <li>
            Locations with job history <span className="font-medium">
              cannot be deleted
            </span>
            ; use deactivation instead.
          </li>
        </ul>
        {hasInactiveLocations && (
          <p className="mt-2 text-[11px] text-slate-600">
            Some locations are already inactive — they remain in reports but are
            not available for new jobs.
          </p>
        )}
      </div>

      {/* Locations Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Latitude</TableHead>
              <TableHead>Longitude</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((location) => {
              const lat =
                typeof location.latitude === "number"
                  ? location.latitude.toFixed(6)
                  : "—";
              const lng =
                typeof location.longitude === "number"
                  ? location.longitude.toFixed(6)
                  : "—";

              const createdRaw =
                (location as UILocation).createdAt ?? location.created_at;
              const createdLabel = createdRaw
                ? format(new Date(createdRaw), "MMM d, yyyy")
                : "—";

              const isActive =
                (location as UILocation).is_active ?? true;

              const statusLabel = isActive ? "Active" : "Inactive";
              const statusClasses = isActive
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-slate-50 text-slate-500 border border-slate-200";

              return (
                <TableRow
                  key={location.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(location as UILocation)}
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
                    <span className="line-clamp-2 whitespace-pre-line">
                      {location.address}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{lat}</TableCell>
                  <TableCell className="font-mono text-sm">{lng}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {createdLabel}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {locations.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No locations added yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first work location to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
