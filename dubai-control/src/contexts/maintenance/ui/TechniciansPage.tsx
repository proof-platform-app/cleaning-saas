// dubai-control/src/contexts/maintenance/ui/TechniciansPage.tsx
// Maintenance Technicians Page - wired to real API
// See docs/execution/LOVABLE_UI_IMPORT_PROTOCOL.md

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Filter,
  Download,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import {
  useTechnicians,
  getTechnicianStatusStyle,
  getTechnicianInitials,
  type Technician,
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
  const user = useUserRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const hasReadAccess = canReadTechnicians(user.role);
  const hasWriteAccess = canWriteTechnicians(user.role);

  // Fetch technicians from API
  const { data: technicians = [], isLoading, error } = useTechnicians(hasReadAccess);

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
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {hasWriteAccess && (
            <Button>
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
        <Button variant="outline" size="icon">
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
              <Button className="mt-4">
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
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
                      <StatusBadge isActive={tech.is_active} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default TechniciansPage;
