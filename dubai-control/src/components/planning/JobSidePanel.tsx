// dubai-control/src/components/planning/JobSidePanel.tsx
import React from "react";
import type { PlanningJob } from "@/types/planning";
import { Camera, ListChecks, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

function ProofRow({
  label,
  ok,
  icon,
  okText,
  noText,
}: {
  label: string;
  ok: boolean;
  icon: React.ReactNode;
  okText: string;
  noText: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{icon}</span>
        <span>{label}</span>
      </div>
      <div
        className={
          ok ? "text-emerald-600 text-sm font-medium" : "text-muted-foreground text-sm"
        }
      >
        {ok ? okText : noText}
      </div>
    </div>
  );
}

export function JobSidePanel({
  job,
  onClose,
}: {
  job: PlanningJob;
  onClose: () => void;
}) {
  const proof = job.proof ?? {};
  const before = Boolean(proof.before_photo);
  const after = Boolean(proof.after_photo);
  const checklist = Boolean(proof.checklist);

  const timeFrom = (job.scheduled_start_time ?? "").slice(0, 5);
  const timeTo = (job.scheduled_end_time ?? "").slice(0, 5);

  const statusLabel =
    job.status === "in_progress"
      ? "In Progress"
      : job.status.charAt(0).toUpperCase() + job.status.slice(1).replace("_", " ");

  const statusClass =
    job.status === "completed"
      ? "bg-emerald-100 text-emerald-700"
      : job.status === "in_progress"
      ? "bg-blue-100 text-blue-700"
      : job.status === "issue"
      ? "bg-red-100 text-red-700"
      : "bg-slate-100 text-slate-700";

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
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Location
            </div>
            <div className="font-medium">{job.location.name ?? "—"}</div>
            <div className="text-sm text-muted-foreground">
              {job.location.address ?? ""}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Schedule
            </div>
            <div className="font-medium">
              {timeFrom} – {timeTo}
            </div>
            <div className="text-sm text-muted-foreground">
              {job.scheduled_date} (GST UTC+4)
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Cleaner
            </div>
            <div className="font-medium">{job.cleaner.full_name ?? "—"}</div>
            {job.cleaner.phone ? (
              <div className="text-sm text-muted-foreground">
                {job.cleaner.phone}
              </div>
            ) : null}
          </div>

          <div className="pt-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Proof of work
            </div>

            <div className="divide-y divide-border rounded-lg border border-border px-3">
              <ProofRow
                label="Before Photo"
                ok={before}
                icon={<Camera className="h-4 w-4" />}
                okText="Captured"
                noText="Missing"
              />
              <ProofRow
                label="After Photo"
                ok={after}
                icon={<Camera className="h-4 w-4" />}
                okText="Captured"
                noText="Missing"
              />
              <ProofRow
                label="Checklist"
                ok={checklist}
                icon={<ListChecks className="h-4 w-4" />}
                okText="Complete"
                noText="Incomplete"
              />
            </div>
          </div>
        </div>

        {/* Bottom action */}
        <div className="pt-2 border-t border-border">
          <Link to={`/jobs/${job.id}`} className="block">
            <Button className="w-full">
              Open Job Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
