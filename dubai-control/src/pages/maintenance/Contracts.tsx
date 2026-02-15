// dubai-control/src/pages/maintenance/Contracts.tsx
// Stage 5 Lite: Service Contracts management page

import { useState } from "react";
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
import {
  Plus,
  Loader2,
  X,
  FileText,
  ChevronRight,
  Calendar,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  listContracts,
  createContract,
  updateContract,
  deleteContract,
  listLocations,
  maintenanceKeys,
  type ServiceContract,
  type CreateServiceContractInput,
  type Location,
} from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";

// Format date for display
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

// RBAC: Check if user can write contracts (owner/manager)
function canWriteContracts(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

// RBAC: Check if user can read contracts (owner/manager/staff)
function canReadContracts(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// Status badge component
function StatusBadge({ status, isExpired }: { status: string; isExpired: boolean }) {
  if (isExpired && status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        <AlertTriangle className="h-3 w-3" />
        Expired
      </span>
    );
  }

  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-700",
    expired: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const icons: Record<string, React.ReactNode> = {
    active: <CheckCircle className="h-3 w-3" />,
    expired: <AlertTriangle className="h-3 w-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.draft}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Contract type badge
function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    service: "bg-blue-100 text-blue-700",
    warranty: "bg-purple-100 text-purple-700",
    preventive: "bg-teal-100 text-teal-700",
  };

  const labels: Record<string, string> = {
    service: "Service",
    warranty: "Warranty",
    preventive: "Preventive",
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[type] || styles.service}`}>
      {labels[type] || type}
    </span>
  );
}

export default function Contracts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useUserRole();

  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<ServiceContract | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // Form state
  const [formData, setFormData] = useState<CreateServiceContractInput>({
    name: "",
    contract_number: "",
    description: "",
    customer_name: "",
    customer_contact: "",
    location_id: undefined,
    contract_type: "service",
    status: "draft",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: null,
    service_terms: "",
    visits_included: null,
  });

  // Check access
  const hasReadAccess = canReadContracts(user.role);
  const hasWriteAccess = canWriteContracts(user.role);

  // Build filters
  const contractFilters = statusFilter !== "all"
    ? { status: statusFilter as any }
    : undefined;

  // Fetch contracts
  const { data: contracts = [], isLoading, isError, refetch } = useQuery({
    queryKey: maintenanceKeys.contracts.list(contractFilters),
    queryFn: () => listContracts(contractFilters),
    enabled: hasReadAccess,
  });

  // Fetch locations for dropdown
  const { data: locations = [] } = useQuery({
    queryKey: maintenanceKeys.locations,
    queryFn: listLocations,
    enabled: hasReadAccess,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.contracts.all });
      toast({ title: "Success", description: "Contract created successfully" });
      handleCloseModal();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to create contract";
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateServiceContractInput> }) =>
      updateContract(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.contracts.all });
      toast({ title: "Success", description: "Contract updated successfully" });
      handleCloseModal();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to update contract";
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.contracts.all });
      toast({ title: "Success", description: "Contract deleted successfully" });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to delete contract";
      toast({ variant: "destructive", title: "Error", description: message });
    },
  });

  const handleOpenCreateModal = () => {
    setEditingContract(null);
    setFormData({
      name: "",
      contract_number: "",
      description: "",
      customer_name: "",
      customer_contact: "",
      location_id: undefined,
      contract_type: "service",
      status: "draft",
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: null,
      service_terms: "",
      visits_included: null,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (contract: ServiceContract) => {
    setEditingContract(contract);
    setFormData({
      name: contract.name,
      contract_number: contract.contract_number || "",
      description: contract.description || "",
      customer_name: contract.customer_name || "",
      customer_contact: contract.customer_contact || "",
      location_id: contract.location?.id || undefined,
      contract_type: contract.contract_type,
      status: contract.status,
      start_date: contract.start_date,
      end_date: contract.end_date,
      service_terms: contract.service_terms || "",
      visits_included: contract.visits_included,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingContract(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Contract name is required" });
      return;
    }

    const payload: CreateServiceContractInput = {
      ...formData,
      location_id: formData.location_id || null,
      end_date: formData.end_date || null,
    };

    if (editingContract) {
      updateMutation.mutate({ id: editingContract.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Access restricted view
  if (!hasReadAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view service contracts.
          </p>
        </div>
      </MaintenanceLayout>
    );
  }

  return (
    <MaintenanceLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Service Contracts</h1>
          {hasWriteAccess && (
            <Button size="sm" className="h-8 px-3 text-xs font-medium" onClick={handleOpenCreateModal}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Contract
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 bg-card border-border text-xs font-normal">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border min-w-[140px]">
              <SelectItem value="all" className="text-xs">All statuses</SelectItem>
              <SelectItem value="draft" className="text-xs">Draft</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="expired" className="text-xs">Expired</SelectItem>
              <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="premium-card overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-destructive" />
              <p className="mt-2 text-sm text-destructive">Failed to load contracts</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : contracts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="font-medium text-foreground">No contracts yet</p>
              <p className="mt-1 text-sm">Create your first service contract</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Type</th>
                  <th>Customer</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th className="w-[80px]">Schedules</th>
                  <th className="w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="cursor-pointer group"
                    onClick={() => hasWriteAccess && handleOpenEditModal(contract)}
                  >
                    <td>
                      <div>
                        <span className="font-medium text-foreground text-xs">{contract.name}</span>
                        {contract.contract_number && (
                          <span className="ml-2 text-xs text-muted-foreground">#{contract.contract_number}</span>
                        )}
                      </div>
                      {contract.location && (
                        <div className="text-xs text-muted-foreground">{contract.location.name}</div>
                      )}
                    </td>
                    <td>
                      <TypeBadge type={contract.contract_type} />
                    </td>
                    <td className="text-muted-foreground text-xs">
                      {contract.customer_name || "—"}
                    </td>
                    <td className="text-muted-foreground text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(contract.start_date)}
                        {contract.end_date && (
                          <> — {formatDate(contract.end_date)}</>
                        )}
                      </div>
                      {contract.days_remaining !== null && contract.days_remaining >= 0 && (
                        <div className="text-xs text-muted-foreground/70">
                          {contract.days_remaining} days remaining
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={contract.status} isExpired={contract.is_expired} />
                    </td>
                    <td className="text-center text-xs text-muted-foreground">
                      {contract.recurring_templates_count || 0}
                    </td>
                    <td>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingContract ? "Edit Contract" : "New Contract"}
              </h2>
              <button onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Contract Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Annual HVAC Maintenance"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract_number">Contract Number</Label>
                  <Input
                    id="contract_number"
                    value={formData.contract_number || ""}
                    onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                    placeholder="e.g., CNT-2024-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_type">Type</Label>
                  <Select
                    value={formData.contract_type}
                    onValueChange={(v) => setFormData({ ...formData, contract_type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service Agreement</SelectItem>
                      <SelectItem value="warranty">Warranty Service</SelectItem>
                      <SelectItem value="preventive">Preventive Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name || ""}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Customer or client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_contact">Customer Contact</Label>
                  <Input
                    id="customer_contact"
                    value={formData.customer_contact || ""}
                    onChange={(e) => setFormData({ ...formData, customer_contact: e.target.value })}
                    placeholder="Phone or email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_id">Location (optional)</Label>
                <Select
                  value={formData.location_id ? String(formData.location_id) : "__none__"}
                  onValueChange={(v) => setFormData({ ...formData, location_id: v === "__none__" ? undefined : Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">All locations</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date || ""}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visits_included">Visits Included</Label>
                <Input
                  id="visits_included"
                  type="number"
                  min="0"
                  value={formData.visits_included ?? ""}
                  onChange={(e) => setFormData({ ...formData, visits_included: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Number of visits (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Contract description..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_terms">Service Terms</Label>
                <Textarea
                  id="service_terms"
                  value={formData.service_terms || ""}
                  onChange={(e) => setFormData({ ...formData, service_terms: e.target.value })}
                  placeholder="SLA commitments, scope of work..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingContract ? "Save Changes" : "Create Contract"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MaintenanceLayout>
  );
}
