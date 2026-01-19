export type PlanningJobStatus = "scheduled" | "in_progress" | "completed" | "issue";

export type PlanningJob = {
  id: number;
  status: PlanningJobStatus;

  scheduled_date: string; // "YYYY-MM-DD"
  scheduled_start_time: string | null; // "HH:MM:SS"
  scheduled_end_time: string | null;

  location: {
    id: number | null;
    name: string | null;
    address: string | null;
  };

  cleaner: {
    id: number | null;
    full_name: string | null;
    phone: string | null;
  };

  // proof flags — для “синих значков” и зелёных чеков
  proof?: {
    check_in?: boolean;
    before_photo?: boolean;
    checklist?: boolean;
    after_photo?: boolean;
    check_out?: boolean;
  };
};

export type PlanningFilters = {
  date: string;                 // "YYYY-MM-DD"
  cleanerIds: number[];         // пока не используем, но оставим
  locationId: number | null;    // пока не используем, но оставим
  statuses: PlanningJobStatus[];// пока не используем, но оставим
};
