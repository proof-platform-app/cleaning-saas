// mobile-cleaner/src/types/job.ts

export type JobStatus = "scheduled" | "in_progress" | "completed";

export type PhotoType = "before" | "after";

export type CheckEventType = "check_in" | "check_out";

export interface LocationInfo {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface JobChecklistItem {
  id: number;
  text: string;
  is_completed: boolean;
  is_required: boolean;
}

export interface JobPhoto {
  id: number;
  photo_type: PhotoType;
  file_url: string;

  // EXIF-derived (nullable if missing)
  latitude: number | null;
  longitude: number | null;
  photo_timestamp: string | null;

  // if API returns it; keep optional to avoid breaking if absent
  exif_missing?: boolean;
}

export interface JobCheckEvent {
  id?: number; // API may or may not send id; not required for UI
  event_type: CheckEventType;
  event_timestamp: string;
  latitude: number;
  longitude: number;
}

export interface JobDetail {
  id: number;
  status: JobStatus;

  scheduled_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;

  actual_start_time: string | null;
  actual_end_time: string | null;

  location: LocationInfo;

  checklist_items: JobChecklistItem[];

  photos: JobPhoto[]; // 0..2

  check_events: JobCheckEvent[]; // sorted ASC by backend
}

/**
 * Contract for GET /api/jobs/today/ (flat shape).
 * NOTE: backend returns location__name (double underscore) and no nested objects.
 */
export interface TodayJobSummary {
  id: number;
  location__name: string | null;

  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;

  status: JobStatus;
}
