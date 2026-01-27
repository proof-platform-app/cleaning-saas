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

  if (viewMode === "create" || viewMode === "edit") {
    return (
      <div className="p-8 animate-fade-in">
        <div className="max-w-2xl">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Locations
          </button>

          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-8">
            {viewMode === "create" ? "Add Location" : "Edit Location"}
          </h1>

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

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Locations
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your work locations for cleaning jobs.
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Locations Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Name</TableHead>
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

              return (
                <TableRow
                  key={location.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(location as UILocation)}
                >
                  <TableCell className="font-medium">
                    {location.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs">
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
            <p className="text-sm text-muted-foreground mt-1">
              Add your first work location to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
