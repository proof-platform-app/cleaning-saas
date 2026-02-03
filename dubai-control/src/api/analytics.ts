// dubai-control/src/api/analytics.ts
import { apiClient } from "@/api/client";

export type AnalyticsDateRange = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
};

// вспомогательный хелпер: формируем ?date_from=...&date_to=...
function buildRangeQuery(range: AnalyticsDateRange): string {
  const params = new URLSearchParams();
  params.set("date_from", range.from);
  params.set("date_to", range.to);

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// 1) Summary — верхние KPI карточки
// GET /api/manager/analytics/summary/
export type AnalyticsSummaryResponse = {
  jobs_completed: number;
  on_time_completion_rate: number;   // 0–1
  proof_completion_rate: number;     // 0–1
  avg_job_duration_hours: number;
  issues_detected: number;
};

export function getAnalyticsSummary(range: AnalyticsDateRange) {
  const qs = buildRangeQuery(range);
  return apiClient.get<AnalyticsSummaryResponse>(
    `/api/manager/analytics/summary/${qs}`,
  );
}

// 2) Jobs Completed — дневной тренд
// GET /api/manager/analytics/jobs-completed/
export type AnalyticsJobsCompletedPoint = {
  date: string;          // YYYY-MM-DD
  jobs_completed: number;
};

export function getAnalyticsJobsCompleted(range: AnalyticsDateRange) {
  const qs = buildRangeQuery(range);
  return apiClient.get<AnalyticsJobsCompletedPoint[]>(
    `/api/manager/analytics/jobs-completed/${qs}`,
  );
}

// 3) Average Job Duration — тренд
// GET /api/manager/analytics/job-duration/
export type AnalyticsJobDurationPoint = {
  date: string;               // YYYY-MM-DD
  avg_job_duration_hours: number;
};

export function getAnalyticsJobDuration(range: AnalyticsDateRange) {
  const qs = buildRangeQuery(range);
  return apiClient.get<AnalyticsJobDurationPoint[]>(
    `/api/manager/analytics/job-duration/${qs}`,
  );
}

// 4) Proof Completion Trend
// GET /api/manager/analytics/proof-completion/
export type AnalyticsProofCompletionPoint = {
  date: string;           // YYYY-MM-DD
  before_photo_rate: number;   // 0–1
  after_photo_rate: number;    // 0–1
  checklist_rate: number;      // 0–1
};

export function getAnalyticsProofCompletion(range: AnalyticsDateRange) {
  const qs = buildRangeQuery(range);
  return apiClient.get<AnalyticsProofCompletionPoint[]>(
    `/api/manager/analytics/proof-completion/${qs}`,
  );
}

// 5) Cleaner Performance
// GET /api/manager/analytics/cleaners-performance/
export type AnalyticsCleanerPerformanceItem = {
  cleaner_id: number;
  cleaner_name: string;
  jobs_completed: number;
  avg_job_duration_hours: number; // совпадает с backend
  on_time_rate: number;           // 0–1
  proof_rate: number;             // 0–1
  issues: number;
};

export function getAnalyticsCleanersPerformance(range: AnalyticsDateRange) {
  const qs = buildRangeQuery(range);
  return apiClient.get<AnalyticsCleanerPerformanceItem[]>(
    `/api/manager/analytics/cleaners-performance/${qs}`,
  );
}

// 6) SLA Breakdown — причины нарушений и "hotspots"
// GET /api/manager/analytics/sla-breakdown/

export type AnalyticsSlaReason = {
  code: string;
  count: number;
};

export type AnalyticsSlaActorStats = {
  cleaner_id?: number | null;
  cleaner_name?: string;
  location_id?: number | null;
  location_name?: string;
  jobs_completed: number;
  violations_count: number;
  violation_rate: number; // 0–1
};

export type AnalyticsSlaBreakdownResponse = {
  jobs_completed: number;
  violations_count: number;
  violation_rate: number; // 0–1
  reasons: AnalyticsSlaReason[];
  top_cleaners: AnalyticsSlaActorStats[];
  top_locations: AnalyticsSlaActorStats[];
};

export function getAnalyticsSlaBreakdown(range: AnalyticsDateRange) {
  const qs = buildRangeQuery(range);
  return apiClient.get<AnalyticsSlaBreakdownResponse>(
    `/api/manager/analytics/sla-breakdown/${qs}`,
  );
}

