// dubai-control/src/contexts/maintenance/routes.tsx
// Maintenance context route definitions
// Import Lovable pages here and register routes

import type { RouteObject } from "react-router-dom";

// Static preview pages (imported from Lovable pattern)
// These show placeholder data and can be used for UI development
import { VisitsPage } from "./ui/VisitsPage";
import { AssetsPage } from "./ui/AssetsPage";
import { TechniciansPage } from "./ui/TechniciansPage";

/**
 * Maintenance context routes (static/preview versions).
 * All paths must be under /maintenance/* namespace.
 *
 * These routes use static placeholder data and are useful for:
 * - UI development without backend
 * - Design reviews
 * - Frontend-only testing
 *
 * For production, App.tsx uses pages from pages/maintenance/ with real API calls.
 *
 * Usage in App.tsx (if needed):
 * ```tsx
 * import { maintenanceRoutes } from "@/contexts/maintenance";
 * // Then spread or map routes in the Route tree
 * ```
 */
export const maintenanceRoutes: RouteObject[] = [
  {
    path: "/maintenance/visits",
    element: <VisitsPage />,
  },
  {
    path: "/maintenance/assets",
    element: <AssetsPage />,
  },
  {
    path: "/maintenance/technicians",
    element: <TechniciansPage />,
  },
];

/**
 * Maintenance route paths for navigation.
 * Use these constants instead of hardcoding paths.
 */
export const maintenancePaths = {
  visits: "/maintenance/visits",
  visitNew: "/maintenance/visits/new",
  visitDetail: (id: number | string) => `/maintenance/visits/${id}`,
  assets: "/maintenance/assets",
  assetNew: "/maintenance/assets/new",
  assetDetail: (id: number | string) => `/maintenance/assets/${id}`,
  technicians: "/maintenance/technicians",
} as const;
