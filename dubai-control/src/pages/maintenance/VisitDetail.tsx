// dubai-control/src/pages/maintenance/VisitDetail.tsx

import { useState } from "react";
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
  Download,
} from "lucide-react";
import { getServiceVisit } from "@/api/client";
import { toggleChecklistItem, downloadVisitReport } from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";
import { CompletionBlockersPanel } from "@/contexts/maintenance/ui/ApiErrorPanel";
import { buildCompletionBlockers } from "@/contexts/maintenance/utils/completionErrors";

// RBAC: Check if user can access visits (owner/manager/staff)
function canAccessVisits(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// Human-readable SLA reason labels (matches Cleaning pattern)
const SLA_REASON_LABELS: Record<string, string> = {
  missing_before_photo: "Missing before photo",
  missing_after_photo: "Missing after photo",
  checklist_not_completed: "Checklist not completed",
  late_check_in: "Late check-in",
  late_check_out: "Late check-out",
};

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
  const [isDownloading, setIsDownloading] = useState(false);

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

  // Download PDF handler
  const handleDownloadPdf = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const blob = await downloadVisitReport(visitId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `maintenance_visit_${visitId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Download complete",
        description: "PDF report has been downloaded.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Failed to download PDF report. Please try again.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

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
          <div className="flex gap-2">
            {visit.status === "completed" && (
              <Button
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                size="sm"
              >
                {isDownloading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                Download PDF
              </Button>
            )}
          </div>
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

      {/* Checklist + Completion Blockers Row */}
      <div className="grid gap-4 md:grid-cols-2 mt-4">
        {/* Checklist Section */}
        {visit.checklist_items && visit.checklist_items.length > 0 ? (() => {
          const completedCount = visit.checklist_items.filter((item: any) => item.is_completed).length;
          const totalCount = visit.checklist_items.length;
          const progressPercent = Math.round((completedCount / totalCount) * 100);
          const canToggle = canEditChecklist && visit.status === "in_progress";

          return (
            <div className="detail-card">
              <div className="flex items-center justify-between">
                <h2 className="detail-card-title">
                  <ClipboardList />
                  Checklist
                </h2>
                <span className="text-xs font-medium text-muted-foreground">
                  {completedCount}/{totalCount}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-2">
                <Progress value={progressPercent} className="h-1.5" />
              </div>

              {/* Checklist items - compact 2-column layout */}
              <div className="mt-2 grid grid-cols-1 gap-1">
                {visit.checklist_items.map((item: any) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-1.5 rounded border px-2 py-1 transition-colors text-xs ${
                      item.is_completed
                        ? "border-green-200 bg-green-50/50"
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
                        className="h-3.5 w-3.5"
                      />
                    ) : (
                      <div className="flex-shrink-0">
                        {item.is_completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <span
                      className={`flex-1 truncate ${
                        item.is_completed ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {item.text}
                    </span>
                    {item.is_required && !item.is_completed && (
                      <span className="text-[10px] text-destructive font-medium shrink-0">Req</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Technician hint */}
              {!canEditChecklist && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Only technician can edit
                </p>
              )}
            </div>
          );
        })() : (
          <div className="detail-card">
            <h2 className="detail-card-title">
              <ClipboardList />
              Checklist
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              No checklist assigned
            </p>
          </div>
        )}

        {/* Completion Blockers or SLA Status */}
        {visit.status === "in_progress" ? (
          <CompletionBlockersPanel
            blockers={buildCompletionBlockers({
              photos: visit.photos,
              checklist_items: visit.checklist_items,
            })}
          />
        ) : (
          <div className="detail-card">
            <h2 className="detail-card-title">SLA Status</h2>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    visit.sla_status === "violated"
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {visit.sla_status === "violated" ? "Violated" : "OK"}
                </span>
              </div>
              {visit.sla_status === "violated" && visit.sla_reasons && visit.sla_reasons.length > 0 && (
                <ul className="space-y-0.5">
                  {visit.sla_reasons.map((reason: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-1.5 text-xs text-red-700">
                      <span className="h-1 w-1 rounded-full bg-red-400" />
                      {SLA_REASON_LABELS[reason] ?? reason.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Evidence + Timing Row */}
      <div className="grid gap-4 md:grid-cols-2 mt-4">
        {/* Evidence Photos */}
        <div className="detail-card">
          <h2 className="detail-card-title">Evidence Photos</h2>
          {(visit.photos?.before || visit.photos?.after) ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] font-medium text-muted-foreground mb-1">BEFORE</div>
                {visit.photos?.before ? (
                  <a href={visit.photos.before.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={visit.photos.before.url}
                      alt="Before"
                      className="w-full h-20 object-cover rounded border border-border hover:opacity-90"
                    />
                  </a>
                ) : (
                  <div className="w-full h-20 rounded border border-dashed border-border bg-muted/30 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">No photo</span>
                  </div>
                )}
              </div>
              <div>
                <div className="text-[10px] font-medium text-muted-foreground mb-1">AFTER</div>
                {visit.photos?.after ? (
                  <a href={visit.photos.after.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={visit.photos.after.url}
                      alt="After"
                      className="w-full h-20 object-cover rounded border border-border hover:opacity-90"
                    />
                  </a>
                ) : (
                  <div className="w-full h-20 rounded border border-dashed border-border bg-muted/30 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">No photo</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2 py-4 text-center">
              <div className="text-xs text-muted-foreground">No photos uploaded</div>
            </div>
          )}
        </div>

        {/* Timing & Check Events */}
        <div className="detail-card">
          <h2 className="detail-card-title">Timing</h2>
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Scheduled:</span>
                <div className="font-medium">{visit.scheduled_date}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Time:</span>
                <div className="font-medium">
                  {visit.scheduled_start_time || "—"}{visit.scheduled_end_time && ` - ${visit.scheduled_end_time}`}
                </div>
              </div>
            </div>
            {(visit.actual_start_time || visit.actual_end_time) && (
              <div className="rounded bg-muted/50 p-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Check-in:</span>
                    <div className="font-medium text-green-600">
                      {visit.actual_start_time ? new Date(visit.actual_start_time).toLocaleTimeString() : "—"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Check-out:</span>
                    <div className="font-medium text-blue-600">
                      {visit.actual_end_time ? new Date(visit.actual_end_time).toLocaleTimeString() : "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* SLA for completed visits */}
            {visit.status === "completed" && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">SLA:</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    visit.sla_status === "violated"
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {visit.sla_status === "violated" ? "Violated" : "OK"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </MaintenanceLayout>
  );
}
