// dubai-control/src/pages/Analytics.tsx

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

import { AnalyticsKPICard } from "@/components/analytics/AnalyticsKPICard";
import { JobsTrendChart } from "@/components/analytics/JobsTrendChart";
import { DurationTrendChart } from "@/components/analytics/DurationTrendChart";
import { ProofCompletionChart } from "@/components/analytics/ProofCompletionChart";
import { CleanerPerformanceTable } from "@/components/analytics/CleanerPerformanceTable";
import { CleanerComparisonChart } from "@/components/analytics/CleanerComparisonChart";

import { apiClient } from "@/api/client";

import {
  kpiData as staticKpiData,
  trendData as staticTrendData,
  cleanerPerformance as staticCleanerPerformance,
} from "@/data/analyticsData";

import type {
  KPIData,
  TrendDataPoint,
  CleanerPerformance,
} from "@/data/analyticsData";

function Analytics() {
  // стейт с дефолтами из моков
  const [kpiData, setKpiData] = useState<KPIData[]>(staticKpiData);
  const [trendData] = useState<TrendDataPoint[]>(staticTrendData); // пока статично
  const [cleanerPerformance, setCleanerPerformance] =
    useState<CleanerPerformance[]>(staticCleanerPerformance);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // пока хардкод, потом можно сделать date-picker
        const dateFrom = "2026-01-01";
        const dateTo = "2026-02-02";

        // ВАЖНО: ходим ровно туда же, куда ты ходишь curl-ом
        const summaryUrl = `/api/manager/analytics/summary/?date_from=${dateFrom}&date_to=${dateTo}`;
        const cleanersUrl = `/api/manager/analytics/cleaners-performance/?date_from=${dateFrom}&date_to=${dateTo}`;

        // параллельно дергаем оба эндпоинта
        const [summaryRes, cleanersRes] = await Promise.all([
          apiClient.get(summaryUrl),
          apiClient.get(cleanersUrl),
        ]);

        const summary = summaryRes.data;
        const cleaners = cleanersRes.data;

        // summary → KPI карточки
        setKpiData([
          {
            ...staticKpiData[0],
            value: String(summary.jobs_completed ?? 0),
          },
          {
            ...staticKpiData[1],
            value: `${Math.round(
              (summary.on_time_completion_rate ?? 0) * 100,
            )}%`,
          },
          {
            ...staticKpiData[2],
            value: `${Math.round(
              (summary.proof_completion_rate ?? 0) * 100,
            )}%`,
          },
          {
            ...staticKpiData[3],
            value: `${(summary.avg_job_duration_hours ?? 0).toFixed(1)} hrs`,
          },
          {
            ...staticKpiData[4],
            value: String(summary.issues_detected ?? 0),
          },
        ]);

        // cleaners → таблица и бар-чарт
        const mappedCleaners: CleanerPerformance[] = Array.isArray(cleaners)
          ? cleaners.map((c: any, idx: number) => ({
              id: c.cleaner_id ?? idx,
              name: c.cleaner_name ?? "Unknown",
              jobsCompleted: c.jobs_completed ?? 0,
              avgDuration: c.avg_job_duration_hours ?? 0,
              onTimeRate: Math.round((c.on_time_rate ?? 0) * 100),
              proofCompletionRate: Math.round((c.proof_rate ?? 0) * 100),
              issuesCount: c.issues ?? 0,
            }))
          : staticCleanerPerformance;

        setCleanerPerformance(mappedCleaners);
      } catch (err) {
        console.error("[Analytics] Failed to load analytics", err);
        setError("Failed to load analytics");
        // на ошибке оставляем статику, чтобы экран не разваливался
        setKpiData(staticKpiData);
        setCleanerPerformance(staticCleanerPerformance);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Analytics
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Operational performance and proof of work metrics
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-card">
              <CalendarDays className="h-4 w-4" />
              <span>Last 14 days</span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <section className="mb-10">
          {error && (
            <p className="mb-2 text-sm text-red-500">
              {error}
            </p>
          )}
          <div
            className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 ${
              loading ? "opacity-70" : "opacity-100"
            }`}
          >
            {kpiData.map((kpi, index) => (
              <AnalyticsKPICard key={index} data={kpi} />
            ))}
          </div>
        </section>

        {/* Trends Section */}
        <section className="mb-10">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Trends</h2>
            <p className="text-sm text-muted-foreground">
              Job completion and performance over time
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <JobsTrendChart data={trendData} />
            <DurationTrendChart data={trendData} />
          </div>
          <div className="mt-6">
            <ProofCompletionChart data={trendData} />
          </div>
        </section>

        {/* Performance Breakdown */}
        <section>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              Performance Breakdown
            </h2>
            <p className="text-sm text-muted-foreground">
              Cleaner metrics and comparison
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CleanerPerformanceTable data={cleanerPerformance} />
            </div>
            <CleanerComparisonChart data={cleanerPerformance} />
          </div>
        </section>

        {/* Footer note */}
        <div className="mt-10 border-t border-border pt-6">
          <p className="text-center text-xs text-muted-foreground">
            All times shown in GST (UTC+4) • Data refreshed on page load
          </p>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
