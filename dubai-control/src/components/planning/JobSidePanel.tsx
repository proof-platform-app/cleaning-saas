// dubai-control/src/components/planning/JobSidePanel.tsx
import React from "react";
import type { PlanningJob } from "@/types/planning";
import { Camera, MapPin, Clock3, User, CheckSquare, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function JobSidePanel({
  job,
  onClose,
}: {
  job: PlanningJob;
  onClose: () => void;
}) {
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
          {/* Status pill */}
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}
            >
              {statusLabel}
            </span>
          </div>

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
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <span>Before Photo</span>
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    before ? "text-emerald-500" : "text-muted-foreground"
                  )}
                >
                  {before ? "Captured" : "Pending"}
                </span>
              </div>

              {/* After Photo */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <span>After Photo</span>
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    after ? "text-emerald-500" : "text-muted-foreground"
                  )}
                >
                  {after ? "Captured" : "Pending"}
                </span>
              </div>

              {/* Checklist */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CheckSquare className="w-4 h-4 text-muted-foreground" />
                  <span>Checklist</span>
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    checklist ? "text-emerald-500" : "text-muted-foreground"
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
