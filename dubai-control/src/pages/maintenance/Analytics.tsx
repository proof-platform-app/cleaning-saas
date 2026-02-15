// dubai-control/src/pages/maintenance/Analytics.tsx
// Maintenance Analytics (S2-P2)
// Displays KPIs, trends, asset performance, and technician comparison

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, subDays } from "date-fns";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wrench,
  Users,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";
import {
  getMaintenanceAnalyticsSummary,
  getMaintenanceVisitsTrend,
  getMaintenanceSlaTrend,
  getMaintenanceAssetsPerformance,
  getMaintenanceTechniciansPerformance,
  maintenanceKeys,
  type AnalyticsDateRange,
  type MaintenanceAnalyticsSummary,
  type MaintenanceVisitsTrendPoint,
  type MaintenanceSlaTrendPoint,
  type MaintenanceAssetPerformance,
  type MaintenanceTechnicianPerformance,
} from "@/api/maintenance";

// ============================================================================
// Types
// ============================================================================

type DatePreset = "7" | "14" | "30";

// ============================================================================
// RBAC
// ============================================================================

function canAccessAnalytics(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDateRange(days: number): AnalyticsDateRange {
  const today = new Date();
  const from = subDays(today, days - 1);
  return {
    date_from: format(from, "yyyy-MM-dd"),
    date_to: format(today, "yyyy-MM-dd"),
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDelta(delta: number): { text: string; isPositive: boolean } {
  const isPositive = delta > 0;
  const text = delta === 0 ? "0%" : `${isPositive ? "+" : ""}${delta}%`;
  return { text, isPositive };
}

// ============================================================================
// KPI Card Component
// ============================================================================

interface KPICardProps {
  title: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon: React.ReactNode;
  loading?: boolean;
  variant?: "default" | "success" | "warning" | "info";
}

function KPICard({
  title,
  value,
  delta,
  deltaLabel,
  icon,
  loading,
  variant = "default",
}: KPICardProps) {
  const variantClasses = {
    default: "border-border bg-card",
    success: "border-emerald-200 bg-emerald-50/50",
    warning: "border-amber-200 bg-amber-50/50",
    info: "border-slate-200 bg-slate-50/50",
  };

  const iconBgClasses = {
    default: "bg-muted/50 text-muted-foreground",
    success: "bg-emerald-100/80 text-emerald-600",
    warning: "bg-amber-100/80 text-amber-600",
    info: "bg-slate-100/80 text-slate-600",
  };

  const deltaInfo = delta !== undefined ? formatDelta(delta) : null;

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${variantClasses[variant]}`}>
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 ${iconBgClasses[variant]}`}>
          {icon}
        </div>
        {deltaInfo && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              deltaInfo.isPositive ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {deltaInfo.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{deltaInfo.text}</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{title}</p>
            {deltaLabel && (
              <p className="text-[10px] text-muted-foreground/70">{deltaLabel}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Chart Card Component
// ============================================================================

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

function ChartCard({ title, children, loading, error, onRetry }: ChartCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-medium text-foreground mb-4">{title}</h3>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2">
          <p className="text-sm text-destructive">Failed to load</p>
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-1.5 h-3 w-3" />
            Retry
          </Button>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ============================================================================
// Table Components
// ============================================================================

interface TableProps<T> {
  data: T[];
  columns: {
    key: keyof T | string;
    header: string;
    render?: (item: T) => React.ReactNode;
    align?: "left" | "center" | "right";
  }[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading,
  emptyMessage = "No data available",
  onRowClick,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const isClickable = !!onRowClick;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`py-2 px-3 text-xs font-medium text-muted-foreground ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left"
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={idx}
              className={`border-b border-border/50 last:border-0 ${
                isClickable
                  ? "cursor-pointer hover:bg-muted/50 transition-colors"
                  : ""
              }`}
              onClick={isClickable ? () => onRowClick(item) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`py-2.5 px-3 ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left"
                  }`}
                >
                  {col.render
                    ? col.render(item)
                    : String(item[col.key as keyof T] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MaintenanceAnalytics() {
  const navigate = useNavigate();
  const user = useUserRole();
  const hasAccess = canAccessAnalytics(user.role);

  // Date range state
  const [selectedDays, setSelectedDays] = useState<DatePreset>("7");
  const dateRange = useMemo(() => getDateRange(Number(selectedDays)), [selectedDays]);

  // Navigation handlers for drill-down
  const handleAssetClick = (asset: MaintenanceAssetPerformance) => {
    const params = new URLSearchParams({
      asset_id: String(asset.asset_id),
      date_from: dateRange.date_from,
      date_to: dateRange.date_to,
    });
    navigate(`/maintenance/visits?${params.toString()}`);
  };

  const handleTechnicianClick = (tech: MaintenanceTechnicianPerformance) => {
    const params = new URLSearchParams({
      technician_id: String(tech.technician_id),
      date_from: dateRange.date_from,
      date_to: dateRange.date_to,
    });
    navigate(`/maintenance/visits?${params.toString()}`);
  };

  // Handler for clicking on chart bars - navigates to visits for that specific day
  const handleChartBarClick = (data: { originalDate?: string }) => {
    if (!data.originalDate) return;
    const params = new URLSearchParams({
      date_from: data.originalDate,
      date_to: data.originalDate,
    });
    navigate(`/maintenance/visits?${params.toString()}`);
  };

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: maintenanceKeys.analytics.summary(dateRange),
    queryFn: () => getMaintenanceAnalyticsSummary(dateRange),
    enabled: hasAccess,
  });

  const {
    data: visitsTrend,
    isLoading: visitsTrendLoading,
    isError: visitsTrendError,
    refetch: refetchVisitsTrend,
  } = useQuery({
    queryKey: maintenanceKeys.analytics.visitsTrend(dateRange),
    queryFn: () => getMaintenanceVisitsTrend(dateRange),
    enabled: hasAccess,
  });

  const {
    data: slaTrend,
    isLoading: slaTrendLoading,
    isError: slaTrendError,
    refetch: refetchSlaTrend,
  } = useQuery({
    queryKey: maintenanceKeys.analytics.slaTrend(dateRange),
    queryFn: () => getMaintenanceSlaTrend(dateRange),
    enabled: hasAccess,
  });

  const {
    data: assetsPerformance,
    isLoading: assetsLoading,
    isError: assetsError,
    refetch: refetchAssets,
  } = useQuery({
    queryKey: maintenanceKeys.analytics.assetsPerformance(dateRange),
    queryFn: () => getMaintenanceAssetsPerformance(dateRange),
    enabled: hasAccess,
  });

  const {
    data: techniciansPerformance,
    isLoading: techniciansLoading,
    isError: techniciansError,
    refetch: refetchTechnicians,
  } = useQuery({
    queryKey: maintenanceKeys.analytics.techniciansPerformance(dateRange),
    queryFn: () => getMaintenanceTechniciansPerformance(dateRange),
    enabled: hasAccess,
  });

  // -------------------------------------------------------------------------
  // Chart Data Formatting
  // -------------------------------------------------------------------------

  const formattedVisitsTrend = useMemo(() => {
    if (!visitsTrend) return [];
    return visitsTrend.map((point) => ({
      ...point,
      date: format(new Date(point.date), "MMM d"),
    }));
  }, [visitsTrend]);

  const formattedSlaTrend = useMemo(() => {
    if (!slaTrend) return [];
    return slaTrend.map((point) => ({
      ...point,
      originalDate: point.date, // Keep original YYYY-MM-DD for navigation
      date: format(new Date(point.date), "MMM d"),
      violation_rate_pct: Math.round(point.violation_rate * 100),
    }));
  }, [slaTrend]);

  // -------------------------------------------------------------------------
  // Access restricted
  // -------------------------------------------------------------------------

  if (!hasAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view analytics.
          </p>
        </div>
      </MaintenanceLayout>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <MaintenanceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Maintenance performance insights
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["7", "14", "30"] as DatePreset[]).map((days) => (
              <Button
                key={days}
                variant={selectedDays === days ? "default" : "outline"}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setSelectedDays(days)}
              >
                {days}d
              </Button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Visits Completed"
            value={summary?.visits_completed ?? "—"}
            delta={summary?.visits_delta}
            deltaLabel="vs previous period"
            icon={<CheckCircle2 className="h-4 w-4" />}
            loading={summaryLoading}
            variant="success"
          />
          <KPICard
            title="SLA Compliance"
            value={summary ? formatPercent(summary.sla_compliance_rate) : "—"}
            delta={summary?.sla_delta}
            deltaLabel="vs previous period"
            icon={<BarChart3 className="h-4 w-4" />}
            loading={summaryLoading}
            variant="info"
          />
          <KPICard
            title="Avg Duration"
            value={
              summary
                ? `${summary.avg_visit_duration_hours.toFixed(1)}h`
                : "—"
            }
            delta={summary?.duration_delta}
            deltaLabel="vs previous period"
            icon={<Clock className="h-4 w-4" />}
            loading={summaryLoading}
          />
          <KPICard
            title="Issues Detected"
            value={summary?.issues_detected ?? "—"}
            delta={summary?.issues_delta}
            deltaLabel="SLA violations"
            icon={<AlertTriangle className="h-4 w-4" />}
            loading={summaryLoading}
            variant={summary && summary.issues_detected > 0 ? "warning" : "default"}
          />
        </div>

        {/* Visits Trend Chart */}
        <ChartCard
          title="Visits Completed Trend"
          loading={visitsTrendLoading}
          error={visitsTrendError}
          onRetry={() => refetchVisitsTrend()}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedVisitsTrend}>
                <defs>
                  <linearGradient id="visitsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="visits_completed"
                  name="Visits"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#visitsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* SLA Violations Trend Chart */}
        <ChartCard
          title="SLA Violations Trend"
          loading={slaTrendLoading}
          error={slaTrendError}
          onRetry={() => refetchSlaTrend()}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={formattedSlaTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="left"
                  dataKey="visits_completed"
                  name="Visits"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => handleChartBarClick(data)}
                />
                <Bar
                  yAxisId="left"
                  dataKey="visits_with_violations"
                  name="Violations"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => handleChartBarClick(data)}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="violation_rate_pct"
                  name="Violation Rate %"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Two Column Layout for Tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Problematic Assets */}
          <ChartCard
            title="Top Problematic Assets"
            loading={assetsLoading}
            error={assetsError}
            onRetry={() => refetchAssets()}
          >
            <DataTable<MaintenanceAssetPerformance>
              data={(assetsPerformance || []).slice(0, 5)}
              loading={assetsLoading}
              emptyMessage="No asset data for this period"
              onRowClick={handleAssetClick}
              columns={[
                {
                  key: "asset_name",
                  header: "Asset",
                  render: (item) => (
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">
                          {item.asset_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.asset_type_name}
                        </p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "location_name",
                  header: "Location",
                },
                {
                  key: "visits_completed",
                  header: "Visits",
                  align: "center",
                },
                {
                  key: "violations_count",
                  header: "Violations",
                  align: "center",
                  render: (item) => (
                    <span
                      className={
                        item.violations_count > 0
                          ? "text-amber-600 font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {item.violations_count}
                    </span>
                  ),
                },
                {
                  key: "violation_rate",
                  header: "Rate",
                  align: "right",
                  render: (item) => (
                    <span
                      className={
                        item.violation_rate > 0.2
                          ? "text-red-500 font-medium"
                          : item.violation_rate > 0
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }
                    >
                      {formatPercent(item.violation_rate)}
                    </span>
                  ),
                },
              ]}
            />
          </ChartCard>

          {/* Technician Comparison */}
          <ChartCard
            title="Technician Performance"
            loading={techniciansLoading}
            error={techniciansError}
            onRetry={() => refetchTechnicians()}
          >
            <DataTable<MaintenanceTechnicianPerformance>
              data={(techniciansPerformance || []).slice(0, 5)}
              loading={techniciansLoading}
              emptyMessage="No technician data for this period"
              onRowClick={handleTechnicianClick}
              columns={[
                {
                  key: "technician_name",
                  header: "Technician",
                  render: (item) => (
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{item.technician_name}</span>
                    </div>
                  ),
                },
                {
                  key: "visits_completed",
                  header: "Visits",
                  align: "center",
                },
                {
                  key: "avg_duration_hours",
                  header: "Avg Time",
                  align: "center",
                  render: (item) => `${item.avg_duration_hours}h`,
                },
                {
                  key: "sla_compliance_rate",
                  header: "SLA",
                  align: "center",
                  render: (item) => (
                    <span
                      className={
                        item.sla_compliance_rate >= 0.95
                          ? "text-emerald-600 font-medium"
                          : item.sla_compliance_rate >= 0.8
                          ? "text-amber-600"
                          : "text-red-500"
                      }
                    >
                      {formatPercent(item.sla_compliance_rate)}
                    </span>
                  ),
                },
                {
                  key: "violations_count",
                  header: "Issues",
                  align: "right",
                  render: (item) => (
                    <span
                      className={
                        item.violations_count > 0
                          ? "text-amber-600"
                          : "text-muted-foreground"
                      }
                    >
                      {item.violations_count}
                    </span>
                  ),
                },
              ]}
            />
          </ChartCard>
        </div>
      </div>
    </MaintenanceLayout>
  );
}
