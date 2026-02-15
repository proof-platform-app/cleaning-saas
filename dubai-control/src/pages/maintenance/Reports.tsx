// dubai-control/src/pages/maintenance/Reports.tsx
// Maintenance Reports (S2-P3)
// Weekly/Monthly reports with PDF download and email delivery

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Download,
  Mail,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Users,
  Wrench,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";
import {
  getMaintenanceWeeklyReport,
  getMaintenanceMonthlyReport,
  downloadMaintenanceWeeklyReportPdf,
  downloadMaintenanceMonthlyReportPdf,
  sendMaintenanceWeeklyReportEmail,
  sendMaintenanceMonthlyReportEmail,
  maintenanceKeys,
  type MaintenanceReportData,
} from "@/api/maintenance";

// ============================================================================
// Types
// ============================================================================

type ReportMode = "weekly" | "monthly";

// ============================================================================
// RBAC
// ============================================================================

function canAccessReports(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// ============================================================================
// SLA Reason Labels
// ============================================================================

const SLA_REASON_LABELS: Record<string, string> = {
  checklist_not_completed: "Checklist not completed",
  no_before_photo: "Before photo missing",
  no_after_photo: "After photo missing",
  missing_before_photo: "Before photo missing",
  missing_after_photo: "After photo missing",
  no_check_in: "Check-in missing",
  no_check_out: "Check-out missing",
  missing_check_in: "Check-in missing",
  missing_check_out: "Check-out missing",
  check_in_too_far: "Check-in location too far",
  check_out_too_far: "Check-out location too far",
  late_start: "Late start",
  early_end: "Early end",
  no_photos: "No photos provided",
  missing_proof: "Missing proof",
};

function getReasonLabel(code: string): string {
  return SLA_REASON_LABELS[code] || code.replace(/_/g, " ");
}

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ rate }: { rate: number }) {
  const percent = rate * 100;

  if (percent < 5) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Healthy
      </span>
    );
  }

  if (percent < 20) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        Needs attention
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
      <AlertTriangle className="h-3 w-3" />
      At risk
    </span>
  );
}

// ============================================================================
// Report Card Component
// ============================================================================

interface ReportCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

function ReportCard({ title, children, icon }: ReportCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// Data Table Component
// ============================================================================

interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  emptyMessage = "No data",
  onRowClick,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {emptyMessage}
      </p>
    );
  }

  const isClickable = !!onRowClick;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`py-2 px-3 text-xs font-medium text-muted-foreground ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left"
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={idx}
              className={`border-b border-border/50 last:border-0 ${
                isClickable
                  ? "cursor-pointer hover:bg-muted/50 transition-colors"
                  : ""
              }`}
              onClick={isClickable ? () => onRowClick(item) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`py-2.5 px-3 ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left"
                  }`}
                >
                  {col.render
                    ? col.render(item)
                    : String(item[col.key as keyof T] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Email Dialog Component
// ============================================================================

interface EmailDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (email?: string) => Promise<void>;
  userEmail: string;
  mode: ReportMode;
}

function EmailDialog({ open, onClose, onSend, userEmail, mode }: EmailDialogProps) {
  const [emailOption, setEmailOption] = useState<"self" | "custom">("self");
  const [customEmail, setCustomEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setError("");

    const email = emailOption === "custom" ? customEmail.trim() : undefined;

    if (emailOption === "custom" && !email) {
      setError("Please enter an email address");
      return;
    }

    if (emailOption === "custom" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email!)) {
      setError("Please enter a valid email address");
      return;
    }

    setSending(true);
    try {
      await onSend(email);
      onClose();
    } catch (err) {
      setError("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send {mode === "weekly" ? "Weekly" : "Monthly"} Report</DialogTitle>
          <DialogDescription>
            The report will be sent as a PDF attachment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={emailOption}
            onValueChange={(v) => setEmailOption(v as "self" | "custom")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="self" id="self" />
              <Label htmlFor="self" className="text-sm">
                Send to my email ({userEmail})
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="text-sm">
                Send to different email
              </Label>
            </div>
          </RadioGroup>

          {emailOption === "custom" && (
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="email@example.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                disabled={sending}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MaintenanceReports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useUserRole();
  const hasAccess = canAccessReports(user.role);

  const [mode, setMode] = useState<ReportMode>("weekly");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  const {
    data: weeklyReport,
    isLoading: weeklyLoading,
    isError: weeklyError,
    refetch: refetchWeekly,
  } = useQuery({
    queryKey: maintenanceKeys.reports.weekly(),
    queryFn: getMaintenanceWeeklyReport,
    enabled: hasAccess && mode === "weekly",
  });

  const {
    data: monthlyReport,
    isLoading: monthlyLoading,
    isError: monthlyError,
    refetch: refetchMonthly,
  } = useQuery({
    queryKey: maintenanceKeys.reports.monthly(),
    queryFn: getMaintenanceMonthlyReport,
    enabled: hasAccess && mode === "monthly",
  });

  const report = mode === "weekly" ? weeklyReport : monthlyReport;
  const isLoading = mode === "weekly" ? weeklyLoading : monthlyLoading;
  const isError = mode === "weekly" ? weeklyError : monthlyError;
  const refetch = mode === "weekly" ? refetchWeekly : refetchMonthly;

  // -------------------------------------------------------------------------
  // Navigation Handlers for drill-down
  // -------------------------------------------------------------------------

  const handleTechnicianClick = (tech: { id: number; name: string }) => {
    if (!report) return;
    const params = new URLSearchParams({
      technician_id: String(tech.id),
      date_from: report.period.from,
      date_to: report.period.to,
    });
    navigate(`/maintenance/visits?${params.toString()}`);
  };

  const handleAssetClick = (asset: { id: number; name: string }) => {
    if (!report) return;
    const params = new URLSearchParams({
      asset_id: String(asset.id),
      date_from: report.period.from,
      date_to: report.period.to,
    });
    navigate(`/maintenance/visits?${params.toString()}`);
  };

  const handleLocationClick = (location: { id: number; name: string }) => {
    if (!report) return;
    const params = new URLSearchParams({
      location_id: String(location.id),
      date_from: report.period.from,
      date_to: report.period.to,
    });
    navigate(`/maintenance/visits?${params.toString()}`);
  };

  const handleSlaReasonClick = (code: string) => {
    if (!report) return;
    const params = new URLSearchParams({
      sla_reason: code,
      date_from: report.period.from,
      date_to: report.period.to,
    });
    navigate(`/maintenance/visits?${params.toString()}`);
  };

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = mode === "weekly"
        ? await downloadMaintenanceWeeklyReportPdf()
        : await downloadMaintenanceMonthlyReportPdf();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `maintenance_${mode}_report.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your report is being downloaded.",
      });
    } catch (err) {
      toast({
        title: "Download failed",
        description: "Failed to download report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async (email?: string) => {
    if (mode === "weekly") {
      await sendMaintenanceWeeklyReportEmail(email);
    } else {
      await sendMaintenanceMonthlyReportEmail(email);
    }

    toast({
      title: "Email sent",
      description: `Report sent to ${email || user.email}`,
    });
  };

  // -------------------------------------------------------------------------
  // Access restricted
  // -------------------------------------------------------------------------

  if (!hasAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view reports.
          </p>
        </div>
      </MaintenanceLayout>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <MaintenanceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Maintenance performance reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              <Button
                variant={mode === "weekly" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setMode("weekly")}
              >
                Weekly
              </Button>
              <Button
                variant={mode === "monthly" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setMode("monthly")}
              >
                Monthly
              </Button>
            </div>
            {/* Actions */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={handleDownloadPdf}
              disabled={downloading || isLoading || !report}
            >
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={() => setEmailDialogOpen(true)}
              disabled={isLoading || !report}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="mt-4 text-sm text-muted-foreground">
              Failed to load report
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Report Content */}
        {report && !isLoading && !isError && (
          <>
            {/* Summary Card */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">
                      {mode === "weekly" ? "Weekly" : "Monthly"} Report
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {report.period.from} — {report.period.to}
                  </p>
                </div>
                <StatusBadge rate={report.issue_rate} />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-semibold">{report.visits_count}</p>
                  <p className="text-xs text-muted-foreground">Visits Completed</p>
                </div>
                <div className="rounded-lg bg-red-50 p-4 text-center">
                  <p className="text-2xl font-semibold text-red-600">
                    {report.violations_count}
                  </p>
                  <p className="text-xs text-muted-foreground">SLA Violations</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-4 text-center">
                  <p className="text-2xl font-semibold text-emerald-600">
                    {((1 - report.issue_rate) * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </div>

            {/* Top SLA Reasons */}
            {report.top_sla_reasons.length > 0 && (
              <ReportCard title="Top SLA Issues" icon={<AlertTriangle className="h-4 w-4" />}>
                <div className="flex flex-wrap gap-2">
                  {report.top_sla_reasons.map((reason) => (
                    <button
                      key={reason.code}
                      onClick={() => handleSlaReasonClick(reason.code)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer"
                    >
                      {getReasonLabel(reason.code)}
                      <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px]">
                        {reason.count}
                      </span>
                    </button>
                  ))}
                </div>
              </ReportCard>
            )}

            {/* Tables Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Technicians */}
              <ReportCard title="Technicians" icon={<Users className="h-4 w-4" />}>
                <DataTable
                  data={report.technicians}
                  emptyMessage="No technician data"
                  onRowClick={handleTechnicianClick}
                  columns={[
                    {
                      key: "name",
                      header: "Technician",
                      render: (t) => (
                        <span className="font-medium">{t.name}</span>
                      ),
                    },
                    {
                      key: "visits",
                      header: "Visits",
                      align: "center",
                    },
                    {
                      key: "violations",
                      header: "Violations",
                      align: "center",
                      render: (t) => (
                        <span
                          className={
                            t.violations > 0
                              ? "text-amber-600 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {t.violations}
                        </span>
                      ),
                    },
                  ]}
                />
              </ReportCard>

              {/* Assets */}
              <ReportCard title="Assets" icon={<Wrench className="h-4 w-4" />}>
                <DataTable
                  data={report.assets.slice(0, 5)}
                  emptyMessage="No asset data"
                  onRowClick={handleAssetClick}
                  columns={[
                    {
                      key: "name",
                      header: "Asset",
                      render: (a) => (
                        <div>
                          <p className="font-medium">{a.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.type_name}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: "visits",
                      header: "Visits",
                      align: "center",
                    },
                    {
                      key: "violations",
                      header: "Violations",
                      align: "center",
                      render: (a) => (
                        <span
                          className={
                            a.violations > 0
                              ? "text-amber-600 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {a.violations}
                        </span>
                      ),
                    },
                  ]}
                />
              </ReportCard>

              {/* Locations */}
              <ReportCard title="Locations" icon={<MapPin className="h-4 w-4" />}>
                <DataTable
                  data={report.locations}
                  emptyMessage="No location data"
                  onRowClick={handleLocationClick}
                  columns={[
                    {
                      key: "name",
                      header: "Location",
                      render: (l) => (
                        <span className="font-medium">{l.name}</span>
                      ),
                    },
                    {
                      key: "visits",
                      header: "Visits",
                      align: "center",
                    },
                    {
                      key: "violations",
                      header: "Violations",
                      align: "center",
                      render: (l) => (
                        <span
                          className={
                            l.violations > 0
                              ? "text-amber-600 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {l.violations}
                        </span>
                      ),
                    },
                  ]}
                />
              </ReportCard>
            </div>
          </>
        )}
      </div>

      {/* Email Dialog */}
      <EmailDialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        onSend={handleSendEmail}
        userEmail={user.email}
        mode={mode}
      />
    </MaintenanceLayout>
  );
}
