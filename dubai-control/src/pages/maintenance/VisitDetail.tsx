// dubai-control/src/pages/maintenance/VisitDetail.tsx

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
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
  CheckCircle2,
  Circle,
} from "lucide-react";
import { getServiceVisit } from "@/api/client";
import { toggleChecklistItem } from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";
import { CompletionBlockersPanel } from "@/contexts/maintenance/ui/ApiErrorPanel";
import { buildCompletionBlockers } from "@/contexts/maintenance/utils/completionErrors";

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

// Check if user is a technician (can edit checklist)
function isTechnician(role: UserRole): boolean {
  return role === "cleaner";
}

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useUserRole();

  const hasAccess = canAccessVisits(user.role);
  const canEditChecklist = isTechnician(user.role);
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

  // Toggle checklist item mutation
  const toggleMutation = useMutation({
    mutationFn: ({ itemId, isCompleted }: { itemId: number; isCompleted: boolean }) =>
      toggleChecklistItem(visitId, itemId, isCompleted),
    onMutate: async ({ itemId, isCompleted }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["serviceVisit", visitId] });
      const previousVisit = queryClient.getQueryData(["serviceVisit", visitId]);

      queryClient.setQueryData(["serviceVisit", visitId], (old: any) => {
        if (!old?.checklist_items) return old;
        return {
          ...old,
          checklist_items: old.checklist_items.map((item: any) =>
            item.id === itemId ? { ...item, is_completed: isCompleted } : item
          ),
        };
      });

      return { previousVisit };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousVisit) {
        queryClient.setQueryData(["serviceVisit", visitId], context.previousVisit);
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update checklist item",
      });
    },
    onSuccess: () => {
      // Invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ["serviceVisit", visitId] });
    },
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
                  to={`/maintenance/assets/${visit.asset.id}`}
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

      {/* Checklist Section */}
      {visit.checklist_items && visit.checklist_items.length > 0 && (() => {
        const completedCount = visit.checklist_items.filter((item: any) => item.is_completed).length;
        const totalCount = visit.checklist_items.length;
        const progressPercent = Math.round((completedCount / totalCount) * 100);
        const canToggle = canEditChecklist && visit.status === "in_progress";

        return (
          <div className="detail-card mt-4">
            <div className="flex items-center justify-between">
              <h2 className="detail-card-title">
                <ClipboardList />
                Checklist
              </h2>
              <span className="text-sm font-medium text-muted-foreground">
                {completedCount}/{totalCount} complete
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* Checklist items */}
            <div className="mt-4 space-y-2">
              {visit.checklist_items.map((item: any) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    item.is_completed
                      ? "border-green-200 bg-green-50"
                      : "border-border bg-card"
                  } ${canToggle ? "cursor-pointer hover:bg-muted/50" : ""}`}
                  onClick={() => {
                    if (canToggle && !toggleMutation.isPending) {
                      toggleMutation.mutate({
                        itemId: item.id,
                        isCompleted: !item.is_completed,
                      });
                    }
                  }}
                >
                  {canToggle ? (
                    <Checkbox
                      checked={item.is_completed}
                      disabled={toggleMutation.isPending}
                      onCheckedChange={(checked) => {
                        toggleMutation.mutate({
                          itemId: item.id,
                          isCompleted: Boolean(checked),
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5"
                    />
                  ) : (
                    <div className="mt-0.5">
                      {item.is_completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <span
                      className={`text-sm ${
                        item.is_completed
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {item.text}
                    </span>
                    {item.is_required && !item.is_completed && (
                      <span className="ml-2 text-xs text-destructive">Required</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Technician hint */}
            {canEditChecklist && visit.status !== "in_progress" && (
              <p className="mt-3 text-xs text-muted-foreground">
                Checklist can only be edited when the visit is in progress.
              </p>
            )}
            {!canEditChecklist && (
              <p className="mt-3 text-xs text-muted-foreground">
                Only the assigned technician can complete checklist items.
              </p>
            )}
          </div>
        );
      })()}

      {/* No checklist message */}
      {(!visit.checklist_items || visit.checklist_items.length === 0) && (
        <div className="detail-card mt-4">
          <h2 className="detail-card-title">
            <ClipboardList />
            Checklist
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No checklist assigned to this visit.
          </p>
        </div>
      )}

      {/* Completion Blockers - shown when visit is in progress */}
      {visit.status === "in_progress" && (
        <CompletionBlockersPanel
          blockers={buildCompletionBlockers({
            photos: visit.photos,
            checklist_items: visit.checklist_items,
          })}
          className="mt-4"
        />
      )}

      {/* Evidence Section - Photos */}
      <div className="detail-card mt-4">
        <h2 className="detail-card-title">Evidence Photos</h2>

        {/* Photos Grid */}
        {(visit.photos?.before || visit.photos?.after) ? (
          <div className="mt-3 grid grid-cols-2 gap-4">
            {/* Before Photo */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">BEFORE</div>
              {visit.photos?.before ? (
                <a
                  href={visit.photos.before.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={visit.photos.before.url}
                    alt="Before"
                    className="w-full h-32 object-cover rounded-lg border border-border hover:opacity-90 transition-opacity cursor-pointer"
                  />
                  {visit.photos.before.uploaded_at && (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(visit.photos.before.uploaded_at).toLocaleString()}
                    </div>
                  )}
                </a>
              ) : (
                <div className="w-full h-32 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">No photo</span>
                </div>
              )}
            </div>

            {/* After Photo */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">AFTER</div>
              {visit.photos?.after ? (
                <a
                  href={visit.photos.after.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={visit.photos.after.url}
                    alt="After"
                    className="w-full h-32 object-cover rounded-lg border border-border hover:opacity-90 transition-opacity cursor-pointer"
                  />
                  {visit.photos.after.uploaded_at && (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(visit.photos.after.uploaded_at).toLocaleString()}
                    </div>
                  )}
                </a>
              ) : (
                <div className="w-full h-32 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">No photo</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3 py-6 text-center">
            <div className="text-sm text-muted-foreground">No photos uploaded yet</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Technician will upload before/after photos during the visit
            </p>
          </div>
        )}

        {/* Link to full Job Detail */}
        <div className="mt-4 pt-3 border-t border-border">
          <Button onClick={() => navigate(`/jobs/${visit.id}`)} variant="outline" size="sm">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            View Full Job Detail
          </Button>
        </div>
      </div>

      {/* Check Events Summary */}
      {visit.check_events && visit.check_events.length > 0 && (
        <div className="detail-card mt-4">
          <h2 className="detail-card-title">Check-in / Check-out</h2>
          <div className="mt-3 space-y-2">
            {visit.check_events.map((event, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className={`font-medium ${event.event_type === 'check_in' ? 'text-green-600' : 'text-blue-600'}`}>
                  {event.event_type === 'check_in' ? 'Check-in' : 'Check-out'}
                </span>
                <span className="text-muted-foreground">
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
