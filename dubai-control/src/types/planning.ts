// dubai-control/src/types/plannig.ts
export type PlanningJobStatus = "scheduled" | "in_progress" | "completed";

export type PlanningProof = {
  check_in: boolean;
  before_photo: boolean;
  checklist: boolean;
  after_photo: boolean;
  check_out: boolean;
};

export type PlanningJob = {
  id: number;
  status: PlanningJobStatus;
  scheduled_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;

  // ✅ новое поле из backend
  sla_status?: "ok" | "violated";
  sla_reasons?: string[];

  // 🔹 чеклист-шаблон, привязанный к job
  checklist_template?: {
    id: number | null;
    name: string | null;
  } | null;

  // 🔹 полный список пунктов чеклиста для этой job
  checklist_items?: string[] | null;

  location: {
    id: number | null;
    name: string | null;
    address: string | null;
  };

  cleaner: {
    id: number | null;
    full_name: string | null;
    phone?: string | null;
  };

  proof: PlanningProof;
};

export type PlanningFilters = {
  date: string; // "YYYY-MM-DD"
  cleanerIds: number[];
  locationId: number | null;
  statuses: PlanningJobStatus[];
};

// ---- Performance (SLA summary) ----

// Фильтры для performance-экрана
export type PerformanceFilters = {
  dateFrom: string; // "YYYY-MM-DD"
  dateTo: string;   // "YYYY-MM-DD"
};

// Один элемент агрегата (и для клинеров, и для локаций)
export type PerformanceStatItem = {
  id: number;
  name: string;
  jobs_total: number;
  jobs_with_sla_violations: number;
};

// Payload от /api/manager/performance/
export type PerformanceSummary = {
  date_from: string;
  date_to: string;
  cleaners: PerformanceStatItem[];
  locations: PerformanceStatItem[];
};
