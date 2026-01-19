import React from "react";
import type { PlanningJob } from "@/types/planning";

export function CreateJobDrawer({
  open,
  onClose,
  defaultDate,
  onJobCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  onJobCreated: (job: PlanningJob) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-background border-l border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="font-semibold">Create job</div>
          <button className="text-sm text-muted-foreground hover:text-foreground" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="p-5 text-sm text-muted-foreground">
          Пока заглушка. Завтра подключим реальную форму Create Job к API.
          <div className="mt-2">Default date: <span className="text-foreground">{defaultDate}</span></div>
        </div>
      </div>
    </div>
  );
}
