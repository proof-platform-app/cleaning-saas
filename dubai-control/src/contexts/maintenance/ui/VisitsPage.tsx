// dubai-control/src/contexts/maintenance/ui/VisitsPage.tsx
// Maintenance Service Visits Page - wired to real API
// See docs/execution/LOVABLE_UI_IMPORT_PROTOCOL.md

import { useState, useMemo } from "react";
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
  Loader2,
} from "lucide-react";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { maintenancePaths } from "../routes";
import {
  useVisits,
  useTodaysVisits,
  getVisitStatusStyle,
  getVisitStatusLabel,
  type ServiceVisit,
} from "../adapters/useVisits";
import { useTechnicians } from "../adapters/useTechnicians";

// RBAC
function canAccessVisits(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

function canCreateVisits(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getVisitStatusStyle(status)}`}>
      {getVisitStatusLabel(status)}
    </span>
  );
}

export function VisitsPage() {
  const navigate = useNavigate();
  const user = useUserRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");

  const hasAccess = canAccessVisits(user.role);
  const canCreate = canCreateVisits(user.role);

  // Fetch visits - last 30 days by default
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateFrom = thirtyDaysAgo.toISOString().split("T")[0];

  const { data: visits = [], isLoading, error } = useVisits(
    { date_from: dateFrom },
    hasAccess
  );

  // Fetch today's visits for stats
  const { data: todaysVisits = [] } = useTodaysVisits(hasAccess);

  // Fetch technicians for filter dropdown
  const { data: technicians = [] } = useTechnicians(hasAccess);

  // Filter visits
  const filteredVisits = useMemo(() => {
    return visits.filter((visit: ServiceVisit) => {
      // Status filter
      if (statusFilter !== "all" && visit.status !== statusFilter) return false;

      // Technician filter
      if (technicianFilter !== "all" && visit.cleaner?.id !== Number(technicianFilter)) return false;

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          visit.location?.name?.toLowerCase().includes(search) ||
          visit.location?.address?.toLowerCase().includes(search) ||
          visit.cleaner?.full_name?.toLowerCase().includes(search) ||
          visit.asset?.name?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [visits, statusFilter, technicianFilter, searchTerm]);

  // Calculate stats from today's visits
  const stats = useMemo(() => {
    const scheduled = todaysVisits.filter((v: ServiceVisit) => v.status === "scheduled").length;
    const inProgress = todaysVisits.filter((v: ServiceVisit) => v.status === "in_progress").length;
    const completed = todaysVisits.filter((v: ServiceVisit) => v.status === "completed").length;
    return { total: todaysVisits.length, scheduled, inProgress, completed };
  }, [todaysVisits]);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading visits...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">Error Loading Visits</h2>
          <p className="mt-2 text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load visits"}
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
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Today's Visits</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.scheduled}</div>
          <div className="text-sm text-muted-foreground">Scheduled</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
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
        <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Technician" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technicians</SelectItem>
            {technicians.map((tech) => (
              <SelectItem key={tech.id} value={String(tech.id)}>
                {tech.full_name}
              </SelectItem>
            ))}
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
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {visits.length === 0 ? "No visits yet" : "No visits found"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {visits.length === 0
                ? "Schedule your first service visit"
                : "Try adjusting your search or filters"}
            </p>
            {canCreate && visits.length === 0 && (
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
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Technician
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
                {filteredVisits.map((visit: ServiceVisit) => (
                  <tr
                    key={visit.id}
                    className="transition-colors hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(maintenancePaths.visitDetail(visit.id))}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{visit.scheduled_date}</div>
                      {(visit.scheduled_start_time || visit.scheduled_end_time) && (
                        <div className="text-xs text-muted-foreground">
                          {visit.scheduled_start_time || "—"} - {visit.scheduled_end_time || "—"}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">{visit.location?.name || "—"}</div>
                      {visit.location?.address && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {visit.location.address}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {visit.asset ? (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                          {visit.asset.name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">
                        {visit.cleaner?.full_name || "Unassigned"}
                      </div>
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
    </div>
  );
}

export default VisitsPage;
