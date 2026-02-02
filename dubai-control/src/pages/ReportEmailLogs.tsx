// dubai-control/src/pages/ReportEmailLogs.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  getEmailLogs,
  type EmailLogsFilters,
  type EmailLogsResponse,
  type EmailLog,
} from "@/api/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 20;

export default function ReportEmailLogsPage() {
  const [filters, setFilters] = useState<EmailLogsFilters>({
    status: "all",
    kind: "all",
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
    job_id: "",
    email: "",
    date_from: "",
    date_to: "",
  });

  // локальное состояние для красивого диапазона дат
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const { data, isLoading, isError, error, isFetching } = useQuery<
    EmailLogsResponse,
    Error
  >({
    queryKey: ["email-logs", filters],
    queryFn: () =>
      getEmailLogs({
        ...filters,
        status: filters.status === "all" ? undefined : filters.status,
      }),
  });

  const pagination = (data as any)?.pagination;
  const logs: EmailLog[] = data?.results ?? [];

  // ⚙️ Клиентская фильтрация по диапазону дат (на основе created_at / sent_at)
  const visibleLogs: EmailLog[] = logs.filter((log) => {
    if (!filters.date_from && !filters.date_to) {
      return true;
    }

    if (!log.sent_at) {
      return false;
    }

    // sent_at приходит из бэкенда как ISO-строка: "YYYY-MM-DDTHH:MM:SS..."
    const datePart = log.sent_at.split("T")[0]; // "YYYY-MM-DD"

    if (filters.date_from && datePart < filters.date_from) {
      return false;
    }
    if (filters.date_to && datePart > filters.date_to) {
      return false;
    }

    return true;
  });

  const handleStatusChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      status: value as EmailLogsFilters["status"],
    }));
  };

  const handleKindChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      kind: value as EmailLogsFilters["kind"],
    }));
  };

  const handleEmailChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      email: value,
    }));
  };

  const handleJobIdChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      job_id: value,
    }));
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);

    const fromStr = range?.from ? format(range.from, "yyyy-MM-dd") : "";
    const toStr = range?.to ? format(range.to, "yyyy-MM-dd") : "";

    setFilters((prev) => ({
      ...prev,
      page: 1,
      date_from: fromStr,
      date_to: toStr,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      status: "all",
      kind: "all",
      page: 1,
      page_size: DEFAULT_PAGE_SIZE,
      job_id: "",
      email: "",
      date_from: "",
      date_to: "",
    });
    setDateRange(undefined);
  };

  const handlePageChange = (nextPage: number) => {
    if (!pagination) return;
    if (nextPage < 1 || nextPage > pagination.total_pages) return;

    setFilters((prev) => ({
      ...prev,
      page: nextPage,
    }));
  };

  const renderStatusBadge = (status: string) => {
    const base =
      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border";
    if (status === "sent") {
      return (
        <span
          className={`${base} border-emerald-200 bg-emerald-50 text-emerald-800`}
        >
          Sent
        </span>
      );
    }
    if (status === "failed") {
      return (
        <span className={`${base} border-red-200 bg-red-50 text-red-800`}>
          Failed
        </span>
      );
    }
    return (
      <span className={`${base} border-border bg-muted text-muted-foreground`}>
        {status || "unknown"}
      </span>
    );
  };

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.kind !== "all" ||
    !!filters.job_id ||
    !!filters.email ||
    !!filters.date_from ||
    !!filters.date_to;

  const dateRangeLabel = (() => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "MMM d, yyyy")} – ${format(
        dateRange.to,
        "MMM d, yyyy",
      )}`;
    }
    if (dateRange?.from) {
      return format(dateRange.from, "MMM d, yyyy");
    }
    return "All dates";
  })();

  const currentKind = filters.kind ?? "all";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50">
        <div className="px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Reports
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                History of all report emails you send to owners (jobs, weekly
                and monthly summaries).
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-1 py-1 text-xs">
              <Link
                to="/reports"
                className="px-3 py-1 rounded-full text-muted-foreground"
              >
                Overview
              </Link>
              <Link
                to="/reports/email-logs"
                className="px-3 py-1 rounded-full bg-background shadow-sm text-foreground"
              >
                Email history
              </Link>
            </div>
          </div>

          {isFetching && (
            <p className="text-xs text-muted-foreground">Updating…</p>
          )}
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Фильтры */}
        <div className="rounded-2xl border border-border bg-card px-4 py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Status
              </span>
              <Select
                value={filters.status ?? "all"}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-[150px] h-10">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Report type — tabs вместо Select */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Report type
              </span>
              <div className="inline-flex items-center rounded-full bg-muted px-1 py-1 text-xs">
                {[
                  { value: "all", label: "All" },
                  { value: "job", label: "Job" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                ].map((tab) => {
                  const active = currentKind === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => handleKindChange(tab.value)}
                      className={cn(
                        "px-3 py-1 rounded-full transition-colors",
                        active
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Job ID
              </span>
              <Input
                className="w-[140px] h-10"
                placeholder="e.g. 123"
                value={filters.job_id ?? ""}
                onChange={(e) => handleJobIdChange(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Recipient email
              </span>
              <Input
                className="w-[220px] h-10"
                placeholder="owner@example.com"
                value={filters.email ?? ""}
                onChange={(e) => handleEmailChange(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Date range
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[260px] h-10 justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">{dateRangeLabel}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    numberOfMonths={1}
                    selected={dateRange}
                    onSelect={handleDateRangeChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleResetFilters}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Ошибки / загрузка */}
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading email logs…</p>
        )}

        {isError && (
          <p className="text-sm text-destructive">
            Failed to load email logs:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        )}

        {/* Empty state */}
        {!isLoading && !isError && visibleLogs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "No report emails match selected filters."
              : "No report emails have been sent yet."}
          </p>
        )}

        {/* Таблица */}
        {!isLoading && !isError && visibleLogs.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 px-3 text-left">Date / time</th>
                  <th className="py-2 px-3 text-left">Kind</th>
                  <th className="py-2 px-3 text-left">Job / Period</th>
                  <th className="py-2 px-3 text-left">Company</th>
                  <th className="py-2 px-3 text-left">Location</th>
                  <th className="py-2 px-3 text-left">Cleaner</th>
                  <th className="py-2 px-3 text-left">Target email</th>
                  <th className="py-2 px-3 text-left">Status</th>
                  <th className="py-2 px-3 text-left">Sent by</th>
                </tr>
              </thead>
              <tbody>
                {visibleLogs.map((log) => {
                  const dt = log.sent_at ? new Date(log.sent_at) : null;
                  const dateStr = dt ? dt.toLocaleString() : "-";

                  const isJob = log.kind === "job_report";

                  return (
                    <tr
                      key={log.id}
                      className="border-t border-border/60 hover:bg-muted/50"
                    >
                      <td className="py-2 px-3 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-2 px-3">
                        {log.kind === "job_report"
                          ? "Job"
                          : log.kind === "weekly_report"
                          ? "Weekly"
                          : log.kind === "monthly_report"
                          ? "Monthly"
                          : log.kind || "-"}
                      </td>
                      <td className="py-2 px-3">
                        {isJob && log.job_id ? (
                          <Link
                            to={`/jobs/${log.job_id}`}
                            className="text-xs text-primary underline-offset-2 hover:underline"
                          >
                            Job #{log.job_id}
                          </Link>
                        ) : (log as any).job_period ? (
                          <span>{(log as any).job_period}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {(log as any).company_name ?? "-"}
                      </td>
                      <td className="py-2 px-3">
                        {(log as any).location_name ?? "-"}
                      </td>
                      <td className="py-2 px-3">
                        {(log as any).cleaner_name ?? "-"}
                      </td>
                      <td className="py-2 px-3">
                        {log.target_email ?? "-"}
                      </td>
                      <td className="py-2 px-3">
                        {renderStatusBadge(log.status)}
                      </td>
                      <td className="py-2 px-3">
                        {typeof log.sent_by === "string"
                          ? log.sent_by
                          : (log.sent_by as any)?.full_name ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Пагинация */}
        {!isLoading &&
          !isError &&
          pagination &&
          pagination.total_pages > 1 && (
            <div className="flex items-center justify_between text-xs text-muted-foreground">
              <div>
                Page {pagination.page} of {pagination.total_pages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
