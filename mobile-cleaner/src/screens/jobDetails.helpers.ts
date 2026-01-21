// mobile-cleaner/src/screens/jobDetails.helpers.ts

import type { JobChecklistItem } from "../api/client";

export type ChecklistState = {
  hasAny: boolean;
  hasRequired: boolean;
  allCompleted: boolean;
  requiredCompleted: boolean;
  checklistOk: boolean;
};

export function computeChecklistState(checklist: JobChecklistItem[]): ChecklistState {
  const hasAny = checklist.length > 0;
  const requiredItems = checklist.filter((item) => item.is_required);
  const hasRequired = requiredItems.length > 0;

  const allCompleted =
    hasAny && checklist.every((item) => item.is_completed === true);

  const requiredCompleted =
    !hasRequired || requiredItems.every((item) => item.is_completed === true);

  // чеклист «ок» для прогресса / check-out:
  // - если вообще нет пунктов
  // - или все обязательные завершены
  const checklistOk = !hasAny || requiredCompleted;

  return {
    hasAny,
    hasRequired,
    allCompleted,
    requiredCompleted,
    checklistOk,
  };
}

export type ProgressState = {
  scheduled: boolean;
  checkIn: boolean;
  beforePhoto: boolean;
  checklist: boolean;
  afterPhoto: boolean;
  checkOut: boolean;
};

export function deriveJobProgress(params: {
  status: string;
  timelineEvents: any[];
  beforePhoto: any | null;
  afterPhoto: any | null;
  checklistState: ChecklistState;
}): ProgressState {
  const { status, timelineEvents, beforePhoto, afterPhoto, checklistState } =
    params;

  const hasCheckIn = timelineEvents.some((e) => e.event_type === "check_in");
  const hasCheckOut = timelineEvents.some((e) => e.event_type === "check_out");

  return {
    scheduled: true,
    checkIn: hasCheckIn || status === "in_progress" || status === "completed",
    beforePhoto: !!beforePhoto,
    checklist: checklistState.checklistOk,
    afterPhoto: !!afterPhoto,
    checkOut: hasCheckOut || status === "completed",
  };
}

export function normalizeAndSortEvents(events: any[]) {
  const mapped = events
    .map((e) => {
      const createdAt = e.created_at ?? e.event_timestamp ?? e.createdAt ?? "";
      const type = e.event_type ?? e.type ?? "";
      const label =
        type === "check_in"
          ? "Checked in"
          : type === "check_out"
          ? "Checked out"
          : type || "Event";

      return {
        id: String(e.id ?? `${type}-${createdAt}`),
        createdAt,
        label,
        userName: e.user_name ?? e.userName ?? "",
        distanceM:
          typeof e.distance_m === "number"
            ? e.distance_m
            : typeof e.distanceM === "number"
            ? e.distanceM
            : undefined,
        event_type: type,
      };
    })
    .filter((e) => e.createdAt);

  mapped.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return mapped;
}

export function formatTime(iso: string) {
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : iso;
}
