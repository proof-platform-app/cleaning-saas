// dubai-control/src/config/contexts/maintenance.ts
// Maintenance Context Navigation Configuration

import {
  ClipboardList,
  Wrench,
  Users,
  Settings,
  Building2,
} from "lucide-react";
import type { ContextConfig, NavItem } from "./types";

/**
 * Maintenance context navigation items.
 * All routes under /maintenance/* prefix.
 */
export const maintenanceNavItems: NavItem[] = [
  { name: "Service Visits", href: "/maintenance/visits", icon: ClipboardList },
  { name: "Assets", href: "/maintenance/assets", icon: Wrench },
  { name: "Technicians", href: "/maintenance/technicians", icon: Users },
  // Company is RBAC-gated (owner/manager only)
  { name: "Company", href: "/company/profile", icon: Building2, roles: ["owner", "manager"] },
  { name: "Settings", href: "/settings", icon: Settings },
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
};
