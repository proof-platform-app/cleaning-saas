// mobile-cleaner/src/components/job-details/statusConfig.ts

export type JobStatusKey =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "canceled";

type StatusConfig = {
  label: string;
  badgeBg: string;
  badgeText: string;
};

const BASE_CONFIG: Record<JobStatusKey, StatusConfig> = {
  scheduled: {
    label: "Scheduled",
    badgeBg: "#EEF2FF",   // мягкий лавандовый
    badgeText: "#4F46E5", // индиго
  },
  in_progress: {
    label: "In progress",
    badgeBg: "#DCFCE7",   // мягкий зелёный
    badgeText: "#047857", // зелёный, но не кислотный
  },
  completed: {
    label: "Completed",
    badgeBg: "#E0F2FE",   // голубой
    badgeText: "#0369A1",
  },
  cancelled: {
    label: "Cancelled",
    badgeBg: "#FEE2E2",   // светло-красный
    badgeText: "#B91C1C",
  },
  // американский вариант пишем как алиас
  canceled: {
    label: "Cancelled",
    badgeBg: "#FEE2E2",
    badgeText: "#B91C1C",
  },
};

export function getStatusConfig(raw?: string | null): StatusConfig {
  const key = (raw || "scheduled").toLowerCase() as JobStatusKey;
  if (key in BASE_CONFIG) {
    return BASE_CONFIG[key];
  }
  return BASE_CONFIG.scheduled;
}
