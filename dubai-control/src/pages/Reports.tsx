// dubai-control/src/pages/Reports.tsx

import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getWeeklyReport,
  getMonthlyReport,
  emailWeeklyReport,
  emailMonthlyReport,
  getOwnerOverview,
  type ManagerReport,
} from "@/api/client";
import type { OwnerOverview } from "@/types/reports";
import { Button } from "@/components/ui/button";
import { Download, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ReportMode = "weekly" | "monthly";

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

  sentences.push(
    `In the selected period, ${jobsCount} ${jobsWord} were completed.`,
  );

  if (violationsCount > 0) {
    sentences.push(
      `${violationsCount} SLA ${violationsWord} were detected (${issueRatePct}% issue rate).`,
    );
  } else {
    sentences.push("No SLA violations were detected.");
  }

  if (violationsCount > 0 && top_reasons.length > 0) {
    const topTwo = top_reasons.slice(0, 2);
    const reasonsText = topTwo
      .map((r) => formatReasonCode(r.code))
      .join(topTwo.length === 2 ? " and " : "");
    if (reasonsText) {
      sentences.push(`Most common issues were ${reasonsText}.`);
    }
  }

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

function getIssueRateStatus(rateFraction: number) {
  const pct = rateFraction * 100;

  if (pct < 5) {
    return {
      label: "Healthy",
      className:
        "inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 text-[11px]",
    };
  }

  if (pct < 20) {
    return {
      label: "Needs attention",
      className:
        "inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-100 px-2 py-0.5 text-[11px]",
    };
  }

  return {
    label: "At risk",
    className:
      "inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 text-[11px]",
  };
}

export default function ReportsPage() {
  const location = useLocation();
  const isEmailHistory = location.pathname.startsWith("/reports/email-logs");

  const [mode, setMode] = useState<ReportMode>("weekly");

  // 🔀 Переключатель Owner / Manager view
  const [view, setView] = useState<"owner" | "manager">("owner");
  const isOwnerView = view === "owner";

  const [ownerOverview, setOwnerOverview] = useState<OwnerOverview | null>(null);
  const [ownerLoading, setOwnerLoading] = useState<boolean>(true);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<"self" | "custom">("self");
  const [customEmail, setCustomEmail] = useState("");
  const [customEmailError, setCustomEmailError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function loadOwnerOverview() {
      try {
        setOwnerLoading(true);
        setOwnerError(null);

        const data = await getOwnerOverview(); // по умолчанию 30 дней
        if (cancelled) return;

        setOwnerOverview(data);
      } catch (err: any) {
        if (cancelled) return;
        setOwnerError(err?.message || "Failed to load owner overview");
        setOwnerOverview(null);
      } finally {
        if (!cancelled) {
          setOwnerLoading(false);
        }
      }
    }

    void loadOwnerOverview();

    return () => {
      cancelled = true;
    };
  }, []);

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

  // сумма всех нарушений из top_reasons — для прогресс-баров
  const reasonsTotal =
    report?.top_reasons?.reduce((sum, r) => sum + r.count, 0) ?? 0;

  // Owner KPI helpers
  const ownerIssueRate = ownerOverview?.summary.issue_rate ?? 0;
  const ownerIssueStatus = getIssueRateStatus(ownerIssueRate);

  // Только проблемные сущности для менеджера
  const cleanersWithIssues =
    report?.cleaners?.filter((cl) => cl.violations_count > 0) ?? [];

  const locationsWithIssues =
    report?.locations?.filter((loc) => loc.violations_count > 0) ?? [];

  const handleDownloadReportPdf = async () => {
    if (!report) return;

    const endpoint =
      mode === "weekly"
        ? "/api/manager/reports/weekly/pdf/"
        : "/api/manager/reports/monthly/pdf/";

    try {
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
      const filenameBase =
        mode === "weekly" ? "weekly_report" : "monthly_report";
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

  async function handleEmailReportSubmit() {
    if (emailLoading) return;

    let emailToSend: string | undefined;

    if (emailMode === "custom") {
      const value = customEmail.trim();
      if (!value) {
        setCustomEmailError("Email is required.");
        return;
      }
      const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailRegex.test(value)) {
        setCustomEmailError("Invalid email format.");
        return;
      }
      emailToSend = value;
    } else {
      emailToSend = undefined; // backend возьмёт user.email
    }

    try {
      setEmailLoading(true);
      setEmailMessage(null);
      setEmailError(null);
      setCustomEmailError(null);

      let result: any;
      if (mode === "weekly") {
        result = await emailWeeklyReport(emailToSend);
      } else {
        result = await emailMonthlyReport(emailToSend);
      }

      const targetEmail =
        result?.target_email || result?.email || emailToSend || undefined;

      const label = mode === "weekly" ? "Weekly" : "Monthly";
      const detailText =
        result?.detail ||
        (targetEmail
          ? `${label} report emailed to ${targetEmail}.`
          : `${label} report emailed.`);

      setEmailMessage(detailText);
      setIsEmailDialogOpen(false);
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
        <div className="px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Reports
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Weekly and monthly SLA performance summaries you can share with
                owners.
              </p>
            </div>

            {/* Tabs: Overview / Email history */}
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-1 py-1 text-xs">
              <Link
                to="/reports"
                className={`px-3 py-1 rounded-full ${
                  isEmailHistory
                    ? "text-muted-foreground"
                    : "bg-background shadow-sm text-foreground"
                }`}
              >
                Overview
              </Link>
              <Link
                to="/reports/email-logs"
                className={`px-3 py-1 rounded-full ${
                  isEmailHistory
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Email history
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant={mode === "weekly" ? "default" : "outline"}
                onClick={() => {
                  setMode("weekly");
                  setEmailMessage(null);
                  setEmailError(null);
                }}
              >
                Weekly
              </Button>
              <Button
                variant={mode === "monthly" ? "default" : "outline"}
                onClick={() => {
                  setMode("monthly");
                  setEmailMessage(null);
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
                onClick={() => {
                  setEmailMessage(null);
                  setEmailError(null);
                  setCustomEmailError(null);
                  setEmailMode("self");
                  setCustomEmail("");
                  setIsEmailDialogOpen(true);
                }}
                disabled={emailLoading}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email report
              </Button>
            </div>

            {emailMessage && (
              <p className="text-xs text-emerald-600 mt-1">{emailMessage}</p>
            )}

            {emailError && (
              <p className="text-xs text-red-500 mt-1">{emailError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Email dialog */}
      <Dialog
        open={isEmailDialogOpen}
        onOpenChange={(open) => {
          setIsEmailDialogOpen(open);
          if (!open) {
            setCustomEmailError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "weekly" ? "Email weekly report" : "Email monthly report"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <RadioGroup
              value={emailMode}
              onValueChange={(v) => setEmailMode(v as "self" | "custom")}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="reports-email-self" value="self" />
                <Label
                  htmlFor="reports-email-self"
                  className="text-sm font-normal"
                >
                  Send to my account email
                </Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="reports-email-custom" value="custom" />
                  <Label
                    htmlFor="reports-email-custom"
                    className="text-sm font-normal"
                  >
                    Send to another email
                  </Label>
                </div>
                {emailMode === "custom" && (
                  <div className="pl-6 space-y-1">
                    <Input
                      type="email"
                      placeholder="owner@example.com"
                      value={customEmail}
                      onChange={(e) => {
                        setCustomEmail(e.target.value);
                        setCustomEmailError(null);
                      }}
                    />
                    {customEmailError && (
                      <p className="text-xs text-red-600">
                        {customEmailError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
              disabled={emailLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleEmailReportSubmit} disabled={emailLoading}>
              {emailLoading ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className="px-2 md:px-6 lg:px-10 py-6 space-y-6">
        {/* 🔀 Переключатель Owner / Manager view */}
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("owner")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition
              ${
                view === "owner"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
          >
            Owner view
          </button>

          <button
            type="button"
            onClick={() => setView("manager")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition
              ${
                view === "manager"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
          >
            Manager view
          </button>
        </div>

        {/* ==== OWNER LAYER =================================================== */}
        <div className="mb-10 rounded-2xl border border-border bg-muted/40 px-6 py-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                For owners
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                Owner overview
              </h2>
              {ownerOverview && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last 30 days (rolling window) · {ownerOverview.period.from} –{" "}
                  {ownerOverview.period.to}
                </p>
              )}
            </div>

            {ownerLoading && (
              <span className="text-xs text-muted-foreground">Loading…</span>
            )}
          </div>

          {ownerError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Failed to load owner overview: {ownerError}
            </div>
          )}

          {ownerOverview && !ownerError && (
            <>
              {/* KPI cards — accent on issue rate */}
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Issue rate — главный сигнал для владельца */}
                <div className="md:col-span-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-medium text-amber-900">
                    Issue rate
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-2xl font-semibold text-amber-900">
                      {(ownerIssueRate * 100).toFixed(1)}%
                    </p>
                    <span className={ownerIssueStatus.className}>
                      {ownerIssueStatus.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-amber-700/80">
                    Share of jobs with incomplete proof in the last 30 days
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Higher values mean more SLA risk for owners.
                  </p>
                </div>

                {/* Jobs total */}
                <div className="rounded-xl border border-border bg-background px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Jobs (period)
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {ownerOverview.summary.jobs_count}
                  </p>
                </div>

                {/* Jobs with issues */}
                <div className="rounded-xl border border-border bg-background px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Jobs with issues
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {ownerOverview.summary.violations_count}
                  </p>
                </div>
              </div>

              <p className="mb-4 text-[11px] text-muted-foreground">
                This is a high-level overview. Detailed SLA breakdown is
                available for managers.
              </p>

              {/* Top locations & cleaners */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Top locations by issues
                  </h3>
                  {ownerOverview.top_locations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No locations with issues in this period.
                    </p>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border text-muted-foreground">
                        <tr>
                          <th className="py-1 pr-2 font-medium">Location</th>
                          <th className="px-2 py-1 text-right font-medium">
                            Jobs
                          </th>
                          <th className="px-2 py-1 text-right font-medium">
                            With issues
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownerOverview.top_locations.map((loc) => (
                          <tr
                            key={loc.id}
                            className="border-b border-border/60"
                          >
                            <td className="py-1 pr-2">{loc.name}</td>
                            <td className="px-2 py-1 text-right">
                              {loc.jobs_count}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {loc.violations_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Top cleaners by volume
                  </h3>
                  {ownerOverview.top_cleaners.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No cleaner activity in this period.
                    </p>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border text-muted-foreground">
                        <tr>
                          <th className="py-1 pr-2 font-medium">Cleaner</th>
                          <th className="px-2 py-1 text-right font-medium">
                            Jobs
                          </th>
                          <th className="px-2 py-1 text-right font-medium">
                            With issues
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownerOverview.top_cleaners.map((cl) => (
                          <tr
                            key={cl.id}
                            className="border-b border-border/60"
                          >
                            <td className="py-1 pr-2">{cl.name}</td>
                            <td className="px-2 py-1 text-right">
                              {cl.jobs_count}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {cl.violations_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ==== MANAGER LAYER ================================================= */}
        {!isOwnerView && (
          <>
            {/* ==== MANAGER LAYER SEPARATOR =================================== */}
            <div className="mb-4 mt-2 border-t border-border pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                For managers
              </p>
              <h2 className="mt-1 text-base font-semibold text-foreground">
                Weekly & monthly SLA reports
              </h2>
            </div>

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
                {/* Hero-summary for the selected period */}
                <div className="rounded-2xl border border-border bg-card px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Period:{" "}
                      <span className="font-medium text-foreground">
                        {report.period.from} – {report.period.to}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Issue rate
                    </p>
                    <p className="text-2xl font-semibold text-foreground">
                      {(report.summary.issue_rate * 100).toFixed(1)}%
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {report.summary.jobs_count} jobs ·{" "}
                      {report.summary.violations_count} with issues
                    </p>
                  </div>
                </div>

                {/* Narrative summary — короткий вывод для менеджера */}
                {narrative && (
                  <div className="text-sm text-muted-foreground max-w-3xl">
                    {narrative}
                  </div>
                )}

                {/* Top SLA reasons — ПОЧЕМУ. Ставим выше таблиц */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="text-sm font-medium mb-1">
                    Top SLA reasons
                  </div>
                  <p className="text-xs text-muted-foreground">
                    What causes SLA violations most frequently in this period.
                  </p>
                  <p className="mt-1 mb-4 text-xs text-amber-600">
                    Click a reason to view affected jobs.
                  </p>

                  {report.top_reasons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No SLA violations in this period.
                    </p>
                  ) : (
                    <div className="space-y-1 text-sm">
                      {(() => {
                        const maxCount =
                          report.top_reasons.length > 0
                            ? Math.max(
                                ...report.top_reasons.map((x) => x.count),
                              )
                            : 0;

                        return report.top_reasons.map((r) => {
                          const share =
                            reasonsTotal > 0
                              ? Math.round((r.count / reasonsTotal) * 100)
                              : 0;
                          const isTop =
                            maxCount > 0 && r.count === maxCount;
                          const barClass = isTop
                            ? "bg-amber-500"
                            : "bg-amber-300";

                          return (
                            <button
                              key={r.code}
                              type="button"
                              title="View jobs with this SLA violation"
                              onClick={() => {
                                navigate(
                                  `/reports/violations?reason=${encodeURIComponent(
                                    r.code,
                                  )}&period_start=${report.period.from}&period_end=${
                                    report.period.to
                                  }`,
                                );
                              }}
                              className="w-full rounded-md border border-amber-100 bg-amber-50/40 px-3 py-2 text-left text-sm transition-colors hover:border-amber-300 hover:bg-amber-50 cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-foreground">
                                  {formatReasonCode(r.code)}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-900">
                                  × {r.count}
                                  {share > 0 && (
                                    <span className="ml-1 text-[10px] opacity-80">
                                      · {share}%
                                    </span>
                                  )}
                                </span>
                              </div>
                              {share > 0 && (
                                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${barClass}`}
                                    style={{ width: `${share}%` }}
                                  />
                                </div>
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {/* Who / Where — Cleaners + Locations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Cleaners */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="text-sm font-medium mb-1">
                      Cleaners with issues
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Who generates the most SLA violations in this period.
                      Click &quot;View jobs&quot; to investigate specific
                      cleaners.
                    </p>

                    {cleanersWithIssues.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No cleaners with SLA violations in this period.
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-muted-foreground">
                            <th className="text-left py-1.5">Cleaner</th>
                            <th className="text-right py-1.5">Jobs</th>
                            <th className="text-right py-1.5">
                              SLA violations
                            </th>
                            <th className="text-right py-1.5 pr-1.5">
                              Evidence
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {cleanersWithIssues.map((cl) => (
                            <tr
                              key={cl.id ?? cl.name}
                              className="border-t border-border/60 transition-colors hover:bg-amber-50/40"
                            >
                              <td className="py-1.5 pr-2 text-sm font-medium text-foreground">
                                {cl.name}
                              </td>
                              <td className="py-1.5 px-2 text-sm text-muted-foreground text-right">
                                {cl.jobs_count}
                              </td>
                              <td className="py-1.5 px-2 text-right">
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                                  {cl.violations_count} issues
                                </span>
                              </td>
                              <td className="py-1.5 text-right">
                                <button
                                  type="button"
                                  className="text-xs font-medium text-primary hover:underline"
                                  onClick={() => {
                                    if (!report) return;
                                    navigate(
                                      `/reports/violations?period_start=${report.period.from}` +
                                        `&period_end=${report.period.to}` +
                                        `&cleaner_id=${cl.id}`,
                                    );
                                  }}
                                >
                                  View jobs →
                                </button>
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
                    <p className="text-sm text-muted-foreground mb-4">
                      Where SLA problems appear most often. Click &quot;View
                      jobs&quot; to see affected jobs at this location.
                    </p>

                    {locationsWithIssues.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No locations with SLA violations in this period.
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-muted-foreground">
                            <th className="text-left py-1.5">Location</th>
                            <th className="text-right py-1.5">Jobs</th>
                            <th className="text-right py-1.5">
                              SLA violations
                            </th>
                            <th className="text-right py-1.5 pr-1.5">
                              Evidence
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {locationsWithIssues.map((loc) => (
                            <tr
                              key={loc.id ?? loc.name}
                              className="border-t border-border/60 transition-colors hover:bg-amber-50/40"
                            >
                              <td className="py-1.5 pr-2 text-sm font-medium text-foreground">
                                {loc.name}
                              </td>
                              <td className="py-1.5 px-2 text-sm text-muted-foreground text-right">
                                {loc.jobs_count}
                              </td>
                              <td className="py-1.5 px-2 text-right">
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                                  {loc.violations_count} issues
                                </span>
                              </td>
                              <td className="py-1.5 text-right">
                                <button
                                  type="button"
                                  className="text-xs font-medium text-primary hover:underline"
                                  onClick={() => {
                                    if (!report) return;
                                    navigate(
                                      `/reports/violations?period_start=${report.period.from}` +
                                        `&period_end=${report.period.to}` +
                                        `&location_id=${loc.id}`,
                                    );
                                  }}
                                >
                                  View jobs →
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
