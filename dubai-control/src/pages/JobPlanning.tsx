// dubai-control/src/pages/JobPlanning.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PlanningFiltersPanel } from "@/components/planning/PlanningFilters";
import { JobsTable } from "@/components/planning/JobsTable";
import { JobSidePanel } from "@/components/planning/JobSidePanel";
import { CreateJobDrawer } from "@/components/planning/CreateJobDrawer";

import type {
  PlanningFilters,
  PlanningJob,
  PlanningJobStatus,
} from "@/types/planning";
import { fetchPlanningJobs } from "@/api/planning";

export default function JobPlanning() {
  const today = format(new Date(), "yyyy-MM-dd");

  // Единственный источник правды по дате — внутри filters
  const [filters, setFilters] = useState<PlanningFilters>({
    date: today,
    cleanerIds: [],
    locationId: null,
    statuses: [],
  });

  const {
    data: planningJobs,
    isLoading: isPlanningLoading,
    isError: isPlanningError,
    error: planningError,
    refetch: refetchPlanning,
  } = useQuery<PlanningJob[], Error>({
    queryKey: ["manager-planning-jobs", filters.date],
    queryFn: () => fetchPlanningJobs(filters),
    enabled: !!filters.date,
  });

  const jobs: PlanningJob[] = planningJobs ?? [];
  const [selectedJob, setSelectedJob] = useState<PlanningJob | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);

  const navigate = useNavigate();

  // null — trial ещё не трогали, объект — trial истёк
  const [trialExpired, setTrialExpired] = useState<null | { detail: string }>(
    null,
  );

  const loadError = isPlanningError
    ? planningError?.message || "Failed to load jobs. Please try again."
    : null;

  // Локальная фильтрация (backend отдаёт только список на дату)
  const visibleJobs = useMemo(() => {
    let out = jobs;

    // cleanerIds: multi-select
    if (filters.cleanerIds && filters.cleanerIds.length > 0) {
      const set = new Set(filters.cleanerIds);
      out = out.filter((j) => (j.cleaner?.id ? set.has(j.cleaner.id) : false));
    }

    // locationId: single
    if (filters.locationId) {
      out = out.filter((j) => j.location?.id === filters.locationId);
    }

    // statuses
    if (filters.statuses && filters.statuses.length > 0) {
      const statusSet = new Set<PlanningJobStatus>(filters.statuses);
      out = out.filter((j) => statusSet.has(j.status));
    }

    return out;
  }, [jobs, filters.cleanerIds, filters.locationId, filters.statuses]);

  const handleFiltersChange = (next: PlanningFilters) => {
    setFilters(next);
  };

  const handleJobCreated = (newJob: PlanningJob) => {
    // успешное создание — очищаем возможный баннер про истёкший trial
    setTrialExpired(null);

    // Если job создана на другой день — просто перезагружаем
    if (newJob.scheduled_date !== filters.date) {
      void refetchPlanning();
      return;
    }

    // Для текущей даты: покажем созданную job и обновим список
    setSelectedJob(newJob);
    void refetchPlanning();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="px-6 py-6 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Job Planning
              </h1>
              <p className="text-muted-foreground mt-1">
                Plan and manage jobs for cleaners
              </p>
            </div>
            <Button onClick={() => setCreateDrawerOpen(true)} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Create job
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters - Left Column */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <PlanningFiltersPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </div>

          {/* Jobs Table - Right Column */}
          <div className="flex-1 min-w-0">
            {/* Trial expired banner */}
            {trialExpired && (
              <div className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div>
                  <p className="font-medium">Your free trial has ended.</p>
                  <p className="mt-1">
                    {trialExpired.detail ||
                      "You can still view existing jobs and download reports, but creating new jobs requires an upgrade."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/cleanproof/pricing")}
                  className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Upgrade
                </button>
              </div>
            )}

            <div className="mb-4 flex items-start justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Showing jobs for{" "}
                <span className="font-medium text-foreground">
                  {format(new Date(filters.date), "EEEE, MMMM d, yyyy")}
                </span>{" "}
                (GST UTC+4)
              </p>

              <p className="text-sm text-muted-foreground">
                {isPlanningLoading ? "Loading…" : `${visibleJobs.length} jobs`}
              </p>
            </div>

            {loadError && (
              <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 flex items-center justify-between gap-3">
                <div className="text-sm text-destructive">{loadError}</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchPlanning()}
                >
                  Retry
                </Button>
              </div>
            )}

            <JobsTable
              jobs={visibleJobs}
              loading={isPlanningLoading}
              onJobClick={setSelectedJob}
            />
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {selectedJob && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSelectedJob(null)}
          />
          <JobSidePanel job={selectedJob} onClose={() => setSelectedJob(null)} />
        </>
      )}

      {/* Create Job Drawer */}
      <CreateJobDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        defaultDate={filters.date}
        onJobCreated={handleJobCreated}
      />
    </div>
  );
}
