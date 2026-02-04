// dubai-control/src/data/analyticsData.ts

// Типы KPI живут здесь и используются и страницей, и компонентом карточки

export type KPITrend = "positive" | "negative" | "neutral";
// Варианты оформления KPI-карточек
export type KPIVariant =
  | "primary"   // нежно-синяя, как на Dashboard
  | "success"   // зелёная, когда всё отлично
  | "grey"   // серый / обычная
  | "warning"   // жёлтая, предупреждение
  | "danger";   // красная, всё плохо

export interface KPIData {
  id: string;
  icon: string; // строковый ключ для iconMap в карточке
  label: string; // короткое имя KPI (Jobs completed, Issues detected и т.п.)
  value: string; // отображаемое значение

  // старые демо-поля (используются для % и стрелок)
  change?: number;
  changeLabel?: string;
  trend?: KPITrend;
  variant?: KPIVariant;

  // новые поля, которые может задать страница Analytics
  title?: string; // основной заголовок (override label при необходимости)
  description?: string; // маленькое описание под заголовком
  delta?: number; // alias для change (страница может использовать одно из полей)
  deltaLabel?: string; // alias для changeLabel
  tooltip?: string;
  onClick?: () => void;
}

// Чтобы при необходимости импортировать типы из data:
export type { KPIData as TKPIData, KPITrend as TKPITrend, KPIVariant as TKPIVariant };

// Точки тренда по дням
export interface TrendDataPoint {
  date: string;
  label: string;
  jobsCompleted: number;
  avgDuration: number;
  beforePhotoRate: number;
  afterPhotoRate: number;
  checklistRate: number;
  // тренд по нарушениям SLA — используется для демо/моков
  jobsWithViolations: number;
  violationRate: number; // в процентах (0–100)
}

// Производительность клинеров
export interface CleanerPerformance {
  id: number;
  name: string;
  jobsCompleted: number;
  avgDuration: number;
  onTimeRate: number;
  proofCompletionRate: number;
  issuesCount: number;
}

// Распределение задач по локациям
export interface LocationJobsData {
  location: string;
  jobs: number;
}

/**
 * Базовые (статические) настройки KPI-карточек.
 * Значения (value) подменяются данными из backend в Analytics.tsx.
 * Здесь живут:
 * – id / icon / label
 * – change / changeLabel
 * – trend
 * – variant
 */
export const staticKpiData: KPIData[] = [
  {
    id: "jobs_completed",
    icon: "CheckCircle2",
    label: "Jobs completed",
    value: "24",
    change: 12,
    changeLabel: "vs yesterday",
    trend: "positive",
    variant: "success",
  },
  {
    id: "on_time",
    icon: "Clock",
    label: "On-time completion",
    value: "94%",
    change: 3,
    changeLabel: "vs last week",
    trend: "positive",
    variant: "success",
  },
  {
    id: "proof",
    icon: "Camera",
    label: "Proof completion",
    value: "98%",
    change: 1,
    changeLabel: "vs last week",
    trend: "positive",
    variant: "success",
  },
  {
    id: "duration",
    icon: "Timer",
    label: "Avg job duration",
    value: "2.4 hrs",
    change: -5,
    changeLabel: "vs last week",
    trend: "negative",
    variant: "neutral",
  },
  {
    id: "issues",
    icon: "AlertTriangle",
    label: "Issues detected",
    value: "3",
    change: -2,
    changeLabel: "vs yesterday",
    trend: "negative",
    variant: "warning",
  },
];

// Для обратной совместимости: старый экспорт kpiData
export const kpiData = staticKpiData;

// Last 14 days trend data (demo-only, не используется как fallback в проде)
export const trendData: TrendDataPoint[] = [
  {
    date: "2024-01-06",
    label: "Jan 6",
    jobsCompleted: 18,
    avgDuration: 2.6,
    beforePhotoRate: 95,
    afterPhotoRate: 92,
    checklistRate: 88,
    jobsWithViolations: 2,
    violationRate: 11,
  },
  {
    date: "2024-01-07",
    label: "Jan 7",
    jobsCompleted: 22,
    avgDuration: 2.4,
    beforePhotoRate: 96,
    afterPhotoRate: 94,
    checklistRate: 91,
    jobsWithViolations: 1,
    violationRate: 5,
  },
  {
    date: "2024-01-08",
    label: "Jan 8",
    jobsCompleted: 20,
    avgDuration: 2.5,
    beforePhotoRate: 94,
    afterPhotoRate: 93,
    checklistRate: 90,
    jobsWithViolations: 1,
    violationRate: 5,
  },
  {
    date: "2024-01-09",
    label: "Jan 9",
    jobsCompleted: 25,
    avgDuration: 2.3,
    beforePhotoRate: 97,
    afterPhotoRate: 95,
    checklistRate: 93,
    jobsWithViolations: 3,
    violationRate: 12,
  },
  {
    date: "2024-01-10",
    label: "Jan 10",
    jobsCompleted: 23,
    avgDuration: 2.4,
    beforePhotoRate: 98,
    afterPhotoRate: 96,
    checklistRate: 94,
    jobsWithViolations: 2,
    violationRate: 9,
  },
  {
    date: "2024-01-11",
    label: "Jan 11",
    jobsCompleted: 19,
    avgDuration: 2.7,
    beforePhotoRate: 93,
    afterPhotoRate: 91,
    checklistRate: 89,
    jobsWithViolations: 3,
    violationRate: 16,
  },
  {
    date: "2024-01-12",
    label: "Jan 12",
    jobsCompleted: 15,
    avgDuration: 2.8,
    beforePhotoRate: 92,
    afterPhotoRate: 90,
    checklistRate: 87,
    jobsWithViolations: 4,
    violationRate: 20,
  },
  {
    date: "2024-01-13",
    label: "Jan 13",
    jobsCompleted: 21,
    avgDuration: 2.5,
    beforePhotoRate: 96,
    afterPhotoRate: 94,
    checklistRate: 92,
    jobsWithViolations: 2,
    violationRate: 10,
  },
  {
    date: "2024-01-14",
    label: "Jan 14",
    jobsCompleted: 24,
    avgDuration: 2.3,
    beforePhotoRate: 97,
    afterPhotoRate: 96,
    checklistRate: 95,
    jobsWithViolations: 1,
    violationRate: 4,
  },
  {
    date: "2024-01-15",
    label: "Jan 15",
    jobsCompleted: 26,
    avgDuration: 2.2,
    beforePhotoRate: 98,
    afterPhotoRate: 97,
    checklistRate: 96,
    jobsWithViolations: 1,
    violationRate: 4,
  },
  {
    date: "2024-01-16",
    label: "Jan 16",
    jobsCompleted: 22,
    avgDuration: 2.4,
    beforePhotoRate: 95,
    afterPhotoRate: 94,
    checklistRate: 93,
    jobsWithViolations: 2,
    violationRate: 8,
  },
  {
    date: "2024-01-17",
    label: "Jan 17",
    jobsCompleted: 28,
    avgDuration: 2.1,
    beforePhotoRate: 99,
    afterPhotoRate: 98,
    checklistRate: 97,
    jobsWithViolations: 1,
    violationRate: 3,
  },
  {
    date: "2024-01-18",
    label: "Jan 18",
    jobsCompleted: 25,
    avgDuration: 2.3,
    beforePhotoRate: 97,
    afterPhotoRate: 96,
    checklistRate: 95,
    jobsWithViolations: 2,
    violationRate: 7,
  },
  {
    date: "2024-01-19",
    label: "Jan 19",
    jobsCompleted: 24,
    avgDuration: 2.4,
    beforePhotoRate: 98,
    afterPhotoRate: 97,
    checklistRate: 96,
    jobsWithViolations: 2,
    violationRate: 7,
  },
];

// Cleaner performance data (demo-only)
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

// Weekly job distribution by location (demo-only)
export const locationJobsData: LocationJobsData[] = [
  { location: "Dubai Marina", jobs: 85 },
  { location: "Business Bay", jobs: 72 },
  { location: "Downtown Dubai", jobs: 68 },
  { location: "JBR", jobs: 54 },
  { location: "DIFC", jobs: 45 },
];
