export type PlanningJobStatus = "scheduled" | "in_progress" | "completed";

export type PlanningProof = {
  check_in: boolean;
  before_photo: boolean;
  checklist: boolean;
  after_photo: boolean;
  check_out: boolean;
};

export type PlanningJob = {
  id: number;
  status: PlanningJobStatus;
  scheduled_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;

  location: {
    id: number | null;
    name: string | null;
    address: string | null;
  };

  cleaner: {
    id: number | null;
    full_name: string | null;
    phone?: string | null;
  };

  proof: PlanningProof;
};

export type PlanningFilters = {
  date: string; // "YYYY-MM-DD"
  cleanerIds: number[];
  locationId: number | null;
  statuses: PlanningJobStatus[];
};
