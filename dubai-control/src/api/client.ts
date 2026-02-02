import type { OwnerOverview } from "@/types/reports";

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

  sla_status?: "ok" | "violated";
  sla_reasons?: string[];
}

// История отправки PDF-отчёта по джобу
export interface ManagerJobReportEmailLogEntry {
  id: number;
  sent_at: string;
  target_email: string | null;
  status: "sent" | "failed" | string;
  sent_by: string | null;
  subject: string | null;
  error_message: string | null;
}

export interface ManagerJobReportEmailsResponse {
  job_id: number;
  emails: ManagerJobReportEmailLogEntry[];
}

// ---------- Company, Cleaners & Locations types ----------

export interface CompanyProfile {
  id: number;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
}

export interface Cleaner {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
}

// единственный тип Location для всего фронта
export interface Location {
  id: number;
  name: string;
  address: string | null;

  // возможные поля, которые уже были в UI/бэке
  latitude?: number | null;
  longitude?: number | null;

  created_at?: string | null; // backend
  createdAt?: string | null; // старый фронт

  [key: string]: any;
}

// ---------- Auth state ----------

type AuthState = {
  token: string | null;
};

const auth: AuthState = {
  token: null,
};

// хелпер: подтянуть токен из localStorage, если он есть
function syncTokenFromStorage(): string | null {
  if (typeof window === "undefined") {
    return auth.token;
  }

  const stored =
    localStorage.getItem("authToken") || localStorage.getItem("auth_token");

  if (stored && stored !== auth.token) {
    auth.token = stored;
  }

  return auth.token;
}

// ---------- Low-level fetch helpers ----------

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // перед каждым запросом синкаемся с localStorage
  const currentToken = syncTokenFromStorage();

  if (currentToken && !("Authorization" in headers)) {
    headers["Authorization"] = `Token ${currentToken}`;
  }

  const resp = await fetch(url, {
    ...options,
    headers,
  });

  if (!resp.ok) {
    const text = await resp.text();

    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { detail: text || "Unknown error" };
    }

    console.error("API error", resp.status, resp.statusText, data);

    const error: any = new Error("API request failed");
    error.response = {
      status: resp.status,
      statusText: resp.statusText,
      data,
    };
    throw error;
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

  const currentToken = syncTokenFromStorage();

  if (currentToken && !("Authorization" in headers)) {
    headers["Authorization"] = `Token ${currentToken}`;
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
  // 1) Всегда сначала смотрим в localStorage (новый login flow)
  const storedToken = syncTokenFromStorage();
  if (storedToken) {
    return;
  }

  // 2) Если токена в storage нет, но уже есть в памяти — тоже ок
  if (auth.token) {
    return;
  }

  // 3) Fallback: dev-логин через ENV / дефолтные креды
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

  // кладём токен и в localStorage, чтобы всё было единообразно
  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", data.token);
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("authUserEmail", data.email);
    if (data.role) {
      localStorage.setItem("authUserRole", data.role);
    }
  }

  console.log("[api] Logged in as manager (dev fallback)", data.email);
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
    sla_status: raw.sla_status,
    sla_reasons: Array.isArray(raw.sla_reasons) ? raw.sla_reasons : [],
  };
}

// ---------- Job create (Manager Portal) ----------

export type ManagerJobCreatePayload = {
  scheduled_date: string; // "YYYY-MM-DD"
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  location_id: number;
  cleaner_id: number;
  // опционально, на будущее:
  checklist_template_id?: number | null;
  hourly_rate?: number | null;
  flat_rate?: number | null;
};

export async function createManagerJob(
  payload: ManagerJobCreatePayload
): Promise<ManagerJobDetail> {
  await loginManager();

  const raw = await apiFetch<any>("/api/manager/jobs/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

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
    notes: raw.notes ?? raw.manager_notes ?? null,
    checklist,
    timeline,
  };
}

// История отправки job PDF-отчёта
export async function fetchManagerJobReportEmails(
  jobId: number
): Promise<ManagerJobReportEmailsResponse> {
  await loginManager();
  return apiFetch<ManagerJobReportEmailsResponse>(
    `/api/manager/jobs/${jobId}/report/emails/`
  );
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

// Email job PDF report to manager (optionally to custom email)
export async function emailJobReportPdf(
  jobId: number,
  email?: string
): Promise<any> {
  const url = `/api/manager/jobs/${jobId}/report/email/`;

  const payload = email ? { email } : {};

  const res = await apiClient.post(url, payload);
  return res.data;
}

// ---------- Company API ----------

export async function getCompanyProfile(): Promise<CompanyProfile> {
  await loginManager();
  return apiFetch<CompanyProfile>("/api/manager/company/");
}

export async function updateCompanyProfile(
  payload: Partial<{
    name: string;
    contact_email: string | null;
    contact_phone: string | null;
  }>
): Promise<CompanyProfile> {
  await loginManager();
  return apiFetch<CompanyProfile>("/api/manager/company/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadCompanyLogo(file: File): Promise<CompanyProfile> {
  await loginManager();

  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_BASE_URL}/api/manager/company/logo/`;

  const headers: HeadersInit = {};
  const currentToken = syncTokenFromStorage();
  if (currentToken) {
    headers["Authorization"] = `Token ${currentToken}`;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("API logo upload error", resp.status, resp.statusText, text);
    throw new Error(
      `API ${resp.status} ${resp.statusText}: ${text || "Unknown error"}`
    );
  }

  return (await resp.json()) as CompanyProfile;
}

// ---------- Cleaners API ----------

export type CreateCleanerPayload = {
  full_name: string;
  phone: string; // ОБЯЗАТЕЛЬНО
  email?: string | null;
  is_active?: boolean;
  pin: string; // 4 цифры, строка
};

export async function getCleaners(): Promise<Cleaner[]> {
  await loginManager();
  return apiFetch<Cleaner[]>("/api/manager/cleaners/");
}

export async function createCleaner(
  payload: CreateCleanerPayload
): Promise<Cleaner> {
  await loginManager();
  return apiFetch<Cleaner>("/api/manager/cleaners/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCleaner(
  id: number,
  input: Partial<{
    full_name: string;
    email: string | null;
    phone: string | null;
    is_active: boolean;
  }>
): Promise<Cleaner> {
  await loginManager();
  return apiFetch<Cleaner>(`/api/manager/cleaners/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function resetCleanerPin(
  cleanerId: number
): Promise<{ id: number; full_name: string; phone: string | null; pin: string }> {
  await loginManager();

  return apiFetch<{
    id: number;
    full_name: string;
    phone: string | null;
    pin: string;
  }>(`/api/manager/cleaners/${cleanerId}/reset-pin/`, {
    method: "POST",
  });
}

// ---------- Locations API ----------

export async function getLocations(): Promise<Location[]> {
  await loginManager();
  return apiFetch<Location[]>("/api/manager/locations/");
}

export async function createLocation(input: {
  name: string;
  address?: string;
  [key: string]: any;
}): Promise<Location> {
  await loginManager();
  return apiFetch<Location>("/api/manager/locations/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateLocation(
  id: number,
  input: Partial<{
    name: string;
    address: string | null;
    is_active: boolean;
    [key: string]: any;
  }>
): Promise<Location> {
  await loginManager();
  return apiFetch<Location>(`/api/manager/locations/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
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

// ---- Reports: email weekly / monthly ----

// Email weekly report (optionally to custom email)
export async function emailWeeklyReport(email?: string): Promise<any> {
  const url = "/api/manager/reports/weekly/email/";
  const payload = email ? { email } : {};
  const res = await apiClient.post(url, payload);
  return res.data;
}

// Email monthly report (optionally to custom email)
export async function emailMonthlyReport(email?: string): Promise<any> {
  const url = "/api/manager/reports/monthly/email/";
  const payload = email ? { email } : {};
  const res = await apiClient.post(url, payload);
  return res.data;
}

// ---- Job Reports ----

export async function emailJobReport(
  jobId: number,
  email?: string
): Promise<void> {
  const body = email ? { email } : undefined;

  await apiClient.post(`/api/manager/jobs/${jobId}/report/email/`, body);
}

// ----- explicit exports for other modules -----
export { API_BASE_URL };

// ---------- Manager Planning Jobs ----------

export type ManagerPlanningJob = {
  id: number;
  scheduled_date: string; // "YYYY-MM-DD"
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  status: string;
  location: {
    id: number;
    name: string;
    address: string;
  } | null;
  cleaner: {
    id: number;
    full_name: string;
  } | null;
  proof: {
    before_uploaded: boolean;
    after_uploaded: boolean;
    checklist_completed: boolean;
    before_photo: boolean;
    after_photo: boolean;
    checklist: boolean;
  };
};

// ---------- Reports types ----------

export type ReportSummary = {
  jobs_count: number;
  violations_count: number;
  issue_rate: number;
};

export type ReportEntityStat = {
  id: number | null;
  name: string;
  jobs_count: number;
  violations_count: number;
};

export type ReportReasonStat = {
  code: string;
  count: number;
};

export type ManagerReport = {
  period: {
    from: string; // "YYYY-MM-DD"
    to: string; // "YYYY-MM-DD"
  };
  summary: ReportSummary;
  cleaners: ReportEntityStat[];
  locations: ReportEntityStat[];
  top_reasons: ReportReasonStat[];
};

export type ViolationJob = {
  id: number;
  scheduled_date: string;
  scheduled_start_time: string | null;
  status: string;
  location_id: number;
  location_name: string;
  cleaner_id: number;
  cleaner_name: string;
  sla_status: string;
  sla_reasons: string[];
};

export type ViolationJobsResponse = {
  reason: string;
  reason_label: string;
  period: {
    start: string;
    end: string;
  };
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
  jobs: ViolationJob[];
};

export async function getManagerPlanningJobs(
  date: string
): Promise<ManagerPlanningJob[]> {
  await loginManager();

  const { data } = await apiClient.get<ManagerPlanningJob[]>(
    `/api/manager/jobs/planning/?date=${date}`
  );

  return data;
}

// ---------- Reports API ----------

export async function getViolationJobs(params: {
  reason: string;
  periodStart: string;
  periodEnd: string;
  page?: number;
}): Promise<ViolationJobsResponse> {
  const searchParams = new URLSearchParams({
    reason: params.reason,
    period_start: params.periodStart,
    period_end: params.periodEnd,
  });

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  const { data } = await apiClient.get<ViolationJobsResponse>(
    `/api/manager/reports/violations/jobs/?${searchParams.toString()}`
  );

  return data;
}

export async function getWeeklyReport(): Promise<ManagerReport> {
  const res = await apiClient.get<ManagerReport>("/api/manager/reports/weekly/");
  return res.data;
}

export async function getMonthlyReport(): Promise<ManagerReport> {
  const res = await apiClient.get<ManagerReport>(
    "/api/manager/reports/monthly/"
  );
  return res.data;
}

// ---- PDF download for weekly/monthly manager reports ----

export async function downloadManagerReportPdf(
  mode: "weekly" | "monthly"
): Promise<Blob> {
  await loginManager();

  const path =
    mode === "weekly"
      ? "/api/manager/reports/weekly/pdf/"
      : "/api/manager/reports/monthly/pdf/";

  // если на бэке POST — можно поменять method на "POST"
  return apiFetchBlob(path, { method: "GET" });
}

// ---------- Email Logs API (глобальные логи отправки отчётов) ----------

export type EmailLogKind = "job_report" | "weekly_report" | "monthly_report";
export type EmailLogStatus = "sent" | "failed";

export type EmailLog = {
  id: number;
  sent_at: string;
  kind: EmailLogKind | string;
  job_id: number | null;
  job_period: string; // то, что мы собираем на бэке для колонки "Job / Period"
  company_name: string | null;
  location_name: string | null;
  cleaner_name: string | null;
  target_email: string | null;
  status: EmailLogStatus | string;
  sent_by: string | null;
};

export type EmailLogsPagination = {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
};

export type EmailLogsResponse = {
  results: EmailLog[];
  pagination: EmailLogsPagination;
};

export type EmailLogsFilters = {
  page?: number;
  page_size?: number;
  status?: "all" | EmailLogStatus;
  kind?: "all" | "job" | "weekly" | "monthly";
  date_from?: string; // "YYYY-MM-DD" или пустая строка
  date_to?: string;   // "YYYY-MM-DD" или пустая строка
  job_id?: string;
  email?: string;
};

export async function getEmailLogs(
  filters: EmailLogsFilters
): Promise<EmailLogsResponse> {
  await loginManager();

  const params = new URLSearchParams();

  // --- пагинация с дефолтами ---
  const page =
    typeof filters.page === "number" && filters.page > 0 ? filters.page : 1;
  const pageSize =
    typeof filters.page_size === "number" && filters.page_size > 0
      ? filters.page_size
      : 50;

  params.set("page", String(page));
  params.set("page_size", String(pageSize));

  // --- статус (sent / failed) ---
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  // --- тип отчёта (job / weekly / monthly) ---
  if (filters.kind && filters.kind !== "all") {
    const kindMap: Record<"job" | "weekly" | "monthly", EmailLogKind> = {
      job: "job_report",
      weekly: "weekly_report",
      monthly: "monthly_report",
    };
    params.set("kind", kindMap[filters.kind]);
  }

  // --- даты: важное исправление — ключи date_from / date_to ---
  if (filters.date_from) {
    params.set("date_from", filters.date_from);
  }

  if (filters.date_to) {
    params.set("date_to", filters.date_to);
  }

  // --- job_id ---
  if (filters.job_id) {
    params.set("job_id", filters.job_id.trim());
  }

  // --- email substring ---
  if (filters.email) {
    params.set("email", filters.email.trim());
  }

  const qs = params.toString();
  const path = qs
    ? `/api/manager/report-emails/?${qs}`
    : "/api/manager/report-emails/";

  // сырой ответ бэка
  const { data } = await apiClient.get<{
    count: number;
    page: number;
    page_size: number;
    next_page: number | null;
    previous_page: number | null;
    results: EmailLog[];
  }>(path);

  const totalItems = data.count;
  const totalPages = data.page_size
    ? Math.ceil(totalItems / data.page_size)
    : 1;

  return {
    results: data.results,
    pagination: {
      page: data.page,
      page_size: data.page_size,
      total_items: totalItems,
      total_pages: totalPages,
    },
  };
}

// ---------- Owner overview (для блока For owners на /reports) ----------

export async function getOwnerOverview(days?: number): Promise<OwnerOverview> {
  const params = days ? `?days=${days}` : "";
  const res = await apiClient.get<OwnerOverview>(
    `/api/owner/overview/${params}`
  );
  return res.data;
}
