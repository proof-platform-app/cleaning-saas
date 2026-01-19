// dubai-control/src/components/planning/PlanningFilters.tsx

import React, { useEffect, useState, useMemo } from "react";
import type { PlanningFilters, PlanningJobStatus } from "@/types/planning";
import { fetchPlanningMeta, type PlanningMeta } from "@/api/planning";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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
  const [meta, setMeta] = useState<PlanningMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  // === DATE ===
  const selectedDate = useMemo(() => {
    try {
      return filters.date ? parseISO(filters.date) : new Date();
    } catch {
      return new Date();
    }
  }, [filters.date]);

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    const iso = format(date, "yyyy-MM-dd");
    onFiltersChange({ ...filters, date: iso });
  };

  // === STATUS (круглые мульти-чекбоксы) ===
  const toggleStatus = (s: PlanningJobStatus) => {
    const exists = filters.statuses.includes(s);
    const statuses = exists
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s];

    onFiltersChange({ ...filters, statuses });
  };

  // === CLEANER ===
  const handleCleanerChange = (value: string) => {
    if (!value) {
      onFiltersChange({ ...filters, cleanerIds: [] });
      return;
    }
    const id = Number(value);
    onFiltersChange({ ...filters, cleanerIds: [id] });
  };

  const selectedCleanerId = filters.cleanerIds[0] ?? "";

  // === LOCATION ===
  const handleLocationChange = (value: string) => {
    const locationId = value ? Number(value) : null;
    onFiltersChange({ ...filters, locationId });
  };

  // === META LOAD ===
  const loadMeta = () => {
    if (metaLoading) return;
    setMetaLoading(true);
    setMetaError(null);

    fetchPlanningMeta()
      .then((data) => {
        setMeta(data);
      })
      .catch((err: any) => {
        console.error("[PlanningFiltersPanel] failed to load meta", err);
        setMetaError(
          err?.response?.data?.detail ||
            err?.message ||
            "Failed to load filters data.",
        );
      })
      .finally(() => setMetaLoading(false));
  };

  useEffect(() => {
    loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    onFiltersChange({
      ...filters,
      cleanerIds: [],
      locationId: null,
      statuses: [],
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Filters</div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleReset}
          disabled={
            filters.cleanerIds.length === 0 &&
            filters.locationId == null &&
            filters.statuses.length === 0
          }
        >
          Reset
        </Button>
      </div>

      {/* DATE: как в Lovable — своё поле + поповер */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Date</div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>
                  {selectedDate ? format(selectedDate, "MMMM do, yyyy") : "Pick a date"}
                </span>
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* STATUS: круглые мульти-чекбоксы */}
      <div>
        <div className="text-xs text-muted-foreground mb-2">Status</div>
        <div className="space-y-2">
          {STATUSES.map((s) => (
            <label
              key={s.value}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 appearance-none rounded-full border border-slate-300 bg-white 
                           outline-none ring-offset-background 
                           checked:bg-blue-500 checked:border-blue-500
                           focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                           transition-colors"
                checked={filters.statuses.includes(s.value)}
                onChange={() => toggleStatus(s.value)}
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      {/* META LOAD STATE */}
      {metaLoading && !meta && (
        <p className="text-xs text-muted-foreground">
          Loading cleaners and locations…
        </p>
      )}

      {metaError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-xs text-destructive">{metaError}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={loadMeta}
            disabled={metaLoading}
          >
            Retry
          </Button>
        </div>
      )}

      {meta && (
        <>
          {/* CLEANER – dropdown All / конкретный */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">Cleaner</div>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={selectedCleanerId}
              onChange={(e) => handleCleanerChange(e.target.value)}
            >
              <option value="">All cleaners</option>
              {meta.cleaners.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* LOCATION */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">Location</div>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={filters.locationId ?? ""}
              onChange={(e) => handleLocationChange(e.target.value)}
            >
              <option value="">All locations</option>
              {meta.locations.map((loc) => (
                <option key={loc.id} value={loc.id ?? ""}>
                  {loc.name || `Location #${loc.id}`}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}
