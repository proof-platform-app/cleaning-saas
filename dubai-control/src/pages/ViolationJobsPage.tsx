// dubai-control/src/pages/ViolationJobs.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getViolationJobs, ViolationJobsResponse } from "@/api/client";
import { Button } from "@/components/ui/button";

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
      .catch((err) => {
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

  const handleViewJob = (jobId: number) => {
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
        <p className="mt-4">Loading jobs with violations…</p>
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Jobs with violation: {reason_label}
          </h1>
          <p className="text-sm text-muted-foreground">
            Period: {period.start} — {period.end}
          </p>
        </div>
        <Button variant="outline" onClick={handleBack}>
          ← Back to reports
        </Button>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No jobs with this violation in the selected period.
        </p>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
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
                  <td className="px-3 py-2">{job.status}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewJob(job.id)}
                    >
                      View job
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
