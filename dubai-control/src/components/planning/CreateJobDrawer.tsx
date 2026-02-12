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

type CreateJobPayload = {
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  location_id: number;
  cleaner_id: number;
  notes?: string;
  checklist_template_id?: number;
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

  // Только активные локации для планирования
  const activeLocations = useMemo(
    () => locations.filter((loc) => (loc as any).is_active ?? true),
    [locations],
  );

  // ===== meta ===== (cleaners; locations тут больше не используем)
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

  // раскрытие полного списка пунктов чеклиста
  const [showAllChecklistItems, setShowAllChecklistItems] = useState(false);

  // ===== ui state =====
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorCode, setSubmitErrorCode] = useState<string | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [companyBlocked, setCompanyBlocked] = useState(false);

  const canInteract =
    !metaLoading &&
    !submitting &&
    !trialExpired &&
    !companyBlocked &&
    !locationsLoading &&
    activeLocations.length > 0;

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
        // checklistTemplateId не трогаем — по умолчанию "No checklist"
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
    setChecklistTemplateId(null);
    setSubmitError(null);
    setSubmitErrorCode(null);
    setTrialExpired(false);
    setCompanyBlocked(false);
    setShowAllChecklistItems(false);

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
    if (activeLocations.length === 0) return;
    setLocationId(activeLocations[0].id);
  }, [open, locationId, activeLocations]);

  // при смене шаблона сбрасываем разворот чеклиста
  useEffect(() => {
    setShowAllChecklistItems(false);
  }, [checklistTemplateId]);

  // ===== checklist helpers =====
  const selectedChecklistTemplate = useMemo(
    () =>
      meta?.checklist_templates?.find(
        (tpl) => tpl.id === checklistTemplateId,
      ) ?? null,
    [meta, checklistTemplateId],
  );

  const checklistPreviewItems =
    selectedChecklistTemplate?.items_preview ?? [];

  // Пока бэкенд не отдаёт полный список, используем превью
  const checklistFullItems =
    showAllChecklistItems ? checklistPreviewItems : checklistPreviewItems;

  const checklistItemsToShow = showAllChecklistItems
    ? checklistFullItems
    : checklistPreviewItems;

  const previewLength = checklistPreviewItems.length;
  const totalItemsCount =
    typeof selectedChecklistTemplate?.items_count === "number"
      ? selectedChecklistTemplate.items_count
      : checklistFullItems.length;

  const checklistRestCount =
    totalItemsCount > previewLength ? totalItemsCount - previewLength : 0;

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

    // базовые проверки
    if (activeLocations.length === 0) {
      setSubmitError("Please create at least one active location first.");
      setSubmitErrorCode(null);
      return;
    }

    if (!date || !locationId || !cleanerId) {
      setSubmitError("Date, location and cleaner are required.");
      setSubmitErrorCode(null);
      return;
    }

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    if (startMinutes == null || endMinutes == null) {
      setSubmitError("Invalid time format.");
      setSubmitErrorCode(null);
      return;
    }

    if (endMinutes <= startMinutes) {
      setSubmitError("End time must be later than start time.");
      setSubmitErrorCode(null);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitErrorCode(null);
    setTrialExpired(false);
    setCompanyBlocked(false);

    try {
      const payload: CreateJobPayload = {
        scheduled_date: date,
        scheduled_start_time: normalizeTimeToSeconds(startTime),
        scheduled_end_time: normalizeTimeToSeconds(endTime),
        location_id: locationId,
        cleaner_id: cleanerId,
        // manager_notes пока не отправляем в API
        ...(checklistTemplateId !== null
          ? { checklist_template_id: checklistTemplateId }
          : {}),
      };

      const job = await createPlanningJob(payload);

      onJobCreated(job);
      onClose();
    } catch (err: any) {
      console.error("Failed to create job", err);

      const apiData = err?.response?.data;
      const msg = String(err?.message ?? "");

      // Пытаемся достать код из разных мест:
      // 1) err.code — из planning.ts (TrialExpiredError / company_blocked)
      // 2) payload из response.data
      let apiCode: string | undefined =
        (err as any)?.code ||
        apiData?.code ||
        apiData?.error_code ||
        apiData?.error ||
        apiData?.detail?.code;

      // Отдельно обрабатываем неактивную локацию
      if (apiCode === "location_inactive") {
        const detail =
          (typeof apiData === "string" ? apiData : apiData?.detail) ??
          "This location is inactive. Please choose another location.";

        setSubmitError(detail);
        setSubmitErrorCode("location_inactive");

        // сбрасываем выбор и перезагружаем список локаций
        setLocationId(null);
        void reloadLocations();

        return;
      }

      const isTrialExpired =
        apiCode === "trial_expired" ||
        msg.includes('"code":"trial_expired"') ||
        msg.includes("trial_expired");

      if (isTrialExpired) {
        setTrialExpired(true);
        setSubmitError(
          "Your free trial has ended. You can still view existing jobs and reports, but creating new jobs requires an upgrade.",
        );
        setSubmitErrorCode("trial_expired");
      } else if (apiCode === "company_blocked") {
        setCompanyBlocked(true);
        setSubmitErrorCode("company_blocked");
        // тут специально НЕ ставим текст ошибки,
        // чтобы показывался только жёлтый блок, без красной строки
        setSubmitError(null);
      } else {
        const detail =
          (typeof apiData === "string" ? apiData : apiData?.detail) ??
          err?.message ??
          "Failed to create job.";
        setSubmitError(detail);
        setSubmitErrorCode(apiCode ?? null);
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

      <div className="absolute right-0 top-0 flex h-full w-full flex-col border-l border-border bg-background sm:w-[420px]">
        <div className="flex items-center justify-between border-b border-border p-5">
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
              {activeLocations.length === 0 && !locationsLoading && (
                <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  No active locations yet. Create or activate a location first,
                  then come back to create a job.
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
                          activeLocations.length === 0
                            ? "No active locations"
                            : "Select location"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLocations.map((loc) => (
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
                  <label className="text-xs font-medium text-muted-foreground">
                    Checklist template
                  </label>

                  <Select
                    value={
                      checklistTemplateId !== null
                        ? String(checklistTemplateId)
                        : "none"
                    }
                    onValueChange={(value) => {
                      if (value === "none") {
                        setChecklistTemplateId(null);
                      } else {
                        setChecklistTemplateId(Number(value));
                      }
                    }}
                    disabled={!canInteract}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No checklist" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No checklist</SelectItem>

                      {meta.checklist_templates?.map((tpl) => (
                        <SelectItem key={tpl.id} value={String(tpl.id)}>
                          <div className="flex flex-col gap-0.5">
                            <div className="text-sm font-medium">
                              {tpl.name}
                            </div>

                            {tpl.items_preview &&
                              tpl.items_preview.length > 0 && (
                                <div
                                  className="text-xs text-muted-foreground truncate"
                                  title={tpl.items_preview.join(" · ")}
                                >
                                  {tpl.items_preview.slice(0, 2).join(" · ")}
                                  {typeof tpl.items_count === "number" &&
                                    tpl.items_count >
                                      tpl.items_preview.length &&
                                    "…"}
                                </div>
                              )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <p className="text-xs text-muted-foreground">
                    Choose a checklist for this job, or keep “No checklist”.
                  </p>

                  {selectedChecklistTemplate && (
                    <div className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2 space-y-2">
                      <div className="text-[11px] font-semibold text-muted-foreground">
                        CHECKLIST DETAILS
                      </div>

                      <div className="text-sm font-medium">
                        {selectedChecklistTemplate.name}
                      </div>

                      {selectedChecklistTemplate.description && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedChecklistTemplate.description}
                        </p>
                      )}

                      {checklistItemsToShow.length > 0 && (
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                          {checklistItemsToShow.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      )}

                      {checklistRestCount > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowAllChecklistItems((v) => !v)
                          }
                          className="text-[11px] text-primary underline cursor-pointer"
                        >
                          {showAllChecklistItems
                            ? "Hide extra items"
                            : `+ ${checklistRestCount} more item${
                                checklistRestCount > 1 ? "s" : ""
                              }`}
                        </button>
                      )}
                    </div>
                  )}
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

                {/* company_blocked notice */}
                {submitErrorCode === "company_blocked" && (
                  <div className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
                    <div className="mb-1 font-medium">⚠️ Account suspended</div>
                    <p>
                      Your company account is currently suspended. You can view
                      existing jobs and reports, but creating new jobs is
                      temporarily disabled.
                    </p>
                    <p className="mt-1">
                      If you believe this is a mistake, please contact support.
                    </p>
                  </div>
                )}

                {/* generic error (excluding company_blocked and trial_expired) */}
                {submitError &&
                  submitErrorCode !== "company_blocked" &&
                  submitErrorCode !== "trial_expired" && (
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
                    {companyBlocked
                      ? "Account suspended"
                      : trialExpired
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
