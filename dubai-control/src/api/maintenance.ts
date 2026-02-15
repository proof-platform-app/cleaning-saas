// =============================================================================
// Maintenance Context API Layer
// =============================================================================
// Single source of truth for all Maintenance Context API calls.
// Maintenance pages MUST use these functions, not direct fetch.
//
// Endpoints:
// - Categories: /api/manager/maintenance-categories/
// - Assets: /api/manager/assets/
// - Asset Types: /api/manager/asset-types/
// - Service Visits: /api/manager/service-visits/
// - Visit Detail: /api/manager/jobs/:id/ (reuses Jobs endpoint)
// =============================================================================

import {
  // Categories
  getMaintenanceCategories,
  getMaintenanceCategory,
  createMaintenanceCategory,
  updateMaintenanceCategory,
  deleteMaintenanceCategory,
  type MaintenanceCategory,
  // Assets
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetServiceHistory,
  type Asset,
  type AssetServiceHistory,
  // Asset Types
  getAssetTypes,
  getAssetType,
  createAssetType,
  updateAssetType,
  deleteAssetType,
  type AssetType,
  // Visits (Service Visits = Jobs with asset)
  getServiceVisits,
  createServiceVisit,
  type ServiceVisit,
  type CreateServiceVisitInput,
  // Locations & Technicians (shared with Cleaning)
  getLocations,
  getCleaners,
  type Location,
  type Cleaner,
  // Job detail (for Visit detail)
  fetchManagerJobDetail,
  type ManagerJobDetail,
  // Checklist operations (reused from Cleaning)
  apiClient,
  // PDF Reports (P5, P6 Proof Parity)
  downloadMaintenanceVisitReport,
  downloadAssetHistoryReport as downloadAssetHistoryReportClient,
} from "./client";

// =============================================================================
// Checklist Types (Proof Parity with Cleaning)
// =============================================================================

export type ChecklistTemplate = {
  id: number;
  name: string;
  description?: string | null;
  items?: string[] | null;         // Full list of items
  items_preview?: string[] | null; // First 4 items for preview
  items_count?: number | null;
};

export type ChecklistItem = {
  id: number;
  text: string;
  is_required: boolean;
  is_completed: boolean;
  order: number;
};

// =============================================================================
// Type Re-exports
// =============================================================================

export type {
  MaintenanceCategory,
  Asset,
  AssetType,
  AssetServiceHistory,
  ServiceVisit,
  CreateServiceVisitInput,
  Location,
  Cleaner,
  ManagerJobDetail as VisitDetail,
};

// =============================================================================
// Filter Types
// =============================================================================

export interface AssetFilters {
  location_id?: number;
  asset_type_id?: number;
  is_active?: boolean;
}

export interface VisitFilters {
  status?: string;
  technician_id?: number;
  asset_id?: number;
  location_id?: number;
  category_id?: number;
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  sla_reason?: string; // Filter by SLA violation reason code
}

// =============================================================================
// Categories API
// =============================================================================

export async function listCategories(): Promise<MaintenanceCategory[]> {
  return getMaintenanceCategories();
}

export async function getCategory(id: number): Promise<MaintenanceCategory> {
  return getMaintenanceCategory(id);
}

export async function createCategory(input: {
  name: string;
  description?: string;
}): Promise<MaintenanceCategory> {
  return createMaintenanceCategory(input);
}

export async function updateCategory(
  id: number,
  input: Partial<{ name: string; description: string; is_active: boolean }>
): Promise<MaintenanceCategory> {
  return updateMaintenanceCategory(id, input);
}

export async function deleteCategory(id: number): Promise<void> {
  return deleteMaintenanceCategory(id);
}

// =============================================================================
// Assets API
// =============================================================================

export async function listAssets(filters?: AssetFilters): Promise<Asset[]> {
  return getAssets(filters);
}

export { getAsset };

export async function createNewAsset(input: {
  name: string;
  location_id: number;
  asset_type_id: number;
  serial_number?: string;
  description?: string;
}): Promise<Asset> {
  return createAsset(input);
}

export async function updateExistingAsset(
  id: number,
  input: Partial<{
    name: string;
    serial_number: string;
    description: string;
    is_active: boolean;
    location_id: number;
    asset_type_id: number;
  }>
): Promise<Asset> {
  return updateAsset(id, input);
}

export async function deactivateAsset(id: number): Promise<Asset> {
  return updateAsset(id, { is_active: false });
}

export async function removeAsset(id: number): Promise<void> {
  return deleteAsset(id);
}

export async function getAssetVisits(assetId: number): Promise<AssetServiceHistory> {
  return getAssetServiceHistory(assetId);
}

// =============================================================================
// Asset Types API
// =============================================================================

export async function listAssetTypes(): Promise<AssetType[]> {
  return getAssetTypes();
}

export { getAssetType };

export async function createNewAssetType(input: {
  name: string;
  description?: string;
}): Promise<AssetType> {
  return createAssetType(input);
}

export async function updateExistingAssetType(
  id: number,
  input: Partial<{ name: string; description: string; is_active: boolean }>
): Promise<AssetType> {
  return updateAssetType(id, input);
}

export async function removeAssetType(id: number): Promise<void> {
  return deleteAssetType(id);
}

// =============================================================================
// Visits (Service Visits) API
// =============================================================================

export async function listVisits(filters?: VisitFilters): Promise<ServiceVisit[]> {
  // Map our filter interface to client's expected format
  return getServiceVisits({
    status: filters?.status,
    cleaner_id: filters?.technician_id, // API expects technician_id
    asset_id: filters?.asset_id,
    location_id: filters?.location_id,
    category_id: filters?.category_id,
    date_from: filters?.date_from,
    date_to: filters?.date_to,
    sla_reason: filters?.sla_reason, // Filter by SLA violation reason
  });
}

/**
 * Get visit detail.
 * Uses the Jobs endpoint since Service Visits ARE Jobs with asset linked.
 */
export async function getVisit(id: number): Promise<ManagerJobDetail> {
  return fetchManagerJobDetail(id);
}

export async function createVisit(input: CreateServiceVisitInput): Promise<ServiceVisit> {
  return createServiceVisit(input);
}

// =============================================================================
// Shared Resources (Locations & Technicians)
// =============================================================================

export async function listLocations(): Promise<Location[]> {
  return getLocations();
}

export async function listTechnicians(): Promise<Cleaner[]> {
  return getCleaners();
}

// =============================================================================
// Checklist API (Proof Parity with Cleaning)
// =============================================================================

type PlanningMeta = {
  cleaners: { id: number; full_name: string; phone: string | null }[];
  locations: { id: number; name: string; address: string | null }[];
  checklist_templates: ChecklistTemplate[];
};

/**
 * Get checklist templates available for maintenance context.
 * Requests only maintenance templates (context=maintenance).
 */
export async function listChecklistTemplates(): Promise<ChecklistTemplate[]> {
  const res = await apiClient.get<PlanningMeta>("/api/manager/meta/?context=maintenance");
  return res.data.checklist_templates || [];
}

/**
 * Toggle a checklist item's completion status.
 * Used by technicians to mark items as complete/incomplete.
 *
 * IMPORTANT: This reuses the existing cleaner endpoint that works for any Job.
 */
export async function toggleChecklistItem(
  jobId: number,
  itemId: number,
  isCompleted: boolean
): Promise<{ id: number; job_id: number; is_completed: boolean }> {
  const res = await apiClient.post<{ id: number; job_id: number; is_completed: boolean }>(
    `/api/jobs/${jobId}/checklist/${itemId}/toggle/`,
    { is_completed: isCompleted }
  );
  return res.data;
}

/**
 * Bulk update checklist items.
 * Used by technicians to mark multiple items at once.
 */
export async function bulkUpdateChecklist(
  jobId: number,
  items: Array<{ id: number; is_completed: boolean }>
): Promise<{ updated_count: number }> {
  const res = await apiClient.post<{ updated_count: number }>(
    `/api/jobs/${jobId}/checklist/bulk/`,
    { items }
  );
  return res.data;
}

// =============================================================================
// Visit PDF Report API (P5 Proof Parity)
// =============================================================================

/**
 * Download PDF report for a completed maintenance visit.
 * Only available for visits with status === "completed".
 *
 * GET /api/maintenance/visits/{id}/report/
 * Returns: PDF blob
 */
export async function downloadVisitReport(visitId: number): Promise<Blob> {
  return downloadMaintenanceVisitReport(visitId);
}

// =============================================================================
// Asset History PDF Report API (P6 Proof Parity)
// =============================================================================

/**
 * Download PDF report for asset service history.
 * Includes asset info and all service visits.
 *
 * GET /api/maintenance/assets/{id}/history/report/
 * Returns: PDF blob
 *
 * RBAC: owner/manager/staff only (cleaners get 403)
 */
export async function downloadAssetHistoryReport(assetId: number): Promise<Blob> {
  return downloadAssetHistoryReportClient(assetId);
}

// =============================================================================
// Query Keys for React Query
// =============================================================================

// =============================================================================
// Technicians API (S2-P1)
// =============================================================================

/**
 * Technician with maintenance-specific stats.
 * Different from base Cleaner type - includes aggregated data.
 */
export interface MaintenanceTechnician {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  total_visits: number;
  sla_violation_rate: number; // 0.0 to 1.0
}

/**
 * List technicians with maintenance stats.
 * GET /api/maintenance/technicians/
 */
export async function listMaintenanceTechnicians(): Promise<MaintenanceTechnician[]> {
  const res = await apiClient.get<MaintenanceTechnician[]>("/api/maintenance/technicians/");
  return res.data;
}

// =============================================================================
// Analytics API (S2-P2)
// =============================================================================

/**
 * Date range filter for analytics endpoints.
 */
export interface AnalyticsDateRange {
  date_from: string; // YYYY-MM-DD
  date_to: string;   // YYYY-MM-DD
}

/**
 * KPI summary with deltas.
 */
export interface MaintenanceAnalyticsSummary {
  visits_completed: number;
  sla_compliance_rate: number;  // 0.0 to 1.0
  avg_visit_duration_hours: number;
  issues_detected: number;
  visits_delta: number;   // % change vs previous period
  sla_delta: number;
  duration_delta: number;
  issues_delta: number;
}

/**
 * Daily visits trend point.
 */
export interface MaintenanceVisitsTrendPoint {
  date: string;  // YYYY-MM-DD
  visits_completed: number;
}

/**
 * Daily SLA trend point.
 */
export interface MaintenanceSlaTrendPoint {
  date: string;  // YYYY-MM-DD
  visits_completed: number;
  visits_with_violations: number;
  violation_rate: number;  // 0.0 to 1.0
}

/**
 * Asset performance stats.
 */
export interface MaintenanceAssetPerformance {
  asset_id: number;
  asset_name: string;
  asset_type_name: string;
  location_name: string;
  visits_completed: number;
  violations_count: number;
  violation_rate: number;  // 0.0 to 1.0
}

/**
 * Technician performance stats.
 */
export interface MaintenanceTechnicianPerformance {
  technician_id: number;
  technician_name: string;
  visits_completed: number;
  avg_duration_hours: number;
  sla_compliance_rate: number;  // 0.0 to 1.0
  violations_count: number;
}

/**
 * Build query string from date range.
 */
function buildDateQuery(range: AnalyticsDateRange): string {
  return `?date_from=${range.date_from}&date_to=${range.date_to}`;
}

/**
 * Get analytics summary (KPIs).
 * GET /api/maintenance/analytics/summary/
 */
export async function getMaintenanceAnalyticsSummary(
  range: AnalyticsDateRange
): Promise<MaintenanceAnalyticsSummary> {
  const res = await apiClient.get<MaintenanceAnalyticsSummary>(
    `/api/maintenance/analytics/summary/${buildDateQuery(range)}`
  );
  return res.data;
}

/**
 * Get daily visits trend.
 * GET /api/maintenance/analytics/visits-trend/
 */
export async function getMaintenanceVisitsTrend(
  range: AnalyticsDateRange
): Promise<MaintenanceVisitsTrendPoint[]> {
  const res = await apiClient.get<MaintenanceVisitsTrendPoint[]>(
    `/api/maintenance/analytics/visits-trend/${buildDateQuery(range)}`
  );
  return res.data;
}

/**
 * Get daily SLA violations trend.
 * GET /api/maintenance/analytics/sla-trend/
 */
export async function getMaintenanceSlaTrend(
  range: AnalyticsDateRange
): Promise<MaintenanceSlaTrendPoint[]> {
  const res = await apiClient.get<MaintenanceSlaTrendPoint[]>(
    `/api/maintenance/analytics/sla-trend/${buildDateQuery(range)}`
  );
  return res.data;
}

/**
 * Get assets performance (sorted by violations).
 * GET /api/maintenance/analytics/assets-performance/
 */
export async function getMaintenanceAssetsPerformance(
  range: AnalyticsDateRange
): Promise<MaintenanceAssetPerformance[]> {
  const res = await apiClient.get<MaintenanceAssetPerformance[]>(
    `/api/maintenance/analytics/assets-performance/${buildDateQuery(range)}`
  );
  return res.data;
}

/**
 * Get technicians performance (sorted by violations).
 * GET /api/maintenance/analytics/technicians-performance/
 */
export async function getMaintenanceTechniciansPerformance(
  range: AnalyticsDateRange
): Promise<MaintenanceTechnicianPerformance[]> {
  const res = await apiClient.get<MaintenanceTechnicianPerformance[]>(
    `/api/maintenance/analytics/technicians-performance/${buildDateQuery(range)}`
  );
  return res.data;
}

// =============================================================================
// Reports API (S2-P3)
// =============================================================================

/**
 * Report data structure.
 */
export interface MaintenanceReportData {
  period: {
    from: string;
    to: string;
  };
  visits_count: number;
  violations_count: number;
  issue_rate: number;
  technicians: Array<{
    id: number;
    name: string;
    visits: number;
    violations: number;
  }>;
  assets: Array<{
    id: number;
    name: string;
    type_name: string;
    visits: number;
    violations: number;
  }>;
  locations: Array<{
    id: number;
    name: string;
    visits: number;
    violations: number;
  }>;
  top_sla_reasons: Array<{
    code: string;
    count: number;
  }>;
}

/**
 * Get weekly maintenance report (last 7 days).
 * GET /api/maintenance/reports/weekly/
 */
export async function getMaintenanceWeeklyReport(): Promise<MaintenanceReportData> {
  const res = await apiClient.get<MaintenanceReportData>("/api/maintenance/reports/weekly/");
  return res.data;
}

/**
 * Get monthly maintenance report (last 30 days).
 * GET /api/maintenance/reports/monthly/
 */
export async function getMaintenanceMonthlyReport(): Promise<MaintenanceReportData> {
  const res = await apiClient.get<MaintenanceReportData>("/api/maintenance/reports/monthly/");
  return res.data;
}

/**
 * Download weekly maintenance report as PDF.
 * GET /api/maintenance/reports/weekly/pdf/
 */
export async function downloadMaintenanceWeeklyReportPdf(): Promise<Blob> {
  const res = await apiClient.get("/api/maintenance/reports/weekly/pdf/", {
    responseType: "blob",
  });
  return res.data;
}

/**
 * Download monthly maintenance report as PDF.
 * GET /api/maintenance/reports/monthly/pdf/
 */
export async function downloadMaintenanceMonthlyReportPdf(): Promise<Blob> {
  const res = await apiClient.get("/api/maintenance/reports/monthly/pdf/", {
    responseType: "blob",
  });
  return res.data;
}

/**
 * Send weekly maintenance report via email.
 * POST /api/maintenance/reports/weekly/email/
 */
export async function sendMaintenanceWeeklyReportEmail(email?: string): Promise<void> {
  await apiClient.post("/api/maintenance/reports/weekly/email/", { email });
}

/**
 * Send monthly maintenance report via email.
 * POST /api/maintenance/reports/monthly/email/
 */
export async function sendMaintenanceMonthlyReportEmail(email?: string): Promise<void> {
  await apiClient.post("/api/maintenance/reports/monthly/email/", { email });
}

// =============================================================================
// Recurring Visit Templates API (Stage 3)
// =============================================================================

/**
 * Recurring visit template.
 */
export interface RecurringVisitTemplate {
  id: number;
  name: string;
  description: string;
  asset: { id: number; name: string } | null;
  location: { id: number; name: string };
  frequency: "monthly" | "quarterly" | "yearly" | "custom";
  frequency_display: string;
  interval_days: number;
  start_date: string;
  end_date: string | null;
  checklist_template: { id: number; name: string } | null;
  maintenance_category: { id: number; name: string } | null;
  assigned_technician: { id: number; full_name: string } | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  manager_notes: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Input for creating/updating recurring template.
 */
export interface RecurringTemplateInput {
  name: string;
  description?: string;
  asset_id?: number | null;
  location_id: number;
  frequency: "monthly" | "quarterly" | "yearly" | "custom";
  interval_days?: number;
  start_date: string;
  end_date?: string | null;
  checklist_template_id?: number | null;
  maintenance_category_id?: number | null;
  assigned_technician_id?: number | null;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  manager_notes?: string;
  is_active?: boolean;
}

/**
 * Result of generating visits from template.
 */
export interface GenerateVisitsResult {
  generated_count: number;
  visits: Array<{ id: number; scheduled_date: string }>;
  message?: string;
}

/**
 * Filter options for recurring templates.
 */
export interface RecurringTemplateFilters {
  is_active?: boolean;
  location_id?: number;
}

/**
 * Build query string from filters.
 */
function buildRecurringTemplateQuery(filters?: RecurringTemplateFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.is_active !== undefined) {
    params.set("is_active", String(filters.is_active));
  }
  if (filters.location_id) {
    params.set("location_id", String(filters.location_id));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * List recurring visit templates.
 * GET /api/maintenance/recurring-templates/
 */
export async function listRecurringTemplates(
  filters?: RecurringTemplateFilters
): Promise<RecurringVisitTemplate[]> {
  const res = await apiClient.get<RecurringVisitTemplate[]>(
    `/api/maintenance/recurring-templates/${buildRecurringTemplateQuery(filters)}`
  );
  return res.data;
}

/**
 * Get single recurring template.
 * GET /api/maintenance/recurring-templates/{id}/
 */
export async function getRecurringTemplate(id: number): Promise<RecurringVisitTemplate> {
  const res = await apiClient.get<RecurringVisitTemplate>(
    `/api/maintenance/recurring-templates/${id}/`
  );
  return res.data;
}

/**
 * Create recurring template.
 * POST /api/maintenance/recurring-templates/
 */
export async function createRecurringTemplate(
  input: RecurringTemplateInput
): Promise<RecurringVisitTemplate> {
  const res = await apiClient.post<RecurringVisitTemplate>(
    "/api/maintenance/recurring-templates/",
    input
  );
  return res.data;
}

/**
 * Update recurring template.
 * PATCH /api/maintenance/recurring-templates/{id}/
 */
export async function updateRecurringTemplate(
  id: number,
  input: Partial<RecurringTemplateInput>
): Promise<RecurringVisitTemplate> {
  const res = await apiClient.patch<RecurringVisitTemplate>(
    `/api/maintenance/recurring-templates/${id}/`,
    input
  );
  return res.data;
}

/**
 * Delete recurring template.
 * DELETE /api/maintenance/recurring-templates/{id}/
 */
export async function deleteRecurringTemplate(id: number): Promise<void> {
  await apiClient.delete(`/api/maintenance/recurring-templates/${id}/`);
}

/**
 * Generate visits from template.
 * POST /api/maintenance/recurring-templates/{id}/generate/
 */
export async function generateVisitsFromTemplate(
  templateId: number,
  dateTo: string
): Promise<GenerateVisitsResult> {
  const res = await apiClient.post<GenerateVisitsResult>(
    `/api/maintenance/recurring-templates/${templateId}/generate/`,
    { date_to: dateTo }
  );
  return res.data;
}

// =============================================================================
// Query Keys for React Query
// =============================================================================

export const maintenanceKeys = {
  // Categories
  categories: {
    all: ["maintenance", "categories"] as const,
    list: () => [...maintenanceKeys.categories.all, "list"] as const,
    detail: (id: number) => [...maintenanceKeys.categories.all, "detail", id] as const,
  },
  // Assets
  assets: {
    all: ["maintenance", "assets"] as const,
    list: (filters?: AssetFilters) => [...maintenanceKeys.assets.all, "list", filters] as const,
    detail: (id: number) => [...maintenanceKeys.assets.all, "detail", id] as const,
    visits: (id: number) => [...maintenanceKeys.assets.all, "visits", id] as const,
  },
  // Asset Types
  assetTypes: {
    all: ["maintenance", "assetTypes"] as const,
    list: () => [...maintenanceKeys.assetTypes.all, "list"] as const,
    detail: (id: number) => [...maintenanceKeys.assetTypes.all, "detail", id] as const,
  },
  // Visits
  visits: {
    all: ["maintenance", "visits"] as const,
    list: (filters?: VisitFilters) => [...maintenanceKeys.visits.all, "list", filters] as const,
    detail: (id: number) => [...maintenanceKeys.visits.all, "detail", id] as const,
  },
  // Checklists
  checklistTemplates: ["maintenance", "checklistTemplates"] as const,
  // Shared
  locations: ["maintenance", "locations"] as const,
  technicians: ["maintenance", "technicians"] as const,
  // Analytics (S2-P2)
  analytics: {
    all: ["maintenance", "analytics"] as const,
    summary: (range: AnalyticsDateRange) => [...maintenanceKeys.analytics.all, "summary", range] as const,
    visitsTrend: (range: AnalyticsDateRange) => [...maintenanceKeys.analytics.all, "visitsTrend", range] as const,
    slaTrend: (range: AnalyticsDateRange) => [...maintenanceKeys.analytics.all, "slaTrend", range] as const,
    assetsPerformance: (range: AnalyticsDateRange) => [...maintenanceKeys.analytics.all, "assetsPerformance", range] as const,
    techniciansPerformance: (range: AnalyticsDateRange) => [...maintenanceKeys.analytics.all, "techniciansPerformance", range] as const,
  },
  // Reports (S2-P3)
  reports: {
    all: ["maintenance", "reports"] as const,
    weekly: () => [...maintenanceKeys.reports.all, "weekly"] as const,
    monthly: () => [...maintenanceKeys.reports.all, "monthly"] as const,
  },
  // Recurring Templates (Stage 3)
  recurringTemplates: {
    all: ["maintenance", "recurringTemplates"] as const,
    list: (filters?: RecurringTemplateFilters) => [...maintenanceKeys.recurringTemplates.all, "list", filters] as const,
    detail: (id: number) => [...maintenanceKeys.recurringTemplates.all, "detail", id] as const,
  },
} as const;
