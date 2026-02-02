// Mock analytics data for the UAE cleaning services dashboard

export interface KPIData {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: string;
  variant: "primary" | "success" | "warning" | "danger" | "neutral";
}

export interface TrendDataPoint {
  date: string;
  label: string;
  jobsCompleted: number;
  avgDuration: number;
  beforePhotoRate: number;
  afterPhotoRate: number;
  checklistRate: number;
}

export interface CleanerPerformance {
  id: number;
  name: string;
  jobsCompleted: number;
  avgDuration: number;
  onTimeRate: number;
  proofCompletionRate: number;
  issuesCount: number;
}

export interface LocationJobsData {
  location: string;
  jobs: number;
}

// KPI Cards Data
export const kpiData: KPIData[] = [
  {
    label: "Jobs Completed Today",
    value: 24,
    change: 12,
    changeLabel: "vs yesterday",
    icon: "CheckCircle2",
    variant: "primary",
  },
  {
    label: "On-time Completion",
    value: "94%",
    change: 3,
    changeLabel: "vs last week",
    icon: "Clock",
    variant: "success",
  },
  {
    label: "Proof Completion",
    value: "98%",
    change: 1,
    changeLabel: "vs last week",
    icon: "Camera",
    variant: "success",
  },
  {
    label: "Avg Job Duration",
    value: "2.4 hrs",
    change: -5,
    changeLabel: "vs last week",
    icon: "Timer",
    variant: "neutral",
  },
  {
    label: "Issues Detected",
    value: 3,
    change: -2,
    changeLabel: "vs yesterday",
    icon: "AlertTriangle",
    variant: "warning",
  },
];

// Last 14 days trend data
export const trendData: TrendDataPoint[] = [
  { date: "2024-01-06", label: "Jan 6", jobsCompleted: 18, avgDuration: 2.6, beforePhotoRate: 95, afterPhotoRate: 92, checklistRate: 88 },
  { date: "2024-01-07", label: "Jan 7", jobsCompleted: 22, avgDuration: 2.4, beforePhotoRate: 96, afterPhotoRate: 94, checklistRate: 91 },
  { date: "2024-01-08", label: "Jan 8", jobsCompleted: 20, avgDuration: 2.5, beforePhotoRate: 94, afterPhotoRate: 93, checklistRate: 90 },
  { date: "2024-01-09", label: "Jan 9", jobsCompleted: 25, avgDuration: 2.3, beforePhotoRate: 97, afterPhotoRate: 95, checklistRate: 93 },
  { date: "2024-01-10", label: "Jan 10", jobsCompleted: 23, avgDuration: 2.4, beforePhotoRate: 98, afterPhotoRate: 96, checklistRate: 94 },
  { date: "2024-01-11", label: "Jan 11", jobsCompleted: 19, avgDuration: 2.7, beforePhotoRate: 93, afterPhotoRate: 91, checklistRate: 89 },
  { date: "2024-01-12", label: "Jan 12", jobsCompleted: 15, avgDuration: 2.8, beforePhotoRate: 92, afterPhotoRate: 90, checklistRate: 87 },
  { date: "2024-01-13", label: "Jan 13", jobsCompleted: 21, avgDuration: 2.5, beforePhotoRate: 96, afterPhotoRate: 94, checklistRate: 92 },
  { date: "2024-01-14", label: "Jan 14", jobsCompleted: 24, avgDuration: 2.3, beforePhotoRate: 97, afterPhotoRate: 96, checklistRate: 95 },
  { date: "2024-01-15", label: "Jan 15", jobsCompleted: 26, avgDuration: 2.2, beforePhotoRate: 98, afterPhotoRate: 97, checklistRate: 96 },
  { date: "2024-01-16", label: "Jan 16", jobsCompleted: 22, avgDuration: 2.4, beforePhotoRate: 95, afterPhotoRate: 94, checklistRate: 93 },
  { date: "2024-01-17", label: "Jan 17", jobsCompleted: 28, avgDuration: 2.1, beforePhotoRate: 99, afterPhotoRate: 98, checklistRate: 97 },
  { date: "2024-01-18", label: "Jan 18", jobsCompleted: 25, avgDuration: 2.3, beforePhotoRate: 97, afterPhotoRate: 96, checklistRate: 95 },
  { date: "2024-01-19", label: "Jan 19", jobsCompleted: 24, avgDuration: 2.4, beforePhotoRate: 98, afterPhotoRate: 97, checklistRate: 96 },
];

// Cleaner performance data
export const cleanerPerformance: CleanerPerformance[] = [
  {
    id: 1,
    name: "Ahmed Hassan",
    jobsCompleted: 48,
    avgDuration: 2.2,
    onTimeRate: 98,
    proofCompletionRate: 100,
    issuesCount: 0,
  },
  {
    id: 2,
    name: "Fatima Al-Rashid",
    jobsCompleted: 45,
    avgDuration: 2.3,
    onTimeRate: 96,
    proofCompletionRate: 98,
    issuesCount: 1,
  },
  {
    id: 3,
    name: "Mohammed Saeed",
    jobsCompleted: 42,
    avgDuration: 2.5,
    onTimeRate: 92,
    proofCompletionRate: 95,
    issuesCount: 2,
  },
  {
    id: 4,
    name: "Sara Ahmed",
    jobsCompleted: 38,
    avgDuration: 2.6,
    onTimeRate: 89,
    proofCompletionRate: 94,
    issuesCount: 3,
  },
  {
    id: 5,
    name: "Omar Khalil",
    jobsCompleted: 35,
    avgDuration: 2.8,
    onTimeRate: 85,
    proofCompletionRate: 92,
    issuesCount: 4,
  },
  {
    id: 6,
    name: "Layla Ibrahim",
    jobsCompleted: 50,
    avgDuration: 2.1,
    onTimeRate: 99,
    proofCompletionRate: 100,
    issuesCount: 0,
  },
];

// Weekly job distribution by location
export const locationJobsData: LocationJobsData[] = [
  { location: "Dubai Marina", jobs: 85 },
  { location: "Business Bay", jobs: 72 },
  { location: "Downtown Dubai", jobs: 68 },
  { location: "JBR", jobs: 54 },
  { location: "DIFC", jobs: 45 },
];
