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
  Shield,
  UserCog,
  UserCheck,
  Crown,
  Search,
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
import { useUserRole, canAccessBilling, isOwner } from "@/hooks/useUserRole";
import {
  getCleaners,
  createCleaner,
  updateCleaner,
  resetCleanerAccess,
  getCleanerAuditLog,
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  resetTeamMemberPassword,
  type Cleaner,
  type CreateCleanerPayload,
  type CleanerAuditLog,
  type TeamMember,
  type CreateTeamMemberPayload,
} from "@/api/client";

type TabType = "members" | "cleaners";

export default function CompanyTeam() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const user = useUserRole();
  const canAccess = canAccessBilling(user.role); // Owner/Manager only
  const userIsOwner = isOwner(user.role);
  const queryClient = useQueryClient();

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>("members");

  // Cleaner modals state
  const [showAddCleanerModal, setShowAddCleanerModal] = useState(false);
  const [showResetAccessModal, setShowResetAccessModal] = useState(false);
  const [resetAccessData, setResetAccessData] = useState<{
    cleaner: Cleaner;
    tempPassword: string;
  } | null>(null);
  const [showAuditLogModal, setShowAuditLogModal] = useState(false);
  const [auditLogCleaner, setAuditLogCleaner] = useState<Cleaner | null>(null);
  const [auditLogs, setAuditLogs] = useState<CleanerAuditLog[]>([]);

  // Team member modals state
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
  const [showMemberPasswordModal, setShowMemberPasswordModal] = useState(false);
  const [memberPasswordData, setMemberPasswordData] = useState<{
    member: TeamMember;
    tempPassword: string;
  } | null>(null);

  // Search and filter state for Field Workers
  const [cleanerSearch, setCleanerSearch] = useState("");
  const [cleanerStatusFilter, setCleanerStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Fetch team members
  const { data: teamMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["teamMembers"],
    queryFn: getTeamMembers,
    enabled: canAccess,
  });

  // Fetch cleaners
  const { data: cleaners = [], isLoading: isLoadingCleaners } = useQuery({
    queryKey: ["cleaners"],
    queryFn: getCleaners,
    enabled: canAccess,
  });

  // Update cleaner mutation
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

  // Update team member mutation
  const updateMemberMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { is_active?: boolean; full_name?: string } }) =>
      updateTeamMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      toast({
        title: "Success",
        description: "Team member updated successfully",
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to update team member";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  // Reset cleaner access mutation
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

  // Reset team member password mutation
  const resetMemberPasswordMutation = useMutation({
    mutationFn: (memberId: number) => resetTeamMemberPassword(memberId),
    onSuccess: (data, memberId) => {
      const member = teamMembers.find((m) => m.id === memberId);
      if (member) {
        setMemberPasswordData({ member, tempPassword: data.temp_password });
        setShowMemberPasswordModal(true);
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to reset password";
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

  const handleToggleCleanerActive = (cleaner: Cleaner) => {
    updateCleanerMutation.mutate({
      id: cleaner.id,
      data: { is_active: !cleaner.is_active },
    });
  };

  const handleToggleMemberActive = (member: TeamMember) => {
    if (!userIsOwner) {
      toast({
        variant: "destructive",
        title: "Access denied",
        description: "Only account owner can modify team members",
      });
      return;
    }
    updateMemberMutation.mutate({
      id: member.id,
      data: { is_active: !member.is_active },
    });
  };

  const handleResetCleanerAccess = (cleaner: Cleaner) => {
    resetAccessMutation.mutate(cleaner.id);
  };

  const handleResetMemberPassword = (member: TeamMember) => {
    if (!userIsOwner) {
      toast({
        variant: "destructive",
        title: "Access denied",
        description: "Only account owner can reset passwords",
      });
      return;
    }
    resetMemberPasswordMutation.mutate(member.id);
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

  const isLoading = activeTab === "members" ? isLoadingMembers : isLoadingCleaners;

  // Filter team members - only show active (hide deactivated)
  const filteredTeamMembers = teamMembers.filter((m) => m.is_active);
  const inactiveTeamMembersCount = teamMembers.filter((m) => !m.is_active).length;

  // Filter cleaners by search and status
  const filteredCleaners = cleaners.filter((cleaner) => {
    // Search filter
    const searchLower = cleanerSearch.toLowerCase();
    const matchesSearch =
      !cleanerSearch ||
      cleaner.full_name.toLowerCase().includes(searchLower) ||
      (cleaner.email && cleaner.email.toLowerCase().includes(searchLower)) ||
      (cleaner.phone && cleaner.phone.includes(cleanerSearch));

    // Status filter
    const matchesStatus =
      cleanerStatusFilter === "all" ||
      (cleanerStatusFilter === "active" && cleaner.is_active) ||
      (cleanerStatusFilter === "inactive" && !cleaner.is_active);

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Role badge component
  const RoleBadge = ({ role }: { role: string }) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      owner: {
        label: "Owner",
        className: "bg-amber-100 text-amber-800 border-amber-200",
        icon: Crown,
      },
      manager: {
        label: "Manager",
        className: "bg-blue-100 text-blue-800 border-blue-200",
        icon: UserCog,
      },
      staff: {
        label: "Staff",
        className: "bg-gray-100 text-gray-700 border-gray-200",
        icon: UserCheck,
      },
    };
    const { label, className, icon: Icon } = config[role] || config.staff;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

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

        {/* Action Button - changes based on tab */}
        {activeTab === "members" ? (
          userIsOwner && (
            <Button onClick={() => setShowInviteMemberModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite member
            </Button>
          )
        ) : (
          <Button onClick={() => setShowAddCleanerModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add cleaner
          </Button>
        )}
      </div>

      {/* Navigation Tabs (Profile | Team) */}
      <div className="mb-6 border-b border-border">
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

      {/* Sub-tabs (Team Members | Cleaners) */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "members"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          <Shield className="h-4 w-4" />
          Team Members
          <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {teamMembers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("cleaners")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "cleaners"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Field Workers
          <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {cleaners.length}
          </span>
        </button>
      </div>

      {/* Team Members Tab */}
      {activeTab === "members" && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Console users who can access the dashboard
                </p>
              </div>
              {inactiveTeamMembersCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {inactiveTeamMembersCount} inactive member{inactiveTeamMembersCount > 1 ? "s" : ""} hidden
                </span>
              )}
            </div>
          </div>

          {filteredTeamMembers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No team members</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {userIsOwner
                  ? "Invite managers and staff to help manage your business"
                  : "No other team members have been added yet"}
              </p>
              {userIsOwner && (
                <Button onClick={() => setShowInviteMemberModal(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Invite member
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
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    {userIsOwner && (
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {filteredTeamMembers.map((member) => (
                    <tr
                      key={member.id}
                      className={`transition-colors hover:bg-muted/30 ${
                        !member.is_active ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                              member.role === "owner"
                                ? "bg-amber-100 text-amber-800"
                                : member.role === "manager"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {member.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {member.full_name}
                              {member.is_current_user && (
                                <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <RoleBadge role={member.role} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {member.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {member.role === "owner" ? (
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            Active
                          </span>
                        ) : userIsOwner && !member.is_current_user ? (
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={member.is_active}
                              onCheckedChange={() => handleToggleMemberActive(member)}
                              disabled={updateMemberMutation.isPending}
                            />
                            <span className="text-sm font-medium text-foreground">
                              {member.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-sm font-medium ${member.is_active ? "text-green-700" : "text-gray-500"}`}>
                            <div className={`h-2 w-2 rounded-full ${member.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                            {member.is_active ? "Active" : "Inactive"}
                          </span>
                        )}
                      </td>
                      {userIsOwner && (
                        <td className="px-6 py-4 text-right">
                          {member.role !== "owner" && !member.is_current_user && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={resetMemberPasswordMutation.isPending}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleResetMemberPassword(member)}
                                  disabled={resetMemberPasswordMutation.isPending}
                                >
                                  <Key className="mr-2 h-4 w-4" />
                                  Reset password
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Cleaners Tab */}
      {activeTab === "cleaners" && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Field Workers</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cleaners who use the mobile app
            </p>
          </div>

          {/* Search and Filter */}
          {cleaners.length > 0 && (
            <div className="flex flex-col gap-4 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={cleanerSearch}
                  onChange={(e) => setCleanerSearch(e.target.value)}
                  className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Status Filter */}
              <select
                value={cleanerStatusFilter}
                onChange={(e) => setCleanerStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All cleaners</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>
          )}

          {cleaners.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No cleaners yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get started by adding your first cleaner
              </p>
              <Button onClick={() => setShowAddCleanerModal(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add cleaner
              </Button>
            </div>
          ) : filteredCleaners.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No matches found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting your search or filter
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setCleanerSearch("");
                  setCleanerStatusFilter("all");
                }}
                className="mt-4"
              >
                Clear filters
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
                  {filteredCleaners.map((cleaner) => (
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
                            onCheckedChange={() => handleToggleCleanerActive(cleaner)}
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
                              onClick={() => handleResetCleanerAccess(cleaner)}
                              disabled={resetAccessMutation.isPending || !cleaner.is_active}
                              title={
                                !cleaner.is_active
                                  ? "Cleaner is inactive"
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
      )}

      {/* Cleaner Reset Access Modal */}
      {showResetAccessModal && resetAccessData && (
        <PasswordModal
          title="Access Reset Successful"
          subtitle={`Temporary password for ${resetAccessData.cleaner.full_name}`}
          password={resetAccessData.tempPassword}
          onClose={() => {
            setShowResetAccessModal(false);
            setResetAccessData(null);
          }}
        />
      )}

      {/* Team Member Password Reset Modal */}
      {showMemberPasswordModal && memberPasswordData && (
        <PasswordModal
          title="Password Reset Successful"
          subtitle={`Temporary password for ${memberPasswordData.member.full_name}`}
          password={memberPasswordData.tempPassword}
          onClose={() => {
            setShowMemberPasswordModal(false);
            setMemberPasswordData(null);
          }}
        />
      )}

      {/* Cleaner Access Activity Modal */}
      {showAuditLogModal && auditLogCleaner && (
        <AuditLogModal
          cleanerName={auditLogCleaner.full_name}
          logs={auditLogs}
          onClose={() => {
            setShowAuditLogModal(false);
            setAuditLogCleaner(null);
            setAuditLogs([]);
          }}
        />
      )}

      {/* Add Cleaner Modal */}
      {showAddCleanerModal && <AddCleanerModal onClose={() => setShowAddCleanerModal(false)} />}

      {/* Invite Member Modal */}
      {showInviteMemberModal && (
        <InviteMemberModal onClose={() => setShowInviteMemberModal(false)} />
      )}
    </div>
  );
}

// Password Display Modal Component
function PasswordModal({
  title,
  subtitle,
  password,
  onClose,
}: {
  title: string;
  subtitle: string;
  password: string;
  onClose: () => void;
}) {
  const { toast } = useToast();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Temporary Password
          </div>
          <div className="flex items-center justify-between">
            <code className="text-xl font-mono font-semibold text-foreground">
              {password}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(password);
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
          <p className="font-medium">Important</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>Share this password securely</li>
            <li>They must change it on first login</li>
            <li>This password will not be shown again</li>
          </ul>
        </div>

        <div className="mt-6">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

// Audit Log Modal Component
function AuditLogModal({
  cleanerName,
  logs,
  onClose,
}: {
  cleanerName: string;
  logs: CleanerAuditLog[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Access Activity</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Security and access management history for {cleanerName}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {logs.length === 0 ? (
          <div className="py-12 text-center">
            <History className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <p className="mt-4 text-sm text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log, index) => (
              <div
                key={index}
                className="relative flex gap-4 pb-4"
                style={{
                  borderBottom:
                    index < logs.length - 1 ? "1px solid hsl(var(--border))" : "none",
                }}
              >
                <div className="relative flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{log.action}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        by {log.performed_by}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
        const fieldErrors: Record<string, string> = {};
        for (const [key, value] of Object.entries(data.fields)) {
          fieldErrors[key] = Array.isArray(value) ? value[0] : String(value);
        }
        setErrors(fieldErrors);
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
    setErrors({ ...errors, pin: "" });
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
          Add a new field worker to your team
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Enter full name"
              disabled={createMutation.isPending}
            />
            {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="+971 50 123 4567"
              disabled={createMutation.isPending}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email (optional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="email@example.com"
              disabled={createMutation.isPending}
            />
          </div>

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
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                placeholder="1234"
                disabled={createMutation.isPending}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateRandomPin}
                disabled={createMutation.isPending}
              >
                <Shuffle className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>
            {errors.pin && <p className="text-xs text-red-500">{errors.pin}</p>}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
            <div>
              <label className="text-sm font-medium text-foreground">Active</label>
              <p className="text-xs text-muted-foreground">Can log in and be assigned to jobs</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              disabled={createMutation.isPending}
            />
          </div>

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
            <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Invite Member Modal Component
function InviteMemberModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "manager" as "manager" | "staff",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: CreateTeamMemberPayload) => createTeamMember(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      setCreatedPassword(data.temp_password);
    },
    onError: (error: any) => {
      const data = error?.response?.data;
      if (data?.fields) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, value] of Object.entries(data.fields)) {
          fieldErrors[key] = Array.isArray(value) ? value[0] : String(value);
        }
        setErrors(fieldErrors);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data?.message || "Failed to invite member",
        });
      }
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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
      email: formData.email,
      role: formData.role,
    });
  };

  // If password was created, show the password modal
  if (createdPassword) {
    return (
      <PasswordModal
        title="Team Member Invited"
        subtitle={`Temporary password for ${formData.full_name}`}
        password={createdPassword}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground">Invite Team Member</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a manager or staff member to your team
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Enter full name"
              disabled={createMutation.isPending}
            />
            {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="email@example.com"
              disabled={createMutation.isPending}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            <p className="text-xs text-muted-foreground">
              They will use this email to log in
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "manager" })}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                  formData.role === "manager"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-foreground">Manager</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Full access to operations
                </p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "staff" })}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                  formData.role === "staff"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-foreground">Staff</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Limited console access
                </p>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={createMutation.isPending} className="flex-1">
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inviting...
                </>
              ) : (
                "Invite member"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
