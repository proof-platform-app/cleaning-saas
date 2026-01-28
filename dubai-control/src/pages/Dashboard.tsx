import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { getManagerTodayJobs, getUsageSummary } from "@/api/client";

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

type UsageSummary = {
  is_trial_active: boolean;
  is_trial_expired: boolean;
  days_left?: number | null;
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
  const navigate = useNavigate();

  const [todayJobs, setTodayJobs] = useState<UiJob[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [apiJobs, usageSummary] = await Promise.all([
          getManagerTodayJobs(),
          getUsageSummary(),
        ]);

        if (!isMounted) return;

        const mappedJobs = (apiJobs as ApiJob[]).map(mapApiJobToUi);
        setTodayJobs(mappedJobs);
        setUsage(usageSummary as UsageSummary);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to load dashboard data");
        setTodayJobs([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

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

  const todayInGulf = new Date();
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Dubai", // GST / UTC+4
  }).format(todayInGulf);

  // Banner texts
  const bannerTitle =
    usage && usage.is_trial_expired
      ? "Trial ended"
      : usage && usage.is_trial_active
      ? `Trial active · ${usage.days_left ?? 0} day${
          (usage.days_left ?? 0) === 1 ? "" : "s"
        } left`
      : "Standard plan";

  const bannerDescription =
    usage && usage.is_trial_expired
      ? "Your 7-day free trial has ended. You can still view existing jobs and download reports, but to create new jobs you'll need to upgrade."
      : usage && usage.is_trial_active
      ? "You're exploring CleanProof with full access. Upgrade anytime — no changes to your data."
      : "You’re on a paid plan. All features are available.";

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Today&apos;s Overview
          </h1>
          <p className="mt-1 text-muted-foreground">
            {todayLabel} · GST (UTC+4)
          </p>
        </div>

        <Link to="/planning">
          <Button className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
        </Link>
      </div>

      {/* Usage / Trial banner */}
      {usage && (
        <div className="mb-6 rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {bannerTitle}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {bannerDescription}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/cleanproof/pricing")}
          >
            Upgrade
          </Button>
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
