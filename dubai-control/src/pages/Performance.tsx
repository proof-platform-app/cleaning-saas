// dubai-control/src/pages/Performance.tsx

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import type {
  PerformanceSummary,
  PerformanceStatItem,
} from "@/types/planning";
import { fetchPerformanceSummary } from "@/api/performance";

type DateRange = {
  from: Date;
  to: Date;
};

function sortStats(items: PerformanceStatItem[]): PerformanceStatItem[] {
  // Сначала по количеству нарушений, потом по общему числу jobs
  return [...items].sort((a, b) => {
    if (b.jobs_with_sla_violations !== a.jobs_with_sla_violations) {
      return b.jobs_with_sla_violations - a.jobs_with_sla_violations;
    }
    return b.jobs_total - a.jobs_total;
  });
}

// общий компонент строки для performance-таблиц
type RowProps = {
  name: string;
  jobs: number;
  violations: number;
};

function PerformanceRow({ name, jobs, violations }: RowProps) {
  return (
    <div className="grid grid-cols-[2fr,1fr,1fr] items-center py-2 text-sm border-b border-border/60 last:border-0">
      <div className="pr-4 text-foreground">{name}</div>
      <div className="px-4 text-right tabular-nums text-foreground">
        {jobs}
      </div>
      <div className="pl-4 text-right">
        <span className="inline-flex min-w-[2rem] justify-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          {violations}
        </span>
      </div>
    </div>
  );
}

export default function Performance() {
  // по умолчанию последние 7 дней, как в History
  const today = new Date();
  const initialRange: DateRange = {
    from: subDays(today, 6),
    to: today,
  };

  const [range, setRange] = useState<DateRange>(initialRange);

  const dateFromStr = useMemo(
    () => format(range.from, "yyyy-MM-dd"),
    [range.from],
  );
  const dateToStr = useMemo(
    () => format(range.to, "yyyy-MM-dd"),
    [range.to],
  );

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<PerformanceSummary, Error>({
    queryKey: ["manager-performance", dateFromStr, dateToStr],
    queryFn: () =>
      fetchPerformanceSummary({
        dateFrom: dateFromStr,
        dateTo: dateToStr,
      }),
  });

  const cleaners = useMemo(
    () => (data ? sortStats(data.cleaners) : []),
    [data],
  );
  const locations = useMemo(
    () => (data ? sortStats(data.locations) : []),
    [data],
  );

  // Простая агрегированная метрика по клинерам:
  // total jobs, violated jobs, процент
  const summary = useMemo(() => {
    if (!cleaners.length) {
      return null;
    }

    let jobsTotal = 0;
    let jobsWithViolations = 0;

    for (const item of cleaners) {
      jobsTotal += item.jobs_total;
      jobsWithViolations += item.jobs_with_sla_violations;
    }

    if (jobsTotal === 0) {
      return {
        jobsTotal: 0,
        jobsWithViolations: 0,
        issueRate: 0,
      };
    }

    const issueRate = (jobsWithViolations / jobsTotal) * 100;

    return {
      jobsTotal,
      jobsWithViolations,
      issueRate,
    };
  }, [cleaners]);

  const handleCalendarSelect = (value: DateRange | undefined) => {
    if (!value?.from && !value?.to) {
      return;
    }

    if (value.from && value.to) {
      setRange({ from: value.from, to: value.to });
      return;
    }

    if (value.from && !value.to) {
      setRange({ from: value.from, to: value.from });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="px-6 py-6 max-w-7xl mx-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Performance (SLA)
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a date range to see which cleaners and locations
                  generate the most SLA issues.
                </p>
              </div>
              {/* Кнопка “Refresh” больше не нужна — данные обновляются при смене диапазона */}
            </div>

            {/* Короткая сводка по периоду */}
            {summary && summary.jobsTotal > 0 && (
              <p className="text-xs sm:text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {summary.jobsTotal}
                </span>{" "}
                jobs •{" "}
                <span className="font-medium text-foreground">
                  {summary.jobsWithViolations}
                </span>{" "}
                SLA violations •{" "}
                <span className="font-medium text-foreground">
                  {summary.issueRate.toFixed(1)}%
                </span>{" "}
                issue rate
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div>
                <h2 className="text-sm font-medium text-foreground">
                  Filters
                </h2>
              </div>

              {/* Date range */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Date range
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full inline-flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <span className="inline-flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex flex-col">
                          <span className="text-xs">
                            {format(range.from, "MMM d, yyyy")} –{" "}
                            {format(range.to, "MMM d, yyyy")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(range.from, "EEE")} –{" "}
                            {format(range.to, "EEE")}
                          </span>
                        </span>
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{
                        from: range.from,
                        to: range.to,
                      }}
                      onSelect={handleCalendarSelect}
                      numberOfMonths={1}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select a start and end date to analyse SLA performance.
                </p>
              </div>
            </div>
          </div>

          {/* Data */}
          <div className="flex-1 space-y-6">
            {isError && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                Failed to load performance data: {error?.message}
              </div>
            )}

            {/* Cleaners */}
            <div className="rounded-xl border border-border bg-card">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-medium text-foreground">
                    Cleaners with issues
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Who generates the most SLA violations in this period.
                  </p>
                </div>
              </div>
              <div className="p-4">
                {isLoading && (
                  <p className="text-sm text-muted-foreground">
                    Loading performance…
                  </p>
                )}
                {!isLoading && cleaners.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No completed jobs in this date range yet.
                  </p>
                )}
                {!isLoading && cleaners.length > 0 && (
                  <div className="w-full">
                    {/* Header row */}
                    <div className="grid grid-cols-[2fr,1fr,1fr] text-xs text-muted-foreground border-b border-border pb-1.5">
                      <div className="pr-4 text-left font-medium">
                        Cleaner
                      </div>
                      <div className="px-4 text-right font-medium">Jobs</div>
                      <div className="pl-4 text-right font-medium">
                        SLA violations
                      </div>
                    </div>
                    {/* Data rows */}
                    <div>
                      {cleaners.map((item) => (
                        <PerformanceRow
                          key={item.id}
                          name={item.name}
                          jobs={item.jobs_total}
                          violations={item.jobs_with_sla_violations}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Locations */}
            <div className="rounded-xl border border-border bg-card">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-medium text-foreground">
                    Locations with issues
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Where SLA problems appear most often in this period.
                  </p>
                </div>
              </div>
              <div className="p-4">
                {isLoading && (
                  <p className="text-sm text-muted-foreground">
                    Loading performance…
                  </p>
                )}
                {!isLoading && locations.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No completed jobs in this date range yet.
                  </p>
                )}
                {!isLoading && locations.length > 0 && (
                  <div className="w-full">
                    {/* Header row — такая же сетка, как у клинеров */}
                    <div className="grid grid-cols-[2fr,1fr,1fr] text-xs text-muted-foreground border-b border-border pb-1.5">
                      <div className="pr-4 text-left font-medium">
                        Location
                      </div>
                      <div className="px-4 text-right font-medium">Jobs</div>
                      <div className="pl-4 text-right font-medium">
                        SLA violations
                      </div>
                    </div>
                    {/* Data rows */}
                    <div>
                      {locations.map((item) => (
                        <PerformanceRow
                          key={item.id}
                          name={item.name}
                          jobs={item.jobs_total}
                          violations={item.jobs_with_sla_violations}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
