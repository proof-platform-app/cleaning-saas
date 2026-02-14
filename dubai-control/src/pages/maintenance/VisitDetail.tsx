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
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";

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
      <MaintenanceLayout>
        <div className="py-8 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Access Restricted</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have permission to view service visits.
          </p>
          <Button onClick={() => navigate("/maintenance/visits")} className="mt-4" size="sm">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back to Visits
          </Button>
        </div>
      </MaintenanceLayout>
    );
  }

  if (isLoading) {
    return (
      <MaintenanceLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MaintenanceLayout>
    );
  }

  if (isError || !visit) {
    return (
      <MaintenanceLayout>
        <div className="py-8 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Failed to load visit</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Service visit #{id} could not be found or loaded.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate("/maintenance/visits")} size="sm">
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              Back
            </Button>
            <Button onClick={() => refetch()} size="sm">
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        </div>
      </MaintenanceLayout>
    );
  }

  return (
    <MaintenanceLayout>
      {/* Back button */}
      <button
        onClick={() => navigate("/maintenance/visits")}
        className="back-button"
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
        Back to Visits
      </button>

      {/* Header */}
      <div className="detail-header">
        <div className="flex items-center justify-between">
          <div>
            <h1>Service Visit #{visit.id}</h1>
            <div className="detail-badges">
              <StatusBadge status={visit.status} />
              <SLABadge status={visit.sla_status} />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/jobs/${visit.id}`)}
            size="sm"
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open in Job Detail
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Schedule Card */}
        <div className="detail-card">
          <h2 className="detail-card-title">
            <Calendar />
            Schedule
          </h2>
          <div className="detail-section space-y-2">
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
        <div className="detail-card">
          <h2 className="detail-card-title">
            <MapPin />
            Location
          </h2>
          <div className="detail-section space-y-2">
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
        <div className="detail-card">
          <h2 className="detail-card-title">
            <User />
            Technician
          </h2>
          <div className="detail-section space-y-2">
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
        <div className="detail-card">
          <h2 className="detail-card-title">
            <Wrench />
            Asset
          </h2>
          <div className="detail-section">
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
        <div className="detail-card mt-4">
          <h2 className="detail-card-title">
            <FileText />
            Notes
          </h2>
          <div className="detail-section space-y-3">
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
      <div className="detail-card mt-4">
        <h2 className="detail-card-title">Evidence & Proof</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          View photos, checklist, and check-in/check-out events in the full Job Detail.
        </p>
        <div className="mt-3">
          <Button onClick={() => navigate(`/jobs/${visit.id}`)} size="sm">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open in Job Detail
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
          <div>
            <div className="detail-label">Photos</div>
            <div className="detail-value">
              {visit.photos?.length || 0}
            </div>
          </div>
          <div>
            <div className="detail-label">Checklist Items</div>
            <div className="detail-value">
              {visit.checklist_items?.length || 0}
            </div>
          </div>
          <div>
            <div className="detail-label">Check Events</div>
            <div className="detail-value">
              {visit.check_events?.length || 0}
            </div>
          </div>
        </div>
      </div>

      {/* SLA Violations */}
      {visit.sla_status === "violated" && visit.sla_reasons && visit.sla_reasons.length > 0 && (
        <div className="detail-card mt-4 border-red-200 bg-red-50">
          <h2 className="text-sm font-semibold text-red-800">SLA Violations</h2>
          <ul className="mt-2 list-disc list-inside text-xs text-red-700">
            {visit.sla_reasons.map((reason, idx) => (
              <li key={idx}>
                {reason.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </li>
            ))}
          </ul>
        </div>
      )}
    </MaintenanceLayout>
  );
}
