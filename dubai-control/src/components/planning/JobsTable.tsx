// dubai-control/src/components/planning/JobsTable.tsx

import { Link } from "react-router-dom";
import { ChevronRight, Camera, ListChecks } from "lucide-react";

import { StatusPill } from "@/components/ui/status-pill";
import type { PlanningJob } from "@/types/planning";
import { cn } from "@/lib/utils";

function ProofBadges({ job }: { job: PlanningJob }) {
  const before = Boolean(job.proof?.before_photo);
  const after = Boolean(job.proof?.after_photo);
  const list = Boolean(job.proof?.checklist);

  // если вообще нет пруфов — показываем просто "—"
  if (!before && !after && !list) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const base =
    "inline-flex items-center gap-1.5 text-xs font-medium transition-colors";
  const onCls = "text-emerald-600";
  const offCls = "text-muted-foreground";

  return (
    <div className="flex items-center gap-4">
      {/* Before */}
      <span className={cn(base, before ? onCls : offCls)}>
        <Camera
          className={cn(
            "w-3.5 h-3.5",
            before ? "" : "opacity-40"
          )}
        />
        <span>Before</span>
      </span>

      {/* After */}
      <span className={cn(base, after ? onCls : offCls)}>
        <Camera
          className={cn(
            "w-3.5 h-3.5",
            after ? "" : "opacity-40"
          )}
        />
        <span>After</span>
      </span>

      {/* Checklist */}
      <span className={cn(base, list ? onCls : offCls)}>
        <ListChecks
          className={cn(
            "w-3.5 h-3.5",
            list ? "" : "opacity-40"
          )}
        />
        <span>List</span>
      </span>
    </div>
  );
}

type Props = {
  jobs: PlanningJob[];
  loading?: boolean;
  onJobClick?: (job: PlanningJob) => void;
};

function formatTime(value: string | null | undefined): string | null {
  if (!value) return null;
  // "09:00:00" -> "09:00"
  if (value.length >= 5) {
    return value.slice(0, 5);
  }
  return value;
}

export function JobsTable({ jobs, loading = false, onJobClick }: Props) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Job
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cleaner
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Proof
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="bg-card divide-y divide-border">
            {jobs.map((job) => {
              const start = formatTime(job.scheduled_start_time);
              const end = formatTime(job.scheduled_end_time);

              return (
                <tr
                  key={job.id}
                  className="hover:bg-muted/20 cursor-pointer"
                  onClick={() => onJobClick?.(job)}
                >
                  <td className="px-4 py-4">
                    <div className="font-medium text-foreground">
                      JOB-{String(job.id).padStart(3, "0")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {job.scheduled_date}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-medium text-foreground">
                      {job.location?.name || "—"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {job.location?.address || "—"}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-medium text-foreground">
                      {job.cleaner?.full_name || "—"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {job.cleaner?.phone || "—"}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-foreground">
                    {start && end ? `${start} - ${end}` : "—"}
                  </td>

                  <td className="px-4 py-4">
                    <StatusPill status={job.status as any} />
                  </td>

                  <td className="px-4 py-4">
                    <ProofBadges job={job} />
                  </td>

                  <td className="px-4 py-4 text-right">
                    <Link
                      to={`/jobs/${job.id}`}
                      onClick={(e) => {
                        if (onJobClick) {
                          e.preventDefault();
                          onJobClick(job);
                        }
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      )}
                    >
                      View
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}

            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Loading jobs…
                </td>
              </tr>
            )}

            {!loading && jobs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No jobs
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
