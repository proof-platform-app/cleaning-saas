// dubai-control/src/contexts/maintenance/index.ts
// Maintenance Context - public exports
// See docs/execution/LOVABLE_UI_IMPORT_PROTOCOL.md for import guidelines

// Routes
export { maintenanceRoutes, maintenancePaths } from "./routes";

// UI Pages (wired to real API)
export { VisitsPage } from "./ui/VisitsPage";
export { AssetsPage } from "./ui/AssetsPage";
export { TechniciansPage } from "./ui/TechniciansPage";

// Lovable Layout Components (reusable UI patterns)
export { MaintenanceLayout } from "./ui/MaintenanceLayout";
export { AssetsLovableLayout, type AssetLayoutItem } from "./ui/AssetsLovableLayout";
export {
  VisitsLovableLayout,
  type VisitLayoutItem,
  type VisitStatus,
  type FilterOption,
} from "./ui/VisitsLovableLayout";

// Components (imported from Lovable)
// export { VisitCard } from "./components/VisitCard";
// export { AssetStatusBadge } from "./components/AssetStatusBadge";

// Adapters (API bridge layer)
export {
  useAssets,
  useAsset,
  useAssetTypes,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  assetKeys,
  type Asset,
  type AssetType,
  type AssetFilters,
} from "./adapters/useAssets";

export {
  useVisits,
  useTodaysVisits,
  useVisit,
  useCreateVisit,
  visitKeys,
  getVisitStatusStyle,
  getVisitStatusLabel,
  VISIT_STATUS,
  type ServiceVisit,
  type VisitFilters,
} from "./adapters/useVisits";

export {
  useTechnicians,
  useActiveTechnicians,
  useTechnicianAuditLog,
  useCreateTechnician,
  useUpdateTechnician,
  technicianKeys,
  getTechnicianStatusStyle,
  getTechnicianInitials,
  type Technician,
} from "./adapters/useTechnicians";
