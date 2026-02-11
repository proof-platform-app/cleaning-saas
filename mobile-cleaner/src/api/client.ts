// mobile-cleaner/src/api/client.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Mobile API client — Execution Core (Layer 1)
 *
 * Этот модуль — единственная точка общения мобильного приложения с backend
 * для:
 * - логина клинера;
 * - получения списка задач на сегодня;
 * - детальной информации по job;
 * - check-in / check-out;
 * - чек-листа;
 * - фото (before / after);
 * - PDF-отчёта.
 *
 * ВАЖНО:
 * - Любое изменение формата payload’ов или URL может сломать:
 *   - backend-валидацию (Phase 9 photos, GPS, checklist),
 *   - Manager Portal (Job Details / Planning),
 *   - PDF-отчёты.
 * - Перед изменениями:
 *   - проверять backend/apps/api/*,
 *   - проверять контракты, описанные в MASTER BRIEF / PRD,
 *   - прогонять полный флоу: Login → Today Jobs → Job Details → Check-in → Photos → Checklist → Check-out → PDF.
 */

// Базовый URL API (IP твоего Mac + порт backend'а)
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.0.162:8000";


// ===== Auth token — memory + AsyncStorage =====

const AUTH_TOKEN_KEY = "@auth_token";

type AuthState = {
  token: string | null;
};

const auth: AuthState = {
  token: null,
};

/**
 * setAuthToken — stores the token in memory AND persists it to AsyncStorage.
 * Pass null to clear (logout).
 */
export function setAuthToken(token: string | null) {
  auth.token = token;
  if (token) {
    AsyncStorage.setItem(AUTH_TOKEN_KEY, token).catch((err) => {
      console.warn("[setAuthToken] AsyncStorage.setItem failed:", err);
    });
  } else {
    AsyncStorage.removeItem(AUTH_TOKEN_KEY).catch((err) => {
      console.warn("[setAuthToken] AsyncStorage.removeItem failed:", err);
    });
  }
}

export function getAuthToken() {
  return auth.token;
}

/**
 * loadStoredToken — called once at app startup to hydrate the in-memory token
 * from AsyncStorage. Returns the token if found, null otherwise.
 */
export async function loadStoredToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      auth.token = token;
    }
    return token ?? null;
  } catch (err) {
    console.warn("[loadStoredToken] AsyncStorage.getItem failed:", err);
    return null;
  }
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

/**
 * apiFetch — единственный низкоуровневый helper для запросов.
 *
 * ВАЖНО:
 * - Отвечает за:
 *   - подстановку Authorization: Token <token>;
 *   - корректный Content-Type (JSON vs FormData);
 *   - единый формат ошибок (ApiError с .status и .details).
 *
 * НЕЛЬЗЯ:
 * - Ставить Content-Type руками для FormData (ломает boundary);
 * - менять формат выбрасываемых ошибок (ожидается Error с .status);
 * - читать body более одного раза.
 */

// TODO (offline groundwork):
// If a request fails due to network connectivity,
// certain actions (checklist updates, photo uploads)
// may be enqueued into an offline outbox instead of throwing.
// Check-in / check-out must never be queued.

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

/**
 * loginCleaner
 *
 * POST /api/auth/login/
 * body: { email, password }
 *
 * Возвращает token и кладёт его в in-memory storage.
 * НЕЛЬЗЯ:
 * - менять URL без синхронизации с backend;
 * - менять формат { token } → это ломает весь login-flow.
 */
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

/**
 * fetchCleanerTodayJobs
 *
 * GET /api/jobs/today/
 *
 * Возвращает плоский список задач, в том числе:
 * - id
 * - status
 * - scheduled_date / time
 * - location__name (плоское поле, на котором уже сидит UI).
 *
 * НЕЛЬЗЯ:
 * - придумывать здесь новый формат location;
 * - маппить в другой shape (UI знает про location__name).
 */
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

/**
 * fetchJobDetail
 *
 * Основной источник правды для Job Details Screen.
 *
 * Важно:
 * - Пытается несколько URL-кандидатов (legacy support),
 * - Возвращает JobDetail с checklist_items, check_events и фото-URL.
 *
 * НЕЛЬЗЯ:
 * - менять порядок кандидатов без ревью backend;
 * - убирать fallback’и, пока на backend не зафиксирован финальный URL.
 */
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

/**
 * checkInJob
 *
 * POST /api/jobs/<id>/check-in/
 * body: { latitude, longitude }
 *
 * Связан с:
 * - GPS-валидацией (≤ 100 м),
 * - сменой статуса scheduled → in_progress,
 * - созданием JobCheckEvent.
 *
 * НЕЛЬЗЯ:
 * - вызывать без координат,
 * - менять ключи в payload (latitude / longitude),
 * - переименовывать URL.
 */
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

/**
 * checkOutJob
 *
 * POST /api/jobs/<id>/check-out/
 * body: { latitude, longitude }
 *
 * Связан с:
 * - финализацией job (in_progress → completed),
 * - проверкой чек-листа и фото на backend,
 * - итоговым PDF-отчётом.
 *
 * НЕЛЬЗЯ:
 * - вызывать без координат,
 * - менять URL или структуру payload,
 * - пытаться "обойти" backend-валидацию через этот слой.
 */
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
 *
 * НЕЛЬЗЯ:
 * - менять структуру payload (id, is_completed),
 * - переименовывать поле items,
 * - интерпретировать ответ "как попало" (здесь уже все варианты учтены).
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
 *
 * НЕЛЬЗЯ:
 * - менять URL-структуру;
 * - убирать поле is_completed из payload;
 * - менять ожидаемый формат ответа (id, job_id, is_completed).
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

/**
 * fetchJobPhotos
 *
 * GET /api/jobs/<job_id>/photos/
 *
 * Возвращает массив JobPhoto:
 * - photo_type ("before" | "after"),
 * - file_url / url,
 * - created_at.
 *
 * НЕЛЬЗЯ:
 * - менять URL;
 * - маппить структуру ответа (UI сам решает, что брать: file_url или url).
 */
export async function fetchJobPhotos(jobId: number): Promise<JobPhoto[]> {
  const data = await apiFetch<JobPhoto[]>(`/api/jobs/${jobId}/photos/`, {
    method: "GET",
  });

  return data ?? [];
}

/**
 * uploadJobPhoto
 *
 * Загрузка фото для job:
 *   jobId      — ID задачи
 *   photoType  — "before" | "after"
 *   uri        — file:// URI, который вернул ImagePicker
 *
 * Связано с backend Phase 9:
 * - exactly 2 photos (before / after),
 * - after нельзя без before,
 * - EXIF / GPS-валидация.
 *
 * НЕЛЬЗЯ:
 * - менять имена полей:
 *   - "photo_type"
 *   - "file"
 * - ставить Content-Type руками (ломает FormData);
 * - передавать что-то кроме file://-uri от ImagePicker.
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

// ===== PDF report =====

/**
 * fetchJobReportPdf
 *
 * POST /api/jobs/<job_id>/report/pdf/
 *
 * Возвращает бинарный PDF как ArrayBuffer (для дальнейшего сохранения / шаринга).
 *
 * НЕЛЬЗЯ:
 * - менять метод (POST → GET) без синхронизации с backend;
 * - пытаться парсить JSON здесь — этот вызов всегда должен возвращать бинарь;
 * - завязывать сюда бизнес-логику (валидации делаются до генерации отчёта).
 */
export async function fetchJobReportPdf(jobId: number): Promise<ArrayBuffer> {
  const url = `${API_BASE_URL}/api/jobs/${jobId}/report/pdf/`;

  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Token ${token}`;

  const resp = await fetch(url, {
    method: "POST",
    headers,
  });

  if (!resp.ok) {
    const raw = await resp.text().catch(() => "");
    throw new Error(raw || `Failed to fetch PDF report (HTTP ${resp.status})`);
  }

  return await resp.arrayBuffer();
}
