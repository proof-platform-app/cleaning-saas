// dubai-control/src/config/contexts/maintenance.ts
// Maintenance Context Navigation Configuration

import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  Tag,
} from "lucide-react";
import type { ContextConfig, NavItem } from "./types";

/**
 * Maintenance context navigation items.
 * All routes MUST be under /maintenance/* prefix (no cross-context routing).
 */
export const maintenanceNavItems: NavItem[] = [
  { name: "Dashboard", href: "/maintenance/dashboard", icon: LayoutDashboard },
  { name: "Service Visits", href: "/maintenance/visits", icon: ClipboardList },
  { name: "Assets", href: "/maintenance/assets", icon: Wrench },
  { name: "Asset Types", href: "/maintenance/asset-types", icon: Tag },
];

/**
 * Maintenance context configuration.
 */
export const maintenanceContext: ContextConfig = {
  id: "maintenance",
  displayName: "Maintenance",
  productName: "MaintainProof",
  basePath: "/maintenance",
  defaultRoute: "/maintenance/visits",
  navItems: maintenanceNavItems,
  enabled: true,
  shellMode: "compact",
};
