// dubai-control/src/pages/History.tsx

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JobsTable } from "@/components/planning/JobsTable";
import { JobSidePanel } from "@/components/planning/JobSidePanel";

import type { PlanningJob } from "@/types/planning";
import { fetchJobsHistory } from "@/api/planning";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type DateRange = {
  from: Date;
  to: Date;
};

export default function History() {
  // по умолчанию показываем последние 7 дней
  const today = new Date();
  const initialRange: DateRange = {
    from: subDays(today, 6),
    to: today,
  };

  const [range, setRange] = useState<DateRange>(initialRange);
  const [selectedJob, setSelectedJob] = useState<PlanningJob | null>(null);

  const dateFromStr = useMemo(
    () => format(range.from, "yyyy-MM-dd"),
    [range.from],
  );
  const dateToStr = useMemo(
    () => format(range.to, "yyyy-MM-dd"),
    [range.to],
  );

  const {
    data: jobs,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PlanningJob[], Error>({
    queryKey: ["manager-jobs-history", dateFromStr, dateToStr],
    queryFn: () =>
      fetchJobsHistory({
        dateFrom: dateFromStr,
        dateTo: dateToStr,
      }),
  });

  const jobsList = jobs ?? [];

  const loadError = isError
    ? error?.message || "Failed to load job history. Please try again."
    : null;

  const handleRangeChange = (from: Date, to: Date) => {
    setRange({ from, to });
  };

  // новая функция: аккуратно обрабатываем выбор диапазона
  const handleCalendarSelect = (
    value: { from?: Date; to?: Date } | undefined,
  ) => {
    if (!value || !value.from) return;

    // если выбраны обе даты — используем полный диапазон
    if (value.to) {
      handleRangeChange(value.from, value.to);
      return;
    }

    // если выбрана только первая дата — считаем диапазон из одного дня
    handleRangeChange(value.from, value.from);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="px-6 py-6 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Job History
              </h1>
              <p className="text-muted-foreground mt-1">
                Review completed and scheduled jobs over a selected date range.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters - Left Column */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium tracking-tight">
                  Filters
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setRange(initialRange)}
                >
                  Reset
                </Button>
              </div>

              {/* DATE RANGE */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Date range
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex flex-col">
                          <span>
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
                      numberOfMonths={1} // 👈 один месяц, не два
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select a start and end date in the calendar to load job
                  history.
                </p>
              </div>
            </div>
          </div>

          {/* Jobs Table - Right Column */}
          <div className="flex-1 min-w-0">
            <div className="mb-4 flex items-start justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Showing jobs from{" "}
                <span className="font-medium text-foreground">
                  {format(range.from, "MMMM d, yyyy")}
                </span>{" "}
                to{" "}
                <span className="font-medium text-foreground">
                  {format(range.to, "MMMM d, yyyy")}
                </span>{" "}
                (GST UTC+4)
              </p>

              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading…" : `${jobsList.length} jobs`}
              </p>
            </div>

            {loadError && (
              <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 flex items-center justify-between gap-3">
                <div className="text-sm text-destructive">{loadError}</div>
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            )}

            {!isLoading && !loadError && jobsList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-card px-8 py-10 text-center">
                <h2 className="text-sm font-medium text-foreground">
                  No jobs in this date range
                </h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                  Try selecting a wider period in the calendar or scheduling new
                  jobs in the Job Planning view. Completed jobs will appear here
                  automatically.
                </p>
              </div>
            ) : (
              <JobsTable
                jobs={jobsList}
                loading={isLoading}
                onJobClick={setSelectedJob}
              />
            )}
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {selectedJob && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSelectedJob(null)}
          />
          <JobSidePanel job={selectedJob} onClose={() => setSelectedJob(null)} />
        </>
      )}
    </div>
  );
}
