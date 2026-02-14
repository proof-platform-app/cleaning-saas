// dubai-control/src/pages/maintenance/CreateVisit.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2, ClipboardList, Save } from "lucide-react";
import {
  listLocations,
  listTechnicians,
  listAssets,
  listCategories,
  createVisit,
  maintenanceKeys,
  type Location,
  type Cleaner,
  type Asset,
  type MaintenanceCategory,
} from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";

// RBAC: Check if user can create visits (owner/manager)
function canCreateVisits(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

export default function CreateVisit() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useUserRole();

  const canCreate = canCreateVisits(user.role);

  // Form state
  const [formData, setFormData] = useState({
    scheduled_date: format(new Date(), "yyyy-MM-dd"),
    scheduled_start_time: "",
    scheduled_end_time: "",
    location_id: "",
    cleaner_id: "",
    asset_id: "",
    category_id: "",
    manager_notes: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Filter assets by selected location
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);

  // Fetch locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: maintenanceKeys.locations,
    queryFn: listLocations,
    enabled: canCreate,
  });

  // Fetch technicians (cleaners)
  const { data: technicians = [], isLoading: techniciansLoading } = useQuery({
    queryKey: maintenanceKeys.technicians,
    queryFn: listTechnicians,
    enabled: canCreate,
  });

  // Fetch assets
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: maintenanceKeys.assets.list({ is_active: true }),
    queryFn: () => listAssets({ is_active: true }),
    enabled: canCreate,
  });

  // Fetch maintenance categories
  const { data: categories = [] } = useQuery({
    queryKey: maintenanceKeys.categories.list(),
    queryFn: listCategories,
    enabled: canCreate,
  });

  // Filter assets when location changes
  useEffect(() => {
    if (formData.location_id) {
      const locationId = Number(formData.location_id);
      const filtered = assets.filter((a) => a.location.id === locationId);
      setFilteredAssets(filtered);
      // Clear asset selection if it's not in the new location
      if (formData.asset_id) {
        const currentAsset = assets.find((a) => a.id === Number(formData.asset_id));
        if (currentAsset && currentAsset.location.id !== locationId) {
          setFormData((prev) => ({ ...prev, asset_id: "" }));
        }
      }
    } else {
      setFilteredAssets([]);
      setFormData((prev) => ({ ...prev, asset_id: "" }));
    }
  }, [formData.location_id, assets, formData.asset_id]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createVisit,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.visits.all });
      toast({
        title: "Success",
        description: "Service visit created successfully",
      });
      navigate(`/maintenance/visits/${data.id}`);
    },
    onError: (error: any) => {
      const errorData = error?.response?.data;

      // Handle field-level validation errors
      if (errorData?.fields) {
        const errors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(errorData.fields)) {
          errors[field] = Array.isArray(messages) ? messages[0] : String(messages);
        }
        setFieldErrors(errors);
      }

      const message = errorData?.message || errorData?.detail || "Failed to create service visit";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};
    if (!formData.scheduled_date) {
      errors.scheduled_date = "Date is required";
    }
    if (!formData.location_id) {
      errors.location_id = "Location is required";
    }
    if (!formData.cleaner_id) {
      errors.cleaner_id = "Technician is required";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    createMutation.mutate({
      scheduled_date: formData.scheduled_date,
      scheduled_start_time: formData.scheduled_start_time || null,
      scheduled_end_time: formData.scheduled_end_time || null,
      location_id: Number(formData.location_id),
      cleaner_id: Number(formData.cleaner_id),
      asset_id: formData.asset_id ? Number(formData.asset_id) : null,
      maintenance_category_id: formData.category_id ? Number(formData.category_id) : null,
      manager_notes: formData.manager_notes || undefined,
    });
  };

  // Access restricted view
  if (!canCreate) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            Access Restricted
          </h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to create service visits.
          </p>
          <Button onClick={() => navigate("/maintenance/visits")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Visits
          </Button>
        </div>
      </div>
    );
  }

  const activeLocations = locations.filter((l) => l.is_active !== false);
  const activeTechnicians = technicians.filter((t) => t.is_active);

  return (
    <div className="mx-auto max-w-2xl p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/maintenance/visits")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Visits
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Create Service Visit
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule a new maintenance service visit
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-6">
            {/* Date and Time */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled_date">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduled_date: e.target.value })
                  }
                  className={fieldErrors.scheduled_date ? "border-destructive" : ""}
                />
                {fieldErrors.scheduled_date && (
                  <p className="text-xs text-destructive">{fieldErrors.scheduled_date}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_start_time">Start Time</Label>
                <Input
                  id="scheduled_start_time"
                  type="time"
                  value={formData.scheduled_start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduled_start_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_end_time">End Time</Label>
                <Input
                  id="scheduled_end_time"
                  type="time"
                  value={formData.scheduled_end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduled_end_time: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location_id">
                Location <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.location_id}
                onValueChange={(v) => setFormData({ ...formData, location_id: v })}
              >
                <SelectTrigger
                  className={fieldErrors.location_id ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.location_id && (
                <p className="text-xs text-destructive">{fieldErrors.location_id}</p>
              )}
            </div>

            {/* Technician */}
            <div className="space-y-2">
              <Label htmlFor="cleaner_id">
                Technician <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.cleaner_id}
                onValueChange={(v) => setFormData({ ...formData, cleaner_id: v })}
              >
                <SelectTrigger
                  className={fieldErrors.cleaner_id ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {activeTechnicians.map((tech) => (
                    <SelectItem key={tech.id} value={String(tech.id)}>
                      {tech.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.cleaner_id && (
                <p className="text-xs text-destructive">{fieldErrors.cleaner_id}</p>
              )}
            </div>

            {/* Asset (optional) */}
            <div className="space-y-2">
              <Label htmlFor="asset_id">Asset (optional)</Label>
              <Select
                value={formData.asset_id}
                onValueChange={(v) => setFormData({ ...formData, asset_id: v })}
                disabled={!formData.location_id}
              >
                <SelectTrigger
                  className={fieldErrors.asset_id ? "border-destructive" : ""}
                >
                  <SelectValue
                    placeholder={
                      formData.location_id
                        ? filteredAssets.length > 0
                          ? "Select asset"
                          : "No assets at this location"
                        : "Select location first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No asset</SelectItem>
                  {filteredAssets.map((asset) => (
                    <SelectItem key={asset.id} value={String(asset.id)}>
                      {asset.name} ({asset.asset_type.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.asset_id && (
                <p className="text-xs text-destructive">{fieldErrors.asset_id}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Link this visit to a specific asset for service tracking
              </p>
            </div>

            {/* Category (optional) */}
            <div className="space-y-2">
              <Label htmlFor="category_id">Category (optional)</Label>
              <Select
                value={formData.category_id}
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No category</SelectItem>
                  {categories.filter((c) => c.is_active).map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Categorize this visit (e.g., Preventive, Corrective, Emergency)
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="manager_notes">Notes (optional)</Label>
              <Textarea
                id="manager_notes"
                value={formData.manager_notes}
                onChange={(e) =>
                  setFormData({ ...formData, manager_notes: e.target.value })
                }
                placeholder="Instructions or notes for the technician..."
                rows={3}
              />
            </div>

            {/* Info Banner */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <p className="font-medium">About Checklist Templates</p>
              <p className="mt-1 text-xs">
                Checklist templates are coming soon. For now, technicians can complete
                tasks manually during the service visit.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/maintenance/visits")}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              Create Visit
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
