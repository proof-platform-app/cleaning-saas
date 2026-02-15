// dubai-control/src/pages/maintenance/AssetDetail.tsx
// Asset Detail page with Service History
// Follows Lovable design patterns from VisitDetail.tsx

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Loader2,
  Wrench,
  MapPin,
  Hash,
  Calendar,
  Clock,
  User,
  FileText,
  RefreshCw,
  Plus,
  ExternalLink,
  Tag,
  Power,
  PowerOff,
  Download,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import {
  getAsset,
  getAssetVisits,
  downloadAssetHistoryReport,
  maintenanceKeys,
  type AssetServiceHistory,
} from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";

// RBAC: Check if user can read assets (owner/manager/staff)
function canReadAssets(role: UserRole): boolean {
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

// Format date for display
function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

// Format time for display
function formatTime(timeStr: string | null): string {
  if (!timeStr) return "—";
  try {
    // Handle both HH:mm:ss and ISO datetime formats
    if (timeStr.includes("T")) {
      return format(new Date(timeStr), "h:mm a");
    }
    // Simple time string like "09:00:00"
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return format(date, "h:mm a");
  } catch {
    return timeStr;
  }
}

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useUserRole();

  const hasAccess = canReadAssets(user.role);
  const assetId = Number(id);
  const [isDownloading, setIsDownloading] = useState(false);

  // Download PDF handler
  const handleDownloadPdf = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const blob = await downloadAssetHistoryReport(assetId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `asset_${assetId}_history.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Download complete",
        description: "Asset history PDF has been downloaded.",
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

  // Fetch asset with service history
  const {
    data: historyData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: maintenanceKeys.assets.visits(assetId),
    queryFn: () => getAssetVisits(assetId),
    enabled: hasAccess && !isNaN(assetId),
  });

  // Access restricted view
  if (!hasAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-8 text-center">
          <Wrench className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Access Restricted</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have permission to view assets.
          </p>
          <Button onClick={() => navigate("/maintenance/assets")} className="mt-4" size="sm">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back to Assets
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

  if (isError || !historyData) {
    return (
      <MaintenanceLayout>
        <div className="py-8 text-center">
          <Wrench className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Failed to load asset</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Asset #{id} could not be found or loaded.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate("/maintenance/assets")} size="sm">
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

  const { asset, visits, total_visits } = historyData;

  return (
    <MaintenanceLayout>
      {/* Back button */}
      <button
        onClick={() => navigate("/maintenance/assets")}
        className="back-button"
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
        Back to Assets
      </button>

      {/* Header */}
      <div className="detail-header">
        <div className="flex items-center justify-between">
          <div>
            <h1>{asset.name}</h1>
            <div className="detail-badges mt-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Tag className="mr-1.5 h-3.5 w-3.5" />
                {asset.asset_type?.name || "Unknown Type"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
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
              Export PDF
            </Button>
            <Button
              onClick={() => navigate(`/maintenance/visits/new?asset_id=${asset.id}&location_id=${asset.location?.id}`)}
              size="sm"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Schedule Visit
            </Button>
          </div>
        </div>
      </div>

      {/* Asset Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Location Card */}
        <div className="detail-card">
          <h2 className="detail-card-title">
            <MapPin />
            Location
          </h2>
          <div className="detail-section">
            <span className="text-sm font-medium text-foreground">
              {asset.location?.name || "—"}
            </span>
          </div>
        </div>

        {/* Serial Number Card */}
        <div className="detail-card">
          <h2 className="detail-card-title">
            <Hash />
            Serial Number
          </h2>
          <div className="detail-section">
            <span className="text-sm font-mono text-foreground">
              {asset.serial_number || "—"}
            </span>
          </div>
        </div>

        {/* Stats Card */}
        <div className="detail-card">
          <h2 className="detail-card-title">
            <Wrench />
            Service Stats
          </h2>
          <div className="detail-section">
            <div className="text-2xl font-semibold text-foreground">
              {total_visits}
            </div>
            <div className="text-xs text-muted-foreground">
              Total service visits
            </div>
          </div>
        </div>
      </div>

      {/* Warranty Info (Stage 5 Lite) */}
      {(asset.warranty_end_date || asset.warranty_provider) && (
        <div className="detail-card mt-4">
          <h2 className="detail-card-title">
            <ShieldCheck />
            Warranty
          </h2>
          <div className="detail-section">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Warranty Status */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                {asset.warranty_status === "active" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <ShieldCheck className="h-3 w-3" />
                    Active
                  </span>
                )}
                {asset.warranty_status === "expiring_soon" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <AlertTriangle className="h-3 w-3" />
                    Expiring Soon
                  </span>
                )}
                {asset.warranty_status === "expired" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    <AlertTriangle className="h-3 w-3" />
                    Expired
                  </span>
                )}
                {asset.warranty_status === "no_warranty" && (
                  <span className="text-xs text-muted-foreground">No warranty</span>
                )}
              </div>

              {/* Warranty Period */}
              {asset.warranty_end_date && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Period</div>
                  <div className="text-sm text-foreground">
                    {asset.warranty_start_date && formatDate(asset.warranty_start_date)} — {formatDate(asset.warranty_end_date)}
                  </div>
                </div>
              )}

              {/* Provider */}
              {asset.warranty_provider && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Provider</div>
                  <div className="text-sm text-foreground">{asset.warranty_provider}</div>
                </div>
              )}
            </div>

            {/* Warranty Notes */}
            {asset.warranty_notes && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1">Notes</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{asset.warranty_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Service History */}
      <div className="detail-card mt-4">
        <div className="flex items-center justify-between">
          <h2 className="detail-card-title">
            <Calendar />
            Service History
          </h2>
          {visits.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {visits.length} visit{visits.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {visits.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No service visits recorded yet
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate(`/maintenance/visits/new?asset_id=${asset.id}&location_id=${asset.location?.id}`)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Schedule First Visit
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {visits.map((visit) => (
              <Link
                key={visit.id}
                to={`/maintenance/visits/${visit.id}`}
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    {/* Date and Status */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {formatDate(visit.scheduled_date)}
                      </span>
                      <StatusBadge status={visit.status} />
                    </div>

                    {/* Time */}
                    {visit.scheduled_start_time && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTime(visit.scheduled_start_time)}
                      </div>
                    )}

                    {/* Technician */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {visit.technician?.name || "Unassigned"}
                    </div>

                    {/* Category */}
                    {visit.category && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        {visit.category.name}
                      </div>
                    )}

                    {/* Notes preview */}
                    {(visit.manager_notes || visit.cleaner_notes) && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">
                          {visit.manager_notes || visit.cleaner_notes}
                        </span>
                      </div>
                    )}
                  </div>

                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Actual times for completed visits */}
                {visit.status === "completed" && (visit.actual_start_time || visit.actual_end_time) && (
                  <div className="mt-2 rounded bg-green-50 px-2 py-1 text-xs text-green-700">
                    Completed: {visit.actual_start_time && formatTime(visit.actual_start_time)}
                    {visit.actual_end_time && ` - ${formatTime(visit.actual_end_time)}`}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </MaintenanceLayout>
  );
}
