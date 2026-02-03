// dubai-control/src/pages/Jobs.tsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Plus, FileCheck, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  fetchManagerJobsSummary,
  type ManagerJobSummary,
} from "@/api/client";

type Filter = "today" | "upcoming" | "completed";

// форматируем и "чистое" время HH:MM(/SS), и ISO-дату
function formatTime(value?: string | null): string {
  if (!value) return "--:--";

  // кейс 1: сервер отдал только время "HH:MM" или "HH:MM:SS"
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.slice(0, 5); // "HH:MM"
  }

  // кейс 2: полноценный ISO-формат
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--:--";

  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Jobs() {
  const [activeFilter, setActiveFilter] = useState<Filter>("today");
  const [jobs, setJobs] = useState<ManagerJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 🔹 Берём не только сегодняшние джобы, а сводку (summary)
        const data = await fetchManagerJobsSummary();

        if (!cancelled) {
          setJobs(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("[Jobs] Failed to load jobs", e);
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load jobs",
          );
          setJobs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const filteredJobs = jobs.filter((job) => {
    // ✅ Completed не завязан на scheduled_date
    if (activeFilter === "completed") {
      return job.status === "completed";
    }

    // Для Today / Upcoming без даты показывать нечего
    if (!job.scheduled_date) return false;

    if (activeFilter === "today") {
      return job.scheduled_date === todayStr;
    }

    if (activeFilter === "upcoming") {
      // показываем только будущие даты относительно «сегодня»
      return job.scheduled_date > todayStr;
    }

    return true;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Jobs
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage and track all cleaning jobs
          </p>
        </div>
        <Link to="/create-job">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft">
            <Plus className="w-4 h-4 mr-2" />
            Create Job
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
              activeFilter === filter.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
          Failed to load jobs: {error}
        </div>
      )}

      {/* Jobs Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Location
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cleaner
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Scheduled Time
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Proof
                </th>
                <th className="text-right px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading &&
                filteredJobs.map((job) => {
                  // пробуем несколько вариантов имён полей на всякий случай
                  const start =
                    (job as any).scheduled_start ||
                    (job as any).scheduled_time_start ||
                    (job as any).scheduled_start_time ||
                    (job as any).start_time ||
                    null;

                  const end =
                    (job as any).scheduled_end ||
                    (job as any).scheduled_time_end ||
                    (job as any).scheduled_end_time ||
                    (job as any).end_time ||
                    null;

                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {job.location_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {job.location_address}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-foreground">
                          {job.cleaner_name || (job as any).cleaner || "—"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-foreground">
                          {formatTime(start)} – {formatTime(end)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {job.scheduled_date}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill status={job.status as any} />
                      </td>
                      <td className="px-6 py-4">
                        {job.has_proof ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-status-completed">
                            <FileCheck className="w-4 h-4" />
                            Available
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          View
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {!loading && filteredJobs.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-muted-foreground">
              No jobs found for this filter
            </p>
          </div>
        )}

        {loading && (
          <div className="px-6 py-12 text-center">
            <p className="text-muted-foreground">Loading jobs…</p>
          </div>
        )}
      </div>
    </div>
  );
}
