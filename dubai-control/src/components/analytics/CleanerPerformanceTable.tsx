import { cn } from "@/lib/utils";
import { CleanerPerformance } from "@/data/analyticsData";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface CleanerPerformanceTableProps {
  data: CleanerPerformance[];
}

export function CleanerPerformanceTable({ data }: CleanerPerformanceTableProps) {
  const sortedData = [...data].sort((a, b) => b.jobsCompleted - a.jobsCompleted);

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border p-6">
        <h3 className="text-base font-semibold text-foreground">
          Cleaner Performance
        </h3>
        <p className="text-sm text-muted-foreground">
          Weekly performance metrics by cleaner
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cleaner
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Jobs
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Avg Duration
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                On-time
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Proof Rate
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Issues
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.map((cleaner, index) => {
              const isTopPerformer = index < 2;
              const hasIssues = cleaner.issuesCount > 2;
              const slowDuration = cleaner.avgDuration > 2.5;
              const lowOnTime = cleaner.onTimeRate < 90;

              return (
                <tr
                  key={cleaner.id}
                  className={cn(
                    "transition-colors hover:bg-muted/20",
                    isTopPerformer && "bg-analytics-success-light/30",
                  )}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium",
                          isTopPerformer
                            ? "bg-analytics-success-light text-analytics-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {cleaner.name
                          .split(" ")
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {cleaner.name}
                        </p>
                        {isTopPerformer && (
                          <span className="text-xs text-analytics-success">
                            Top Performer
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    <span className="font-semibold text-foreground">
                      {cleaner.jobsCompleted}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {slowDuration && (
                        <Clock className="h-3.5 w-3.5 text-analytics-warning" />
                      )}
                      <span
                        className={cn(
                          "font-medium",
                          slowDuration
                            ? "text-analytics-warning"
                            : "text-foreground",
                        )}
                      >
                        {cleaner.avgDuration.toFixed(2)}h
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        cleaner.onTimeRate >= 95
                          ? "bg-analytics-success-light text-analytics-success"
                          : lowOnTime
                          ? "bg-analytics-warning-light text-analytics-warning"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {cleaner.onTimeRate >= 95 && (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {cleaner.onTimeRate}%
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            cleaner.proofCompletionRate >= 98
                              ? "bg-analytics-success"
                              : cleaner.proofCompletionRate >= 95
                              ? "bg-analytics-primary"
                              : "bg-analytics-warning",
                          )}
                          style={{
                            width: `${cleaner.proofCompletionRate}%`,
                          }}
                        />
                      </div>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {cleaner.proofCompletionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    {cleaner.issuesCount === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-sm font-medium",
                          hasIssues
                            ? "text-analytics-danger"
                            : "text-analytics-warning",
                        )}
                      >
                        {hasIssues && (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        )}
                        {cleaner.issuesCount}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
