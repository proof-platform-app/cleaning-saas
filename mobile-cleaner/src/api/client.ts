// mobile-cleaner/src/api/client.ts

// Базовый URL API (IP твоего Mac + порт backend'а)
export const API_BASE_URL = "http://192.168.0.162:8001";

// ===== Простое хранение токена в памяти =====

type AuthState = {
  token: string | null;
};

const auth: AuthState = {
  token: null,
};

export function setAuthToken(token: string | null) {
  auth.token = token;
}

export function getAuthToken() {
  return auth.token;
}

// ===== Типы =====

export type CleanerJobSummary = {
  id: number;
  status: "scheduled" | "in_progress" | "completed" | string;
  scheduled_date?: string | null;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;

  // Текущий backend может отдавать так
  location__name?: string | null;

  // На будущее: нормальный объект
  location?: {
    name?: string;
    address?: string;
  } | null;
};

export type JobChecklistItem = {
  id: number;
  order: number;
  text: string;
  is_required: boolean;
  is_completed: boolean;
};

export type JobCheckEvent = {
  id: number;
  event_type: "check_in" | "check_out" | string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  distance_m: number | null;
  user_name: string;
};

export type JobPhoto = {
  id?: number;
  photo_type: "before" | "after" | string;
  url?: string;
  file_url?: string;
  created_at: string;
};

export type JobDetail = {
  id: number;
  status: "scheduled" | "in_progress" | "completed" | string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;

  location_name: string | null;
  manager_notes: string;
  cleaner_notes: string;

  checklist_items: JobChecklistItem[];
  check_events: JobCheckEvent[];

  before_photo_url: string | null;
  after_photo_url: string | null;
};

// Чтобы старый код, где ожидается JobListItem, не ломался
export type JobListItem = CleanerJobSummary;

// ===== Низкоуровневый helper: читаем body один раз =====

type ApiError = Error & {
  status?: number;
  details?: any;
};

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  // Для JSON руками ставим Content-Type, для FormData — никогда
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const token = getAuthToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Token ${token}`;
  } else if (!token) {
    console.log("[apiFetch] No auth token set for request:", path);
  }

  const resp = await fetch(url, {
    ...options,
    headers,
  });

  const raw = await resp.text();
  const contentType = resp.headers.get("content-type") || "";

  let data: any = null;
  if (raw) {
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw;
      }
    } else {
      data = raw;
    }
  }

  if (!resp.ok) {
    const msg =
      typeof data === "string"
        ? data
        : data?.detail ||
          data?.message ||
          (data ? JSON.stringify(data) : `HTTP ${resp.status}`);

    const err: ApiError = new Error(msg);
    err.status = resp.status;
    err.details = data;
    throw err;
  }

  return data as T;
}

// ===== Auth / login =====

export async function loginCleaner(
  email: string,
  password: string
): Promise<string> {
  const data = await apiFetch<{ token: string }>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!data?.token) {
    throw new Error("Login succeeded but token is missing in response");
  }

  setAuthToken(data.token);
  return data.token;
}

// ===== Список задач на сегодня =====

export async function fetchCleanerTodayJobs(): Promise<CleanerJobSummary[]> {
  const data = await apiFetch<CleanerJobSummary[]>("/api/jobs/today/", {
    method: "GET",
  });
  return data ?? [];
}

// алиас под старое имя (если где-то ещё используется)
export async function fetchTodayJobs(): Promise<JobListItem[]> {
  return fetchCleanerTodayJobs();
}

// ===== Детали задачи =====

export async function fetchJobDetail(jobId: number): Promise<JobDetail> {
  // Сейчас у нас стабильный DRF endpoint, старые варианты оставим как fallback
  const candidates = [
    `/api/jobs/${jobId}/`,
    `/api/jobs/${jobId}/mobile-detail/`,
    `/api/jobs/mobile-detail/${jobId}/`,
    `/api/jobs/${jobId}/detail/`,
  ];

  let lastError: any = null;

  for (const path of candidates) {
    try {
      const data = await apiFetch<JobDetail>(path, { method: "GET" });
      console.log("[JobDetails] fetched from:", path);
      return data;
    } catch (e: any) {
      lastError = e;
      if (e?.status === 404) {
        console.log("[JobDetails] 404 on", path, "- trying next");
        continue;
      }
      console.log("[JobDetails] error on", path, e?.message || e);
      throw e;
    }
  }

  console.log("[JobDetails] all URL candidates failed", lastError);
  throw new Error(
    "Job detail endpoint not found (tried multiple URL patterns on backend)"
  );
}

// ===== Check-in / Check-out =====

export async function checkInJob(
  jobId: number,
  latitude: number,
  longitude: number
): Promise<any> {
  const payload = { latitude, longitude };

  const data = await apiFetch<any>(`/api/jobs/${jobId}/check-in/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  console.log("[checkInJob] response:", data);
  return data;
}

export async function checkOutJob(
  jobId: number,
  latitude: number,
  longitude: number
): Promise<any> {
  const payload = { latitude, longitude };

  const data = await apiFetch<any>(`/api/jobs/${jobId}/check-out/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  console.log("[checkOutJob] response:", data);
  return data;
}

// ===== Checklist API =====

/**
 * Основной путь: bulk update
 * POST /api/jobs/<job_id>/checklist/bulk/
 * body: { items: [{id, is_completed}, ...] }
 *
 * Возвращаем массив JobChecklistItem[] если backend его явно отдаёт.
 * Если нет — возвращаем [], чтобы экран использовал локальный optimistic state.
 */
export async function updateJobChecklistBulk(
  jobId: number,
  items: { id: number; is_completed: boolean }[]
): Promise<JobChecklistItem[]> {
  const payload = { items };

  const data = await apiFetch<any>(`/api/jobs/${jobId}/checklist/bulk/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  console.log("[updateJobChecklistBulk] raw response:", data);

  // backend может вернуть:
  // - { items: [...] }
  // - { checklist_items: [...] }
  // - сразу массив [...]
  const list =
    data?.items ??
    data?.checklist_items ??
    (Array.isArray(data) ? data : null);

  if (Array.isArray(list)) {
    return list as JobChecklistItem[];
  }

  // Если формат не распознали — ничего не меняем на основе ответа
  // и позволяем экрану оставить свой локальный `next`
  return [];
}

/**
 * Fallback: toggle одного пункта
 * POST /api/jobs/<job_id>/checklist/<item_id>/toggle/
 *
 * Оставляем поддержку payload с is_completed (даже если backend его не требует).
 */
export async function toggleJobChecklistItem(
  jobId: number,
  itemId: number,
  isCompleted: boolean
): Promise<{ id: number; job_id: number; is_completed: boolean }> {
  const payload = { is_completed: isCompleted };

  const data = await apiFetch<{
    id: number;
    job_id: number;
    is_completed: boolean;
  }>(`/api/jobs/${jobId}/checklist/${itemId}/toggle/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  console.log("[toggleJobChecklistItem] response:", data);
  return data;
}

// backward-compatible export (чтобы старый импорт не ломался)
export async function toggleChecklistItem(
  jobId: number,
  itemId: number,
  isCompleted: boolean
): Promise<{ id: number; job_id: number; is_completed: boolean }> {
  return toggleJobChecklistItem(jobId, itemId, isCompleted);
}

// ===== Фото before / after =====

export async function fetchJobPhotos(jobId: number): Promise<JobPhoto[]> {
  const data = await apiFetch<JobPhoto[]>(`/api/jobs/${jobId}/photos/`, {
    method: "GET",
  });

  console.log("[fetchJobPhotos] raw:", data);
  return data ?? [];
}

/**
 * Загрузка фото для job:
 *   jobId      — ID задачи
 *   photoType  — "before" | "after"
 *   uri        — file:// URI, который вернул ImagePicker
 */
export async function uploadJobPhoto(
  jobId: number,
  photoType: "before" | "after",
  uri: string
): Promise<any> {
  if (!uri) {
    console.log("[uploadJobPhoto] called with empty uri");
    throw new Error("Internal error: photo URI is missing");
  }

  const form = new FormData();

  // тип фото — критичное поле
  form.append("photo_type", photoType);

  // имя файла
  const name = uri.split("/").pop() || `${photoType}.jpg`;
  const ext = name.split(".").pop()?.toLowerCase();
  const type =
    ext === "png"
      ? "image/png"
      : ext === "heic"
      ? "image/heic"
      : "image/jpeg";

  const fileObj: any = {
    uri,
    name,
    type,
  };

  // Бэкенд ждёт файл в поле "file"
  form.append("file", fileObj);

  // ВАЖНО: не ставим Content-Type руками — apiFetch сам определит FormData
  console.log("[uploadJobPhoto] sending form", {
    jobId,
    photoType,
    uri,
    name,
    type,
  });

  const data = await apiFetch<any>(`/api/jobs/${jobId}/photos/`, {
    method: "POST",
    body: form,
  });

  console.log("[uploadJobPhoto] response:", data);
  return data;
}
