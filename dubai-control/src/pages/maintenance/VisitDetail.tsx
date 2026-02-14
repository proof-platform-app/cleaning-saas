// dubai-control/src/pages/maintenance/VisitDetail.tsx

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  ClipboardList,
  ExternalLink,
  MapPin,
  User,
  Calendar,
  Clock,
  Wrench,
  FileText,
  RefreshCw,
} from "lucide-react";
import { getServiceVisit } from "@/api/client";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";

// RBAC: Check if user can access visits (owner/manager/staff)
function canAccessVisits(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
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
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
        styles[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

// SLA badge component
function SLABadge({ status }: { status?: string }) {
  if (!status) return null;

  const isOk = status === "ok";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
        isOk ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      {isOk ? "SLA OK" : "SLA Violated"}
    </span>
  );
}

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useUserRole();

  const hasAccess = canAccessVisits(user.role);
  const visitId = Number(id);

  // Fetch visit details
  const {
    data: visit,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["serviceVisit", visitId],
    queryFn: () => getServiceVisit(visitId),
    enabled: hasAccess && !isNaN(visitId),
  });

  // Access restricted view
  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            Access Restricted
          </h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view service visits.
          </p>
          <Button onClick={() => navigate("/maintenance/visits")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Visits
          </Button>
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

  if (isError || !visit) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            Failed to load visit
          </h2>
          <p className="mt-2 text-muted-foreground">
            Service visit #{id} could not be found or loaded.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate("/maintenance/visits")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Visits
            </Button>
            <Button onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/maintenance/visits")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Visits
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Service Visit #{visit.id}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <StatusBadge status={visit.status} />
              <SLABadge status={visit.sla_status} />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/jobs/${visit.id}`)}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Job Detail
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Schedule Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Schedule
          </h2>
          <div className="mt-4 space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Date:</span>
              <span className="ml-2 text-sm font-medium text-foreground">
                {visit.scheduled_date}
              </span>
            </div>
            {(visit.scheduled_start_time || visit.scheduled_end_time) && (
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Time:</span>
                <span className="ml-2 text-sm font-medium text-foreground">
                  {visit.scheduled_start_time || "—"}
                  {visit.scheduled_end_time && ` - ${visit.scheduled_end_time}`}
                </span>
              </div>
            )}
            {(visit.actual_start_time || visit.actual_end_time) && (
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actual Times
                </div>
                <div className="mt-1 text-sm">
                  {visit.actual_start_time && (
                    <div>
                      Start:{" "}
                      <span className="font-medium">
                        {new Date(visit.actual_start_time).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {visit.actual_end_time && (
                    <div>
                      End:{" "}
                      <span className="font-medium">
                        {new Date(visit.actual_end_time).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Location Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            Location
          </h2>
          <div className="mt-4 space-y-3">
            <div>
              <span className="text-sm font-medium text-foreground">
                {visit.location?.name || "—"}
              </span>
            </div>
            {visit.location?.address && (
              <div className="text-sm text-muted-foreground">
                {visit.location.address}
              </div>
            )}
            {visit.location?.latitude && visit.location?.longitude && (
              <a
                href={`https://maps.google.com/?q=${visit.location.latitude},${visit.location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-600 hover:underline"
              >
                Open in Maps
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Technician Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <User className="h-5 w-5 text-muted-foreground" />
            Technician
          </h2>
          <div className="mt-4 space-y-3">
            <div>
              <span className="text-sm font-medium text-foreground">
                {visit.cleaner?.full_name || "—"}
              </span>
            </div>
            {visit.cleaner?.phone && (
              <div className="text-sm text-muted-foreground">
                {visit.cleaner.phone}
              </div>
            )}
          </div>
        </div>

        {/* Asset Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            Asset
          </h2>
          <div className="mt-4">
            {visit.asset ? (
              <div className="space-y-2">
                <Link
                  to={`/assets`}
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline"
                >
                  {visit.asset.name}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
                {visit.asset.asset_type && (
                  <div className="text-sm text-muted-foreground">
                    Type: {visit.asset.asset_type.name}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                No asset linked to this visit
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {(visit.manager_notes || visit.cleaner_notes) && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Notes
          </h2>
          <div className="mt-4 space-y-4">
            {visit.manager_notes && (
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Manager Notes
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {visit.manager_notes}
                </p>
              </div>
            )}
            {visit.cleaner_notes && (
              <div className="rounded-lg bg-amber-50 p-4">
                <div className="text-xs font-medium text-amber-800 uppercase tracking-wider mb-1">
                  Technician Notes
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {visit.cleaner_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evidence Section */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Evidence & Proof</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View photos, checklist, and check-in/check-out events in the full Job Detail.
        </p>
        <div className="mt-4">
          <Button onClick={() => navigate(`/jobs/${visit.id}`)}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Job Detail
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-4">
          <div>
            <div className="text-sm text-muted-foreground">Photos</div>
            <div className="text-lg font-semibold text-foreground">
              {visit.photos?.length || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Checklist Items</div>
            <div className="text-lg font-semibold text-foreground">
              {visit.checklist_items?.length || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Check Events</div>
            <div className="text-lg font-semibold text-foreground">
              {visit.check_events?.length || 0}
            </div>
          </div>
        </div>
      </div>

      {/* SLA Violations */}
      {visit.sla_status === "violated" && visit.sla_reasons && visit.sla_reasons.length > 0 && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-red-800">SLA Violations</h2>
          <ul className="mt-2 list-disc list-inside text-sm text-red-700">
            {visit.sla_reasons.map((reason, idx) => (
              <li key={idx}>
                {reason.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
