// dubai-control/src/config/contexts/maintenance.ts
// Maintenance Context Navigation Configuration

import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  Tag,
  Users,
  BarChart3,
  FileText,
  CalendarRange,
  ScrollText,
} from "lucide-react";
import type { ContextConfig, NavItem } from "./types";

/**
 * Maintenance context navigation items.
 * All routes MUST be under /maintenance/* prefix (no cross-context routing).
 */
export const maintenanceNavItems: NavItem[] = [
  { name: "Dashboard", href: "/maintenance/dashboard", icon: LayoutDashboard },
  { name: "Service Visits", href: "/maintenance/visits", icon: ClipboardList },
  { name: "Schedules", href: "/maintenance/schedules", icon: CalendarRange },
  { name: "Contracts", href: "/maintenance/contracts", icon: ScrollText },
  { name: "Assets", href: "/maintenance/assets", icon: Wrench },
  { name: "Asset Types", href: "/maintenance/asset-types", icon: Tag },
  { name: "Technicians", href: "/maintenance/technicians", icon: Users },
  { name: "Analytics", href: "/maintenance/analytics", icon: BarChart3 },
  { name: "Reports", href: "/maintenance/reports", icon: FileText },
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
