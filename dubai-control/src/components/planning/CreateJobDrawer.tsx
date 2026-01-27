// dubai-control/src/components/planning/CreateJobDrawer.tsx
import React, { useEffect, useState, FormEvent, useMemo } from "react";
import type { PlanningJob } from "@/types/planning";
import {
  fetchPlanningMeta,
  createPlanningJob,
  type PlanningMeta,
} from "@/api/planning";
import { Button } from "@/components/ui/button";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useLocations } from "@/contexts/LocationsContext";

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
  // Единственный источник истины по locations
  const {
    locations,
    isLoading: locationsLoading,
    error: locationsError,
    reload: reloadLocations,
  } = useLocations();

  // ===== meta ===== (cleaners + checklist templates; locations тут больше не используем)
  const [meta, setMeta] = useState<PlanningMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  // ===== form state =====
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [locationId, setLocationId] = useState<number | null>(null);
  const [cleanerId, setCleanerId] = useState<number | null>(null);
  const [checklistTemplateId, setChecklistTemplateId] =
    useState<number | null>(null);

  // manager notes (optional)
  const [managerNotes, setManagerNotes] = useState("");

  // ===== ui state =====
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);

  const canInteract =
    !metaLoading &&
    !submitting &&
    !trialExpired &&
    !locationsLoading &&
    locations.length > 0;

  // ===== utils =====
  function normalizeTimeToSeconds(value: string): string {
    return value && value.length === 5 ? value + ":00" : value;
  }

  function parseTimeToMinutes(value: string): number | null {
    if (!value.includes(":")) return null;
    const [h, m] = value.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  // ===== meta load =====
  const loadMeta = () => {
    if (metaLoading) return;

    setMetaLoading(true);
    setMetaError(null);

    fetchPlanningMeta()
      .then((data) => {
        setMeta(data);
        setCleanerId(data.cleaners[0]?.id ?? null);
        setChecklistTemplateId(data.checklist_templates[0]?.id ?? null);
      })
      .catch((err) => {
        console.error("Failed to load planning meta", err);
        setMetaError("Failed to load options. Please try again later.");
      })
      .finally(() => setMetaLoading(false));
  };

  // ===== open / reset =====
  useEffect(() => {
    if (!open) return;

    setDate(defaultDate);
    setStartTime("09:00");
    setEndTime("12:00");
    setManagerNotes("");
    setSubmitError(null);
    setTrialExpired(false);

    // обновим locations (на случай если их добавили на другой вкладке давно)
    void reloadLocations();

    if (!meta && !metaLoading && !metaError) {
      loadMeta();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate, meta, metaLoading, metaError]);

  // когда locations догрузились — выставим дефолтную locationId, если ещё не выбрана
  useEffect(() => {
    if (!open) return;
    if (locationId != null) return;
    if (locations.length === 0) return;
    setLocationId(locations[0].id);
  }, [open, locationId, locations]);

  // ===== date helpers (hook должен быть до любых return) =====
  const selectedDate = useMemo(() => {
    try {
      return date ? parseISO(date) : new Date();
    } catch {
      return new Date();
    }
  }, [date]);

  const handleDateChange = (d: Date | undefined) => {
    if (!d) return;
    setDate(format(d, "yyyy-MM-dd"));
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  // ===== ранний выход после всех хуков =====
  if (!open) return null;

  // ===== submit =====
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!meta || metaLoading) return;

    if (locations.length === 0) {
      setSubmitError("Please create at least one location first.");
      return;
    }

    if (!date || !locationId || !cleanerId) {
      setSubmitError("Date, location and cleaner are required.");
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
    setTrialExpired(false);

    try {
      const job = await createPlanningJob({
        scheduled_date: date,
        scheduled_start_time: normalizeTimeToSeconds(startTime),
        scheduled_end_time: normalizeTimeToSeconds(endTime),
        location_id: locationId,
        cleaner_id: cleanerId,
        checklist_template_id: checklistTemplateId,
        // manager_notes пока не отправляем в API
      });

      onJobCreated(job);
      onClose();
    } catch (err: any) {
      console.error("Failed to create job", err);

      const msg = String(err?.message ?? "");

      const isTrialExpired =
        msg.includes('"code":"trial_expired"') || msg.includes("trial_expired");

      if (isTrialExpired) {
        setTrialExpired(true);
        setSubmitError(
          "Your free trial has ended. You can still view existing jobs and download reports, but creating new jobs requires an upgrade."
        );
      } else {
        setSubmitError(
          err?.response?.data?.detail || err?.message || "Failed to create job."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const showLoading = (metaLoading && !meta) || locationsLoading;
  const showError = metaError || locationsError;

  // ===== render =====
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
          {showLoading && (
            <p className="text-sm text-muted-foreground">Loading options…</p>
          )}

          {showError && (
            <div className="mb-4 flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
              <p className="text-sm text-destructive">
                {metaError || locationsError}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  loadMeta();
                  void reloadLocations();
                }}
                disabled={metaLoading || locationsLoading}
              >
                Retry
              </Button>
            </div>
          )}

          {meta && (
            <>
              {locations.length === 0 && !locationsLoading && (
                <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  No locations yet. Create a location first, then come back to
                  create a job.
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Date */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Date</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
                        disabled={!canInteract && locations.length > 0 ? false : false}
                      >
                        <span className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {format(selectedDate, "MMMM do, yyyy")}
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

                {/* Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Start time</div>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      disabled={!canInteract}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">End time</div>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      disabled={!canInteract}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-1">
                  <div className="text-sm font-medium">Location</div>
                  <Select
                    value={locationId != null ? String(locationId) : undefined}
                    onValueChange={(v) => setLocationId(Number(v))}
                    disabled={!canInteract}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          locations.length === 0
                            ? "No locations yet"
                            : "Select location"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.name || `Location #${loc.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cleaner */}
                <div className="space-y-1">
                  <div className="text-sm font-medium">Cleaner</div>
                  <Select
                    value={cleanerId ? String(cleanerId) : undefined}
                    onValueChange={(v) => setCleanerId(Number(v))}
                    disabled={!canInteract}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cleaner" />
                    </SelectTrigger>
                    <SelectContent>
                      {meta.cleaners.map((cl) => (
                        <SelectItem key={cl.id} value={String(cl.id)}>
                          {cl.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Checklist template */}
                <div className="space-y-1">
                  <div className="text-sm font-medium">Checklist template</div>
                  <Select
                    value={
                      checklistTemplateId != null
                        ? String(checklistTemplateId)
                        : "none"
                    }
                    onValueChange={(v) =>
                      setChecklistTemplateId(v === "none" ? null : Number(v))
                    }
                    disabled={!canInteract}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No checklist</SelectItem>
                      {meta.checklist_templates.map((tpl) => (
                        <SelectItem key={tpl.id} value={String(tpl.id)}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Manager notes */}
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    Manager Notes (optional)
                  </div>
                  <textarea
                    className="min-h-[96px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Any special instructions for this job…"
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    disabled={!canInteract}
                  />
                </div>

                {submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={!canInteract}
                  >
                    {trialExpired
                      ? "Upgrade required"
                      : submitting
                        ? "Creating…"
                        : "Create job"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
