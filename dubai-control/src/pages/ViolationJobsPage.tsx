// dubai-control/src/pages/ViolationJobsPage.tsx

import { useEffect, useState, useMemo } from "react";
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

  const [data, setData] = useState<ViolationJobsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedJob, setSelectedJob] = useState<PlanningJob | null>(null);

  useEffect(() => {
    if (!reason || !periodStart || !periodEnd) {
      setError("Missing required parameters.");
      return;
    }

    setLoading(true);
    setError(null);

    getViolationJobs({
      reason,
      periodStart,
      periodEnd,
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
  }, [reason, periodStart, periodEnd]);

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

  if (!reason || !periodStart || !periodEnd) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={handleBack}>
          ← Back to reports
        </Button>
        <p className="mt-4 text-red-600">
          Invalid URL. Required params: reason, period_start, period_end.
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

  if (!data) {
    return null;
  }

  const { reason_label, period, jobs } = data;

  const jobsCountLabel = useMemo(() => {
    const count = jobs.length;
    if (count === 0) return "No jobs";
    if (count === 1) return "1 job";
    return `${count} jobs`;
  }, [jobs.length]);

  const evidenceContext: EvidenceContext = {
    source: "report",
    reasonCode: reason,
    reasonLabel: reason_label,
    periodLabel: `${period.start} — ${period.end}`,
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SLA exceptions</span>
            </div>
            <h1 className="text-xl font-semibold">
              Jobs with violation: {reason_label}
            </h1>
            <p className="text-sm text-muted-foreground">
              These jobs did not fully meet your current proof policy
              for this period.
            </p>
            <p className="text-sm text-muted-foreground">
              Period: {period.start} — {period.end} • {jobsCountLabel}
            </p>
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
              Try a different time range in the Reports view
              or select another SLA reason.
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
                  <tr key={job.id} className="border-t">
                    <td className="px-3 py-2">{job.scheduled_date}</td>
                    <td className="px-3 py-2">{job.location_name}</td>
                    <td className="px-3 py-2">{job.cleaner_name}</td>
                    <td className="px-3 py-2 capitalize">
                      {job.status.replace("_", " ")}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewJobInPanel(job)}
                      >
                        Quick view
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenFullJobPage(job.id)}
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
