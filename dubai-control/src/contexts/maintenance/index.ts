// dubai-control/src/contexts/maintenance/index.ts
// Maintenance Context - public exports
// See docs/execution/LOVABLE_UI_IMPORT_PROTOCOL.md for import guidelines

// Routes
export { maintenanceRoutes, maintenancePaths } from "./routes";

// UI Pages (static/preview - imported from Lovable pattern)
// These pages use placeholder data for UI development
export { VisitsPage } from "./ui/VisitsPage";
export { AssetsPage } from "./ui/AssetsPage";
export { TechniciansPage } from "./ui/TechniciansPage";

// Components (imported from Lovable)
// export { VisitCard } from "./components/VisitCard";
// export { AssetStatusBadge } from "./components/AssetStatusBadge";

// Adapters (API bridge layer)
// export { useServiceVisits } from "./adapters/useServiceVisits";
// export { useAssets } from "./adapters/useAssets";
