// dubai-control/src/contexts/maintenance/routes.tsx
// Maintenance context route definitions
// Import Lovable pages here and register routes

import type { RouteObject } from "react-router-dom";

// Existing maintenance pages (from pages/maintenance/)
// These will be migrated here over time
// import { ServiceVisitsPage } from "./ui/ServiceVisitsPage";
// import { AssetDetailPage } from "./ui/AssetDetailPage";

/**
 * Maintenance context routes.
 * All paths must be under /maintenance/* namespace.
 *
 * Usage in App.tsx:
 * ```tsx
 * import { maintenanceRoutes } from "@/contexts/maintenance";
 * // Then spread or map routes in the Route tree
 * ```
 */
export const maintenanceRoutes: RouteObject[] = [
  // Routes will be added here as Lovable UI is imported
  // Example:
  // {
  //   path: "/maintenance/visits",
  //   element: <ServiceVisitsPage />,
  // },
  // {
  //   path: "/maintenance/assets/:id",
  //   element: <AssetDetailPage />,
  // },
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
