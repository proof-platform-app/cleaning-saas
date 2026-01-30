// dubai-control/src/components/planning/JobSidePanel.tsx
import React, { useRef, useState } from "react";
import type { PlanningJob } from "@/types/planning";
import {
  Camera,
  MapPin,
  Clock3,
  User,
  CheckSquare,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SLA_REASON_LABELS: Record<string, string> = {
  missing_before_photo: "Missing before photo",
  missing_after_photo: "Missing after photo",
  checklist_not_completed: "Checklist not completed",
};

type SlaReasonCode = keyof typeof SLA_REASON_LABELS;

export type EvidenceContext = {
  /**
   * Откуда пользователь попал в этот job:
   * - "history"     — обычный просмотр из History / Planning
   * - "report"      — из SLA-отчёта (weekly / monthly)
   * - "performance" — из performance-слоя
   */
  source: "history" | "report" | "performance";
  /** Машинный код причины SLA (например, "missing_after_photo") */
  reasonCode: string;
  /** Человеко-понятная причина (если заранее известна) */
  reasonLabel?: string;
  /** Период для отображения (например, "Jan 24–30, 2026") */
  periodLabel?: string;
};

type JobSidePanelProps = {
  job: PlanningJob;
  onClose: () => void;
  evidenceContext?: EvidenceContext;
};

export function JobSidePanel({ job, onClose, evidenceContext }: JobSidePanelProps) {
  const proof = job.proof;
  const before = proof.before_photo;
  const after = proof.after_photo;
  const checklist = proof.checklist;

  const timeFrom = (job.scheduled_start_time ?? "").slice(0, 5);
  const timeTo = (job.scheduled_end_time ?? "").slice(0, 5);

  const statusLabel =
    job.status === "in_progress"
      ? "In Progress"
      : job.status.charAt(0).toUpperCase() +
        job.status.slice(1).replace("_", " ");

  const statusClass =
    job.status === "completed"
      ? "bg-emerald-100 text-emerald-700"
      : job.status === "in_progress"
      ? "bg-blue-100 text-blue-700"
      : "bg-slate-100 text-slate-700";

  const slaStatus = job.sla_status ?? "ok";
  const slaReasons = job.sla_reasons ?? [];
  const hasSlaViolation = slaStatus === "violated";

  const beforeRowRef = useRef<HTMLDivElement | null>(null);
  const afterRowRef = useRef<HTMLDivElement | null>(null);
  const checklistRowRef = useRef<HTMLDivElement | null>(null);

  // Активная причина SLA (подсветка нужного блока proof)
  const [activeSlaReason, setActiveSlaReason] = useState<string | null>(
    evidenceContext?.reasonCode ?? null,
  );

  const scrollToRef = (ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return;
    ref.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleSlaReasonClick = (code: string) => {
    const typed = code as SlaReasonCode;
    setActiveSlaReason(code);

    switch (typed) {
      case "missing_before_photo":
        scrollToRef(beforeRowRef);
        break;
      case "missing_after_photo":
        scrollToRef(afterRowRef);
        break;
      case "checklist_not_completed":
        scrollToRef(checklistRowRef);
        break;
      default:
        break;
    }
  };

  const hasEvidenceContext = !!evidenceContext;

  const resolvedEvidenceReasonLabel =
    evidenceContext &&
    (evidenceContext.reasonLabel ||
      SLA_REASON_LABELS[evidenceContext.reasonCode as SlaReasonCode] ||
      evidenceContext.reasonCode.replace(/_/g, " "));

  return (
    <div className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-background border-l border-border z-50">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="font-semibold">Job Details</div>
        <button
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="p-5 flex flex-col gap-5 h-[calc(100%-72px)]">
        {/* Scrollable content */}
        <div className="space-y-5 overflow-y-auto pr-1">
          {/* Evidence context (optional) */}
          {hasEvidenceContext && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold text-slate-800">
                SLA exception review
              </div>
              <div className="mt-1 text-xs text-slate-700 space-y-0.5">
                <p>
                  This job is part of an SLA review
                  {evidenceContext?.source === "report"
                    ? " for a weekly or monthly report."
                    : "."}
                </p>
                {resolvedEvidenceReasonLabel && (
                  <p>
                    Reason:{" "}
                    <span className="font-medium">
                      {resolvedEvidenceReasonLabel}
                    </span>
                  </p>
                )}
                {evidenceContext?.periodLabel && (
                  <p>
                    Period:{" "}
                    <span className="font-medium">
                      {evidenceContext.periodLabel}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Status pill */}
          <div>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                statusClass,
              )}
            >
              {statusLabel}
            </span>
          </div>

          {/* SLA block (only when violated) */}
          {hasSlaViolation && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>SLA: Violated</span>
              </div>
              {slaReasons.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {slaReasons.map((code) => (
                    <li key={code}>
                      <button
                        type="button"
                        onClick={() => handleSlaReasonClick(code)}
                        className={cn(
                          "inline-flex items-center gap-2 text-left text-xs hover:underline",
                          activeSlaReason === code
                            ? "text-amber-950"
                            : "text-amber-900 hover:text-amber-950",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            activeSlaReason === code
                              ? "bg-amber-900"
                              : "bg-amber-700",
                          )}
                        />
                        <span>
                          {SLA_REASON_LABELS[code as SlaReasonCode] ??
                            code.replace(/_/g, " ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Location */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>Location</span>
            </div>
            <div className="font-medium">{job.location.name ?? "—"}</div>
            <div className="text-sm text-muted-foreground">
              {job.location.address ?? ""}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-muted-foreground">
              <Clock3 className="w-3 h-3" />
              <span>Schedule</span>
            </div>
            <div className="font-medium">
              {timeFrom && timeTo ? `${timeFrom} – ${timeTo}` : "—"}
            </div>
            <div className="text-sm text-muted-foreground">
              {job.scheduled_date} (GST UTC+4)
            </div>
          </div>

          {/* Cleaner */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-muted-foreground">
              <User className="w-3 h-3" />
              <span>Cleaner</span>
            </div>
            <div className="font-medium">{job.cleaner.full_name ?? "—"}</div>
            {job.cleaner.phone ? (
              <div className="text-sm text-muted-foreground">
                {job.cleaner.phone}
              </div>
            ) : null}
          </div>

          {/* Proof of work */}
          <div className="mt-4">
            <div className="text-xs font-medium tracking-wide uppercase text-muted-foreground mb-3">
              Proof of work
            </div>

            <div className="rounded-2xl border border-border bg-muted/40 divide-y divide-border/60">
              {/* Before Photo */}
              <div
                ref={beforeRowRef}
                className={cn(
                  "flex items-center justify-between px-4 py-3",
                  activeSlaReason === "missing_before_photo" &&
                    "bg-amber-50 border-l-2 border-amber-400",
                )}
              >
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <span>Before Photo</span>
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    before ? "text-emerald-500" : "text-muted-foreground",
                  )}
                >
                  {before ? "Captured" : "Pending"}
                </span>
              </div>

              {/* After Photo */}
              <div
                ref={afterRowRef}
                className={cn(
                  "flex items-center justify-between px-4 py-3",
                  activeSlaReason === "missing_after_photo" &&
                    "bg-amber-50 border-l-2 border-amber-400",
                )}
              >
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <span>After Photo</span>
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    after ? "text-emerald-500" : "text-muted-foreground",
                  )}
                >
                  {after ? "Captured" : "Pending"}
                </span>
              </div>

              {/* Checklist */}
              <div
                ref={checklistRowRef}
                className={cn(
                  "flex items-center justify-between px-4 py-3",
                  activeSlaReason === "checklist_not_completed" &&
                    "bg-amber-50 border-l-2 border-amber-400",
                )}
              >
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CheckSquare className="w-4 h-4 text-muted-foreground" />
                  <span>Checklist</span>
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    checklist ? "text-emerald-500" : "text-muted-foreground",
                  )}
                >
                  {checklist ? "Complete" : "Pending"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="pt-2 border-t border-border">
          <div className="pt-2 flex gap-2">
            <Link to={`/jobs/${job.id}`} className="flex-1">
              <Button className="w-full" variant="default">
                Open Job Details
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>

            <Link to={`/jobs/${job.id}`} className="flex-1">
              <Button className="w-full" variant="outline">
                Generate PDF
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
