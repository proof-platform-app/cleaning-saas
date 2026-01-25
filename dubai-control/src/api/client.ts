const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const DEV_MANAGER_EMAIL =
  import.meta.env.VITE_DEV_MANAGER_EMAIL || "manager@test.com";
const DEV_MANAGER_PASSWORD =
  import.meta.env.VITE_DEV_MANAGER_PASSWORD || "Test1234!";

export interface ManagerJobSummary {
  id: number;
  status: string;

  scheduled_date?: string;
  start_time?: string;
  end_time?: string;

  location_name?: string;
  location_address?: string;
  cleaner_name?: string;

  has_proof?: boolean;

  // алиасы под старый UI (все строки)
  location?: string;
  address?: string;
  cleaner?: string;

  [key: string]: any;
}

// ---------- Usage summary (trial + soft-limits) ----------

export type UsageSummary = {
  plan: string;
  is_trial_active: boolean;
  is_trial_expired: boolean;
  days_left: number | null;
  jobs_today_count: number;
  jobs_today_soft_limit: number;
  cleaners_count: number;
  cleaners_soft_limit: number;
};

// ---------- Timeline types ----------

export type JobTimelineStepKey =
  | "scheduled"
  | "check_in"
  | "before_photo"
  | "checklist"
  | "after_photo"
  | "check_out";

export type JobTimelineStepStatus = "done" | "pending";

export interface JobTimelineStep {
  key: JobTimelineStepKey;
  label: string;
  status: JobTimelineStepStatus;
  timestamp?: string | null;
}

// ---------- Check events ----------

export interface ManagerJobCheckEvent {
  id: number;
  event_type: "check_in" | "check_out" | string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
}

export interface ManagerJobDetail extends ManagerJobSummary {
  photos?:
    | {
        before?:
          | {
              id: number;
              type: string;
              url: string;
              uploaded_at?: string;
            }
          | null;
        after?:
          | {
              id: number;
              type: string;
              url: string;
              uploaded_at?: string;
            }
          | null;
      }
    | null;
  check_events?: ManagerJobCheckEvent[];
  notes?: string | null;

  // нормализованный таймлайн для UI
  timeline?: JobTimelineStep[];

  checklist?: { item: string; completed: boolean }[];
}

type AuthState = {
  token: string | null;
};

const auth: AuthState = {
  token: null,
};

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (auth.token && !("Authorization" in headers)) {
    headers["Authorization"] = `Token ${auth.token}`;
  }

  const resp = await fetch(url, {
    ...options,
    headers,
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("API error", resp.status, resp.statusText, text);
    throw new Error(
      `API ${resp.status} ${resp.statusText}: ${text || "Unknown error"}`
    );
  }

  if (resp.status === 204) {
    return null as unknown as T;
  }

  return (await resp.json()) as T;
}

// Для бинарных (PDF) ответов — отдельный helper
async function apiFetchBlob(
  path: string,
  options: RequestInit = {}
): Promise<Blob> {
  const url = `${API_BASE_URL}${path}`;

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  if (auth.token && !("Authorization" in headers)) {
    headers["Authorization"] = `Token ${auth.token}`;
  }

  const resp = await fetch(url, {
    ...options,
    headers,
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("API blob error", resp.status, resp.statusText, text);
    throw new Error(
      `API ${resp.status} ${resp.statusText}: ${text || "Unknown error"}`
    );
  }

  return await resp.blob();
}

// ---------- Auth ----------

export async function loginManager(): Promise<void> {
  if (auth.token) return;

  const payload = {
    email: DEV_MANAGER_EMAIL,
    password: DEV_MANAGER_PASSWORD,
  };

  const data = await apiFetch<{
    token: string;
    user_id: number;
    email: string;
    full_name?: string;
    role?: string;
  }>("/api/manager/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  auth.token = data.token;
  console.log("[api] Logged in as manager", data.email);
}

// ---------- Helpers ----------

function extractTimeFromISO(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toAbsoluteUrl(
  u: string | null | undefined
): string | null | undefined {
  if (!u) return u;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  // гарантируем ровно один "/" между base и path
  if (u.startsWith("/")) return `${API_BASE_URL}${u}`;
  return `${API_BASE_URL}/${u}`;
}

// ---------- Normalization ----------

// сюда прилетает "сырой" объект из Django, мы руками приводим к плоскому виду
function normalizeJob(raw: any): ManagerJobSummary {
  const scheduled_date: string | undefined =
    raw.scheduled_date ?? raw.date ?? undefined;

  // логика времени: сначала scheduled, если нет — actual_* (как минимум время)
  let start_time: string;
  let end_time: string;

  const scheduled_start: string | null =
    raw.scheduled_start_time ?? raw.scheduled_start ?? raw.start_time ?? null;

  const scheduled_end: string | null =
    raw.scheduled_end_time ?? raw.scheduled_end ?? raw.end_time ?? null;

  if (scheduled_start) {
    start_time = scheduled_start;
  } else if (raw.actual_start_time) {
    start_time = extractTimeFromISO(raw.actual_start_time) ?? "--:--";
  } else {
    start_time = "--:--";
  }

  if (scheduled_end) {
    end_time = scheduled_end;
  } else if (raw.actual_end_time) {
    end_time = extractTimeFromISO(raw.actual_end_time) ?? "--:--";
  } else {
    end_time = "--:--";
  }

  const locationObj =
    typeof raw.location === "object" && raw.location !== null
      ? raw.location
      : null;

  const location_name: string =
    raw.location_name ??
    locationObj?.name ??
    (typeof raw.location === "string" ? raw.location : "") ??
    "";

  const location_address: string =
    raw.location_address ?? locationObj?.address ?? raw.address ?? "";

  const cleaner_name: string =
    raw.cleaner_name ??
    (typeof raw.cleaner === "string" ? raw.cleaner : raw.cleaner?.full_name) ??
    raw.cleaner ??
    "";

  const has_before =
    !!raw.has_before_photo || !!raw.before_photo_url || !!raw.before_photo;
  const has_after =
    !!raw.has_after_photo || !!raw.after_photo_url || !!raw.after_photo;
  const has_proof = has_before || has_after;

  return {
    id: raw.id,
    status: raw.status,

    scheduled_date,
    start_time,
    end_time,

    location_name,
    location_address,
    cleaner_name,

    has_proof,

    // алиасы для текущих страниц (ВСЕГДА строки, никаких объектов):
    location: location_name,
    address: location_address,
    cleaner: cleaner_name,
  };
}

function normalizeChecklist(raw: any): { item: string; completed: boolean }[] {
  const items = Array.isArray(raw?.checklist_items) ? raw.checklist_items : [];

  return items
    .map((it: any) => {
      const item =
        it?.item ??
        it?.title ??
        it?.name ??
        it?.label ??
        it?.text ??
        "";

      // разные варианты булевого поля
      const completed =
        !!it?.completed ||
        !!it?.is_completed ||
        !!it?.done ||
        it?.status === "completed" ||
        it?.status === "done";

      return { item, completed };
    })
    .filter((x: any) => typeof x.item === "string" && x.item.trim().length > 0);
}

// ---------- Timeline ----------

// Строим "Job Timeline" из сырого объекта job
function buildJobTimeline(raw: any): JobTimelineStep[] {
  const events: ManagerJobCheckEvent[] = Array.isArray(raw.check_events)
    ? raw.check_events
    : [];

  const checkInEvent = events.find((e) => e.event_type === "check_in");
  const checkOutEvent = events.find((e) => e.event_type === "check_out");

  const photosArr = Array.isArray(raw.photos) ? raw.photos : [];
  const beforePhoto =
    photosArr.find(
      (p: any) => (p.photo_type || "").toString().toLowerCase() === "before"
    ) || null;
  const afterPhoto =
    photosArr.find(
      (p: any) => (p.photo_type || "").toString().toLowerCase() === "after"
    ) || null;

  const checklist = normalizeChecklist(raw);
  const checklistCompleted =
    checklist.length > 0 && checklist.every((x) => x.completed);

  const scheduledTimestamp: string | null =
    raw.scheduled_start_time ??
    raw.scheduled_start ??
    raw.scheduled_datetime ??
    raw.scheduled_date ??
    null;

  const checkInTimestamp: string | null =
    checkInEvent?.created_at ?? raw.actual_start_time ?? null;

  const checkOutTimestamp: string | null =
    checkOutEvent?.created_at ?? raw.actual_end_time ?? null;

  const beforeTimestamp: string | null =
    beforePhoto?.photo_timestamp ?? beforePhoto?.created_at ?? null;

  const afterTimestamp: string | null =
    afterPhoto?.photo_timestamp ?? afterPhoto?.created_at ?? null;

  const steps: JobTimelineStep[] = [
    {
      key: "scheduled",
      label: "Scheduled",
      status: "done",
      timestamp: scheduledTimestamp,
    },
    {
      key: "check_in",
      label: "Check-in",
      // done ТОЛЬКО если есть событие check_in
      status: checkInEvent ? "done" : "pending",
      timestamp: checkInTimestamp,
    },
    {
      key: "before_photo",
      label: "Before photo",
      status: beforePhoto ? "done" : "pending",
      timestamp: beforeTimestamp,
    },
    {
      key: "checklist",
      label: "Checklist",
      status: checklistCompleted ? "done" : "pending",
      timestamp: null,
    },
    {
      key: "after_photo",
      label: "After photo",
      status: afterPhoto ? "done" : "pending",
      timestamp: afterTimestamp,
    },
    {
      key: "check_out",
      label: "Check-out",
      // done ТОЛЬКО если есть событие check_out
      status: checkOutEvent ? "done" : "pending",
      timestamp: checkOutTimestamp,
    },
  ];

  return steps;
}

function normalizePhotos(
  raw: any
):
  | {
      before?: {
        id: number;
        type: string;
        url: string;
        uploaded_at?: string;
      } | null;
      after?: {
        id: number;
        type: string;
        url: string;
        uploaded_at?: string;
      } | null;
    }
  | null {
  // 1) Новый формат: raw.photos — массив job_photos
  const arr = Array.isArray(raw.photos) ? raw.photos : [];

  let before: any = null;
  let after: any = null;

  if (arr.length > 0) {
    for (const p of arr) {
      const rawType = (p.photo_type || p.type || "").toString().toLowerCase();
      const type = rawType === "after" ? "after" : "before";

      let url =
        p.url ||
        p.file_url ||
        (p.file && (p.file.file_url || p.file.url || p.file.download_url)) ||
        null;

      if (!url) continue;

      // делаем абсолютный URL для фронта
      url = toAbsoluteUrl(url) as string;

      const photo = {
        id: typeof p.id === "number" ? p.id : 0,
        type,
        url,
        uploaded_at:
          p.uploaded_at || p.photo_timestamp || p.created_at || undefined,
      };

      if (type === "before" && !before) {
        before = photo;
      }
      if (type === "after" && !after) {
        after = photo;
      }
    }
  }

  // 2) Если из массива ничего не вытащили — падаем на legacy-поля
  if (!before && !after) {
    const hasLegacyBefore = !!raw.before_photo_url;
    const hasLegacyAfter = !!raw.after_photo_url;

    if (!hasLegacyBefore && !hasLegacyAfter) {
      return null;
    }

    const makeAbsolute = toAbsoluteUrl;

    return {
      before: hasLegacyBefore
        ? {
            id: 1,
            type: "before",
            url: makeAbsolute(raw.before_photo_url) as string,
            uploaded_at: raw.before_photo_uploaded_at,
          }
        : null,
      after: hasLegacyAfter
        ? {
            id: 2,
            type: "after",
            url: makeAbsolute(raw.after_photo_url) as string,
            uploaded_at: raw.after_photo_uploaded_at,
          }
        : null,
    };
  }

  return {
    before,
    after,
  };
}

// ---------- Usage summary API ----------

export async function getUsageSummary(): Promise<UsageSummary> {
  await loginManager();
  return apiFetch<UsageSummary>("/api/cleanproof/usage-summary/");
}

// ---------- Jobs: today ----------

export async function getManagerTodayJobs(): Promise<ManagerJobSummary[]> {
  await loginManager();
  const raw = await apiFetch<any[]>("/api/manager/jobs/today/");
  return raw.map((item) => normalizeJob(item));
}

// Общий список для Jobs.tsx (сейчас просто today)
export async function fetchManagerJobsSummary(): Promise<ManagerJobSummary[]> {
  return getManagerTodayJobs();
}

// ---------- Job details ----------

export async function fetchManagerJobDetail(
  id: string | number
): Promise<ManagerJobDetail> {
  await loginManager();
  const raw = await apiFetch<any>(`/api/manager/jobs/${id}/`);

  const base = normalizeJob(raw);

  const photos = normalizePhotos(raw);
  const timeline = buildJobTimeline(raw);
  const checklist = normalizeChecklist(raw);

  return {
    ...base,
    photos,
    check_events: Array.isArray(raw.check_events)
      ? (raw.check_events as ManagerJobCheckEvent[])
      : [],
    // пока берём только одно поле notes; если появятся manager/cleaner_notes — придумаем маппинг
    notes: raw.notes ?? raw.manager_notes ?? null,
    checklist,
    timeline,
  };
}

// ---- PDF report (binary) ----

export async function downloadJobReportPdf(jobId: number): Promise<Blob> {
  await loginManager();
  // используем общий jobs-эндпоинт, он уже реализован для mobile
  const blob = await apiFetchBlob(`/api/jobs/${jobId}/report/pdf/`, {
    method: "POST",
  });
  return blob;
}

// ---- Email PDF report (stub) ----

export async function emailJobReportPdf(
  jobId: number,
  email?: string
): Promise<void> {
  await loginManager();

  const body = email ? { email } : {};

  await apiFetch(`/api/manager/jobs/${jobId}/report/email/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ---- Backward-compatible exports ----
export const fetchManagerJobsToday = getManagerTodayJobs;

// ---- apiClient facade для нового кода (JobPlanning и т.п.) ----

type ApiClientOptions = Omit<RequestInit, "method" | "body">;

export const apiClient = {
  async get<T = any>(
    path: string,
    options: ApiClientOptions = {}
  ): Promise<{ data: T }> {
    await loginManager();
    const data = await apiFetch<T>(path, { ...options, method: "GET" });
    return { data };
  },

  async post<T = any>(
    path: string,
    body?: any,
    options: ApiClientOptions = {}
  ): Promise<{ data: T }> {
    await loginManager();
    const init: RequestInit = {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };
    const data = await apiFetch<T>(path, init);
    return { data };
  },
};
