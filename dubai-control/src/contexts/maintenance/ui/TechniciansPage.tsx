// dubai-control/src/contexts/maintenance/ui/TechniciansPage.tsx
// Maintenance Technicians Page - imported from Lovable pattern
// Static version with placeholder data

import { useState } from "react";
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
} from "lucide-react";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";

// RBAC
function canWriteTechnicians(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

function canReadTechnicians(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// Status badge component
function StatusBadge({ status }: { status: "active" | "inactive" | "on_leave" }) {
  const styles = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    on_leave: "bg-amber-100 text-amber-800",
  };

  const labels = {
    active: "Active",
    inactive: "Inactive",
    on_leave: "On Leave",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// Specialization badge
function SpecializationBadge({ specialization }: { specialization: string }) {
  const colors: Record<string, string> = {
    HVAC: "bg-blue-100 text-blue-800",
    Electrical: "bg-yellow-100 text-yellow-800",
    Plumbing: "bg-cyan-100 text-cyan-800",
    Elevator: "bg-purple-100 text-purple-800",
    "Fire Safety": "bg-red-100 text-red-800",
    General: "bg-gray-100 text-gray-800",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[specialization] || colors.General}`}>
      {specialization}
    </span>
  );
}

// Placeholder data
const placeholderTechnicians = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "+971 50 123 4567",
    specialization: "HVAC",
    status: "active" as const,
    assignedJobs: 5,
    completedThisMonth: 12,
  },
  {
    id: 2,
    name: "Mike Johnson",
    email: "mike.j@example.com",
    phone: "+971 50 234 5678",
    specialization: "Elevator",
    status: "active" as const,
    assignedJobs: 3,
    completedThisMonth: 8,
  },
  {
    id: 3,
    name: "Sarah Williams",
    email: "sarah.w@example.com",
    phone: "+971 50 345 6789",
    specialization: "Fire Safety",
    status: "on_leave" as const,
    assignedJobs: 0,
    completedThisMonth: 15,
  },
  {
    id: 4,
    name: "Tom Brown",
    email: "tom.brown@example.com",
    phone: "+971 50 456 7890",
    specialization: "Electrical",
    status: "active" as const,
    assignedJobs: 4,
    completedThisMonth: 10,
  },
  {
    id: 5,
    name: "Ahmed Hassan",
    email: "ahmed.h@example.com",
    phone: "+971 50 567 8901",
    specialization: "Plumbing",
    status: "inactive" as const,
    assignedJobs: 0,
    completedThisMonth: 0,
  },
];

export function TechniciansPage() {
  const user = useUserRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [specializationFilter, setSpecializationFilter] = useState("all");

  const hasReadAccess = canReadTechnicians(user.role);
  const hasWriteAccess = canWriteTechnicians(user.role);

  // Filter technicians
  const filteredTechnicians = placeholderTechnicians.filter((tech) => {
    if (statusFilter !== "all" && tech.status !== statusFilter) return false;
    if (specializationFilter !== "all" && tech.specialization !== specializationFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        tech.name.toLowerCase().includes(search) ||
        tech.email.toLowerCase().includes(search) ||
        tech.phone.includes(search)
      );
    }
    return true;
  });

  // Calculate stats
  const activeTechnicians = placeholderTechnicians.filter(t => t.status === "active").length;
  const totalAssigned = placeholderTechnicians.reduce((sum, t) => sum + t.assignedJobs, 0);
  const totalCompleted = placeholderTechnicians.reduce((sum, t) => sum + t.completedThisMonth, 0);

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
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-foreground">{placeholderTechnicians.length}</div>
          <div className="text-sm text-muted-foreground">Total Technicians</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-green-600">{activeTechnicians}</div>
          <div className="text-sm text-muted-foreground">Active</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-blue-600">{totalAssigned}</div>
          <div className="text-sm text-muted-foreground">Jobs Assigned</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-purple-600">{totalCompleted}</div>
          <div className="text-sm text-muted-foreground">Completed This Month</div>
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
            <SelectItem value="on_leave">On Leave</SelectItem>
          </SelectContent>
        </Select>
        <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Specialization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="HVAC">HVAC</SelectItem>
            <SelectItem value="Electrical">Electrical</SelectItem>
            <SelectItem value="Plumbing">Plumbing</SelectItem>
            <SelectItem value="Elevator">Elevator</SelectItem>
            <SelectItem value="Fire Safety">Fire Safety</SelectItem>
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
            <h3 className="mt-4 text-lg font-semibold text-foreground">No technicians found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
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
                    Specialization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredTechnicians.map((tech) => (
                  <tr
                    key={tech.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {tech.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="font-medium text-foreground">{tech.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {tech.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {tech.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <SpecializationBadge specialization={tech.specialization} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tech.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">{tech.assignedJobs} jobs</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">{tech.completedThisMonth} this month</div>
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

      {/* Info Banner */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-medium">Static Preview</p>
        <p className="mt-1 text-xs">
          This page shows placeholder data. Connect to API via adapters to display real technicians.
        </p>
      </div>
    </div>
  );
}

export default TechniciansPage;
