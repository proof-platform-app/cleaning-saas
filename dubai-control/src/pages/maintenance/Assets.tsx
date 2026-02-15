// dubai-control/src/pages/maintenance/Assets.tsx
// Layout imported from control-hub/src/pages/ObjectsPage.tsx (Lovable design)
// Uses Lovable-style CSS classes: .page-header, .page-title, .premium-card, .data-table
//
// NOTE: Mock data removed - this page uses real API via React Query.
// If backend unavailable, assets will show empty state.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Loader2, X, Wrench, ChevronRight, MapPin, Power, PowerOff, Pencil } from "lucide-react";
import { format } from "date-fns";
import {
  listAssets,
  listAssetTypes,
  listLocations,
  createNewAsset,
  updateExistingAsset,
  createNewAssetType,
  maintenanceKeys,
  type Asset,
  type AssetType,
  type Location,
} from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";

// Format date for display (Lovable pattern)
function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

// RBAC: Check if user can write assets (owner/manager)
function canWriteAssets(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

// RBAC: Check if user can read assets (owner/manager/staff)
function canReadAssets(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

export default function Assets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useUserRole();

  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState<Asset | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    serial_number: "",
    description: "",
    location_id: "",
    asset_type_id: "",
    is_active: true,
  });

  // New asset type form state
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");

  // Check access
  const hasReadAccess = canReadAssets(user.role);
  const hasWriteAccess = canWriteAssets(user.role);

  // Build filter for assets query
  const assetFilters = showInactive ? undefined : { is_active: true };

  // Fetch assets
  const { data: assets = [], isLoading: assetsLoading, isError: assetsError, error: assetsErrorData, refetch: refetchAssets } = useQuery({
    queryKey: maintenanceKeys.assets.list(assetFilters),
    queryFn: () => listAssets(assetFilters),
    enabled: hasReadAccess,
  });

  // Fetch asset types
  const { data: assetTypes = [], isLoading: typesLoading, isError: typesError } = useQuery({
    queryKey: maintenanceKeys.assetTypes.list(),
    queryFn: listAssetTypes,
    enabled: hasReadAccess,
  });

  // Fetch locations for dropdown
  const { data: locations = [] } = useQuery({
    queryKey: maintenanceKeys.locations,
    queryFn: listLocations,
    enabled: hasReadAccess,
  });

  // Create asset mutation
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createNewAsset>[0]) => createNewAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.assets.all });
      toast({
        title: "Success",
        description: "Asset created successfully",
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to create asset";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  // Update asset mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateExistingAsset>[1] }) =>
      updateExistingAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.assets.all });
      toast({
        title: "Success",
        description: "Asset updated successfully",
      });
      if (showModal) {
        handleCloseModal();
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to update asset";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  // Deactivate/Activate asset mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      console.log("[Assets] Calling updateExistingAsset:", { id, is_active });
      const result = await updateExistingAsset(id, { is_active });
      console.log("[Assets] Update result:", result);
      return result;
    },
    onSuccess: (_, variables) => {
      console.log("[Assets] Mutation success");
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.assets.all });
      toast({
        title: "Success",
        description: variables.is_active ? "Asset activated" : "Asset deactivated",
      });
      // After deactivation, show inactive assets so user sees the result
      if (!variables.is_active) {
        setShowInactive(true);
      }
      setDeactivateConfirm(null);
    },
    onError: (error: any) => {
      console.error("[Assets] Mutation error:", error);
      const message = error?.response?.data?.message || error?.message || "Failed to update asset";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
      setDeactivateConfirm(null);
    },
  });

  // Create asset type mutation
  const createTypeMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      createNewAssetType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetTypes.all });
      toast({
        title: "Success",
        description: "Asset type created successfully",
      });
      setShowTypeModal(false);
      setNewTypeName("");
      setNewTypeDescription("");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to create asset type";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  const handleDeactivateClick = (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasWriteAccess) return;
    if (asset.is_active) {
      // Show confirm dialog for deactivation
      setDeactivateConfirm(asset);
    } else {
      // Activate immediately
      toggleActiveMutation.mutate({ id: asset.id, is_active: true });
    }
  };

  const confirmDeactivate = () => {
    if (deactivateConfirm) {
      console.log("[Assets] Deactivating asset:", deactivateConfirm.id);
      toggleActiveMutation.mutate(
        { id: deactivateConfirm.id, is_active: false },
        {
          onSettled: () => {
            console.log("[Assets] Mutation settled");
          },
        }
      );
    }
  };

  const handleAddNew = () => {
    setEditingAsset(null);
    setFormData({
      name: "",
      serial_number: "",
      description: "",
      location_id: "",
      asset_type_id: "",
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      serial_number: asset.serial_number || "",
      description: asset.description || "",
      location_id: String(asset.location.id),
      asset_type_id: String(asset.asset_type.id),
      is_active: asset.is_active,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAsset(null);
    setFormData({
      name: "",
      serial_number: "",
      description: "",
      location_id: "",
      asset_type_id: "",
      is_active: true,
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Asset name is required",
      });
      return;
    }

    if (!formData.location_id) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Location is required",
      });
      return;
    }

    if (!formData.asset_type_id) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Asset type is required",
      });
      return;
    }

    if (editingAsset) {
      updateMutation.mutate({
        id: editingAsset.id,
        data: {
          name: formData.name.trim(),
          serial_number: formData.serial_number.trim(),
          description: formData.description.trim(),
          location_id: Number(formData.location_id),
          asset_type_id: Number(formData.asset_type_id),
          is_active: formData.is_active,
        },
      });
    } else {
      createMutation.mutate({
        name: formData.name.trim(),
        serial_number: formData.serial_number.trim() || undefined,
        description: formData.description.trim() || undefined,
        location_id: Number(formData.location_id),
        asset_type_id: Number(formData.asset_type_id),
      });
    }
  };

  const handleCreateType = () => {
    if (!newTypeName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Asset type name is required",
      });
      return;
    }
    createTypeMutation.mutate({
      name: newTypeName.trim(),
      description: newTypeDescription.trim() || undefined,
    });
  };

  // Show all assets (filters hidden in Lovable style)
  // Filter state kept for modal dropdowns
  const filteredAssets = assets;

  // Access restricted view
  if (!hasReadAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-8 text-center">
          <Wrench className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view assets.
          </p>
        </div>
      </MaintenanceLayout>
    );
  }

  if (assetsLoading || typesLoading) {
    return (
      <MaintenanceLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MaintenanceLayout>
    );
  }

  // Error state
  if (assetsError || typesError) {
    const errorMessage = (assetsErrorData as any)?.response?.data?.message
      || "Failed to load assets. Please try again.";
    return (
      <MaintenanceLayout>
        <div className="space-y-4">
          {/* Error Banner */}
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-destructive" />
              <p className="text-sm font-medium text-destructive">Error loading data</p>
            </div>
            <p className="mt-1 text-sm text-destructive/80">{errorMessage}</p>
          </div>
          <div className="py-8 text-center">
            <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Unable to load assets</h2>
            <p className="mt-2 text-muted-foreground">
              There was an error loading the assets list.
            </p>
            <Button onClick={() => refetchAssets()} className="mt-4" size="sm">
              Retry
            </Button>
          </div>
        </div>
      </MaintenanceLayout>
    );
  }

  const activeLocations = locations.filter((l) => l.is_active !== false);
  const activeTypes = assetTypes.filter((t) => t.is_active);

  return (
    <MaintenanceLayout>
      <div className="space-y-4">
        {/* Header - Lovable style (clean, minimal) */}
        <div className="page-header">
          <h1 className="page-title">Assets</h1>
          <div className="flex items-center gap-3">
            {/* Show inactive filter chip */}
            <button
              type="button"
              onClick={() => setShowInactive(!showInactive)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                showInactive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
              }`}
            >
              {showInactive && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              Include inactive
            </button>
            {hasWriteAccess && (
              <Button size="sm" className="h-8 px-3 text-xs font-medium" onClick={handleAddNew}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Asset
              </Button>
            )}
          </div>
        </div>

      {/* Assets Table - Lovable premium-card style */}
      <div className="premium-card overflow-hidden">
        {filteredAssets.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No assets yet. Add your first asset.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Type</th>
                <th>Serial Number</th>
                <th className="w-[100px]">Location</th>
                <th className="w-[80px]">Status</th>
                {hasWriteAccess && <th className="w-[140px]">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr
                  key={asset.id}
                  className={`cursor-pointer group ${!asset.is_active ? "opacity-60" : ""}`}
                  onClick={() => navigate(`/maintenance/assets/${asset.id}`)}
                >
                  <td className={`font-medium ${asset.is_active ? "text-foreground" : "text-muted-foreground"}`}>
                    <div className="flex items-center gap-2">
                      {asset.name}
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="text-muted-foreground">
                    {asset.asset_type?.name || "—"}
                  </td>
                  <td className="text-muted-foreground font-mono text-xs">
                    {asset.serial_number || "—"}
                  </td>
                  <td>
                    {asset.location ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3" strokeWidth={1.5} />
                        <span className="text-xs truncate max-w-[80px]">{asset.location.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        asset.is_active
                          ? "bg-green-500/10 text-green-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {asset.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {hasWriteAccess && (
                    <td>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(asset);
                          }}
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 px-2 text-xs ${
                            asset.is_active
                              ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              : "text-green-600 hover:text-green-700 hover:bg-green-50"
                          }`}
                          onClick={(e) => handleDeactivateClick(asset, e)}
                          disabled={toggleActiveMutation.isPending}
                        >
                          {asset.is_active ? (
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

      {/* Add/Edit Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {editingAsset ? "Edit Asset" : "Add Asset"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {editingAsset ? "Update asset details" : "Add a new asset for service tracking"}
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

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., AHU-01 Main Building"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="asset_type">Type *</Label>
                  <Select
                    value={formData.asset_type_id}
                    onValueChange={(v) => setFormData({ ...formData, asset_type_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTypes.map((type) => (
                        <SelectItem key={type.id} value={String(type.id)}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Select
                    value={formData.location_id}
                    onValueChange={(v) => setFormData({ ...formData, location_id: v })}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="e.g., SN-12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this asset..."
                  rows={3}
                />
              </div>

              {editingAsset && (
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

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
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
                {editingAsset ? "Save Changes" : "Create Asset"}
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
                    Deactivate Asset
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This action can be reversed
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Deactivate{" "}
                <span className="font-medium text-foreground">
                  "{deactivateConfirm.name}"
                </span>
                ? It will no longer appear in active lists.
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

      {/* New Asset Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">New Asset Type</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a new category for assets
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTypeModal(false);
                  setNewTypeName("");
                  setNewTypeDescription("");
                }}
                disabled={createTypeMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type_name">Name *</Label>
                <Input
                  id="type_name"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g., HVAC, Electrical, Elevator"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type_description">Description</Label>
                <Textarea
                  id="type_description"
                  value={newTypeDescription}
                  onChange={(e) => setNewTypeDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTypeModal(false);
                  setNewTypeName("");
                  setNewTypeDescription("");
                }}
                disabled={createTypeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateType}
                disabled={createTypeMutation.isPending}
              >
                {createTypeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Type
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </MaintenanceLayout>
  );
}
