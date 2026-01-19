import { apiClient } from "@/api/client";
import type { PlanningFilters, PlanningJob } from "@/types/planning";

type BackendManagerJob = {
  id: number;
  status: "scheduled" | "in_progress" | "completed";
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  location: {
    id: number | null;
    name: string | null;
    address: string | null;
  };
  cleaner: {
    id: number | null;
    full_name: string | null;
    phone: string | null;
  };
};

export async function fetchPlanningJobs(filters: PlanningFilters): Promise<PlanningJob[]> {
  // MVP: бекенд пока отдаёт today. Поэтому:
  // 1) тянем today
  // 2) если выбрали дату не today — просто показываем пусто (или позже добавим эндпоинт по дате)
  const res = await apiClient.get<BackendManagerJob[]>("/api/manager/jobs/today/");

  // Преобразуем в PlanningJob + добавим proof (пока как заглушки false)
  // Позже расширим бэкенд, чтобы реально считать proof по данным job detail.
  const jobs: PlanningJob[] = res.data.map((j) => ({
    id: j.id,
    status: j.status,
    scheduled_date: j.scheduled_date,
    scheduled_start_time: j.scheduled_start_time ?? null,
    scheduled_end_time: j.scheduled_end_time ?? null,
    location: j.location,
    cleaner: j.cleaner,
    proof: {
      check_in: false,
      before_photo: false,
      checklist: false,
      after_photo: false,
      check_out: false,
    },
  }));

  // Фильтр по статусам (если выбраны)
  const byStatus =
    filters.statuses.length === 0
      ? jobs
      : jobs.filter((j) => filters.statuses.includes(j.status));

  // Фильтр по дате:
  // сейчас бекенд отдаёт только today, поэтому:
  return byStatus.filter((j) => j.scheduled_date === filters.date);
}
