import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanningFiltersPanel } from "@/components/planning/PlanningFilters";
import { JobsTable } from "@/components/planning/JobsTable";
import { JobSidePanel } from "@/components/planning/JobSidePanel";
import { CreateJobDrawer } from "@/components/planning/CreateJobDrawer";
import { PlanningJob, PlanningFilters } from "@/types/planning";
import { fetchPlanningJobs } from "@/api/planning";

export default function JobPlanning() {
  const today = format(new Date(), "yyyy-MM-dd");
  
  const [filters, setFilters] = useState<PlanningFilters>({
    date: today,
    cleanerIds: [],
    locationId: null,
    statuses: [],
  });

  const [jobs, setJobs] = useState<PlanningJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<PlanningJob | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const data = await fetchPlanningJobs(filters);
    setJobs(data);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleJobCreated = (newJob: PlanningJob) => {
    // If the new job matches the current filter date, add it to the list
    if (newJob.scheduled_date === filters.date) {
      setJobs((prev) => [...prev, newJob].sort((a, b) => {
        const timeA = a.scheduled_start_time || "00:00:00";
        const timeB = b.scheduled_start_time || "00:00:00";
        return timeA.localeCompare(timeB);
      }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="px-6 py-6 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Job Planning</h1>
              <p className="text-muted-foreground mt-1">Plan and manage jobs for cleaners</p>
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
            <PlanningFiltersPanel filters={filters} onFiltersChange={setFilters} />
          </div>

          {/* Jobs Table - Right Column */}
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Showing jobs for{" "}
                <span className="font-medium text-foreground">
                  {format(new Date(filters.date), "EEEE, MMMM d, yyyy")}
                </span>
                {" "}(GST UTC+4)
              </p>
            </div>
            <JobsTable jobs={jobs} loading={loading} onJobClick={setSelectedJob} />
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {selectedJob && (
        <>
          {/* Backdrop */}
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
