// dubai-control/src/pages/maintenance/RecurringTemplates.tsx
// Recurring Visit Schedules page - Stage 3
// Layout follows Assets.tsx pattern (Lovable design)

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Loader2,
  X,
  CalendarRange,
  Power,
  PowerOff,
  Pencil,
  Play,
  Calendar,
  MapPin,
  User,
  Repeat,
} from "lucide-react";
import { format, addDays } from "date-fns";
import {
  listRecurringTemplates,
  getRecurringTemplate,
  createRecurringTemplate,
  updateRecurringTemplate,
  deleteRecurringTemplate,
  generateVisitsFromTemplate,
  listAssets,
  listLocations,
  listTechnicians,
  listCategories,
  listChecklistTemplates,
  maintenanceKeys,
  type RecurringVisitTemplate,
  type RecurringTemplateInput,
  type Asset,
  type Location,
  type Cleaner,
  type MaintenanceCategory,
  type ChecklistTemplate,
} from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";

// RBAC
function canWriteTemplates(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

function canReadTemplates(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// Frequency labels
const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  custom: "Custom",
};

export default function RecurringTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useUserRole();

  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringVisitTemplate | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState<RecurringVisitTemplate | null>(null);

  // Generate visits state
  const [generateTemplateId, setGenerateTemplateId] = useState<number | null>(null);
  const [generateDateTo, setGenerateDateTo] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    location_id: string;
    asset_id: string;
    frequency: "monthly" | "quarterly" | "yearly" | "custom";
    interval_days: string;
    start_date: string;
    end_date: string;
    assigned_technician_id: string;
    maintenance_category_id: string;
    checklist_template_id: string;
    scheduled_start_time: string;
    scheduled_end_time: string;
    manager_notes: string;
    is_active: boolean;
  }>({
    name: "",
    description: "",
    location_id: "",
    asset_id: "",
    frequency: "monthly",
    interval_days: "30",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    assigned_technician_id: "",
    maintenance_category_id: "",
    checklist_template_id: "",
    scheduled_start_time: "",
    scheduled_end_time: "",
    manager_notes: "",
    is_active: true,
  });

  const hasReadAccess = canReadTemplates(user.role);
  const hasWriteAccess = canWriteTemplates(user.role);

  // Filters
  const templateFilters = showInactive ? undefined : { is_active: true };

  // Queries
  const { data: templates = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: maintenanceKeys.recurringTemplates.list(templateFilters),
    queryFn: () => listRecurringTemplates(templateFilters),
    enabled: hasReadAccess,
  });

  const { data: locations = [] } = useQuery({
    queryKey: maintenanceKeys.locations,
    queryFn: listLocations,
    enabled: hasReadAccess,
  });

  const { data: assets = [] } = useQuery({
    queryKey: maintenanceKeys.assets.list(),
    queryFn: () => listAssets(),
    enabled: hasReadAccess,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: maintenanceKeys.technicians,
    queryFn: listTechnicians,
    enabled: hasReadAccess,
  });

  const { data: categories = [] } = useQuery({
    queryKey: maintenanceKeys.categories.list(),
    queryFn: listCategories,
    enabled: hasReadAccess,
  });

  const { data: checklistTemplates = [] } = useQuery({
    queryKey: maintenanceKeys.checklistTemplates,
    queryFn: listChecklistTemplates,
    enabled: hasReadAccess,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: RecurringTemplateInput) => createRecurringTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.recurringTemplates.all });
      toast({ title: "Success", description: "Schedule created successfully" });
      handleCloseModal();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to create schedule";
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RecurringTemplateInput> }) =>
      updateRecurringTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.recurringTemplates.all });
      toast({ title: "Success", description: "Schedule updated successfully" });
      if (showModal) handleCloseModal();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to update schedule";
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      return updateRecurringTemplate(id, { is_active });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.recurringTemplates.all });
      toast({
        title: "Success",
        description: variables.is_active ? "Schedule activated" : "Schedule deactivated",
      });
      if (!variables.is_active) setShowInactive(true);
      setDeactivateConfirm(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to update schedule";
      toast({ variant: "destructive", title: "Error", description: message });
      setDeactivateConfirm(null);
    },
  });

  // Generate visits mutation
  const generateMutation = useMutation({
    mutationFn: ({ templateId, dateTo }: { templateId: number; dateTo: string }) =>
      generateVisitsFromTemplate(templateId, dateTo),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.visits.all });
      toast({
        title: "Visits Generated",
        description: result.generated_count > 0
          ? `Created ${result.generated_count} visit(s)`
          : result.message || "No new visits to generate",
      });
      setGenerateTemplateId(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to generate visits";
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  const handleDeactivateClick = (template: RecurringVisitTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasWriteAccess) return;
    if (template.is_active) {
      setDeactivateConfirm(template);
    } else {
      toggleActiveMutation.mutate({ id: template.id, is_active: true });
    }
  };

  const confirmDeactivate = () => {
    if (deactivateConfirm) {
      toggleActiveMutation.mutate({ id: deactivateConfirm.id, is_active: false });
    }
  };

  const handleAddNew = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      location_id: "",
      asset_id: "",
      frequency: "monthly",
      interval_days: "30",
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: "",
      assigned_technician_id: "",
      maintenance_category_id: "",
      checklist_template_id: "",
      scheduled_start_time: "",
      scheduled_end_time: "",
      manager_notes: "",
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (template: RecurringVisitTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      location_id: String(template.location.id),
      asset_id: template.asset ? String(template.asset.id) : "",
      frequency: template.frequency,
      interval_days: String(template.interval_days),
      start_date: template.start_date,
      end_date: template.end_date || "",
      assigned_technician_id: template.assigned_technician ? String(template.assigned_technician.id) : "",
      maintenance_category_id: template.maintenance_category ? String(template.maintenance_category.id) : "",
      checklist_template_id: template.checklist_template ? String(template.checklist_template.id) : "",
      scheduled_start_time: template.scheduled_start_time || "",
      scheduled_end_time: template.scheduled_end_time || "",
      manager_notes: template.manager_notes || "",
      is_active: template.is_active,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Name is required" });
      return;
    }
    if (!formData.location_id) {
      toast({ variant: "destructive", title: "Validation Error", description: "Location is required" });
      return;
    }
    if (!formData.start_date) {
      toast({ variant: "destructive", title: "Validation Error", description: "Start date is required" });
      return;
    }

    const input: RecurringTemplateInput = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      location_id: Number(formData.location_id),
      asset_id: formData.asset_id ? Number(formData.asset_id) : null,
      frequency: formData.frequency,
      interval_days: Number(formData.interval_days) || 30,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      assigned_technician_id: formData.assigned_technician_id ? Number(formData.assigned_technician_id) : null,
      maintenance_category_id: formData.maintenance_category_id ? Number(formData.maintenance_category_id) : null,
      checklist_template_id: formData.checklist_template_id ? Number(formData.checklist_template_id) : null,
      scheduled_start_time: formData.scheduled_start_time || null,
      scheduled_end_time: formData.scheduled_end_time || null,
      manager_notes: formData.manager_notes.trim() || undefined,
      is_active: formData.is_active,
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: input });
    } else {
      createMutation.mutate(input);
    }
  };

  const handleGenerate = () => {
    if (!generateTemplateId || !generateDateTo) return;
    generateMutation.mutate({ templateId: generateTemplateId, dateTo: generateDateTo });
  };

  // Filter assets by selected location
  const filteredAssets = formData.location_id
    ? assets.filter((a) => a.location.id === Number(formData.location_id) && a.is_active)
    : [];

  const activeLocations = locations.filter((l) => l.is_active !== false);

  // Access restricted view
  if (!hasReadAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-8 text-center">
          <CalendarRange className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view schedules.
          </p>
        </div>
      </MaintenanceLayout>
    );
  }

  if (isLoading) {
    return (
      <MaintenanceLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MaintenanceLayout>
    );
  }

  if (isError) {
    const errorMessage = (error as any)?.response?.data?.message || "Failed to load schedules.";
    return (
      <MaintenanceLayout>
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-destructive" />
              <p className="text-sm font-medium text-destructive">Error loading data</p>
            </div>
            <p className="mt-1 text-sm text-destructive/80">{errorMessage}</p>
          </div>
          <div className="py-8 text-center">
            <CalendarRange className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Unable to load schedules</h2>
            <Button onClick={() => refetch()} className="mt-4" size="sm">
              Retry
            </Button>
          </div>
        </div>
      </MaintenanceLayout>
    );
  }

  return (
    <MaintenanceLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Recurring Schedules</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowInactive(!showInactive)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                showInactive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
              }`}
            >
              {showInactive && <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />}
              Include inactive
            </button>
            {hasWriteAccess && (
              <Button size="sm" className="h-8 px-3 text-xs font-medium" onClick={handleAddNew}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Schedule
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="premium-card overflow-hidden">
          {templates.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No recurring schedules yet. Create your first schedule.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Frequency</th>
                  <th>Location</th>
                  <th>Asset</th>
                  <th>Technician</th>
                  <th className="w-[80px]">Status</th>
                  {hasWriteAccess && <th className="w-[180px]">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr
                    key={template.id}
                    className={`group ${!template.is_active ? "opacity-60" : ""}`}
                  >
                    <td className={`font-medium ${template.is_active ? "text-foreground" : "text-muted-foreground"}`}>
                      <div className="flex items-center gap-2">
                        <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
                        {template.name}
                      </div>
                    </td>
                    <td className="text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {template.frequency_display || FREQUENCY_LABELS[template.frequency]}
                        {template.frequency === "custom" && (
                          <span className="text-xs">({template.interval_days}d)</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs truncate max-w-[100px]">{template.location.name}</span>
                      </div>
                    </td>
                    <td className="text-muted-foreground text-xs">
                      {template.asset?.name || "—"}
                    </td>
                    <td>
                      {template.assigned_technician ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="text-xs truncate max-w-[80px]">
                            {template.assigned_technician.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          template.is_active
                            ? "bg-green-500/10 text-green-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {template.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {hasWriteAccess && (
                      <td>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGenerateTemplateId(template.id);
                              setGenerateDateTo(format(addDays(new Date(), 30), "yyyy-MM-dd"));
                            }}
                            disabled={!template.is_active}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Generate
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={(e) => handleEdit(template, e)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-2 text-xs ${
                              template.is_active
                                ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                : "text-green-600 hover:text-green-700 hover:bg-green-50"
                            }`}
                            onClick={(e) => handleDeactivateClick(template, e)}
                            disabled={toggleActiveMutation.isPending}
                          >
                            {template.is_active ? (
                              <PowerOff className="w-3 h-3" />
                            ) : (
                              <Power className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
              {/* Header */}
              <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {editingTemplate ? "Edit Schedule" : "Add Schedule"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {editingTemplate ? "Update recurring schedule" : "Create a new recurring visit schedule"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseModal}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Monthly HVAC Inspection"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>

                {/* Location & Asset */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Select
                      value={formData.location_id}
                      onValueChange={(v) => setFormData({ ...formData, location_id: v, asset_id: "" })}
                    >
                      <SelectTrigger>
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asset">Asset (optional)</Label>
                    <Select
                      value={formData.asset_id || "__none__"}
                      onValueChange={(v) => setFormData({ ...formData, asset_id: v === "__none__" ? "" : v })}
                      disabled={!formData.location_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.location_id ? "Select asset" : "Select location first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {filteredAssets.map((asset) => (
                          <SelectItem key={asset.id} value={String(asset.id)}>
                            {asset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Frequency */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency *</Label>
                    <Select
                      value={formData.frequency}
                      onValueChange={(v) => setFormData({ ...formData, frequency: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly (every 30 days)</SelectItem>
                        <SelectItem value="quarterly">Quarterly (every 90 days)</SelectItem>
                        <SelectItem value="yearly">Yearly (every 365 days)</SelectItem>
                        <SelectItem value="custom">Custom interval</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.frequency === "custom" && (
                    <div className="space-y-2">
                      <Label htmlFor="interval_days">Interval (days)</Label>
                      <Input
                        id="interval_days"
                        type="number"
                        min="1"
                        value={formData.interval_days}
                        onChange={(e) => setFormData({ ...formData, interval_days: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date (optional)</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Technician & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="technician">Technician</Label>
                    <Select
                      value={formData.assigned_technician_id || "__none__"}
                      onValueChange={(v) => setFormData({ ...formData, assigned_technician_id: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select technician" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {technicians.map((tech) => (
                          <SelectItem key={tech.id} value={String(tech.id)}>
                            {tech.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.maintenance_category_id || "__none__"}
                      onValueChange={(v) => setFormData({ ...formData, maintenance_category_id: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {categories.filter((c) => c.is_active).map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Checklist Template */}
                <div className="space-y-2">
                  <Label htmlFor="checklist">Checklist Template</Label>
                  <Select
                    value={formData.checklist_template_id || "__none__"}
                    onValueChange={(v) => setFormData({ ...formData, checklist_template_id: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select checklist template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {checklistTemplates.map((tpl) => (
                        <SelectItem key={tpl.id} value={String(tpl.id)}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.scheduled_start_time}
                      onChange={(e) => setFormData({ ...formData, scheduled_start_time: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.scheduled_end_time}
                      onChange={(e) => setFormData({ ...formData, scheduled_end_time: e.target.value })}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.manager_notes}
                    onChange={(e) => setFormData({ ...formData, manager_notes: e.target.value })}
                    placeholder="Instructions for technicians..."
                    rows={2}
                  />
                </div>

                {/* Active toggle for edit */}
                {editingTemplate && (
                  <div className="flex items-center gap-3">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-card px-6 py-4">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingTemplate ? "Save Changes" : "Create Schedule"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Deactivate Confirmation Modal */}
        {deactivateConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                    <PowerOff className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Deactivate Schedule
                    </h3>
                    <p className="text-sm text-muted-foreground">This action can be reversed</p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  Deactivate{" "}
                  <span className="font-medium text-foreground">
                    "{deactivateConfirm.name}"
                  </span>
                  ? No new visits will be generated from this schedule.
                </p>

                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setDeactivateConfirm(null)}
                    disabled={toggleActiveMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={confirmDeactivate}
                    disabled={toggleActiveMutation.isPending}
                  >
                    {toggleActiveMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Deactivate
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generate Visits Modal */}
        {generateTemplateId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
              <div className="border-b border-border px-6 py-4">
                <h3 className="text-lg font-semibold text-foreground">Generate Visits</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create visits from schedule
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="generate_date">Generate until</Label>
                  <Input
                    id="generate_date"
                    type="date"
                    value={generateDateTo}
                    onChange={(e) => setGenerateDateTo(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Visits will be created from the schedule's start date until this date.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => setGenerateTemplateId(null)}
                  disabled={generateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !generateDateTo}
                >
                  {generateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Generate
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MaintenanceLayout>
  );
}
