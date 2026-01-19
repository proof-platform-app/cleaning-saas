import React from "react";
import type { PlanningFilters, PlanningJobStatus } from "@/types/planning";

type Props = {
  filters: PlanningFilters;
  onFiltersChange: (next: PlanningFilters) => void;
};

const STATUSES: { label: string; value: PlanningJobStatus }[] = [
  { label: "Scheduled", value: "scheduled" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

export function PlanningFiltersPanel({ filters, onFiltersChange }: Props) {
  const toggleStatus = (s: PlanningJobStatus) => {
    const exists = filters.statuses.includes(s);
    const statuses = exists ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s];
    onFiltersChange({ ...filters, statuses });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-sm font-medium mb-3">Filters</div>

      <div className="mb-4">
        <label className="text-xs text-muted-foreground">Date</label>
        <input
          type="date"
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={filters.date}
          onChange={(e) => onFiltersChange({ ...filters, date: e.target.value })}
        />
      </div>

      <div className="mb-2">
        <div className="text-xs text-muted-foreground mb-2">Status</div>
        <div className="space-y-2">
          {STATUSES.map((s) => (
            <label key={s.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filters.statuses.includes(s.value)}
                onChange={() => toggleStatus(s.value)}
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        Cleaner/Location filters подключим, когда заведём справочники.
      </div>
    </div>
  );
}
