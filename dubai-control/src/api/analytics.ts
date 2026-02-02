// dubai-control/src/api/analytics.ts
import { apiClient } from "@/api/client";

export type AnalyticsDateRange = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
};

// 1) Summary — верхние KPI карточки
// GET /api/manager/analytics/summary/
export type AnalyticsSummaryResponse = {
  jobs_completed: number;
  on_time_completion_rate: number;   // 0–1
  proof_completion_rate: number;     // 0–1
  avg_job_duration_hours: number;
  issues_detected: number;
};

export function getAnalyticsSummary(params: AnalyticsDateRange) {
  return apiClient.get<AnalyticsSummaryResponse>(
    "/api/manager/analytics/summary/",
    { params },
  );
}

// 2) Jobs Completed — дневной тренд
// GET /api/manager/analytics/jobs-completed/
export type AnalyticsJobsCompletedPoint = {
  date: string;          // YYYY-MM-DD
  jobs_completed: number;
};

export function getAnalyticsJobsCompleted(params: AnalyticsDateRange) {
  return apiClient.get<AnalyticsJobsCompletedPoint[]>(
    "/api/manager/analytics/jobs-completed/",
    { params },
  );
}

// 3) Average Job Duration — тренд
// GET /api/manager/analytics/job-duration/
export type AnalyticsJobDurationPoint = {
  date: string;               // YYYY-MM-DD
  avg_job_duration_hours: number;
};

export function getAnalyticsJobDuration(params: AnalyticsDateRange) {
  return apiClient.get<AnalyticsJobDurationPoint[]>(
    "/api/manager/analytics/job-duration/",
    { params },
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

export function getAnalyticsProofCompletion(params: AnalyticsDateRange) {
  return apiClient.get<AnalyticsProofCompletionPoint[]>(
    "/api/manager/analytics/proof-completion/",
    { params },
  );
}

// 5) Cleaner Performance
// GET /api/manager/analytics/cleaners-performance/
export type AnalyticsCleanerPerformanceItem = {
  cleaner_id: number;
  cleaner_name: string;
  jobs_completed: number;
  avg_duration_hours: number;
  on_time_rate: number;   // 0–1
  proof_rate: number;     // 0–1
  issues: number;
};

export function getAnalyticsCleanersPerformance(params: AnalyticsDateRange) {
  return apiClient.get<AnalyticsCleanerPerformanceItem[]>(
    "/api/manager/analytics/cleaners-performance/",
    { params },
  );
}
