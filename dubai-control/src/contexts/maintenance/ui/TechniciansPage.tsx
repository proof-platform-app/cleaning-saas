// dubai-control/src/contexts/maintenance/ui/TechniciansPage.tsx
// Maintenance Technicians Page (S2-P1) - CRUD with stats
// See docs/execution/LOVABLE_UI_IMPORT_PROTOCOL.md

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Users,
  Filter,
  Download,
  Phone,
  Mail,
  Loader2,
  X,
  Pencil,
  Power,
  PowerOff,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import {
  useTechnicians,
  useCreateTechnician,
  useUpdateTechnician,
  useResetTechnicianPin,
  getTechnicianStatusStyle,
  getTechnicianInitials,
  type Technician,
  type CreateTechnicianInput,
} from "../adapters/useTechnicians";

// RBAC
function canWriteTechnicians(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

function canReadTechnicians(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// Status badge component
function StatusBadge({ isActive }: { isActive: boolean }) {
  const style = getTechnicianStatusStyle(isActive);
  const label = isActive ? "Active" : "Inactive";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

// SLA Rate badge component
function SlaRateBadge({ rate }: { rate: number }) {
  const percentage = Math.round(rate * 100);

  let colorClass = "bg-green-100 text-green-800"; // < 5%
  if (rate >= 0.15) {
    colorClass = "bg-red-100 text-red-800"; // >= 15%
  } else if (rate >= 0.05) {
    colorClass = "bg-yellow-100 text-yellow-800"; // 5-15%
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {percentage}%
    </span>
  );
}

// Avatar component
function TechnicianAvatar({ name }: { name: string }) {
  const initials = getTechnicianInitials(name);
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
      {initials}
    </div>
  );
}

export function TechniciansPage() {
  const { toast } = useToast();
  const user = useUserRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState<Technician | null>(null);
  const [resetPinModal, setResetPinModal] = useState<{ tech: Technician; newPin: string | null } | null>(null);
  const [pinCopied, setPinCopied] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    pin: "",
    is_active: true,
  });

  const hasReadAccess = canReadTechnicians(user.role);
  const hasWriteAccess = canWriteTechnicians(user.role);

  // Fetch technicians from API
  const { data: technicians = [], isLoading, error, refetch } = useTechnicians(hasReadAccess);

  // Mutations
  const createMutation = useCreateTechnician();
  const updateMutation = useUpdateTechnician();
  const resetPinMutation = useResetTechnicianPin();

  // Filter technicians
  const filteredTechnicians = useMemo(() => {
    return technicians.filter((tech: Technician) => {
      // Status filter
      if (statusFilter === "active" && !tech.is_active) return false;
      if (statusFilter === "inactive" && tech.is_active) return false;

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          tech.full_name.toLowerCase().includes(search) ||
          tech.email?.toLowerCase().includes(search) ||
          tech.phone?.includes(search)
        );
      }
      return true;
    });
  }, [technicians, statusFilter, searchTerm]);

  // Calculate stats
  const stats = useMemo(() => {
    const active = technicians.filter((t: Technician) => t.is_active).length;
    const inactive = technicians.length - active;
    return { total: technicians.length, active, inactive };
  }, [technicians]);

  // Modal handlers
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTechnician(null);
    setFormData({
      full_name: "",
      phone: "",
      email: "",
      pin: "",
      is_active: true,
    });
  };

  const handleAddNew = () => {
    setEditingTechnician(null);
    setFormData({
      full_name: "",
      phone: "",
      email: "",
      pin: "",
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (tech: Technician) => {
    setEditingTechnician(tech);
    setFormData({
      full_name: tech.full_name,
      phone: tech.phone || "",
      email: tech.email || "",
      pin: "", // PIN is not shown on edit
      is_active: tech.is_active,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    // Validation
    if (!formData.full_name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Name is required",
      });
      return;
    }

    if (!editingTechnician && !formData.phone.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Phone number is required",
      });
      return;
    }

    if (!editingTechnician && (!formData.pin || formData.pin.length !== 4 || !/^\d{4}$/.test(formData.pin))) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "PIN must be exactly 4 digits",
      });
      return;
    }

    if (editingTechnician) {
      // Update
      updateMutation.mutate(
        {
          id: editingTechnician.id,
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          is_active: formData.is_active,
        },
        {
          onSuccess: () => {
            toast({
              title: "Success",
              description: "Technician updated successfully",
            });
            handleCloseModal();
          },
          onError: (error: any) => {
            toast({
              variant: "destructive",
              title: "Error",
              description: error?.response?.data?.message || "Failed to update technician",
            });
          },
        }
      );
    } else {
      // Create
      const input: CreateTechnicianInput = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        pin: formData.pin,
      };
      createMutation.mutate(input, {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "Technician created successfully",
          });
          handleCloseModal();
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: error?.response?.data?.message || "Failed to create technician",
          });
        },
      });
    }
  };

  const handleDeactivateClick = (tech: Technician) => {
    if (tech.is_active) {
      setDeactivateConfirm(tech);
    } else {
      // Activate directly
      updateMutation.mutate(
        { id: tech.id, is_active: true },
        {
          onSuccess: () => {
            toast({
              title: "Success",
              description: "Technician activated",
            });
          },
          onError: (error: any) => {
            toast({
              variant: "destructive",
              title: "Error",
              description: error?.response?.data?.message || "Failed to activate technician",
            });
          },
        }
      );
    }
  };

  const confirmDeactivate = () => {
    if (!deactivateConfirm) return;

    updateMutation.mutate(
      { id: deactivateConfirm.id, is_active: false },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "Technician deactivated",
          });
          setDeactivateConfirm(null);
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: error?.response?.data?.message || "Failed to deactivate technician",
          });
          setDeactivateConfirm(null);
        },
      }
    );
  };

  const handleResetPin = (tech: Technician) => {
    setResetPinModal({ tech, newPin: null });
    setPinCopied(false);

    resetPinMutation.mutate(tech.id, {
      onSuccess: (data) => {
        setResetPinModal({ tech, newPin: data.pin });
        toast({
          title: "PIN Reset",
          description: "New PIN generated successfully",
        });
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: error?.response?.data?.message || "Failed to reset PIN",
        });
        setResetPinModal(null);
      },
    });
  };

  const copyPinToClipboard = async () => {
    if (!resetPinModal?.newPin) return;

    const text = `Your new PIN for MaintainProof: ${resetPinModal.newPin}\nPhone: ${resetPinModal.tech.phone || "N/A"}`;

    try {
      await navigator.clipboard.writeText(text);
      setPinCopied(true);
      toast({
        title: "Copied!",
        description: "PIN details copied to clipboard",
      });
      setTimeout(() => setPinCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy to clipboard",
      });
    }
  };

  // Access restricted
  if (!hasReadAccess) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view technicians.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading technicians...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">Error Loading Technicians</h2>
          <p className="mt-2 text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load technicians"}
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Technicians
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage maintenance technicians and their assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {hasWriteAccess && (
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add Technician
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total Technicians</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-muted-foreground">Active</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          <div className="text-sm text-muted-foreground">Inactive</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search technicians..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" disabled>
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredTechnicians.length} {filteredTechnicians.length === 1 ? "technician" : "technicians"}
          </p>
        </div>

        {filteredTechnicians.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {technicians.length === 0 ? "No technicians yet" : "No technicians found"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {technicians.length === 0
                ? "Add your first technician to start assigning service visits"
                : "Try adjusting your search or filters"}
            </p>
            {hasWriteAccess && technicians.length === 0 && (
              <Button className="mt-4" onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add Technician
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Technician
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total Visits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    SLA Violations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  {hasWriteAccess && (
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredTechnicians.map((tech: Technician) => (
                  <tr
                    key={tech.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <TechnicianAvatar name={tech.full_name} />
                        <div className="font-medium text-foreground">{tech.full_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {tech.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {tech.email}
                          </div>
                        )}
                        {tech.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {tech.phone}
                          </div>
                        )}
                        {!tech.email && !tech.phone && (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-foreground">
                        {tech.total_visits}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <SlaRateBadge rate={tech.sla_violation_rate} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge isActive={tech.is_active} />
                    </td>
                    {hasWriteAccess && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(tech)}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleResetPin(tech)}
                            disabled={resetPinMutation.isPending}
                            title="Reset PIN"
                          >
                            <KeyRound className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-2 text-xs ${
                              tech.is_active
                                ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                : "text-green-600 hover:text-green-700 hover:bg-green-50"
                            }`}
                            onClick={() => handleDeactivateClick(tech)}
                            disabled={updateMutation.isPending}
                          >
                            {tech.is_active ? (
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
          </div>
        )}
      </div>

      {/* Add/Edit Technician Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {editingTechnician ? "Edit Technician" : "Add Technician"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {editingTechnician
                    ? "Update technician details"
                    : "Add a new technician for service assignments"}
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
                <Label htmlFor="full_name">Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g., John Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone {!editingTechnician && "*"}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+971 50 123 4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              {!editingTechnician && (
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN * (4 digits)</Label>
                  <Input
                    id="pin"
                    type="password"
                    maxLength={4}
                    value={formData.pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setFormData({ ...formData, pin: value });
                    }}
                    placeholder="####"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Technician will use this PIN to log into the field app
                  </p>
                </div>
              )}

              {editingTechnician && (
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
                {editingTechnician ? "Save Changes" : "Create Technician"}
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
                    Deactivate Technician
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This action can be reversed
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Deactivate{" "}
                <span className="font-medium text-foreground">
                  "{deactivateConfirm.full_name}"
                </span>
                ? They will no longer be able to receive new assignments.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDeactivateConfirm(null)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={confirmDeactivate}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Deactivate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {resetPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <KeyRound className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Reset PIN
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {resetPinModal.tech.full_name}
                  </p>
                </div>
              </div>

              {resetPinMutation.isPending ? (
                <div className="mt-6 flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Generating new PIN...
                  </span>
                </div>
              ) : resetPinModal.newPin ? (
                <div className="mt-6">
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <p className="text-xs text-muted-foreground mb-2">New PIN</p>
                    <p className="text-3xl font-mono font-bold text-foreground tracking-widest text-center">
                      {resetPinModal.newPin}
                    </p>
                    {resetPinModal.tech.phone && (
                      <p className="text-xs text-muted-foreground mt-3 text-center">
                        Phone: {resetPinModal.tech.phone}
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={copyPinToClipboard}
                  >
                    {pinCopied ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy to send to technician
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Send this PIN to the technician for app login
                  </p>
                </div>
              ) : null}

              <div className="mt-6 flex justify-end">
                <Button
                  variant="default"
                  onClick={() => setResetPinModal(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TechniciansPage;
