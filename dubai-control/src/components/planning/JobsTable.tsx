// dubai-control/src/components/planning/JobsTable.tsx
import React from "react";
import type { PlanningJob } from "@/types/planning";
import { Camera, ListChecks } from "lucide-react";

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

  const label =
    status === "in_progress"
      ? "In Progress"
      : status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
        map[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}

function ProofItem({
  label,
  ok,
  icon,
}: {
  label: string;
  ok: boolean;
  icon: React.ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 text-xs",
        ok ? "text-emerald-600" : "text-muted-foreground",
      ].join(" ")}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

function ProofCell({ job }: { job: PlanningJob }) {
  const proof = job.proof ?? {};
  const before = Boolean(proof.before_photo);
  const after = Boolean(proof.after_photo);
  const list = Boolean(proof.checklist);

  if (!before && !after && !list) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <ProofItem
        label="Before"
        ok={before}
        icon={<Camera className="h-4 w-4" />}
      />
      <ProofItem
        label="After"
        ok={after}
        icon={<Camera className="h-4 w-4" />}
      />
      <ProofItem
        label="List"
        ok={list}
        icon={<ListChecks className="h-4 w-4" />}
      />
    </div>
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
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  No jobs.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-t border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => onJobClick(job)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    {(job.scheduled_start_time ?? "").slice(0, 5)} –{" "}
                    {(job.scheduled_end_time ?? "").slice(0, 5)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium">{job.location.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {job.location.address ?? ""}
                    </div>
                  </td>
                  <td className="px-4 py-4">{job.cleaner.full_name ?? "—"}</td>
                  <td className="px-4 py-4">
                    <StatusPill status={job.status} />
                  </td>
                  <td className="px-4 py-4">
                    <ProofCell job={job} />
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
