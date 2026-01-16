// dubai-control/src/api/client.ts

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

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
  check_events?: any[];
  notes?: string | null;
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

// ---------- Normalization ----------

// сюда прилетает "сырой" объект из Django, мы руками приводим к плоскому виду
function normalizeJob(raw: any): ManagerJobSummary {
  const scheduled_date: string | undefined =
    raw.scheduled_date ?? raw.date ?? undefined;

  const start_time: string =
    raw.scheduled_start_time ??
    raw.scheduled_start ??
    raw.start_time ??
    "--:--";

  const end_time: string =
    raw.scheduled_end_time ??
    raw.scheduled_end ??
    raw.end_time ??
    "--:--";

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
    raw.location_address ??
    locationObj?.address ??
    raw.address ??
    "";

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

  const photos =
    raw.photos ||
    (raw.before_photo_url || raw.after_photo_url
      ? {
          before: raw.before_photo_url
            ? {
                id: 1,
                type: "before",
                url: raw.before_photo_url,
                uploaded_at: raw.before_photo_uploaded_at,
              }
            : null,
          after: raw.after_photo_url
            ? {
                id: 2,
                type: "after",
                url: raw.after_photo_url,
                uploaded_at: raw.after_photo_uploaded_at,
              }
            : null,
        }
      : null);

  return {
    ...base,
    photos,
    check_events: raw.check_events || [],
    notes: raw.notes ?? null,
  };
}

// ---- Backward-compatible exports ----
export const fetchManagerJobsToday = getManagerTodayJobs;
