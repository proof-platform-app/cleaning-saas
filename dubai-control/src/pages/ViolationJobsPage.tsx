// dubai-control/src/pages/ViolationJobsPage.tsx

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getViolationJobs,
  type ViolationJobsResponse,
} from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  JobSidePanel,
  type EvidenceContext,
} from "@/components/planning/JobSidePanel";
import type { PlanningJob } from "@/types/planning";
import { AlertTriangle } from "lucide-react";

type ViolationJob = ViolationJobsResponse["jobs"][number];

export default function ViolationJobsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const reason = searchParams.get("reason") || "";
  const periodStart = searchParams.get("period_start") || "";
  const periodEnd = searchParams.get("period_end") || "";

  // optional filters: cleaner / location
  let cleanerId: number | undefined;
  const cleanerIdRaw = searchParams.get("cleaner_id");
  if (cleanerIdRaw) {
    const parsed = Number(cleanerIdRaw);
    if (!Number.isNaN(parsed)) {
      cleanerId = parsed;
    }
  }

  let locationId: number | undefined;
  const locationIdRaw = searchParams.get("location_id");
  if (locationIdRaw) {
    const parsed = Number(locationIdRaw);
    if (!Number.isNaN(parsed)) {
      locationId = parsed;
    }
  }

  const hasAnyFilter =
    Boolean(reason) || Boolean(cleanerId) || Boolean(locationId);

  const [data, setData] = useState<ViolationJobsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedJob, setSelectedJob] = useState<PlanningJob | null>(null);

  useEffect(() => {
    if (!periodStart || !periodEnd || !hasAnyFilter) {
      setError("Missing required parameters.");
      return;
    }

    setLoading(true);
    setError(null);

    getViolationJobs({
      reason,
      periodStart,
      periodEnd,
      cleanerId,
      locationId,
    })
      .then((res) => setData(res))
      .catch((err: any) => {
        console.error(err);
        const message =
          err?.response?.data?.detail ||
          "Failed to load violation jobs. Please try again.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [reason, periodStart, periodEnd, cleanerId, locationId, hasAnyFilter]);

  const handleBack = () => {
    navigate("/reports");
  };

  /**
   * Маппинг строки из SLA-violations эндпоинта
   * в форму, удобную для JobSidePanel (PlanningJob).
   *
   * Тут мы НЕ делаем отдельный запрос к backend,
   * а аккуратно собираем минимальный объект:
   * - location / cleaner — только имена
   * - proof-флаги — из SLA-reasons (domain logic)
   * - время начала/конца нам сейчас не известно → оставляем null
   */
  const mapViolationToPlanningJob = (job: ViolationJob): PlanningJob => {
    const slaStatus = (job as any).sla_status ?? "violated";
    const slaReasons: string[] = (job as any).sla_reasons ?? [];

    const hasMissingBefore = slaReasons.includes("missing_before_photo");
    const hasMissingAfter = slaReasons.includes("missing_after_photo");
    const hasChecklistNotCompleted = slaReasons.includes(
      "checklist_not_completed",
    );

    return {
      id: job.id,
      status: job.status as PlanningJob["status"],
      scheduled_date: job.scheduled_date,
      scheduled_start_time: null,
      scheduled_end_time: null,
      location: {
        id: (job as any).location_id ?? 0,
        name: job.location_name,
        address: null,
      },
      cleaner: {
        id: (job as any).cleaner_id ?? 0,
        full_name: job.cleaner_name,
        phone: null as any,
      },
      sla_status: slaStatus,
      sla_reasons: slaReasons as any,
      proof: {
        before_photo: !hasMissingBefore,
        after_photo: !hasMissingAfter,
        checklist: !hasChecklistNotCompleted,
      },
    } as PlanningJob;
  };

  const handleViewJobInPanel = (job: ViolationJob) => {
    const planningJob = mapViolationToPlanningJob(job);
    setSelectedJob(planningJob);
  };

  const handleOpenFullJobPage = (jobId: number) => {
    navigate(`/jobs/${jobId}`);
  };

  if (!periodStart || !periodEnd || !hasAnyFilter) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={handleBack}>
          ← Back to reports
        </Button>
        <p className="mt-4 text-red-600">
          Invalid URL. Required params: period_start, period_end, and at least
          one filter.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={handleBack}>
          ← Back to reports
        </Button>
        <p className="mt-4">Loading jobs with SLA exceptions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={handleBack}>
          ← Back to reports
        </Button>
        <p className="mt-4 text-red-600">{error}</p>
      </div>
    );
  }

  // аккуратные дефолты вместо условного return с !data
  const reasonLabel = data?.reason_label ?? "";
  const period = data?.period ?? {
    start: periodStart,
    end: periodEnd,
  };
  const jobs: ViolationJob[] = data?.jobs ?? [];

  const jobsCountLabel =
    jobs.length === 0
      ? "No jobs"
      : jobs.length === 1
      ? "1 job"
      : `${jobs.length} jobs`;

  // подсказка "Filtered by: ..."
  const filterChips: string[] = [];
  if (cleanerId !== undefined && jobs[0]?.cleaner_name) {
    filterChips.push(jobs[0].cleaner_name);
  }
  if (locationId !== undefined && jobs[0]?.location_name) {
    filterChips.push(jobs[0].location_name);
  }
  if (reasonLabel) {
    filterChips.push(reasonLabel);
  }

  const filteredByText =
    filterChips.length > 0 ? `Filtered by: ${filterChips.join(" / ")}` : "";

  const evidenceContext: EvidenceContext = {
    source: "report",
    reasonCode: reason,
    reasonLabel,
    periodLabel: `${period.start} — ${period.end}`,
  };

  const titleSuffix = reasonLabel ? `: ${reasonLabel}` : "";

  return (
    <div className="relative min-h-screen bg-background">
      <div className="px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SLA exceptions</span>
            </div>
            <h1 className="text-xl font-semibold">
              Jobs with violation{titleSuffix}
            </h1>
            <p className="text-sm text-muted-foreground">
              These jobs violated your proof policy for the selected period.
            </p>
            <p className="text-sm text-muted-foreground">
              Period: {period.start} — {period.end} • {jobsCountLabel}
            </p>
            {filteredByText && (
              <p className="text-xs text-muted-foreground">{filteredByText}</p>
            )}
          </div>
          <Button variant="outline" onClick={handleBack}>
            ← Back to reports
          </Button>
        </div>

        {/* Empty state */}
        {jobs.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-card px-8 py-10 text-center">
            <h2 className="text-sm font-medium text-foreground">
              No jobs with this SLA exception in the selected period
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Try a different time range in the Reports view or adjust your
              filters.
            </p>
          </div>
        ) : (
          <div className="mt-4 border rounded-md overflow-hidden bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/70">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Location</th>
                  <th className="px-3 py-2 text-left">Cleaner</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-t hover:bg-muted/40 cursor-pointer"
                    onClick={() => handleViewJobInPanel(job)}
                  >
                    <td className="px-3 py-2">{job.scheduled_date}</td>
                    <td className="px-3 py-2">{job.location_name}</td>
                    <td className="px-3 py-2">{job.cleaner_name}</td>
                    <td className="px-3 py-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          job.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200",
                        ].join(" ")}
                      >
                        {job.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewJobInPanel(job);
                        }}
                      >
                        Quick view
                      </Button>
                      <Button
                        size="sm"
                        variant="link"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFullJobPage(job.id);
                        }}
                      >
                        Open job
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side Panel (reuse pattern из History), но уже с Evidence-контекстом */}
      {selectedJob && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSelectedJob(null)}
          />
          <JobSidePanel
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            evidenceContext={evidenceContext}
          />
        </>
      )}
    </div>
  );
}
