// dubai-control/src/pages/JobDetails.tsx

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { fetchManagerJobDetail, ManagerJobDetail } from "@/api/client";

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
}

function formatTime(iso?: string | null): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<ManagerJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchManagerJobDetail(id);
        if (!cancelled) setJob(data);
      } catch (e) {
        console.error("[JobDetails] Failed to load job", e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load job");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Invalid job id</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading job…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600 mb-4">Failed to load job: {error}</p>
        <Link to="/jobs">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground mb-4">Job not found</p>
        <Link to="/jobs">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
        </Link>
      </div>
    );
  }

  // время — пробуем разные варианты, как и в таблице
  const start =
    job.scheduled_start ||
    (job as any).scheduled_time_start ||
    (job as any).scheduled_start_time ||
    null;

  const end =
    job.scheduled_end ||
    (job as any).scheduled_time_end ||
    (job as any).scheduled_end_time ||
    null;

  // photos теперь объект, не массив
  const beforeUrl =
    job.photos?.before?.url || (job as any).before_photo_url || null;

  const afterUrl =
    job.photos?.after?.url || (job as any).after_photo_url || null;

  const events = (job.check_events as any[]) || [];

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Back */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/jobs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Jobs
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {job.location_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {job.location_address}
            </p>
          </div>
        </div>
        <StatusPill status={job.status as any} />
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Info */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-3">
            <h2 className="font-semibold text-foreground mb-2">Job Info</h2>

            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Cleaner:</span>{" "}
              {job.cleaner_name || job.cleaner || "—"}
            </p>

            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Date:</span>{" "}
              {formatDate(job.scheduled_date)}
            </p>

            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Time:</span>{" "}
              {start && end
                ? `${formatTime(start)} – ${formatTime(end)}`
                : "--:-- – --:--"}
            </p>
          </div>

          {/* Photo proof */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
            <h2 className="font-semibold text-foreground">
              Photo Documentation
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Before
                </p>
                <div className="aspect-video rounded-lg border border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/40">
                  {beforeUrl ? (
                    <img
                      src={beforeUrl}
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No photo
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  After
                </p>
                <div className="aspect-video rounded-lg border border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/40">
                  {afterUrl ? (
                    <img
                      src={afterUrl}
                      alt="After"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No photo
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Events */}
          {events.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
              <h2 className="font-semibold text-foreground">Audit Trail</h2>
              <ul className="space-y-2">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {ev.event_type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(ev.created_at)}{" "}
                      {formatTime(ev.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-3">
            <h2 className="font-semibold text-foreground">Job Details</h2>

            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Job ID:</span>{" "}
              {job.id}
            </p>

            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Cleaner:</span>{" "}
              {job.cleaner_name || job.cleaner || "—"}
            </p>

            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Status:</span>{" "}
              {job.status}
            </p>
          </div>

          {job.notes && (
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-3">
              <h2 className="font-semibold text-foreground">Notes</h2>
              <p className="text-sm text-muted-foreground">{job.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
