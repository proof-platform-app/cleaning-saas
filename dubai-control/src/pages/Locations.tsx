// dubai-control/src/pages/LocationsNew.tsx

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Search,
  MapPin,
  Loader2,
  Edit,
  X,
} from "lucide-react";
import {
  getLocations,
  createLocation,
  updateLocation,
  type Location,
} from "@/api/client";
import { LocationForm } from "@/components/locations/LocationForm";

type StatusFilter = "all" | "active" | "inactive";

export default function LocationsNew() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Fetch locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
  });

  // Create location mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Location>) => createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast({
        title: "Success",
        description: "Location created successfully",
      });
      setShowModal(false);
      setEditingLocation(null);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to create location";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  // Update location mutation (for both toggle and edit)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Location> }) =>
      updateLocation(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });

      // If editing in modal, close it
      if (showModal) {
        setShowModal(false);
        setEditingLocation(null);
      }

      toast({
        title: "Success",
        description: "Location updated successfully",
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to update location";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  const handleToggleActive = (location: Location) => {
    updateMutation.mutate({
      id: location.id,
      data: { is_active: !location.is_active },
    });
  };

  const handleAddNew = () => {
    setEditingLocation(null);
    setShowModal(true);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setShowModal(true);
  };

  const handleSave = async (data: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    is_active?: boolean;
  }) => {
    if (editingLocation) {
      // Update existing location
      updateMutation.mutate({
        id: editingLocation.id,
        data: {
          name: data.name,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          is_active: data.is_active,
        },
      });
    } else {
      // Create new location
      createMutation.mutate({
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        is_active: data.is_active ?? true,
      });
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingLocation(null);
  };

  // Filter locations
  const filteredLocations = locations.filter((location) => {
    // Status filter
    const isActive = location.is_active ?? true;
    if (statusFilter === "active" && !isActive) return false;
    if (statusFilter === "inactive" && isActive) return false;

    // Search filter
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const name = (location.name || "").toLowerCase();
    const address = (location.address || "").toLowerCase();
    return name.includes(search) || address.includes(search);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Locations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your work locations for cleaning jobs
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add location
        </Button>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-medium">💡 About location status</p>
        <ul className="mt-2 space-y-1 text-xs">
          <li>• <strong>Active</strong> locations appear in job planning and can be assigned to new jobs</li>
          <li>• <strong>Inactive</strong> locations are hidden from planning but remain in history and reports</li>
          <li>• Locations with job history cannot be deleted, only deactivated</li>
        </ul>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or address..."
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Locations List */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Locations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredLocations.length}{" "}
            {filteredLocations.length === 1 ? "location" : "locations"}
          </p>
        </div>

        {filteredLocations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {searchTerm || statusFilter !== "all"
                ? "No locations found"
                : "No locations yet"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by adding your first location"}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button onClick={handleAddNew} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add location
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredLocations.map((location) => {
                  const isActive = location.is_active ?? true;
                  return (
                    <tr key={location.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{location.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-muted-foreground">
                          {location.address || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => handleToggleActive(location)}
                            disabled={updateMutation.isPending}
                          />
                          <span className="text-sm font-medium text-foreground">
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(location)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Location Modal - Fullscreen with Large Map */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-[95vw] h-[95vh] flex flex-col rounded-xl border border-border bg-card shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {editingLocation ? "Edit Location" : "Add Location"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {editingLocation
                    ? "Update location details and coordinates"
                    : "Add a new location for cleaning jobs"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Body with Form - Fullscreen Layout */}
            <div className="flex-1 min-h-0 overflow-hidden p-6">
              <LocationForm
                location={editingLocation}
                onSave={handleSave}
                onCancel={handleCancel}
                isLoading={createMutation.isPending || updateMutation.isPending}
                fullscreenMap={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
