// dubai-control/src/pages/JobDetails.tsx

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Download,
  Mail,
  MapPin,
  CheckCircle2,
  Circle,
  Camera,
  User,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  fetchManagerJobDetail,
  ManagerJobDetail,
  JobTimelineStep,
} from "@/api/client";
import { cn } from "@/lib/utils";

interface UITimelineStep {
  id: string;
  label: string;
  time?: string;
  completed: boolean;
  icon: React.ElementType;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString();
}

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date} at ${time}`;
}

function buildMapsUrl(lat?: number | null, lng?: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function formatJobCode(id: number | string) {
  const n = typeof id === "string" ? parseInt(id, 10) : id;
  if (!Number.isFinite(n as number)) return String(id);
  return `JOB-${String(n).padStart(3, "0")}`;
}

function mapTimelineToUI(
  steps: JobTimelineStep[],
  job: ManagerJobDetail
): UITimelineStep[] {
  return steps.map((step): UITimelineStep => {
    let icon: React.ElementType = Circle;
    let time: string | undefined;

    switch (step.key) {
      case "scheduled":
        icon = Calendar;
        // scheduled_date + start_time у нас обычно не ISO — просто как текст
        if (job.scheduled_date && job.start_time && job.start_time !== "--:--") {
          time = `${formatDate(job.scheduled_date)} at ${job.start_time}`;
        } else if (job.scheduled_date) {
          time = formatDate(job.scheduled_date);
        }
        break;
      case "check_in":
      case "check_out":
        icon = MapPin;
        if (step.timestamp) {
          // для чек-инов показываем только время (как в макете)
          const formatted = formatTime(step.timestamp);
          time = formatted || undefined;
        }
        break;
      case "before_photo":
      case "after_photo":
        icon = Camera;
        break;
      case "checklist":
        icon = CheckCircle2;
        break;
      default:
        icon = Circle;
    }

    return {
      id: step.key,
      label: step.label,
      time,
      completed: step.status === "done",
      icon,
    };
  });
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

  // базовые состояния

  if (!id) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Invalid job id</p>
        <Link
          to="/jobs"
          className="text-primary hover:text-primary/80 mt-2 inline-block"
        >
          ← Back to Jobs
        </Link>
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
        <p className="text-muted-foreground">Job not found</p>
        <Link
          to="/jobs"
          className="text-primary hover:text-primary/80 mt-2 inline-block"
        >
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  // нормализуем данные под UI Lovable

  const timelineSteps: UITimelineStep[] = mapTimelineToUI(
    job.timeline || [],
    job
  );

  const beforeUrl =
    job.photos?.before?.url || (job as any).before_photo_url || null;
  const afterUrl =
    job.photos?.after?.url || (job as any).after_photo_url || null;

  const checklist = job.checklist;

  const events = (job.check_events as any[]) || [];

  const checkInEvent = events.find((e) => e.event_type === "check_in");
  const checkOutEvent = events.find((e) => e.event_type === "check_out");

  const checkInLat =
    typeof checkInEvent?.latitude === "number" ? checkInEvent.latitude : null;
  const checkInLng =
    typeof checkInEvent?.longitude === "number" ? checkInEvent.longitude : null;

  const checkOutLat =
    typeof checkOutEvent?.latitude === "number" ? checkOutEvent.latitude : null;
  const checkOutLng =
    typeof checkOutEvent?.longitude === "number"
      ? checkOutEvent.longitude
      : null;

  const checkInGPS =
    checkInLat !== null && checkInLng !== null
      ? `${checkInLat}, ${checkInLng}`
      : undefined;

  const checkOutGPS =
    checkOutLat !== null && checkOutLng !== null
      ? `${checkOutLat}, ${checkOutLng}`
      : undefined;

  const checkInMapsUrl = buildMapsUrl(checkInLat, checkInLng);
  const checkOutMapsUrl = buildMapsUrl(checkOutLat, checkOutLng);

  const checkInTime =
    checkInEvent && (formatTime(checkInEvent.created_at) || undefined);
  const checkOutTime =
    checkOutEvent && (formatTime(checkOutEvent.created_at) || undefined);

  const hourlyRate = (job as any).hourlyRate ?? (job as any).hourly_rate;
  const flatRate = (job as any).flatRate ?? (job as any).flat_rate;

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                {job.location_name || job.location || "Job"}
              </h1>
              <StatusPill status={job.status as any} />
            </div>
            <p className="text-muted-foreground">
              {job.location_address || job.address || "—"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-border">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" className="border-border">
              <Mail className="w-4 h-4 mr-2" />
              Email PDF
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft">
              <FileText className="w-4 h-4 mr-2" />
              Generate PDF Report
            </Button>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Timeline */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="font-semibold text-foreground mb-6">Job Timeline</h2>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-8 bottom-8 w-px bg-border" />

              <div className="space-y-6">
                {timelineSteps.map((step) => (
                  <div key={step.id} className="relative flex items-start gap-4">
                    <div
                      className={cn(
                        "relative z-10 w-8 h-8 rounded-full flex items-center justify-center",
                        step.completed
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <step.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p
                        className={cn(
                          "font-medium",
                          step.completed
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {step.time}
                        </p>
                      )}
                    </div>
                    {step.completed && (
                      <CheckCircle2 className="w-5 h-5 text-status-completed mt-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Photo Documentation */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="font-semibold text-foreground mb-6">
              Photo Documentation
            </h2>

            <div className="grid grid-cols-2 gap-6">
              {/* Before */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Before
                </p>

                <div className="aspect-video bg-muted rounded-lg border border-border flex items-center justify-center overflow-hidden">
                  {beforeUrl ? (
                    <img
                      src={beforeUrl}
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>

                {!beforeUrl && (
                  <p className="text-xs text-muted-foreground mt-2">
                    No photo
                  </p>
                )}
              </div>

              {/* After */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  After
                </p>

                <div className="aspect-video bg-muted rounded-lg border border-border flex items-center justify-center overflow-hidden">
                  {afterUrl ? (
                    <img
                      src={afterUrl}
                      alt="After"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>

                {!afterUrl && (
                  <p className="text-xs text-muted-foreground mt-2">
                    No photo
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Checklist */}
          {Array.isArray(checklist) && checklist.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-card p-6">
              <h2 className="font-semibold text-foreground mb-6">
                Cleaning Checklist
              </h2>
              <div className="space-y-3">
                {checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {item.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-status-completed flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        item.completed
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job Details */}
          <div className="bg-card rounded-xl border border-border shadow-card p-6">
            <h2 className="font-semibold text-foreground mb-4">Job Details</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Job ID
                </dt>
                <dd className="mt-1 text-sm text-foreground font-mono">
                  {formatJobCode(job.id)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cleaner
                </dt>
                <dd className="mt-1 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">
                    {job.cleaner_name || job.cleaner || "—"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Scheduled Time
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {job.start_time && job.end_time
                    ? `${job.start_time} - ${job.end_time}`
                    : "--:-- - --:--"}
                </dd>
              </div>
              {hourlyRate && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Hourly Rate
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    AED {hourlyRate}/hr
                  </dd>
                </div>
              )}
              {flatRate && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Flat Rate
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    AED {flatRate}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* GPS / Location Verification */}
          {(checkInGPS || checkOutGPS) && (
            <div className="bg-card rounded-xl border border-border shadow-card p-6">
              <h2 className="font-semibold text-foreground mb-4">
                Location Verification
              </h2>
              <dl className="space-y-4">
                {checkInGPS && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Check-in GPS
                    </dt>
                    <dd className="mt-1 text-sm text-foreground font-mono text-xs">
                      {checkInGPS}
                    </dd>
                    {checkInTime && (
                      <dd className="text-xs text-muted-foreground mt-0.5">
                        {checkInTime}
                      </dd>
                    )}
                    {checkInMapsUrl && (
                      <dd className="mt-1">
                        <a
                          href={checkInMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline hover:opacity-80"
                        >
                          <MapPin className="w-3 h-3" />
                          Open in Maps
                        </a>
                      </dd>
                    )}
                  </div>
                )}
                {checkOutGPS && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Check-out GPS
                    </dt>
                    <dd className="mt-1 text-sm text-foreground font-mono text-xs">
                      {checkOutGPS}
                    </dd>
                    {checkOutTime && (
                      <dd className="text-xs text-muted-foreground mt-0.5">
                        {checkOutTime}
                      </dd>
                    )}
                    {checkOutMapsUrl && (
                      <dd className="mt-1">
                        <a
                          href={checkOutMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline hover:opacity-80"
                        >
                          <MapPin className="w-3 h-3" />
                          Open in Maps
                        </a>
                      </dd>
                    )}
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Notes (доп. блок, если есть) */}
          {job.notes && (
            <div className="bg-card rounded-xl border border-border shadow-card p-6">
              <h2 className="font-semibold text-foreground mb-4">Notes</h2>
              <p className="text-sm text-muted-foreground">{job.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
