// dubai-control/src/pages/Reports.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getWeeklyReport,
  getMonthlyReport,
  type ManagerReport,
  emailWeeklyReport,
  emailMonthlyReport,
} from "@/api/client";
import { Button } from "@/components/ui/button";
import { Download, Mail } from "lucide-react";

type ReportMode = "weekly" | "monthly";

type HistoryJumpOptions = {
  periodFrom: string;
  periodTo: string;
  cleanerId?: number | null;
  locationId?: number | null;
};

function buildHistoryUrl({
  periodFrom,
  periodTo,
  cleanerId,
  locationId,
}: HistoryJumpOptions): string {
  const params = new URLSearchParams();

  // Период отчёта → период в History
  params.set("date_from", periodFrom);
  params.set("date_to", periodTo);

  // Reports всегда про проблемы, поэтому сразу фильтруем violated
  params.set("sla_status", "violated");

  if (cleanerId) {
    params.set("cleaner_id", String(cleanerId));
  }

  if (locationId) {
    params.set("location_id", String(locationId));
  }

  return `/history?${params.toString()}`;
}

function formatReasonCode(code: string): string {
  if (!code) return "";
  const pretty = code.replace(/_/g, " ");
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

function buildNarrativeSummary(report: ManagerReport): string {
  const { summary, top_reasons, locations } = report;
  const jobsCount = summary.jobs_count;
  const violationsCount = summary.violations_count;
  const issueRatePct = (summary.issue_rate * 100).toFixed(1);

  const jobsWord = jobsCount === 1 ? "job" : "jobs";
  const violationsWord = violationsCount === 1 ? "violation" : "violations";

  const sentences: string[] = [];

  // 1) Общее количество работ
  sentences.push(
    `In the selected period, ${jobsCount} ${jobsWord} were completed.`,
  );

  // 2) Нарушения SLA
  if (violationsCount > 0) {
    sentences.push(
      `${violationsCount} SLA ${violationsWord} were detected (${issueRatePct}% issue rate).`,
    );
  } else {
    sentences.push("No SLA violations were detected.");
  }

  // 3) Основные причины (до двух штук)
  if (violationsCount > 0 && top_reasons.length > 0) {
    const topTwo = top_reasons.slice(0, 2);
    const reasonsText = topTwo
      .map((r) => formatReasonCode(r.code))
      .join(topTwo.length === 2 ? " and " : "");
    if (reasonsText) {
      sentences.push(`Most common issues were ${reasonsText}.`);
    }
  }

  // 4) Основная локация по проблемам
  if (violationsCount > 0 && locations.length > 0) {
    const sorted = [...locations].sort(
      (a, b) => b.violations_count - a.violations_count,
    );
    const topLocation = sorted[0];
    if (topLocation && topLocation.violations_count > 0 && topLocation.name) {
      sentences.push(`Issues occurred primarily at ${topLocation.name}.`);
    }
  }

  return sentences.join(" ");
}

export default function Reports() {
  const [mode, setMode] = useState<ReportMode>("weekly");

  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const {
    data: weekly,
    isLoading: weeklyLoading,
    isError: weeklyError,
  } = useQuery<ManagerReport>({
    queryKey: ["manager-report", "weekly"],
    queryFn: getWeeklyReport,
  });

  const {
    data: monthly,
    isLoading: monthlyLoading,
    isError: monthlyError,
  } = useQuery<ManagerReport>({
    queryKey: ["manager-report", "monthly"],
    queryFn: getMonthlyReport,
  });

  const report = mode === "weekly" ? weekly : monthly;
  const loading = mode === "weekly" ? weeklyLoading : monthlyLoading;
  const error = mode === "weekly" ? weeklyError : monthlyError;

  const title = mode === "weekly" ? "Weekly summary" : "Monthly summary";
  const narrative =
    !loading && !error && report ? buildNarrativeSummary(report) : "";

  const handleDownloadReportPdf = async () => {
    if (!report) return;

    // Определяем, какой PDF нужно скачать
    const endpoint =
      mode === "weekly"
        ? "/api/manager/reports/weekly/pdf/"
        : "/api/manager/reports/monthly/pdf/";

    try {
      // ⚠️ Используем тот же базовый URL и токен, что и остальной фронт.
      // Если у тебя ключ в localStorage называется иначе — подправь строку ниже.
      const apiBase =
        import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("managerToken");

      const resp = await fetch(`${apiBase}${endpoint}`, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
      });

      if (!resp.ok) {
        throw new Error(`Failed to download PDF (${resp.status})`);
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      const period = report.period;
      const filenameBase = mode === "weekly" ? "weekly_report" : "monthly_report";
      const filename = `${filenameBase}_${period.from}_to_${period.to}.pdf`;

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF. Please try again in a moment.");
    }
  };

  async function handleEmailReport() {
    if (emailLoading) return;

    try {
      setEmailLoading(true);
      setEmailSent(false);
      setEmailError(null);

      if (mode === "weekly") {
        await emailWeeklyReport();
      } else {
        await emailMonthlyReport();
      }

      setEmailSent(true);
    } catch (e) {
      console.error("[Reports] Email report failed", e);
      setEmailError(
        e instanceof Error ? e.message : "Failed to email report",
      );
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="px-6 py-6 max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">
              Weekly and monthly SLA performance summaries you can share with
              owners.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant={mode === "weekly" ? "default" : "outline"}
                onClick={() => {
                  setMode("weekly");
                  setEmailSent(false);
                  setEmailError(null);
                }}
              >
                Weekly
              </Button>
              <Button
                variant={mode === "monthly" ? "default" : "outline"}
                onClick={() => {
                  setMode("monthly");
                  setEmailSent(false);
                  setEmailError(null);
                }}
              >
                Monthly
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-border"
                onClick={handleDownloadReportPdf}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>

              <Button
                variant="outline"
                className="border-border"
                onClick={handleEmailReport}
                disabled={emailLoading}
              >
                <Mail className="w-4 h-4 mr-2" />
                {emailLoading ? "Sending…" : "Email report"}
              </Button>
            </div>

            {emailSent && (
              <p className="text-xs text-emerald-600 mt-1">
                Report email scheduled to your address.
              </p>
            )}

            {emailError && (
              <p className="text-xs text-red-500 mt-1">{emailError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {loading && (
          <p className="text-sm text-muted-foreground">
            Loading {title.toLowerCase()}…
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive">
            Failed to load {title.toLowerCase()}. Please try again later.
          </p>
        )}

        {report && !loading && !error && (
          <>
            {/* Summary strip */}
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{title}</span> ·{" "}
              <span>
                {report.period.from} – {report.period.to}
              </span>{" "}
              ·{" "}
              <span>
                {report.summary.jobs_count} jobs ·{" "}
                {report.summary.violations_count} SLA violations ·{" "}
                {(report.summary.issue_rate * 100).toFixed(1)}% issue rate
              </span>
            </div>

            {/* Narrative summary */}
            {narrative && (
              <div className="text-sm text-muted-foreground max-w-3xl">
                {narrative}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cleaners */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-sm font-medium mb-1">
                  Cleaners with issues
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Who generates the most SLA violations in this period.
                </p>

                {report.cleaners.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No jobs in this period.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="text-left py-1.5">Cleaner</th>
                        <th className="text-right py-1.5">Jobs</th>
                        <th className="text-right py-1.5">SLA violations</th>
                        <th className="text-right py-1.5 pr-1.5">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.cleaners.map((cl) => (
                        <tr
                          key={cl.id ?? cl.name}
                          className="border-t border-border/40"
                        >
                          <td className="py-1.5">{cl.name}</td>
                          <td className="py-1.5 text-right">
                            {cl.jobs_count}
                          </td>
                          <td className="py-1.5 text-right">
                            {cl.violations_count}
                          </td>
                          <td className="py-1.5 text-right">
                            <Link
                              to={buildHistoryUrl({
                                periodFrom: report.period.from,
                                periodTo: report.period.to,
                                cleanerId: cl.id ?? null,
                              })}
                              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                            >
                              View jobs →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Locations */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-sm font-medium mb-1">
                  Locations with issues
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Where SLA problems appear most often in this period.
                </p>

                {report.locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No jobs in this period.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th className="text-left py-1.5">Location</th>
                        <th className="text-right py-1.5">Jobs</th>
                        <th className="text-right py-1.5">SLA violations</th>
                        <th className="text-right py-1.5 pr-1.5">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.locations.map((loc) => (
                        <tr
                          key={loc.id ?? loc.name}
                          className="border-t border-border/40"
                        >
                          <td className="py-1.5">{loc.name}</td>
                          <td className="py-1.5 text-right">
                            {loc.jobs_count}
                          </td>
                          <td className="py-1.5 text-right">
                            {loc.violations_count}
                          </td>
                          <td className="py-1.5 text-right">
                            <Link
                              to={buildHistoryUrl({
                                periodFrom: report.period.from,
                                periodTo: report.period.to,
                                locationId: loc.id ?? null,
                              })}
                              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                            >
                              View jobs →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Reasons */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-medium mb-1">Top SLA reasons</div>
              <p className="text-xs text-muted-foreground mb-4">
                What causes SLA violations most frequently.
              </p>

              {report.top_reasons.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No SLA violations in this period.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {report.top_reasons.map((r) => (
                    <li
                      key={r.code}
                      className="flex items-center justify-between"
                    >
                      <span>{formatReasonCode(r.code)}</span>
                      <span className="text-muted-foreground">
                        × {r.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
