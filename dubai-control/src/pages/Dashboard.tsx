import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
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
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  location: string;
  cleaner: string;
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
  let uiStatus: UiJobStatus;
  if (job.status === "in_progress") {
    uiStatus = "in-progress";
  } else if (job.status === "completed") {
    uiStatus = "completed";
  } else {
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
    location: job.location || "Unknown location",
    cleaner: job.cleaner || "Unknown cleaner",
    startTime,
    endTime,
  };
}

export default function Dashboard() {
  const [todayJobs, setTodayJobs] = useState<UiJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // TEMP: trial context (will be wired to API later)
  const trialInfo = {
    isActive: true,
    daysLeft: 6,
  };

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {"Today's Overview"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Monday, January 15, 2024 · GST (UTC+4)
          </p>
        </div>

        <Link to="/planning">
          <Button className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
        </Link>
      </div>

      {/* Trial banner */}
      {trialInfo.isActive && (
        <div className="mb-6">
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-slate-900">
                Trial active · {trialInfo.daysLeft}{" "}
                {trialInfo.daysLeft === 1 ? "day" : "days"} left
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                You&apos;re exploring CleanProof with full access. Upgrade
                anytime — no changes to your data.
              </p>
            </div>
            <Link
              to="/cleanproof/pricing"
              className="ml-4 whitespace-nowrap text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              Upgrade
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {error && (
        <div className="mb-4 text-sm text-red-500">
          Failed to load jobs: {error}
        </div>
      )}

      {/* Today's Jobs */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">Today&apos;s Jobs</h2>
          <Link
            to="/jobs"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
          >
            View all
            <ArrowRight className="h-4 w-4" />
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
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="truncate font-medium text-foreground">
                      {job.location}
                    </p>
                    <StatusPill status={job.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {job.cleaner} · {job.startTime} - {job.endTime}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
