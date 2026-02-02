import type React from "react";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Download,
  Mail,
  MapPin,
  CheckCircle2,
  Circle,
  Camera,
  User,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  fetchManagerJobDetail,
  ManagerJobDetail,
  JobTimelineStep,
  downloadJobReportPdf,
  emailJobReportPdf,
  fetchManagerJobReportEmails,
  ManagerJobReportEmailLogEntry,
  forceCompleteJob,
} from "@/api/client";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface UITimelineStep {
  id: string;
  label: string;
  time?: string;
  completed: boolean;
  icon: React.ElementType;
  // связан ли шаг с SLA-нарушениями (missing_* / checklist_not_completed)
  isViolationRelated: boolean;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
}

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date} at ${time}`;
}

function buildMapsUrl(lat?: number | null, lng?: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function formatJobCode(id: number | string) {
  const n = typeof id === "string" ? parseInt(id, 10) : id;
  if (!Number.isFinite(n as number)) return String(id);
  return `JOB-${String(n).padStart(3, "0")}`;
}

function mapTimelineToUI(
  steps: JobTimelineStep[],
  job: ManagerJobDetail
): UITimelineStep[] {
  const slaReasons = Array.isArray(job.sla_reasons) ? job.sla_reasons : [];

  const hasMissingBefore = slaReasons.includes("missing_before_photo");
  const hasMissingAfter = slaReasons.includes("missing_after_photo");
  const hasChecklistIssue = slaReasons.includes("checklist_not_completed");

  return steps.map((step): UITimelineStep => {
    let icon: React.ElementType = Circle;
    let time: string | undefined;
    let isViolationRelated = false;

    switch (step.key) {
      case "scheduled":
        icon = Calendar;
        // scheduled_date + start_time у нас обычно не ISO — просто как текст
        if (
          job.scheduled_date &&
          (job as any).start_time &&
          (job as any).start_time !== "--:--"
        ) {
          time = `${formatDate(job.scheduled_date)} at ${
            (job as any).start_time
          }`;
        } else if (job.scheduled_date) {
          time = formatDate(job.scheduled_date);
        }
        isViolationRelated = false;
        break;

      case "check_in":
      case "check_out":
        icon = MapPin;
        if (step.timestamp) {
          // для чек-инов показываем только время (как в макете)
          const formatted = formatTime(step.timestamp);
          time = formatted || undefined;
        }
        // сейчас SLA по GPS у нас нет в reasons — оставляем false
        isViolationRelated = false;
        break;

      case "before_photo":
        icon = Camera;
        // если есть missing_before_photo — считаем этот шаг violation-related
        isViolationRelated = hasMissingBefore;
        break;

      case "after_photo":
        icon = Camera;
        isViolationRelated = hasMissingAfter;
        break;

      case "checklist":
        icon = CheckCircle2;
        isViolationRelated = hasChecklistIssue;
        break;

      default:
        icon = Circle;
        isViolationRelated = false;
    }

    return {
      id: step.key,
      label: step.label,
      time,
      completed: step.status === "done",
      icon,
      isViolationRelated,
    };
  });
}

const SLA_REASON_LABELS: Record<string, string> = {
  missing_before_photo: "Missing before photo",
  missing_after_photo: "Missing after photo",
  checklist_not_completed: "Checklist not completed",
};

const FORCE_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "missing_before_photo", label: "Missing before photo" },
  { value: "missing_after_photo", label: "Missing after photo" },
  { value: "checklist_not_completed", label: "Checklist not completed" },
  { value: "missing_check_in", label: "Check-in missing" },
  { value: "missing_check_out", label: "Check-out missing" },
  { value: "other", label: "Other (manual override)" },
];

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<ManagerJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [hasGeneratedPdf, setHasGeneratedPdf] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<"self" | "custom">("self");
  const [customEmail, setCustomEmail] = useState("");
  const [customEmailError, setCustomEmailError] = useState<string | null>(null);

  const [emailHistory, setEmailHistory] =
    useState<ManagerJobReportEmailLogEntry[]>([]);
  const [emailHistoryLoading, setEmailHistoryLoading] = useState(false);
  const [emailHistoryError, setEmailHistoryError] =
    useState<string | null>(null);

  const [showOnlyViolations, setShowOnlyViolations] = useState(false);

  const [isForceDialogOpen, setIsForceDialogOpen] = useState(false);
  const [forceReason, setForceReason] = useState<string>(
    "missing_after_photo"
  );
  const [forceComment, setForceComment] = useState("");
  const [forceError, setForceError] = useState<string | null>(null);
  const [forceLoading, setForceLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchManagerJobDetail(id);
        if (!cancelled) {
          setJob(data);
        }
      } catch (e) {
        console.error("[JobDetails] Failed to load job", e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load job");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Загружаем историю отправки PDF по этому job
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function loadHistory() {
      try {
        setEmailHistoryLoading(true);
        setEmailHistoryError(null);

        const numericId = Number(id);
        if (!Number.isFinite(numericId)) {
          return;
        }

        const res = await fetchManagerJobReportEmails(numericId);
        if (!cancelled) {
          setEmailHistory(res.emails || []);
        }
      } catch (e) {
        console.error("[JobDetails] Failed to load job email history", e);
        if (!cancelled) {
          setEmailHistoryError(
            e instanceof Error
              ? e.message
              : "Failed to load job email history"
          );
        }
      } finally {
        if (!cancelled) {
          setEmailHistoryLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handlePdfAction(mode: "generate" | "download") {
    if (!job || pdfLoading) return;
    const jobIdNumber = typeof job.id === "number" ? job.id : Number(job.id);
    if (!Number.isFinite(jobIdNumber)) return;

    try {
      setPdfLoading(true);
      const blob = await downloadJobReportPdf(jobIdNumber);
      setHasGeneratedPdf(true);

      if (mode === "download") {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `job-${jobIdNumber}-report.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 10000);
      } else {
        console.log(
          `[JobDetails] PDF generated for job ${jobIdNumber}, size=${blob.size} bytes`
        );
      }
    } catch (e) {
      console.error("[JobDetails] PDF action failed", e);
      const msg =
        e instanceof Error ? e.message : "Failed to generate/download PDF";
      window.alert(msg);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleEmailPdf() {
    if (!job || emailLoading) return;

    const jobIdNumber =
      typeof job.id === "number" ? job.id : Number(job.id);
    if (!Number.isFinite(jobIdNumber)) return;

    // выбираем email в зависимости от режима
    let emailToSend: string | undefined;

    if (emailMode === "custom") {
      const value = customEmail.trim();
      if (!value) {
        setCustomEmailError("Email is required.");
        return;
      }
      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailRegex.test(value)) {
        setCustomEmailError("Invalid email format.");
        return;
      }
      emailToSend = value;
    } else {
      // режим "self" — шлём без email, backend возьмёт user.email
      emailToSend = undefined;
    }

    try {
      setEmailLoading(true);
      setEmailMessage(null);
      setEmailError(null);
      setCustomEmailError(null);

      const result: any = await emailJobReportPdf(jobIdNumber, emailToSend);

      const targetEmail =
        result?.target_email || result?.email || emailToSend || undefined;
      const detailText =
        result?.detail ||
        (targetEmail
          ? `PDF report emailed to ${targetEmail}.`
          : "PDF report emailed.");

      setEmailMessage(detailText);
      setIsEmailDialogOpen(false);

      // после успешной отправки обновляем историю писем
      try {
        const history = await fetchManagerJobReportEmails(jobIdNumber);
        setEmailHistory(history.emails || []);
      } catch (historyError) {
        console.error(
          "[JobDetails] Failed to refresh email history",
          historyError
        );
      }
    } catch (e) {
      console.error("[JobDetails] Email PDF failed", e);
      const msg =
        e instanceof Error ? e.message : "Failed to email PDF report.";
      setEmailError(msg);
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleForceComplete() {
    if (!job || forceLoading) return;

    const jobIdNumber =
      typeof job.id === "number" ? job.id : Number(job.id);
    if (!Number.isFinite(jobIdNumber)) return;

    const trimmedComment = forceComment.trim();
    if (!trimmedComment) {
      setForceError("Comment is required to force-complete a job.");
      return;
    }

    try {
      setForceLoading(true);
      setForceError(null);

      const updated = await forceCompleteJob(jobIdNumber, {
        reason_code: forceReason,
        comment: trimmedComment,
      });

      setJob(updated);
      setIsForceDialogOpen(false);
    } catch (e: any) {
      console.error("[JobDetails] Force complete failed", e);
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        (e instanceof Error ? e.message : "Failed to force-complete job.");
      setForceError(detail);
    } finally {
      setForceLoading(false);
    }
  }

  // базовые состояния

  if (!id) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Invalid job id</p>
        <Link
          to="/jobs"
          className="text-primary hover:text-primary/80 mt-2 inline-block"
        >
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading job…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600 mb-4">Failed to load job: {error}</p>
        <Link to="/jobs">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Job not found</p>
        <Link
          to="/jobs"
          className="text-primary hover:text-primary/80 mt-2 inline-block"
        >
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  // нормализуем данные под UI

  const timelineSteps: UITimelineStep[] = mapTimelineToUI(
    job.timeline || [],
    job
  );

  const visibleTimelineSteps: UITimelineStep[] = showOnlyViolations
    ? timelineSteps.filter((step) => step.isViolationRelated)
    : timelineSteps;

  const beforeUrl =
    job.photos?.before?.url || (job as any).before_photo_url || null;
  const afterUrl =
    job.photos?.after?.url || (job as any).after_photo_url || null;

  const checklist = job.checklist;

  const events = (job.check_events as any[]) || [];

  const checkInEvent = events.find((e) => e.event_type === "check_in");
  const checkOutEvent = events.find((e) => e.event_type === "check_out");

  const checkInLat =
    typeof checkInEvent?.latitude === "number" ? checkInEvent.latitude : null;
  const checkInLng =
    typeof checkInEvent?.longitude === "number" ? checkInEvent.longitude : null;

  const checkOutLat =
    typeof checkOutEvent?.latitude === "number"
      ? checkOutEvent.latitude
      : null;
  const checkOutLng =
    typeof checkOutEvent?.longitude === "number"
      ? checkOutEvent.longitude
      : null;

  const checkInGPS =
    checkInLat !== null && checkInLng !== null
      ? `${checkInLat}, ${checkInLng}`
      : undefined;

  const checkOutGPS =
    checkOutLat !== null && checkOutLng !== null
      ? `${checkOutLat}, ${checkOutLng}`
      : undefined;

  const checkInMapsUrl = buildMapsUrl(checkInLat, checkInLng);
  const checkOutMapsUrl = buildMapsUrl(checkOutLat, checkOutLng);

  const checkInTime =
    checkInEvent && (formatTime(checkInEvent.created_at) || undefined);
  const checkOutTime =
    checkOutEvent && (formatTime(checkOutEvent.created_at) || undefined);

  const slaStatus = job.sla_status ?? "ok";
  const slaReasons = Array.isArray(job.sla_reasons) ? job.sla_reasons : [];
  const hasSlaIssue = slaStatus === "violated";

  const hourlyRate = (job as any).hourlyRate ?? (job as any).hourly_rate;
  const flatRate = (job as any).flatRate ?? (job as any).flat_rate;

  const canGeneratePdf = job.status !== "scheduled";
  const canDownloadPdf = canGeneratePdf && hasGeneratedPdf;
  const canEmailPdf = canGeneratePdf;

  const cleanerName =
    (job as any).cleaner_name ||
    (job as any).cleaner_full_name ||
    (job as any).cleaner?.full_name ||
    "—";

  const scheduledDate = job.scheduled_date
    ? formatDate(job.scheduled_date)
    : "—";

  const scheduledTime =
    (job as any).scheduled_start_time || (job as any).start_time || null;
  const scheduledEndTime =
    (job as any).scheduled_end_time || (job as any).end_time || null;

  const actualStart = formatDateTime(
    (job as any).actual_start_time || (checkInEvent as any)?.created_at
  );
  const actualEnd = formatDateTime(
    (job as any).actual_end_time || (checkOutEvent as any)?.created_at
  );

  const isForceCompleted = (job as any).force_completed === true;
  const forceCompletedAt = (job as any).force_completed_at
    ? formatDateTime((job as any).force_completed_at)
    : null;
  const forceCompletedBy =
    (job as any).force_completed_by?.full_name ||
    (job as any).force_completed_by ||
    null;

  const canForceComplete =
    job.status !== "completed" && !isForceCompleted;

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                {job.location_name || (job as any).location || "Job"}
              </h1>
              <StatusPill status={job.status as any} />
            </div>
            <p className="text-muted-foreground">
              {job.location_address || (job as any).address || "—"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-border"
                onClick={() => handlePdfAction("download")}
                disabled={!canDownloadPdf || pdfLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                {pdfLoading ? "Preparing…" : "Download PDF"}
              </Button>
              <Button
                variant="outline"
                className="border-border"
                onClick={() => {
                  setEmailMessage(null);
                  setEmailError(null);
                  setCustomEmailError(null);
                  setEmailMode("self");
                  setCustomEmail("");
                  setIsEmailDialogOpen(true);
                }}
                disabled={!canEmailPdf || emailLoading}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email PDF
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft"
                onClick={() => handlePdfAction("generate")}
                disabled={!canGeneratePdf || pdfLoading}
              >
                <FileText className="w-4 h-4 mr-2" />
                {pdfLoading ? "Generating…" : "Generate PDF Report"}
              </Button>
            </div>
            {(emailMessage || emailError) && (
              <p
                className={cn(
                  "mt-2 text-sm",
                  emailError ? "text-red-600" : "text-emerald-600"
                )}
              >
                {emailError ?? emailMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Email PDF dialog */}
      <Dialog
        open={isEmailDialogOpen}
        onOpenChange={(open) => {
          setIsEmailDialogOpen(open);
          if (!open) {
            setCustomEmailError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email job report</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <RadioGroup
              value={emailMode}
              onValueChange={(v) => setEmailMode(v as "self" | "custom")}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="email-self" value="self" />
                <Label htmlFor="email-self" className="text-sm font-normal">
                  Send to my account email
                </Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="email-custom" value="custom" />
                  <Label
                    htmlFor="email-custom"
                    className="text-sm font-normal"
                  >
                    Send to another email
                  </Label>
                </div>
                {emailMode === "custom" && (
                  <div className="pl-6 space-y-1">
                    <Input
                      type="email"
                      placeholder="owner@example.com"
                      value={customEmail}
                      onChange={(e) => {
                        setCustomEmail(e.target.value);
                        setCustomEmailError(null);
                      }}
                    />
                    {customEmailError && (
                      <p className="text-xs text-red-600">
                        {customEmailError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
              disabled={emailLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleEmailPdf} disabled={emailLoading}>
              {emailLoading ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force-complete dialog */}
      <Dialog
        open={isForceDialogOpen}
        onOpenChange={(open) => {
          setIsForceDialogOpen(open);
          if (!open) {
            setForceError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force complete job</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This action will mark the job as completed and set SLA status to
              violated. Choose a reason and add a short comment explaining the
              override.
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Reason
              </Label>
              <RadioGroup
                value={forceReason}
                onValueChange={(v) => setForceReason(v)}
                className="space-y-2"
              >
                {FORCE_REASON_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem
                      id={`force-${opt.value}`}
                      value={opt.value}
                    />
                    <Label
                      htmlFor={`force-${opt.value}`}
                      className="text-sm font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Comment
              </Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Explain why you are force-completing this job…"
                value={forceComment}
                onChange={(e) => {
                  setForceComment(e.target.value);
                  setForceError(null);
                }}
              />
              {forceError && (
                <p className="text-xs text-red-600">{forceError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsForceDialogOpen(false)}
              disabled={forceLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceComplete}
              disabled={forceLoading}
            >
              {forceLoading ? "Applying…" : "Force complete job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Timeline */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-semibold text-foreground">Job Timeline</h2>
              <Button
                type="button"
                variant={showOnlyViolations ? "secondary" : "ghost"}
                size="sm"
                className="text-xs"
                onClick={() => setShowOnlyViolations((prev) => !prev)}
              >
                {showOnlyViolations ? "Show all events" : "Show only violations"}
              </Button>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-8 bottom-8 w-px bg-border" />

              <div className="space-y-6">
                {visibleTimelineSteps.length === 0 && (
                  <p className="text-xs text-muted-foreground pl-12">
                    No violation-related events in this job.
                  </p>
                )}

                {visibleTimelineSteps.map((step) => (
                  <div key={step.id} className="relative flex items-start gap-4">
                    <div
                      className={cn(
                        "relative z-10 w-8 h-8 rounded-full flex items-center justify-center",
                        step.completed
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <step.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p
                        className={cn(
                          "font-medium",
                          step.completed
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {step.time}
                        </p>
                      )}
                    </div>
                    {step.completed && (
                      <CheckCircle2 className="w-5 h-5 text-status-completed mt-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Photo Documentation */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="font-semibold text-foreground mb-6">
              Photo Documentation
            </h2>

            <div className="grid grid-cols-2 gap-6">
              {/* Before */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Before
                </p>

                <div className="aspect-video bg-muted rounded-lg border border-border flex items-center justify-center overflow-hidden">
                  {beforeUrl ? (
                    <img
                      src={beforeUrl}
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>

                {!beforeUrl && (
                  <p className="text-xs text-muted-foreground mt-2">
                    No photo
                  </p>
                )}
              </div>

              {/* After */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  After
                </p>

                <div className="aspect-video bg-muted rounded-lg border border-border flex items-center justify-center overflow-hidden">
                  {afterUrl ? (
                    <img
                      src={afterUrl}
                      alt="After"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>

                {!afterUrl && (
                  <p className="text-xs text-muted-foreground mt-2">
                    No photo
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Checklist */}
          {Array.isArray(checklist) && checklist.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-card p-6">
              <h2 className="font-semibold text-foreground mb-6">
                Cleaning Checklist
              </h2>
              <div className="space-y-3">
                {checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {item.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-status-completed flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        item.completed
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job Details */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="font-semibold text-foreground mb-4">Job Details</h2>
            <dl className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Job ID
                </dt>
                <dd className="text-sm font-mono text-foreground">
                  {formatJobCode(job.id)}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cleaner
                </dt>
                <dd className="flex items-center gap-2 text-sm text-foreground">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{cleanerName}</span>
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </dt>
                <dd className="text-sm text-foreground">{scheduledDate}</dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Scheduled Time
                </dt>
                <dd className="text-sm text-foreground">
                  {scheduledTime
                    ? scheduledEndTime
                      ? `${scheduledTime}–${scheduledEndTime}`
                      : scheduledTime
                    : "—"}
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actual Time
                </dt>
                <dd className="text-sm text-foreground">
                  {actualStart || actualEnd
                    ? [actualStart, actualEnd].filter(Boolean).join(" → ")
                    : "—"}
                </dd>
              </div>

              {(hourlyRate || flatRate) && (
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pricing (display only)
                  </dt>
                  <dd className="text-sm text-foreground space-y-0.5">
                    {hourlyRate && (
                      <div>
                        Hourly rate:{" "}
                        <span className="font-medium">
                          AED {Number(hourlyRate).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {flatRate && (
                      <div>
                        Flat rate:{" "}
                        <span className="font-medium">
                          AED {Number(flatRate).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* SLA & Proof */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="font-semibold text-foreground mb-4">
              SLA &amp; Proof
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                    hasSlaIssue
                      ? "bg-red-50 text-red-700 border-red-100"
                      : "bg-emerald-50 text-emerald-700 border-emerald-100"
                  )}
                >
                  {hasSlaIssue ? "SLA violated" : "SLA OK"}
                </span>
              </div>

              {hasSlaIssue && slaReasons.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Issues
                  </p>
                  <ul className="space-y-1">
                    {slaReasons.map((reason) => (
                      <li
                        key={reason}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        <span>
                          {SLA_REASON_LABELS[reason] ??
                            reason.replace(/_/g, " ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!hasSlaIssue && (
                <p className="text-xs text-muted-foreground">
                  All required proof (check-in/out, photos, checklist) looks
                  good for this job.
                </p>
              )}

              {isForceCompleted && (
                <div className="pt-2 border-t border-border mt-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Force-completed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Job was force-completed
                    {forceCompletedBy ? ` by ${forceCompletedBy}` : ""}{" "}
                    {forceCompletedAt ? `on ${forceCompletedAt}` : ""}.
                  </p>
                </div>
              )}

              {canForceComplete && (
                <div className="pt-3 border-t border-border mt-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    If the cleaner cannot provide full proof but the job is
                    effectively done, you can force-complete it with an SLA
                    violation.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={() => {
                      setForceError(null);
                      setIsForceDialogOpen(true);
                    }}
                  >
                    Force complete job
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Email History */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="font-semibold text-foreground mb-4">
              PDF Email History
            </h2>

            {emailHistoryLoading ? (
              <p className="text-xs text-muted-foreground">Loading history…</p>
            ) : emailHistoryError ? (
              <p className="text-xs text-red-600">
                Failed to load email history: {emailHistoryError}
              </p>
            ) : emailHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Job report for this job has not been emailed yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {emailHistory.map((entry) => (
                  <li key={entry.id} className="text-xs space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {new Date(entry.sent_at).toLocaleString()}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 border text-[10px] font-medium",
                          entry.status === "sent"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-red-50 text-red-700 border-red-100"
                        )}
                      >
                        {entry.status === "sent" ? "SENT" : "FAILED"}
                      </span>
                    </div>

                    {entry.target_email && (
                      <p className="text-[11px] text-muted-foreground">
                        To:{" "}
                        <span className="text-foreground">
                          {entry.target_email}
                        </span>
                      </p>
                    )}

                    {entry.sent_by && (
                      <p className="text-[11px] text-muted-foreground">
                        Sent by:{" "}
                        <span className="text-foreground">{entry.sent_by}</span>
                      </p>
                    )}

                    {entry.error_message && (
                      <p className="text-[11px] text-red-600">
                        Error: {entry.error_message}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* GPS / Location Verification */}
          {(checkInGPS || checkOutGPS) && (
            <div className="bg-card rounded-xl border border-border shadow-card p-6">
              <h2 className="font-semibold text-foreground mb-4">
                Location Verification
              </h2>
              <dl className="space-y-4">
                {checkInGPS && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Check-in GPS
                    </dt>
                    <dd className="mt-1 text-sm text-foreground font-mono text-xs">
                      {checkInGPS}
                    </dd>
                    {checkInTime && (
                      <dd className="text-xs text-muted-foreground mt-0.5">
                        {checkInTime}
                      </dd>
                    )}
                    {checkInMapsUrl && (
                      <dd className="mt-1">
                        <a
                          href={checkInMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline hover:opacity-80"
                        >
                          <MapPin className="w-3 h-3" />
                          Open in Maps
                        </a>
                      </dd>
                    )}
                  </div>
                )}
                {checkOutGPS && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Check-out GPS
                    </dt>
                    <dd className="mt-1 text-sm text-foreground font-mono text-xs">
                      {checkOutGPS}
                    </dd>
                    {checkOutTime && (
                      <dd className="text-xs text-muted-foreground mt-0.5">
                        {checkOutTime}
                      </dd>
                    )}
                    {checkOutMapsUrl && (
                      <dd className="mt-1">
                        <a
                          href={checkOutMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline hover:opacity-80"
                        >
                          <MapPin className="w-3 h-3" />
                          Open in Maps
                        </a>
                      </dd>
                    )}
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Notes (доп. блок, если есть) */}
          {job.notes && (
            <div className="bg-card rounded-xl border border-border shadow-card p-6">
              <h2 className="font-semibold text-foreground mb-4">Notes</h2>
              <p className="text-sm text-muted-foreground">{job.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
