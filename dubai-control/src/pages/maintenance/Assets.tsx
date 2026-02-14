// dubai-control/src/pages/maintenance/Assets.tsx

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
} from "lucide-react";
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
    <div className="mx-auto max-w-6xl p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Assets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage physical assets for maintenance service visits
          </p>
        </div>
        {hasWriteAccess && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTypeModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Type
            </Button>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-medium">About Assets</p>
        <ul className="mt-2 space-y-1 text-xs">
          <li>• Assets represent physical equipment (HVAC, elevators, electrical systems, etc.)</li>
          <li>• Each asset belongs to a location and has a type for classification</li>
          <li>• Jobs can be linked to assets for service visit tracking</li>
        </ul>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, serial number..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[180px]">
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

      {/* Assets List */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Assets</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredAssets.length} {filteredAssets.length === 1 ? "asset" : "assets"}
          </p>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {searchTerm || statusFilter !== "all" || locationFilter !== "all" || typeFilter !== "all"
                ? "No assets found"
                : "No assets yet"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm || statusFilter !== "all" || locationFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by adding your first asset"}
            </p>
            {!searchTerm && statusFilter === "all" && locationFilter === "all" && typeFilter === "all" && hasWriteAccess && (
              <Button onClick={handleAddNew} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
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
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Serial #
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
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{asset.name}</div>
                      {asset.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {asset.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {asset.asset_type.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground">
                        {asset.location.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground">
                        {asset.serial_number || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={asset.is_active}
                          onCheckedChange={() => handleToggleActive(asset)}
                          disabled={!hasWriteAccess || updateMutation.isPending}
                        />
                        <span className="text-sm font-medium text-foreground">
                          {asset.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {hasWriteAccess && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(asset)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(asset)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
