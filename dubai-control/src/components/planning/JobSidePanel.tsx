import React from "react";
import type { PlanningJob } from "@/types/planning";

export function JobSidePanel({ job, onClose }: { job: PlanningJob; onClose: () => void }) {
  return (
    <div className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-background border-l border-border z-50">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="font-semibold">Job #{job.id}</div>
        <button className="text-sm text-muted-foreground hover:text-foreground" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="p-5 space-y-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Location</div>
          <div className="font-medium">{job.location.name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{job.location.address ?? ""}</div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Cleaner</div>
          <div className="font-medium">{job.cleaner.full_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{job.cleaner.phone ?? ""}</div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Scheduled</div>
          <div className="font-medium">
            {job.scheduled_date} {(job.scheduled_start_time ?? "").slice(0, 5)}–{(job.scheduled_end_time ?? "").slice(0, 5)}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Завтра сюда добавим быстрые действия: открыть Job Details / Generate PDF.
        </div>
      </div>
    </div>
  );
}
