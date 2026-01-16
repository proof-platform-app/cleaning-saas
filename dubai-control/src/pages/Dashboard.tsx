import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
// sampleJobs больше не используем, данные идут с API
// import { sampleJobs } from "@/data/sampleData";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
} from "lucide-react";
import { getManagerTodayJobs } from "@/api/client";

type ApiJob = {
  id: number;
  status: "scheduled" | "in_progress" | "completed" | string;
  scheduled_start?: string; // ISO-строка
  scheduled_end?: string; // ISO-строка
  location?: {
    id: number;
    name: string;
    address?: string;
  };
  cleaner?: {
    id: number;
    full_name: string;
  };
};

type UiJobStatus = "in-progress" | "completed" | "issue";

type UiJob = {
  id: number;
  status: UiJobStatus;
  date: string;
  location: string;
  cleaner: string;
  startTime: string;
  endTime: string;
};

function mapApiJobToUi(job: ApiJob): UiJob {
  // Бэкенд: scheduled | in_progress | completed
  // UI: in-progress | completed | issue
  let uiStatus: UiJobStatus;
  if (job.status === "in_progress") {
    uiStatus = "in-progress";
  } else if (job.status === "completed") {
    uiStatus = "completed";
  } else {
    // временно считаем всё остальное "issue" (можно потом придумать лучше)
    uiStatus = "issue";
  }

  const start = job.scheduled_start || "";
  const end = job.scheduled_end || "";
  const date = start ? start.slice(0, 10) : "";

  const startTime = start ? start.slice(11, 16) : "--:--";
  const endTime = end ? end.slice(11, 16) : "--:--";

  return {
    id: job.id,
    status: uiStatus,
    date,
    location: job.location?.name || "Unknown location",
    cleaner: job.cleaner?.full_name || "Unknown cleaner",
    startTime,
    endTime,
  };
}

export default function Dashboard() {
  const [todayJobs, setTodayJobs] = useState<UiJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadJobs() {
      try {
        setLoading(true);
        setError(null);
        const apiJobs = await getManagerTodayJobs();
        if (!isMounted) return;

        const mapped = (apiJobs as ApiJob[]).map(mapApiJobToUi);
        setTodayJobs(mapped);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to load jobs");
        setTodayJobs([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadJobs();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = {
    total: todayJobs.length,
    inProgress: todayJobs.filter((j) => j.status === "in-progress").length,
    completed: todayJobs.filter((j) => j.status === "completed").length,
    issues: todayJobs.filter((j) => j.status === "issue").length,
  };

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {"Today's Overview"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {/* пока дата захардкожена, позже можно подставить реальную */}
            Monday, January 15, 2024 · GST (UTC+4)
          </p>
        </div>
        <Link to="/create-job">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft">
            <Plus className="w-4 h-4 mr-2" />
            Create Job
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Jobs Today"
          value={stats.total}
          icon={Calendar}
          variant="primary"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={Clock}
          variant="default"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Issues"
          value={stats.issues}
          icon={AlertCircle}
          variant="warning"
        />
      </div>

      {/* Ошибка / лоадер (простая версия) */}
      {error && (
        <div className="mb-4 text-sm text-red-500">
          Failed to load jobs: {error}
        </div>
      )}

      {/* Today's Jobs */}
      <div className="bg-card rounded-xl border border-border shadow-card">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Today's Jobs</h2>
          <Link
            to="/jobs"
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              Loading jobs...
            </div>
          ) : todayJobs.length === 0 ? (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              No jobs for today.
            </div>
          ) : (
            todayJobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-foreground truncate">
                      {job.location}
                    </p>
                    <StatusPill status={job.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {job.cleaner} · {job.startTime} - {job.endTime}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
