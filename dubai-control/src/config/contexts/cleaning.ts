// dubai-control/src/config/contexts/cleaning.ts
// Cleaning Context Navigation Configuration
// DO NOT rename or reorder these items - they must match existing Cleaning UI exactly

import {
  LayoutDashboard,
  Briefcase,
  CalendarDays,
  Clock3,
  BarChart3,
  FileText,
  MapPin,
  Building2,
  Settings,
} from "lucide-react";
import type { ContextConfig, NavItem } from "./types";

/**
 * Cleaning context navigation items.
 * These match the original sidebar exactly - DO NOT MODIFY labels.
 */
export const cleaningNavItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Jobs", href: "/jobs", icon: Briefcase },
  { name: "Job Planning", href: "/planning", icon: CalendarDays },
  { name: "Job History", href: "/history", icon: Clock3 },
  { name: "Performance", href: "/performance", icon: BarChart3 },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Locations", href: "/locations", icon: MapPin },
  // Company is RBAC-gated (owner/manager only)
  { name: "Company", href: "/company/profile", icon: Building2, roles: ["owner", "manager"] },
  { name: "Settings", href: "/settings", icon: Settings },
];

/**
 * Cleaning context configuration.
 */
export const cleaningContext: ContextConfig = {
  id: "cleaning",
  displayName: "Cleaning",
  productName: "CleanProof",
  basePath: "", // Cleaning uses root paths (existing behavior)
  defaultRoute: "/dashboard",
  navItems: cleaningNavItems,
  enabled: true,
};
