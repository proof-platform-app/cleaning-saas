import React from "react";
import type { PlanningJob } from "@/types/planning";

type Props = {
  jobs: PlanningJob[];
  loading: boolean;
  onJobClick: (job: PlanningJob) => void;
};

function StatusPill({ status }: { status: PlanningJob["status"] }) {
  const map: Record<string, string> = {
    scheduled: "bg-slate-100 text-slate-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    issue: "bg-red-100 text-red-700",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${map[status] ?? "bg-slate-100"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export function JobsTable({ jobs, loading, onJobClick }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">TIME</th>
              <th className="text-left px-4 py-3">LOCATION</th>
              <th className="text-left px-4 py-3">CLEANER</th>
              <th className="text-left px-4 py-3">STATUS</th>
              <th className="text-left px-4 py-3">PROOF</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>Loading…</td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>No jobs.</td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-t border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => onJobClick(job)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    {(job.scheduled_start_time ?? "").slice(0, 5)} – {(job.scheduled_end_time ?? "").slice(0, 5)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium">{job.location.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{job.location.address ?? ""}</div>
                  </td>
                  <td className="px-4 py-4">{job.cleaner.full_name ?? "—"}</td>
                  <td className="px-4 py-4"><StatusPill status={job.status} /></td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {/* Пока как заглушка. Реальные “синие значки” вернём, когда proof будет приходить с бэка */}
                    —
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
