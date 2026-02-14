// dubai-control/src/pages/maintenance/VisitList.tsx

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { format, subDays } from "date-fns";
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
  Loader2,
  ClipboardList,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  getServiceVisits,
  getLocations,
  getCleaners,
  type ServiceVisit,
} from "@/api/client";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";

// RBAC: Check if user can access visits (owner/manager/staff)
function canAccessVisits(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// RBAC: Check if user can create visits (owner/manager)
function canCreateVisits(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: "bg-amber-100 text-amber-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    completed_unverified: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    completed_unverified: "Unverified",
    cancelled: "Cancelled",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

export default function VisitList() {
  const navigate = useNavigate();
  const user = useUserRole();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");

  // Default date range: last 30 days
  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const hasAccess = canAccessVisits(user.role);
  const canCreate = canCreateVisits(user.role);

  // Fetch visits
  const {
    data: visits = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["serviceVisits", statusFilter, locationFilter, technicianFilter],
    queryFn: () =>
      getServiceVisits({
        date_from: thirtyDaysAgo,
        date_to: today,
        status: statusFilter !== "all" ? statusFilter : undefined,
        location_id: locationFilter !== "all" ? Number(locationFilter) : undefined,
        cleaner_id: technicianFilter !== "all" ? Number(technicianFilter) : undefined,
      }),
    enabled: hasAccess,
  });

  // Fetch locations for filter
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
    enabled: hasAccess,
  });

  // Fetch cleaners (technicians) for filter
  const { data: technicians = [] } = useQuery({
    queryKey: ["cleaners"],
    queryFn: getCleaners,
    enabled: hasAccess,
  });

  // Filter visits by search term
  const filteredVisits = visits.filter((visit) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const locationName = visit.location?.name?.toLowerCase() || "";
    const technicianName = visit.cleaner?.full_name?.toLowerCase() || "";
    const assetName = visit.asset?.name?.toLowerCase() || "";
    return (
      locationName.includes(search) ||
      technicianName.includes(search) ||
      assetName.includes(search) ||
      String(visit.id).includes(search)
    );
  });

  // Access restricted view
  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            Access Restricted
          </h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view service visits.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            Failed to load visits
          </h2>
          <p className="mt-2 text-muted-foreground">
            There was an error loading service visits.
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
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
            Service Visits
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage maintenance service visits for your assets
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate("/maintenance/visits/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Visit
          </Button>
        )}
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
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Location" />
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
        <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Technician" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All technicians</SelectItem>
            {technicians.map((tech) => (
              <SelectItem key={tech.id} value={String(tech.id)}>
                {tech.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Visits List */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Visits</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredVisits.length} {filteredVisits.length === 1 ? "visit" : "visits"} (last 30 days)
          </p>
        </div>

        {filteredVisits.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {searchTerm || statusFilter !== "all" || locationFilter !== "all" || technicianFilter !== "all"
                ? "No visits found"
                : "No service visits yet"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm || statusFilter !== "all" || locationFilter !== "all" || technicianFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by creating your first service visit"}
            </p>
            {!searchTerm && statusFilter === "all" && locationFilter === "all" && technicianFilter === "all" && canCreate && (
              <Button
                onClick={() => navigate("/maintenance/visits/new")}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Service Visit
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Date / Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
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
                    onClick={() => navigate(`/maintenance/visits/${visit.id}`)}
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-foreground">
                        #{visit.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">
                        {visit.scheduled_date}
                      </div>
                      {visit.scheduled_start_time && (
                        <div className="text-xs text-muted-foreground">
                          {visit.scheduled_start_time}
                          {visit.scheduled_end_time && ` - ${visit.scheduled_end_time}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={visit.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">
                        {visit.location?.name || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {visit.asset ? (
                        <Link
                          to={`/assets/${visit.asset.id}`}
                          className="inline-flex items-center text-sm text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {visit.asset.name}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">
                        {visit.cleaner?.full_name || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/maintenance/visits/${visit.id}`);
                        }}
                      >
                        View
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
