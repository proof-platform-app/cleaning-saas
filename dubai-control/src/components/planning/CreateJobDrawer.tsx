// dubai-control/src/components/planning/CreateJobDrawer.tsx
import React, { useEffect, useState, FormEvent } from "react";
import type { PlanningJob } from "@/types/planning";
import {
  fetchPlanningMeta,
  createPlanningJob,
  type PlanningMeta,
} from "@/api/planning";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultDate: string; // "YYYY-MM-DD"
  onJobCreated: (job: PlanningJob) => void;
};

export function CreateJobDrawer({
  open,
  onClose,
  defaultDate,
  onJobCreated,
}: Props) {
  const [meta, setMeta] = useState<PlanningMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [locationId, setLocationId] = useState<number | null>(null);
  const [cleanerId, setCleanerId] = useState<number | null>(null);
  const [checklistTemplateId, setChecklistTemplateId] = useState<number | null>(
    null,
  );

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canInteract = !metaLoading && !submitting;

  function normalizeTimeToSeconds(value: string): string {
    // "09:00" -> "09:00:00"
    if (value && value.length === 5 && value.includes(":")) {
      return value + ":00";
    }
    return value;
  }

  function parseTimeToMinutes(value: string): number | null {
    if (!value || !value.includes(":")) return null;
    const [h, m] = value.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  const loadMeta = () => {
    if (metaLoading) return;

    setMetaLoading(true);
    setMetaError(null);

    fetchPlanningMeta()
      .then((data) => {
        setMeta(data);

        // авто-проставим первые значения, чтобы не кликать лишний раз
        if (data.locations.length > 0) {
          setLocationId(data.locations[0].id);
        } else {
          setLocationId(null);
        }

        if (data.cleaners.length > 0) {
          setCleanerId(data.cleaners[0].id);
        } else {
          setCleanerId(null);
        }

        if (data.checklist_templates.length > 0) {
          setChecklistTemplateId(data.checklist_templates[0].id);
        } else {
          setChecklistTemplateId(null);
        }
      })
      .catch((err: any) => {
        console.error("Failed to load planning meta", err);
        setMetaError("Failed to load options. Please try again later.");
      })
      .finally(() => setMetaLoading(false));
  };

  // Когда открываем дровер — подгружаем мету и сбрасываем часть формы
  useEffect(() => {
    if (!open) return;

    setDate(defaultDate);
    setSubmitError(null);

    // При каждом открытии слегка сбросим времена и ошибки,
    // но мету не перезагружаем, если она уже есть и без ошибок.
    setStartTime("09:00");
    setEndTime("12:00");

    if (!meta && !metaLoading && !metaError) {
      loadMeta();
    }
  }, [open, defaultDate, meta, metaLoading, metaError]);

  if (!open) return null;

  const handleClose = () => {
    if (submitting) return; // не даём закрыть во время сабмита
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!meta || metaLoading) return;

    // Базовая валидация
    if (!date) {
      setSubmitError("Date is required.");
      return;
    }
    if (!locationId) {
      setSubmitError("Location is required.");
      return;
    }
    if (!cleanerId) {
      setSubmitError("Cleaner is required.");
      return;
    }
    if (!startTime || !endTime) {
      setSubmitError("Start time and end time are required.");
      return;
    }

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    if (startMinutes == null || endMinutes == null) {
      setSubmitError("Invalid time format.");
      return;
    }

    if (endMinutes <= startMinutes) {
      setSubmitError("End time must be later than start time.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const job = await createPlanningJob({
        scheduled_date: date,
        scheduled_start_time: normalizeTimeToSeconds(startTime),
        scheduled_end_time: normalizeTimeToSeconds(endTime),
        location_id: locationId,
        cleaner_id: cleanerId,
        checklist_template_id: checklistTemplateId,
      });

      onJobCreated(job);
      onClose();
    } catch (err: any) {
      console.error("Failed to create job", err);
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to create job. Please try again.";
      setSubmitError(String(detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/20" onClick={handleClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-background border-l border-border flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="font-semibold">Create job</div>
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={handleClose}
            disabled={submitting}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {metaLoading && !meta && (
            <p className="text-sm text-muted-foreground">Loading options…</p>
          )}

          {metaError && (
            <div className="mb-4 flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
              <p className="text-sm text-destructive">
                {metaError}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={loadMeta}
                disabled={metaLoading}
              >
                Retry
              </Button>
            </div>
          )}

          {meta && (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Date */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!canInteract}
                />
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-foreground">
                    Start time
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={!canInteract}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-foreground">
                    End time
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={!canInteract}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Location
                </label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={locationId ?? ""}
                  onChange={(e) =>
                    setLocationId(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  disabled={!canInteract}
                >
                  {meta.locations.length === 0 && (
                    <option value="">No locations available</option>
                  )}
                  {meta.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cleaner */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Cleaner
                </label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={cleanerId ?? ""}
                  onChange={(e) =>
                    setCleanerId(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  disabled={!canInteract}
                >
                  {meta.cleaners.length === 0 && (
                    <option value="">No cleaners available</option>
                  )}
                  {meta.cleaners.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Checklist template */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  Checklist template
                </label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={checklistTemplateId ?? ""}
                  onChange={(e) =>
                    setChecklistTemplateId(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  disabled={!canInteract}
                >
                  {meta.checklist_templates.length === 0 && (
                    <option value="">No templates (optional)</option>
                  )}
                  {meta.checklist_templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                  {meta.checklist_templates.length > 0 && (
                    <option value="">No checklist</option>
                  )}
                </select>
                <p className="text-xs text-muted-foreground">
                  If selected, checklist items will be created from the template.
                </p>
              </div>

              {submitError && (
                <p className="text-sm text-red-500">{submitError}</p>
              )}

              <div className="pt-2 flex gap-2">
                <Button
                  type="submit"
                  disabled={submitting || metaLoading || !meta}
                  className="flex-1"
                >
                  {submitting ? "Creating…" : "Create job"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {!meta && !metaLoading && !metaError && (
            <p className="text-sm text-muted-foreground">
              No meta loaded. Try re-opening drawer or press Retry.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
