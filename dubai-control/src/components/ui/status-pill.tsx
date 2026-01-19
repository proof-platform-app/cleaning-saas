// dubai-control/src/components/ui/status-pill.tsx

import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusPillStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "canceled"
  | "pending"
  | "issue"
  | string;

type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  scheduled: {
    label: "Scheduled",
    className:
      "bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-100 dark:border-slate-700",
  },
  in_progress: {
    label: "In Progress",
    className:
      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-700",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-100 dark:border-emerald-700",
  },
  issue: {
    label: "Issue",
    className:
      "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-100 dark:border-red-700",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-100 dark:border-rose-700",
  },
  canceled: {
    label: "Cancelled",
    className:
      "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-100 dark:border-rose-700",
  },
  pending: {
    label: "Pending",
    className:
      "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-700",
  },
};

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusPillStatus;
}

export function StatusPill({ status, className, ...props }: StatusPillProps) {
  const key = (status || "").toString().toLowerCase();

  const fallback: StatusConfig = {
    label: status ? String(status) : "Unknown",
    className:
      "bg-muted text-muted-foreground border border-border dark:bg-slate-900/40 dark:border-slate-800",
  };

  const config = STATUS_CONFIG[key] ?? fallback;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        config.className,
        className
      )}
      {...props}
    >
      {config.label}
    </span>
  );
}
