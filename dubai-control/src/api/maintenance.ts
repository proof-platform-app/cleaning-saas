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
} as const;
