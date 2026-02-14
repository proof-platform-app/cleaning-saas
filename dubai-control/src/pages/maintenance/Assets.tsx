// dubai-control/src/pages/maintenance/Assets.tsx
// Layout imported from control-hub/src/pages/ObjectsPage.tsx (Lovable design)
// Uses Lovable-style CSS classes: .page-header, .page-title, .premium-card, .data-table
//
// NOTE: Mock data removed - this page uses real API via React Query.
// If backend unavailable, assets will show empty state.

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
  Search,
  Loader2,
  Edit,
  X,
  Wrench,
  Trash2,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import {
  getAssets,
  getAssetTypes,
  getLocations,
  createAsset,
  updateAsset,
  deleteAsset,
  createAssetType,
  type Asset,
  type AssetType,
  type Location,
} from "@/api/client";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";

type StatusFilter = "all" | "active" | "inactive";

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
  const user = useUserRole();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);

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

  // Fetch assets
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => getAssets(),
    enabled: hasReadAccess,
  });

  // Fetch asset types
  const { data: assetTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ["assetTypes"],
    queryFn: getAssetTypes,
    enabled: hasReadAccess,
  });

  // Fetch locations for dropdown
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    enabled: hasReadAccess,
  });

  // Create asset mutation
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createAsset>[0]) => createAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
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
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateAsset>[1] }) =>
      updateAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
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

  // Delete asset mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
    },
    onError: (error: any) => {
      const code = error?.response?.data?.code;
      const message = code === "CONFLICT"
        ? "Cannot delete asset with linked jobs. Deactivate instead."
        : error?.response?.data?.message || "Failed to delete asset";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  // Create asset type mutation
  const createTypeMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      createAssetType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assetTypes"] });
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

  const handleToggleActive = (asset: Asset) => {
    if (!hasWriteAccess) return;
    updateMutation.mutate({
      id: asset.id,
      data: { is_active: !asset.is_active },
    });
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

  const handleDelete = (asset: Asset) => {
    if (!hasWriteAccess) return;
    if (confirm(`Are you sure you want to delete "${asset.name}"?`)) {
      deleteMutation.mutate(asset.id);
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

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    // Status filter
    if (statusFilter === "active" && !asset.is_active) return false;
    if (statusFilter === "inactive" && asset.is_active) return false;

    // Location filter
    if (locationFilter !== "all" && asset.location.id !== Number(locationFilter)) {
      return false;
    }

    // Type filter
    if (typeFilter !== "all" && asset.asset_type.id !== Number(typeFilter)) {
      return false;
    }

    // Search filter
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const name = (asset.name || "").toLowerCase();
    const serial = (asset.serial_number || "").toLowerCase();
    const desc = (asset.description || "").toLowerCase();
    return name.includes(search) || serial.includes(search) || desc.includes(search);
  });

  // Access restricted view
  if (!hasReadAccess) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <Wrench className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view assets.
          </p>
        </div>
      </div>
    );
  }

  if (assetsLoading || typesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeLocations = locations.filter((l) => l.is_active !== false);
  const activeTypes = assetTypes.filter((t) => t.is_active);

  return (
    <div className="mx-auto max-w-6xl p-8 space-y-4">
      {/* Header - Lovable style */}
      <div className="page-header">
        <h1 className="page-title">Assets</h1>
        {hasWriteAccess && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium" onClick={() => setShowTypeModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Type
            </Button>
            <Button size="sm" className="h-8 px-3 text-xs font-medium" onClick={handleAddNew}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Asset
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filters - compact row */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search assets..."
            className="pl-10 h-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={String(loc.id)}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {assetTypes.map((type) => (
              <SelectItem key={type.id} value={String(type.id)}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assets Table - Lovable premium-card style */}
      <div className="premium-card overflow-hidden">
        {filteredAssets.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {searchTerm || statusFilter !== "all" || locationFilter !== "all" || typeFilter !== "all"
              ? "No assets found. Try adjusting your search or filters."
              : "No assets yet. Add your first asset."}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Type</th>
                <th>Location</th>
                <th className="w-[120px]">Serial #</th>
                <th className="w-[100px]">Created</th>
                <th className="w-[80px]">Status</th>
                <th className="w-[80px]"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr
                  key={asset.id}
                  className="cursor-pointer group"
                  onClick={() => hasWriteAccess && handleEdit(asset)}
                >
                  <td className="font-medium text-foreground">
                    {asset.name}
                    {asset.description && (
                      <div className="text-xs text-muted-foreground/70 truncate max-w-[200px]">
                        {asset.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {asset.asset_type.name}
                    </span>
                  </td>
                  <td className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" strokeWidth={1.5} />
                      <span>{asset.location.name}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground font-mono text-xs">
                    {asset.serial_number || "—"}
                  </td>
                  <td className="text-muted-foreground tabular-nums">
                    {formatDate(asset.created_at)}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={asset.is_active}
                        onCheckedChange={() => handleToggleActive(asset)}
                        disabled={!hasWriteAccess || updateMutation.isPending}
                        className="scale-75"
                      />
                      <span className={`text-xs ${asset.is_active ? "text-green-600" : "text-muted-foreground"}`}>
                        {asset.is_active ? "On" : "Off"}
                      </span>
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {hasWriteAccess && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(asset)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(asset)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    {!hasWriteAccess && (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground" />
                    )}
                  </td>
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
  );
}
