// dubai-control/src/api/performance.ts

import { apiClient } from "@/api/client";
import type {
  PerformanceFilters,
  PerformanceSummary,
} from "@/types/planning";

export type PerformanceCleanerRow = {
  id: number;
  name: string;
  jobs_total: number;
  jobs_with_sla_violations: number;
  violation_rate: number;
  has_repeated_violations: boolean;
};

export type PerformanceLocationRow = {
  id: number;
  name: string;
  jobs_total: number;
  jobs_with_sla_violations: number;
  violation_rate: number;
  has_repeated_violations: boolean;
};

/**
 * Fetch SLA performance summary
 * Backend: GET /api/manager/performance/
 */
export async function fetchPerformanceSummary(
  filters: PerformanceFilters
): Promise<PerformanceSummary> {
  const params = new URLSearchParams({
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
  });

  const res = await apiClient.get<PerformanceSummary>(
    `/api/manager/performance/?${params.toString()}`
  );

  return res.data;
}
