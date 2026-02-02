// dubai-control/src/pages/Analytics.tsx

import { CalendarDays } from "lucide-react";
import { AnalyticsKPICard } from "@/components/analytics/AnalyticsKPICard";
import { JobsTrendChart } from "@/components/analytics/JobsTrendChart";
import { DurationTrendChart } from "@/components/analytics/DurationTrendChart";
import { ProofCompletionChart } from "@/components/analytics/ProofCompletionChart";
import { CleanerPerformanceTable } from "@/components/analytics/CleanerPerformanceTable";
import { CleanerComparisonChart } from "@/components/analytics/CleanerComparisonChart";
import {
  kpiData,
  trendData,
  cleanerPerformance,
} from "@/data/analyticsData";

function Analytics() {
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
            All times shown in GST (UTC+4) • Data refreshed every 15 minutes
          </p>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
