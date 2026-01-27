import { apiClient } from "@/api/client";
import type {
  PlanningFilters,
  PlanningJob,
  PlanningJobStatus,
} from "@/types/planning";

type BackendManagerJob = {
  id: number;
  status: "scheduled" | "in_progress" | "completed";
  scheduled_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  location: {
    id: number;
    name: string;
    address: string;
  };
  cleaner: {
    id: number;
    full_name: string;
    phone?: string | null;
  };
  proof?: {
    before_uploaded?: boolean;
    after_uploaded?: boolean;
    checklist_completed?: boolean;

    // на всякий случай — если где-то прилетает старый формат
    before_photo?: boolean;
    after_photo?: boolean;
    checklist?: boolean;
  };
};

function encodeQS(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return qs.toString();
}

function mapBackendJobToPlanningJob(j: BackendManagerJob): PlanningJob {
  const before = j.proof?.before_uploaded ?? j.proof?.before_photo ?? false;
  const after = j.proof?.after_uploaded ?? j.proof?.after_photo ?? false;
  const checklist =
    j.proof?.checklist_completed ?? j.proof?.checklist ?? false;

  return {
    id: j.id,
    status: j.status,
    scheduled_date: j.scheduled_date,
    scheduled_start_time: j.scheduled_start_time,
    scheduled_end_time: j.scheduled_end_time,
    location: j.location,
    cleaner: {
      id: j.cleaner.id,
      full_name: j.cleaner.full_name,
      phone: j.cleaner.phone ?? null,
    },
    proof: {
      check_in: false,
      before_photo: Boolean(before),
      checklist: Boolean(checklist),
      after_photo: Boolean(after),
      check_out: false,
    },
  };
}

export async function fetchPlanningJobs(
  filters: PlanningFilters
): Promise<PlanningJob[]> {
  const qs = encodeQS({ date: filters.date });

  const res = await apiClient.get<BackendManagerJob[]>(
    `/api/manager/jobs/planning/?${qs}`
  );

  const jobs = res.data.map(mapBackendJobToPlanningJob);

  const byStatus =
    filters.statuses.length === 0
      ? jobs
      : jobs.filter((j) => filters.statuses.includes(j.status));

  return byStatus;
}

// ===== NEW: meta + create job =====

export type PlanningMeta = {
  cleaners: { id: number; full_name: string; phone: string | null }[];
  locations: { id: number; name: string; address: string | null }[];
  checklist_templates: { id: number; name: string }[];
};

export type CreateJobPayload = {
  scheduled_date: string; // "2026-01-19"
  scheduled_start_time: string; // "09:00:00"
  scheduled_end_time: string; // "12:00:00"
  location_id: number;
  cleaner_id: number;
  checklist_template_id: number | null;
};

type BackendCreatedJob = {
  id: number;
  scheduled_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  status: "scheduled" | "in_progress" | "completed";
  location: { id: number; name: string; address: string };
  cleaner: { id: number; full_name: string; phone?: string | null };
  proof?: {
    before_photo?: boolean;
    after_photo?: boolean;
    checklist?: boolean;
  };
};

// Ошибка, которую будем кидать при истёкшем trial
export type TrialExpiredError = Error & {
  code?: string;
};

export async function fetchPlanningMeta(): Promise<PlanningMeta> {
  const res = await apiClient.get<PlanningMeta>("/api/manager/meta/");
  return res.data;
}

export async function createPlanningJob(
  payload: CreateJobPayload
): Promise<PlanningJob> {
  try {
    const res = await apiClient.post<BackendCreatedJob>(
      "/api/manager/jobs/",
      payload
    );

    const created = res.data;

    return {
      id: created.id,
      status: created.status,
      scheduled_date: created.scheduled_date,
      scheduled_start_time: created.scheduled_start_time,
      scheduled_end_time: created.scheduled_end_time,
      location: created.location,
      cleaner: {
        id: created.cleaner.id,
        full_name: created.cleaner.full_name,
        phone: created.cleaner.phone ?? null,
      },
      proof: {
        check_in: false,
        before_photo: Boolean(created.proof?.before_photo),
        checklist: Boolean(created.proof?.checklist),
        after_photo: Boolean(created.proof?.after_photo),
        check_out: false,
      },
    };
  } catch (error: any) {
    // axios-ошибка с ответом от бэка
    const status = error?.response?.status;
    const data = error?.response?.data;

    if (status === 403) {
      if (data?.code === "trial_expired") {
        const err: TrialExpiredError = new Error(
          data?.detail ||
            "Your free trial has ended. You can still view existing jobs and download reports, but creating new jobs requires an upgrade."
        );
        err.code = "trial_expired";
        throw err;
      }

      const err: TrialExpiredError = new Error(
        data?.detail || "You are not allowed to create jobs."
      );
      err.code = data?.code || "forbidden";
      throw err;
    }

    // всё остальное — как обычная ошибка
    throw error;
  }
}

// ===============================
// Jobs History
// ===============================

export type JobsHistoryFilters = {
  dateFrom: string; // "YYYY-MM-DD"
  dateTo: string; // "YYYY-MM-DD"
  status?: PlanningJobStatus;
  cleanerId?: number | null;
  locationId?: number | null;
};

export async function fetchJobsHistory(
  filters: JobsHistoryFilters
): Promise<PlanningJob[]> {
  const params = new URLSearchParams({
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
  });

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.cleanerId) {
    params.set("cleaner_id", String(filters.cleanerId));
  }

  if (filters.locationId) {
    params.set("location_id", String(filters.locationId));
  }

  const res = await apiClient.get<PlanningJob[]>(
    `/api/manager/jobs/history/?${params.toString()}`
  );

  return res.data;
}
