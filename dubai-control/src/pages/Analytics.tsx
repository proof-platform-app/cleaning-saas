// dubai-control/src/pages/Analytics.tsx

import { useEffect, useState } from "react";
// 🔹 NEW: добавили ShieldAlert и AlertTriangle
import { CalendarDays, ShieldAlert, AlertTriangle } from "lucide-react";

import { AnalyticsKPICard } from "@/components/analytics/AnalyticsKPICard";
import { JobsTrendChart } from "@/components/analytics/JobsTrendChart";
import { DurationTrendChart } from "@/components/analytics/DurationTrendChart";
import { ProofCompletionChart } from "@/components/analytics/ProofCompletionChart";
import { CleanerPerformanceTable } from "@/components/analytics/CleanerPerformanceTable";
import { CleanerComparisonChart } from "@/components/analytics/CleanerComparisonChart";

import {
  getAnalyticsSummary,
  getAnalyticsJobsCompleted,
  getAnalyticsJobDuration,
  getAnalyticsProofCompletion,
  getAnalyticsCleanersPerformance,
  // 🔹 NEW: импортируем SLA breakdown
  getAnalyticsSlaBreakdown,
  type AnalyticsDateRange,
  type AnalyticsSlaBreakdownResponse,
} from "@/api/analytics";

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

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

type RangePreset = "last7" | "last14" | "last30";

// 🔹 NEW: helper для красивых названий причин
function formatReasonCode(code: string): string {
  const map: Record<string, string> = {
    late_start: "Late start",
    early_leave: "Early leave",
    missing_before_photo: "Missing before photo",
    missing_after_photo: "Missing after photo",
    checklist_not_completed: "Checklist not completed",
  };

  if (map[code]) return map[code];

  return code
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function getDateRangeFromPreset(preset: RangePreset): AnalyticsDateRange {
  const today = new Date();
  const end = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  let days = 14;
  if (preset === "last7") days = 7;
  if (preset === "last30") days = 30;

  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));

  const to = end.toISOString().slice(0, 10); // YYYY-MM-DD
  const from = start.toISOString().slice(0, 10);

  return { from, to };
}

function dateRangeToApiRange(range: DateRange): AnalyticsDateRange | null {
  if (!range.from || !range.to) return null;

  const fromUtc = new Date(
    Date.UTC(
      range.from.getFullYear(),
      range.from.getMonth(),
      range.from.getDate(),
    ),
  );
  const toUtc = new Date(
    Date.UTC(
      range.to.getFullYear(),
      range.to.getMonth(),
      range.to.getDate(),
    ),
  );

  return {
    from: fromUtc.toISOString().slice(0, 10),
    to: toUtc.toISOString().slice(0, 10),
  };
}

function Analytics() {
  // стейт с дефолтами из моков
  const [rangePreset, setRangePreset] = useState<RangePreset>("last14");
  const [range, setRange] = useState<AnalyticsDateRange>(
    getDateRangeFromPreset("last14"),
  );
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();

  const [kpiData, setKpiData] = useState<KPIData[]>(staticKpiData);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>(staticTrendData);
  const [cleanerPerformance, setCleanerPerformance] =
    useState<CleanerPerformance[]>(staticCleanerPerformance);

  // 🔹 NEW: SLA breakdown из бэкенда
  const [slaBreakdown, setSlaBreakdown] =
    useState<AnalyticsSlaBreakdownResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        // параллельно дергаем все нужные эндпоинты
        const [
          summaryRes,
          cleanersRes,
          jobsCompletedRes,
          jobDurationRes,
          proofRes,
          // 🔹 NEW: sla-breakdown
          slaRes,
        ] = await Promise.all([
          getAnalyticsSummary(range),
          getAnalyticsCleanersPerformance(range),
          getAnalyticsJobsCompleted(range),
          getAnalyticsJobDuration(range),
          getAnalyticsProofCompletion(range),
          getAnalyticsSlaBreakdown(range),
        ]);

        const summary = summaryRes.data;
        const cleaners = cleanersRes.data;
        const jobsCompleted = jobsCompletedRes.data;
        const jobDuration = jobDurationRes.data;
        const proofTrend = proofRes.data;
        const sla = slaRes.data as AnalyticsSlaBreakdownResponse;

        // --- KPI из summary ---
        setKpiData([
          {
            ...staticKpiData[0],
            value: String(summary?.jobs_completed ?? 0),
          },
          {
            ...staticKpiData[1],
            value: `${Math.round(
              (summary?.on_time_completion_rate ?? 0) * 100,
            )}%`,
          },
          {
            ...staticKpiData[2],
            value: `${Math.round(
              (summary?.proof_completion_rate ?? 0) * 100,
            )}%`,
          },
          {
            ...staticKpiData[3],
            value: `${(summary?.avg_job_duration_hours ?? 0).toFixed(1)} hrs`,
          },
          {
            ...staticKpiData[4],
            value: String(summary?.issues_detected ?? 0),
          },
        ]);

        // --- Cleaner performance (таблица + бар-чарт) ---
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

        // --- Trends: собираем из трёх эндпоинтов в единый массив ---
        type TrendMap = Record<string, TrendDataPoint>;
        const byDate: TrendMap = {};

        const ensurePoint = (date: string): TrendDataPoint => {
          if (byDate[date]) return byDate[date];

          const d = new Date(date);
          const label = d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          const base: TrendDataPoint = {
            date,
            label,
            jobsCompleted: 0,
            avgDuration: 0,
            beforePhotoRate: 0,
            afterPhotoRate: 0,
            checklistRate: 0,
          };

          byDate[date] = base;
          return base;
        };

        // jobs-completed → jobsCompleted
        if (Array.isArray(jobsCompleted)) {
          for (const point of jobsCompleted) {
            const p = ensurePoint(point.date);
            p.jobsCompleted = point.jobs_completed ?? 0;
          }
        }

        // job-duration → avgDuration
        if (Array.isArray(jobDuration)) {
          for (const point of jobDuration) {
            const p = ensurePoint(point.date);
            p.avgDuration = point.avg_job_duration_hours ?? 0;
          }
        }

        // proof-completion → before/after/checklist (в процентах)
        if (Array.isArray(proofTrend)) {
          for (const point of proofTrend) {
            const p = ensurePoint(point.date);
            p.beforePhotoRate = Math.round(
              (point.before_photo_rate ?? 0) * 100,
            );
            p.afterPhotoRate = Math.round(
              (point.after_photo_rate ?? 0) * 100,
            );
            p.checklistRate = Math.round(
              (point.checklist_rate ?? 0) * 100,
            );
          }
        }

        const combinedTrend = Object.values(byDate).sort((a, b) =>
          a.date.localeCompare(b.date),
        );

        // если вдруг по данным пусто — оставляем статику
        setTrendData(
          combinedTrend.length > 0 ? combinedTrend : staticTrendData,
        );

        // 🔹 NEW: сохраняем SLA breakdown
        setSlaBreakdown(sla);
      } catch (err) {
        console.error("[Analytics] Failed to load analytics", err);
        setError("Failed to load analytics");

        // на ошибке оставляем моки, чтобы экран не распался
        setKpiData(staticKpiData);
        setCleanerPerformance(staticCleanerPerformance);
        setTrendData(staticTrendData);
        // 🔹 NEW: очищаем SLA блок
        setSlaBreakdown(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [range.from, range.to]);

  // 🔹 NEW: UI-хелперы для SLA блока
  const violationRatePercent = slaBreakdown
    ? Math.round((slaBreakdown.violation_rate ?? 0) * 100)
    : 0;

  const violationSeverity:
    | "good"
    | "warning"
    | "bad"
    | "neutral" = !slaBreakdown
    ? "neutral"
    : violationRatePercent <= 5
    ? "good"
    : violationRatePercent <= 20
    ? "warning"
    : "bad";

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
            <div className="flex items-center gap-3">
              {/* Presets: Last 7 / 14 / 30 */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm text-muted-foreground shadow-sm">
                <CalendarDays className="h-4 w-4" />
                <select
                  className="bg-transparent text-sm text-muted-foreground outline-none"
                  value={rangePreset}
                  onChange={(e) => {
                    const preset = e.target.value as RangePreset;
                    setRangePreset(preset);
                    setRange(getDateRangeFromPreset(preset));
                    // при выборе пресета сбрасываем кастомный диапазон
                    setCustomDateRange(undefined);
                  }}
                >
                  <option value="last7">Last 7 days</option>
                  <option value="last14">Last 14 days</option>
                  <option value="last30">Last 30 days</option>
                </select>
              </div>

              {/* Custom range с календарём */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 border border-border bg-white px-3 text-xs font-normal text-muted-foreground shadow-sm hover:bg白/80",
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {customDateRange?.from && customDateRange?.to ? (
                      <>
                        {customDateRange.from.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        –{" "}
                        {customDateRange.to.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </>
                    ) : (
                      "Custom range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="end">
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground">
                      Date range
                    </div>
                    <Calendar
                      mode="range"
                      selected={customDateRange}
                      onSelect={(rangeValue) => {
                        setCustomDateRange(rangeValue);
                        const apiRange = rangeValue
                          ? dateRangeToApiRange(rangeValue)
                          : null;
                        if (apiRange) {
                          setRange(apiRange);
                        }
                      }}
                      numberOfMonths={2}
                      initialFocus
                    />
                  </div>
                </PopoverContent>
              </Popover>
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

        {/* 🔹 NEW: SLA Performance Section */}
        {slaBreakdown && (
          <section className="mb-10">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                SLA Performance
              </h2>
              <p className="text-sm text-muted-foreground">
                Where and why your service level agreements are being broken
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Overview */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      SLA Overview
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Violations across all completed jobs
                    </p>
                  </div>
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                      violationSeverity === "good" &&
                        "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
                      violationSeverity === "warning" &&
                        "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
                      violationSeverity === "bad" &&
                        "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
                      violationSeverity === "neutral" &&
                        "bg-muted text-muted-foreground",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {violationRatePercent}%
                    <span className="hidden sm:inline">violations</span>
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-3xl font-semibold tracking-tight text-foreground">
                    {violationRatePercent}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {slaBreakdown.violations_count} of{" "}
                    {slaBreakdown.jobs_completed} completed jobs violated SLA in
                    this period.
                  </p>
                </div>

                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    &lt; 5% — healthy
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                    5–20% — needs attention
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                    &gt; 20% — at risk
                  </p>
                </div>
              </div>

              {/* Reasons */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Violation Reasons
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      What breaks your SLA most often
                    </p>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>

                {slaBreakdown.reasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No SLA violations detected for this period.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {slaBreakdown.reasons.map((reason) => {
                      const totalViolations =
                        slaBreakdown.violations_count || 1;
                      const share = Math.round(
                        (reason.count / totalViolations) * 100,
                      );

                      return (
                        <div
                          key={reason.code}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              {formatReasonCode(reason.code)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {reason.code}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {reason.count}×
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-amber-500"
                                  style={{ width: `${share}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {share}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Hotspots */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    SLA Hotspots
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Who and where needs attention
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Cleaners
                    </p>
                    {slaBreakdown.top_cleaners.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No data for this period.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {slaBreakdown.top_cleaners.slice(0, 3).map((c) => (
                          <li key={c.cleaner_id ?? c.cleaner_name}>
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <div className="flex-1">
                                <p className="font-medium text-foreground">
                                  {c.cleaner_name || "Unknown cleaner"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {c.violations_count} violations •{" "}
                                  {c.jobs_completed} jobs
                                </p>
                              </div>
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                {Math.round(c.violation_rate * 100)}%
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Locations
                    </p>
                    {slaBreakdown.top_locations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No data for this period.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {slaBreakdown.top_locations.slice(0, 3).map((l) => (
                          <li key={l.location_id ?? l.location_name}>
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <div className="flex-1">
                                <p className="font-medium text-foreground">
                                  {l.location_name || "Unknown location"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {l.violations_count} violations •{" "}
                                  {l.jobs_completed} jobs
                                </p>
                              </div>
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                {Math.round(l.violation_rate * 100)}%
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

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
