// dubai-control/src/pages/maintenance/AssetTypes.tsx
// Asset Types management page for Maintenance context
// Uses Lovable-style CSS classes: .page-header, .page-title, .premium-card, .data-table

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Loader2,
  X,
  Tag,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  listAssetTypes,
  createNewAssetType,
  updateExistingAssetType,
  removeAssetType,
  maintenanceKeys,
  type AssetType,
} from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";

// RBAC: Check if user can write asset types (owner/manager)
function canWriteAssetTypes(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

// RBAC: Check if user can read asset types (owner/manager/staff)
function canReadAssetTypes(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

export default function AssetTypes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useUserRole();

  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<AssetType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AssetType | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  });

  // Check access
  const hasReadAccess = canReadAssetTypes(user.role);
  const hasWriteAccess = canWriteAssetTypes(user.role);

  // Fetch asset types
  const {
    data: assetTypes = [],
    isLoading,
    isError,
    error: errorData,
    refetch,
  } = useQuery({
    queryKey: maintenanceKeys.assetTypes.list(),
    queryFn: listAssetTypes,
    enabled: hasReadAccess,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      createNewAssetType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetTypes.all });
      toast({
        title: "Success",
        description: "Asset type created successfully",
      });
      handleCloseModal();
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

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{ name: string; description: string; is_active: boolean }>;
    }) => updateExistingAssetType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetTypes.all });
      toast({
        title: "Success",
        description: "Asset type updated successfully",
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to update asset type";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => removeAssetType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.assetTypes.all });
      toast({
        title: "Success",
        description: "Asset type deleted successfully",
      });
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      const code = error?.response?.data?.code;
      const message =
        code === "CONFLICT"
          ? "Cannot delete asset type with linked assets. Deactivate instead."
          : error?.response?.data?.message || "Failed to delete asset type";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
      setDeleteConfirm(null);
    },
  });

  const handleAddNew = () => {
    setEditingType(null);
    setFormData({
      name: "",
      description: "",
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (type: AssetType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
      is_active: type.is_active,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({
      name: "",
      description: "",
      is_active: true,
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Asset type name is required",
      });
      return;
    }

    if (editingType) {
      updateMutation.mutate({
        id: editingType.id,
        data: {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          is_active: formData.is_active,
        },
      });
    } else {
      createMutation.mutate({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });
    }
  };

  const handleDelete = (type: AssetType) => {
    setDeleteConfirm(type);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  // Access restricted view
  if (!hasReadAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-8 text-center">
          <Tag className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view asset types.
          </p>
        </div>
      </MaintenanceLayout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <MaintenanceLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MaintenanceLayout>
    );
  }

  // Error state
  if (isError) {
    const errorMessage =
      (errorData as any)?.response?.data?.message ||
      "Failed to load asset types. Please try again.";
    return (
      <MaintenanceLayout>
        <div className="space-y-4">
          {/* Error Banner */}
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-destructive" />
              <p className="text-sm font-medium text-destructive">
                Error loading data
              </p>
            </div>
            <p className="mt-1 text-sm text-destructive/80">{errorMessage}</p>
          </div>
          <div className="py-8 text-center">
            <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">
              Unable to load asset types
            </h2>
            <p className="mt-2 text-muted-foreground">
              There was an error loading the asset types list.
            </p>
            <Button onClick={() => refetch()} className="mt-4" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
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
        {/* Header - Lovable style */}
        <div className="page-header">
          <h1 className="page-title">Asset Types</h1>
          {hasWriteAccess && (
            <Button
              size="sm"
              className="h-8 px-3 text-xs font-medium"
              onClick={handleAddNew}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Type
            </Button>
          )}
        </div>

        {/* Asset Types Table - Lovable premium-card style */}
        <div className="premium-card overflow-hidden">
          {assetTypes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Tag className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground">No asset types yet</p>
              <p className="mt-1 text-sm">
                Create your first asset type to categorize assets
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th className="w-[80px]">Status</th>
                  {hasWriteAccess && <th className="w-[100px]">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {assetTypes.map((type) => (
                  <tr key={type.id}>
                    <td className="font-medium text-foreground">{type.name}</td>
                    <td className="text-muted-foreground">
                      {type.description || "—"}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          type.is_active
                            ? "bg-green-500/10 text-green-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {type.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {hasWriteAccess && (
                      <td>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit(type)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(type)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {editingType ? "Edit Asset Type" : "Add Asset Type"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {editingType
                      ? "Update asset type details"
                      : "Create a new category for assets"}
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
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., HVAC, Electrical, Elevator"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Optional description..."
                    rows={3}
                  />
                </div>

                {editingType && (
                  <div className="flex items-center gap-3">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
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
                  {editingType ? "Save Changes" : "Create Type"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Delete Asset Type
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-foreground">
                    "{deleteConfirm.name}"
                  </span>
                  ? If there are assets using this type, deletion will fail.
                </p>

                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MaintenanceLayout>
  );
}
