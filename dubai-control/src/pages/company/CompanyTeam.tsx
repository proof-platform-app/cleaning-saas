// dubai-control/src/pages/company/CompanyTeam.tsx

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Plus,
  Mail,
  Phone,
  Loader2,
  Key,
  Shuffle,
  MoreVertical,
  History,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useUserRole, canAccessBilling } from "@/hooks/useUserRole";
import {
  getCleaners,
  createCleaner,
  updateCleaner,
  resetCleanerAccess,
  getCleanerAuditLog,
  type Cleaner,
  type CreateCleanerPayload,
  type CleanerAuditLog,
} from "@/api/client";

export default function CompanyTeam() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = useUserRole();
  const canAccess = canAccessBilling(user.role); // Owner/Manager only
  const queryClient = useQueryClient();

  // State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetAccessModal, setShowResetAccessModal] = useState(false);
  const [resetAccessData, setResetAccessData] = useState<{
    cleaner: Cleaner;
    tempPassword: string;
  } | null>(null);
  const [showAuditLogModal, setShowAuditLogModal] = useState(false);
  const [auditLogCleaner, setAuditLogCleaner] = useState<Cleaner | null>(null);
  const [auditLogs, setAuditLogs] = useState<CleanerAuditLog[]>([]);

  // Fetch cleaners
  const { data: cleaners = [], isLoading } = useQuery({
    queryKey: ["cleaners"],
    queryFn: getCleaners,
    enabled: canAccess,
  });

  // Update cleaner mutation (for activate/deactivate)
  const updateCleanerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Cleaner> }) =>
      updateCleaner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cleaners"] });
      toast({
        title: "Success",
        description: "Cleaner status updated successfully",
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to update cleaner";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  // Reset access mutation
  const resetAccessMutation = useMutation({
    mutationFn: (cleanerId: number) => resetCleanerAccess(cleanerId),
    onSuccess: (data, cleanerId) => {
      const cleaner = cleaners.find((c) => c.id === cleanerId);
      if (cleaner) {
        setResetAccessData({ cleaner, tempPassword: data.temp_password });
        setShowResetAccessModal(true);
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to reset access";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  // Redirect non-authorized users
  useEffect(() => {
    if (!canAccess) {
      toast({
        variant: "destructive",
        title: "Access restricted",
        description: "Team management is restricted to administrators",
      });
      navigate("/settings", { replace: true });
    }
  }, [canAccess, navigate, toast]);

  const handleToggleActive = (cleaner: Cleaner) => {
    updateCleanerMutation.mutate({
      id: cleaner.id,
      data: { is_active: !cleaner.is_active },
    });
  };

  const handleResetAccess = (cleaner: Cleaner) => {
    resetAccessMutation.mutate(cleaner.id);
  };

  const handleViewAuditLog = async (cleaner: Cleaner) => {
    setAuditLogCleaner(cleaner);
    setShowAuditLogModal(true);
    try {
      const logs = await getCleanerAuditLog(cleaner.id);
      setAuditLogs(logs);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load access activity",
      });
      setShowAuditLogModal(false);
    }
  };

  if (!canAccess) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      {/* Back Link - Mobile Only */}
      <Link
        to="/company/profile"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Company
      </Link>

      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Company
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your company information and team
            </p>
          </div>
        </div>

        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add cleaner
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8 border-b border-border">
        <nav className="flex gap-8">
          <Link
            to="/company/profile"
            className="border-b-2 border-transparent pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Profile
          </Link>
          <Link
            to="/company/team"
            className="border-b-2 border-primary pb-3 text-sm font-medium text-foreground"
          >
            Team
          </Link>
        </nav>
      </div>

      {/* Cleaners List */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Cleaners</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {cleaners.length} {cleaners.length === 1 ? "cleaner" : "cleaners"}
          </p>
        </div>

        {cleaners.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">No cleaners yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Get started by adding your first cleaner
            </p>
            <Button onClick={() => setShowAddModal(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add cleaner
            </Button>
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
                    Contact
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
                {cleaners.map((cleaner) => (
                  <tr
                    key={cleaner.id}
                    className={`transition-colors hover:bg-muted/30 ${
                      !cleaner.is_active ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                            cleaner.is_active
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {cleaner.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div
                          className={`font-medium ${
                            cleaner.is_active ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {cleaner.full_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        {cleaner.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {cleaner.email}
                          </div>
                        )}
                        {cleaner.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {cleaner.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={cleaner.is_active}
                          onCheckedChange={() => handleToggleActive(cleaner)}
                          disabled={updateCleanerMutation.isPending}
                        />
                        <span className="text-sm font-medium text-foreground">
                          {cleaner.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={resetAccessMutation.isPending}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleResetAccess(cleaner)}
                            disabled={resetAccessMutation.isPending || !cleaner.is_active}
                            title={
                              !cleaner.is_active
                                ? "Cleaner is inactive and cannot be assigned to jobs"
                                : undefined
                            }
                          >
                            <Key className="mr-2 h-4 w-4" />
                            Reset access
                            {!cleaner.is_active && (
                              <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewAuditLog(cleaner)}>
                            <History className="mr-2 h-4 w-4" />
                            View access log
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset Access Modal */}
      {showResetAccessModal && resetAccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Key className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Access Reset Successful
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Temporary password for {resetAccessData.cleaner.full_name}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Temporary Password
              </div>
              <div className="flex items-center justify-between">
                <code className="text-xl font-mono font-semibold text-foreground">
                  {resetAccessData.tempPassword}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(resetAccessData.tempPassword);
                    toast({
                      title: "Copied",
                      description: "Password copied to clipboard",
                    });
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">⚠️ Important</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Share this password securely with the cleaner</li>
                <li>• They must change it on first login</li>
                <li>• This password will not be shown again</li>
              </ul>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => {
                  setShowResetAccessModal(false);
                  setResetAccessData(null);
                }}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Access Activity Modal */}
      {showAuditLogModal && auditLogCleaner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <History className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Access Activity
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Security and access management history for {auditLogCleaner.full_name}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAuditLogModal(false);
                  setAuditLogCleaner(null);
                  setAuditLogs([]);
                }}
              >
                Close
              </Button>
            </div>

            {/* Timeline */}
            {auditLogs.length === 0 ? (
              <div className="py-12 text-center">
                <History className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <p className="mt-4 text-sm text-muted-foreground">No activity yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Access management actions will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log, index) => (
                  <div
                    key={index}
                    className="relative flex gap-4 pb-4"
                    style={{
                      borderBottom:
                        index < auditLogs.length - 1
                          ? "1px solid hsl(var(--border))"
                          : "none",
                    }}
                  >
                    {/* Timeline dot */}
                    <div className="relative flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                      {index < auditLogs.length - 1 && (
                        <div className="absolute top-2 h-full w-px bg-border" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-[-2px]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {log.action}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            by {log.performed_by}
                            {log.performed_by_email && (
                              <span className="ml-1">({log.performed_by_email})</span>
                            )}
                          </p>
                        </div>
                        <time className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>

                      {/* Metadata */}
                      {log.metadata && log.action_code === "status_changed" && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Status changed to{" "}
                          <span className="font-medium">
                            {log.metadata.new_status ? "Active" : "Inactive"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Cleaner Modal - Will implement next */}
      {showAddModal && <AddCleanerModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

// Add Cleaner Modal Component
function AddCleanerModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    pin: "",
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (payload: CreateCleanerPayload) => createCleaner(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cleaners"] });
      toast({
        title: "Success",
        description: "Cleaner added successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      const data = error?.response?.data;
      if (data?.fields) {
        setErrors(data.fields);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data?.message || "Failed to add cleaner",
        });
      }
    },
  });

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData({ ...formData, pin });
    setErrors({ ...errors, pin: "" }); // Clear PIN error
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Name is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    }

    if (!formData.pin.trim()) {
      newErrors.pin = "PIN is required";
    } else if (!/^\d{4}$/.test(formData.pin)) {
      newErrors.pin = "PIN must be 4 digits";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    createMutation.mutate({
      full_name: formData.full_name,
      phone: formData.phone,
      email: formData.email || null,
      pin: formData.pin,
      is_active: formData.is_active,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground">Add Cleaner</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new cleaner to your team
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Enter full name"
              disabled={createMutation.isPending}
            />
            {errors.full_name && (
              <p className="text-xs text-red-500">{errors.full_name}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="+971 50 123 4567"
              disabled={createMutation.isPending}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            <p className="text-xs text-muted-foreground">
              Required for contact and internal reference
            </p>
          </div>

          {/* Email (Optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email (optional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="email@example.com"
              disabled={createMutation.isPending}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            <p className="text-xs text-muted-foreground">
              Optional. Used for notifications and reports
            </p>
          </div>

          {/* PIN */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              4-digit PIN <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={4}
                value={formData.pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData({ ...formData, pin: value });
                }}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="1234"
                disabled={createMutation.isPending}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateRandomPin}
                disabled={createMutation.isPending}
                className="shrink-0"
              >
                <Shuffle className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>
            {errors.pin && <p className="text-xs text-red-500">{errors.pin}</p>}
            <p className="text-xs text-muted-foreground">
              PIN will be used for mobile app login
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground">Active</label>
              <p className="mt-1 text-xs text-muted-foreground">
                Cleaner can log in and be assigned to jobs
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
              disabled={createMutation.isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={createMutation.isPending} className="flex-1">
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add cleaner"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
