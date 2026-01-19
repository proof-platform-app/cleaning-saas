// dubai-control/src/api/planning.ts
import { apiClient } from "@/api/client";
import type { PlanningFilters, PlanningJob } from "@/types/planning";

type BackendManagerJob = {
  id: number;
  status: "scheduled" | "in_progress" | "completed";
  scheduled_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  location: {
    id: number | null;
    name: string | null;
    address: string | null;
  };
  cleaner: {
    id: number | null;
    full_name: string | null;
    // на бекенде phone в planning-эндпоинте может не прилетать
    phone?: string | null;
  };
  proof: {
    before_uploaded: boolean;
    after_uploaded: boolean;
    checklist_completed: boolean;
  };
};

function encodeQS(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return qs.toString();
}

export async function fetchPlanningJobs(
  filters: PlanningFilters
): Promise<PlanningJob[]> {
  const qs = encodeQS({ date: filters.date });

  const res = await apiClient.get<BackendManagerJob[]>(
    `/api/manager/jobs/planning/?${qs}`
  );

  const jobs: PlanningJob[] = res.data.map((j) => ({
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
      check_in: j.status === "in_progress" || j.status === "completed",
      before_photo: j.proof.before_uploaded,
      checklist: j.proof.checklist_completed,
      after_photo: j.proof.after_uploaded,
      check_out: j.status === "completed",
    },
  }));

  const byStatus =
    filters.statuses.length === 0
      ? jobs
      : jobs.filter((j) => filters.statuses.includes(j.status));

  return byStatus;
}
