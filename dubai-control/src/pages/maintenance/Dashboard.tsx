// dubai-control/src/pages/maintenance/Dashboard.tsx
// Maintenance Dashboard with 4 summary widgets
// Uses ONLY existing endpoints - no new backend required

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { format, addDays, subDays, startOfMonth } from "date-fns";
import {
  Calendar,
  CalendarClock,
  AlertTriangle,
  Wrench,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";
import {
  listVisits,
  listAssets,
  maintenanceKeys,
  type ServiceVisit,
} from "@/api/maintenance";

// ============================================================================
// Constants
// ============================================================================

// Only these statuses are displayed/counted per MAINTENANCE_CONTEXT_V1_SCOPE
const VALID_STATUSES = ["scheduled", "in_progress", "completed"] as const;

// Filter out cancelled visits (they should not be displayed or counted)
function filterValidVisits(visits: ServiceVisit[]): ServiceVisit[] {
  return visits.filter((v) => VALID_STATUSES.includes(v.status as any));
}

// ============================================================================
// RBAC
// ============================================================================

function canAccessDashboard(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// ============================================================================
// Widget Component
// ============================================================================

interface WidgetProps {
  title: string;
  icon: React.ReactNode;
  value: number | string;
  subtitle?: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  linkTo?: string;
  linkLabel?: string;
  variant?: "default" | "warning" | "success";
}

function Widget({
  title,
  icon,
  value,
  subtitle,
  loading,
  error,
  onRetry,
  linkTo,
  linkLabel = "View all",
  variant = "default",
}: WidgetProps) {
  const variantClasses = {
    default: "border-border",
    warning: "border-amber-500/30 bg-amber-500/5",
    success: "border-green-500/30 bg-green-500/5",
  };

  const iconClasses = {
    default: "text-muted-foreground",
    warning: "text-amber-500",
    success: "text-green-500",
  };

  return (
    <div
      className={`rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md ${variantClasses[variant]}`}
    >
      <div className="flex items-start justify-between">
        <div className={`rounded-lg bg-muted/50 p-2 ${iconClasses[variant]}`}>
          {icon}
        </div>
        {linkTo && (
          <Link
            to={linkTo}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {linkLabel}
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : error ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">Failed to load</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onRetry}
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Retry
            </Button>
          </div>
        ) : (
          <>
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{title}</p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                {subtitle}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Dashboard Component
// ============================================================================

export default function MaintenanceDashboard() {
  const navigate = useNavigate();
  const user = useUserRole();
  const hasAccess = canAccessDashboard(user.role);

  // Date calculations
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const sevenDaysAhead = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  // -------------------------------------------------------------------------
  // 1. Visits Today
  // -------------------------------------------------------------------------
  const {
    data: todayVisits = [],
    isLoading: todayLoading,
    isError: todayError,
    refetch: refetchToday,
  } = useQuery({
    queryKey: maintenanceKeys.visits.list({ date_from: today, date_to: today }),
    queryFn: () => listVisits({ date_from: today, date_to: today }),
    enabled: hasAccess,
  });

  // -------------------------------------------------------------------------
  // 2. Upcoming Visits (next 7 days, excluding today)
  // -------------------------------------------------------------------------
  const {
    data: upcomingVisits = [],
    isLoading: upcomingLoading,
    isError: upcomingError,
    refetch: refetchUpcoming,
  } = useQuery({
    queryKey: maintenanceKeys.visits.list({
      date_from: tomorrow,
      date_to: sevenDaysAhead,
    }),
    queryFn: () =>
      listVisits({ date_from: tomorrow, date_to: sevenDaysAhead }),
    enabled: hasAccess,
  });

  // -------------------------------------------------------------------------
  // 3. Overdue Visits (scheduled status + date before today)
  // -------------------------------------------------------------------------
  const {
    data: overdueVisits = [],
    isLoading: overdueLoading,
    isError: overdueError,
    refetch: refetchOverdue,
  } = useQuery({
    queryKey: maintenanceKeys.visits.list({
      status: "scheduled",
      date_to: yesterday,
    }),
    queryFn: () => listVisits({ status: "scheduled", date_to: yesterday }),
    enabled: hasAccess,
  });

  // -------------------------------------------------------------------------
  // 4. Asset Summary (distinct assets serviced this month)
  // -------------------------------------------------------------------------
  const {
    data: monthVisits = [],
    isLoading: monthLoading,
    isError: monthError,
    refetch: refetchMonth,
  } = useQuery({
    queryKey: maintenanceKeys.visits.list({
      date_from: monthStart,
      date_to: today,
    }),
    queryFn: () => listVisits({ date_from: monthStart, date_to: today }),
    enabled: hasAccess,
  });

  // Get total assets count for comparison
  const {
    data: allAssets = [],
    isLoading: assetsLoading,
    isError: assetsError,
    refetch: refetchAssets,
  } = useQuery({
    queryKey: maintenanceKeys.assets.list({ is_active: true }),
    queryFn: () => listAssets({ is_active: true }),
    enabled: hasAccess,
  });

  // Filter out cancelled visits from all counts
  const validTodayVisits = useMemo(() => filterValidVisits(todayVisits), [todayVisits]);
  const validUpcomingVisits = useMemo(() => filterValidVisits(upcomingVisits), [upcomingVisits]);
  const validMonthVisits = useMemo(() => filterValidVisits(monthVisits), [monthVisits]);
  // Note: overdueVisits already filtered by status=scheduled in query

  // Calculate distinct assets serviced this month (excluding cancelled)
  const assetsServiced = useMemo(() => {
    const assetIds = new Set<number>();
    validMonthVisits.forEach((visit) => {
      if (visit.asset?.id) {
        assetIds.add(visit.asset.id);
      }
    });
    return assetIds.size;
  }, [validMonthVisits]);

  // -------------------------------------------------------------------------
  // Deep link URLs with query params
  // -------------------------------------------------------------------------
  const todayLink = `/maintenance/visits?date_from=${today}&date_to=${today}`;
  const upcomingLink = `/maintenance/visits?date_from=${tomorrow}&date_to=${sevenDaysAhead}`;
  const overdueLink = `/maintenance/visits?status=scheduled&date_to=${yesterday}`;
  const assetsLink = `/maintenance/assets`;

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
            You don't have permission to view the maintenance dashboard.
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
            <h1 className="page-title">Maintenance Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Overview of service visits and asset maintenance
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 px-3 text-xs font-medium"
            onClick={() => navigate("/maintenance/visits/new")}
          >
            Create Visit
          </Button>
        </div>

        {/* Widgets Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Visits Today */}
          <Widget
            title="Visits Today"
            icon={<Calendar className="h-5 w-5" />}
            value={validTodayVisits.length}
            subtitle={validTodayVisits.length === 0 ? "No visits scheduled" : undefined}
            loading={todayLoading}
            error={todayError}
            onRetry={() => refetchToday()}
            linkTo={todayLink}
          />

          {/* 2. Upcoming Visits */}
          <Widget
            title="Upcoming (7 days)"
            icon={<CalendarClock className="h-5 w-5" />}
            value={validUpcomingVisits.length}
            subtitle={validUpcomingVisits.length === 0 ? "Calendar clear" : undefined}
            loading={upcomingLoading}
            error={upcomingError}
            onRetry={() => refetchUpcoming()}
            linkTo={upcomingLink}
          />

          {/* 3. Overdue Visits */}
          <Widget
            title="Overdue Visits"
            icon={<AlertTriangle className="h-5 w-5" />}
            value={overdueVisits.length}
            subtitle={
              overdueVisits.length === 0
                ? "All visits on track"
                : "Require attention"
            }
            loading={overdueLoading}
            error={overdueError}
            onRetry={() => refetchOverdue()}
            linkTo={overdueLink}
            variant={overdueVisits.length > 0 ? "warning" : "default"}
          />

          {/* 4. Asset Summary */}
          <Widget
            title="Assets Serviced"
            icon={<Wrench className="h-5 w-5" />}
            value={`${assetsServiced}/${allAssets.length}`}
            subtitle="This month"
            loading={monthLoading || assetsLoading}
            error={monthError || assetsError}
            onRetry={() => {
              refetchMonth();
              refetchAssets();
            }}
            linkTo={assetsLink}
            linkLabel="View assets"
            variant={
              assetsServiced > 0 && assetsServiced === allAssets.length
                ? "success"
                : "default"
            }
          />
        </div>

        {/* Quick Actions */}
        <div className="premium-card p-5">
          <h2 className="text-sm font-medium text-foreground mb-3">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate("/maintenance/visits/new")}
            >
              Schedule Visit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate("/maintenance/assets/new")}
            >
              Add Asset
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate("/maintenance/visits")}
            >
              View All Visits
            </Button>
          </div>
        </div>
      </div>
    </MaintenanceLayout>
  );
}
