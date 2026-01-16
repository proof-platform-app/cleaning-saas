import { cn } from "@/lib/utils";

export type JobStatus = "scheduled" | "in-progress" | "completed" | "issue";

interface StatusPillProps {
  status: JobStatus;
  className?: string;
}

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  scheduled: {
    label: "Scheduled",
    className: "bg-status-scheduled-bg text-status-scheduled",
  },
  "in-progress": {
    label: "In Progress",
    className: "bg-status-inprogress-bg text-status-inprogress",
  },
  completed: {
    label: "Completed",
    className: "bg-status-completed-bg text-status-completed",
  },
  issue: {
    label: "Issue",
    className: "bg-status-issue-bg text-status-issue",
  },
};

export function StatusPill({ status, className }: StatusPillProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium tracking-wide",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
