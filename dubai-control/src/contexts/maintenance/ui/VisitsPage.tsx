// dubai-control/src/contexts/maintenance/ui/VisitsPage.tsx
// Maintenance Service Visits Page - imported from Lovable pattern
// Static version with placeholder data

import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  ClipboardList,
  MoreHorizontal,
  Filter,
  Calendar,
  Download,
} from "lucide-react";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { maintenancePaths } from "../routes";

// RBAC
function canAccessVisits(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

function canCreateVisits(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: "bg-amber-100 text-amber-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>
      {labels[status] || status}
    </span>
  );
}

// Priority badge
function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" | "urgent" }) {
  const styles = {
    low: "bg-gray-100 text-gray-800",
    medium: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[priority]}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

// Placeholder data
const placeholderVisits = [
  {
    id: 1,
    date: "2024-02-14",
    time: "09:00 - 11:00",
    asset: "AHU-01 Main Building",
    location: "Tower A - Floor 1",
    technician: "John Smith",
    status: "scheduled",
    priority: "medium" as const,
    type: "Preventive",
  },
  {
    id: 2,
    date: "2024-02-14",
    time: "14:00 - 16:00",
    asset: "Elevator A1",
    location: "Tower A",
    technician: "Mike Johnson",
    status: "in_progress",
    priority: "high" as const,
    type: "Corrective",
  },
  {
    id: 3,
    date: "2024-02-13",
    time: "10:00 - 12:00",
    asset: "Fire Pump System",
    location: "Basement B1",
    technician: "Sarah Williams",
    status: "completed",
    priority: "low" as const,
    type: "Inspection",
  },
  {
    id: 4,
    date: "2024-02-13",
    time: "08:00 - 09:00",
    asset: "Generator Set 1",
    location: "Utility Building",
    technician: "Tom Brown",
    status: "completed",
    priority: "medium" as const,
    type: "Preventive",
  },
];

export function VisitsPage() {
  const navigate = useNavigate();
  const user = useUserRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const hasAccess = canAccessVisits(user.role);
  const canCreate = canCreateVisits(user.role);

  // Filter visits
  const filteredVisits = placeholderVisits.filter((visit) => {
    if (statusFilter !== "all" && visit.status !== statusFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        visit.asset.toLowerCase().includes(search) ||
        visit.location.toLowerCase().includes(search) ||
        visit.technician.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Access restricted
  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view service visits.
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
            Service Visits
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule and track maintenance service visits
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar View
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {canCreate && (
            <Button onClick={() => navigate(maintenancePaths.visitNew)}>
              <Plus className="mr-2 h-4 w-4" />
              New Visit
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-foreground">12</div>
          <div className="text-sm text-muted-foreground">Today's Visits</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-amber-600">4</div>
          <div className="text-sm text-muted-foreground">Scheduled</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-blue-600">3</div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-green-600">5</div>
          <div className="text-sm text-muted-foreground">Completed Today</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search visits..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Visits</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredVisits.length} {filteredVisits.length === 1 ? "visit" : "visits"}
          </p>
        </div>

        {filteredVisits.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">No visits found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
            {canCreate && (
              <Button className="mt-4" onClick={() => navigate(maintenancePaths.visitNew)}>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Visit
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Date / Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Technician
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Priority
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
                {filteredVisits.map((visit) => (
                  <tr
                    key={visit.id}
                    className="transition-colors hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(maintenancePaths.visitDetail(visit.id))}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{visit.date}</div>
                      <div className="text-xs text-muted-foreground">{visit.time}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">{visit.asset}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground">{visit.location}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">{visit.technician}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                        {visit.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <PriorityBadge priority={visit.priority} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={visit.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                      >
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
          This page shows placeholder data. Connect to API via adapters to display real visits.
        </p>
      </div>
    </div>
  );
}

export default VisitsPage;
