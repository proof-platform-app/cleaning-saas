// dubai-control/src/pages/maintenance/CreateVisit.tsx

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  listChecklistTemplates,
  createVisit,
  maintenanceKeys,
  type Location,
  type Cleaner,
  type Asset,
  type MaintenanceCategory,
  type ChecklistTemplate,
} from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";

// RBAC: Check if user can create visits (owner/manager)
function canCreateVisits(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

export default function CreateVisit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useUserRole();

  const canCreate = canCreateVisits(user.role);

  // Read prefill values from URL query params
  const prefillAssetId = searchParams.get("asset_id") || "";
  const prefillLocationId = searchParams.get("location_id") || "";

  // Form state
  const [formData, setFormData] = useState({
    scheduled_date: format(new Date(), "yyyy-MM-dd"),
    scheduled_start_time: "",
    scheduled_end_time: "",
    location_id: prefillLocationId,
    cleaner_id: "",
    asset_id: prefillAssetId,
    category_id: "",
    checklist_template_id: "",
    manager_notes: "",
    // Stage 4: Priority & SLA
    priority: "low" as "low" | "medium" | "high",
    sla_deadline: "",
  });

  // Track if we've applied URL prefill (to avoid re-applying on every render)
  const [prefillApplied, setPrefillApplied] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Checklist expand state
  const [checklistExpanded, setChecklistExpanded] = useState(false);

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

  // Fetch checklist templates
  const { data: checklistTemplates = [] } = useQuery({
    queryKey: maintenanceKeys.checklistTemplates,
    queryFn: listChecklistTemplates,
    enabled: canCreate,
  });

  // Apply URL prefill once assets are loaded
  useEffect(() => {
    if (!prefillApplied && assets.length > 0 && prefillAssetId) {
      const asset = assets.find((a) => a.id === Number(prefillAssetId));
      if (asset) {
        // Set location from asset if not already set, then set asset
        setFormData((prev) => ({
          ...prev,
          location_id: String(asset.location.id),
          asset_id: prefillAssetId,
        }));
        setPrefillApplied(true);
      }
    } else if (!prefillApplied && prefillLocationId && !prefillAssetId) {
      // Only location prefilled, no asset
      setPrefillApplied(true);
    }
  }, [assets, prefillAssetId, prefillLocationId, prefillApplied]);

  // Filter assets when location changes
  useEffect(() => {
    if (formData.location_id) {
      const locationId = Number(formData.location_id);
      const filtered = assets.filter((a) => a.location.id === locationId);
      setFilteredAssets(filtered);
      // Clear asset selection if it's not in the new location (but not during prefill)
      if (formData.asset_id && prefillApplied) {
        const currentAsset = assets.find((a) => a.id === Number(formData.asset_id));
        if (currentAsset && currentAsset.location.id !== locationId) {
          setFormData((prev) => ({ ...prev, asset_id: "" }));
        }
      }
    } else {
      setFilteredAssets([]);
      if (prefillApplied) {
        setFormData((prev) => ({ ...prev, asset_id: "" }));
      }
    }
  }, [formData.location_id, assets, formData.asset_id, prefillApplied]);

  // Reset checklist expanded state when template changes
  useEffect(() => {
    setChecklistExpanded(false);
  }, [formData.checklist_template_id]);

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

    // Convert __none__ to null for optional fields
    const assetId = formData.asset_id && formData.asset_id !== "__none__"
      ? Number(formData.asset_id)
      : null;
    const categoryId = formData.category_id && formData.category_id !== "__none__"
      ? Number(formData.category_id)
      : null;
    const checklistTemplateId = formData.checklist_template_id && formData.checklist_template_id !== "__none__"
      ? Number(formData.checklist_template_id)
      : null;

    createMutation.mutate({
      scheduled_date: formData.scheduled_date,
      scheduled_start_time: formData.scheduled_start_time || null,
      scheduled_end_time: formData.scheduled_end_time || null,
      location_id: Number(formData.location_id),
      cleaner_id: Number(formData.cleaner_id),
      asset_id: assetId,
      maintenance_category_id: categoryId,
      checklist_template_id: checklistTemplateId,
      manager_notes: formData.manager_notes || undefined,
      // Stage 4: Priority & SLA
      priority: formData.priority,
      sla_deadline: formData.sla_deadline || null,
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
                  <SelectItem value="__none__">No asset</SelectItem>
                  {filteredAssets.map((asset) => (
                    <SelectItem key={asset.id} value={String(asset.id)}>
                      {asset.name}{asset.asset_type ? ` (${asset.asset_type.name})` : ""}
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
                  <SelectItem value="__none__">No category</SelectItem>
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

            {/* Checklist Template (optional) */}
            <div className="space-y-2">
              <Label htmlFor="checklist_template_id">Checklist Template (optional)</Label>
              <Select
                value={formData.checklist_template_id}
                onValueChange={(v) => setFormData({ ...formData, checklist_template_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select checklist template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No checklist</SelectItem>
                  {checklistTemplates.map((tpl) => (
                    <SelectItem key={tpl.id} value={String(tpl.id)}>
                      {tpl.name}
                      {tpl.items_count ? ` (${tpl.items_count} items)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign a checklist for the technician to complete during the visit
              </p>
              {/* Show preview of selected template */}
              {formData.checklist_template_id && formData.checklist_template_id !== "__none__" && (() => {
                const template = checklistTemplates.find(
                  (t) => t.id === Number(formData.checklist_template_id)
                );
                if (!template?.items_preview?.length) return null;

                const allItems = template.items || template.items_preview || [];
                const previewItems = template.items_preview || [];
                const itemsToShow = checklistExpanded ? allItems : previewItems.slice(0, 3);
                const remainingCount = (template.items_count || allItems.length) - 3;
                const hasMore = remainingCount > 0;

                return (
                  <div className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      {checklistExpanded ? "CHECKLIST DETAILS" : "CHECKLIST PREVIEW"}
                    </div>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      {itemsToShow.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => setChecklistExpanded(!checklistExpanded)}
                        className="mt-2 text-xs font-medium text-primary hover:text-primary/80 hover:underline cursor-pointer"
                      >
                        {checklistExpanded
                          ? "Show less"
                          : `+${remainingCount} more items...`}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Stage 4: Priority & SLA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v as "low" | "medium" | "high" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  High priority visits are flagged in the list
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sla_deadline">SLA Deadline (optional)</Label>
                <Input
                  id="sla_deadline"
                  type="datetime-local"
                  value={formData.sla_deadline}
                  onChange={(e) =>
                    setFormData({ ...formData, sla_deadline: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Visual countdown timer shows time remaining
                </p>
              </div>
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
