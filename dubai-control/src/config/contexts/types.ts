// dubai-control/src/config/contexts/types.ts
// Context Registry Types for multi-context navigation

import type { LucideIcon } from "lucide-react";

/**
 * Available application contexts.
 * Each context has its own navigation, routes, and UI.
 */
export type AppContextId = "cleaning" | "maintenance" | "property" | "fitout";

/**
 * Navigation item definition for sidebar.
 */
export interface NavItem {
  /** Display label in sidebar */
  name: string;
  /** Route path */
  href: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** RBAC: roles that can see this item (undefined = all roles) */
  roles?: ("owner" | "manager" | "staff")[];
}

/**
 * Context configuration.
 */
export interface ContextConfig {
  /** Unique context identifier */
  id: AppContextId;
  /** Display name shown in switcher */
  displayName: string;
  /** Product name (brand) */
  productName: string;
  /** Base path for routes (e.g., "/maintenance") */
  basePath: string;
  /** Default route when switching to this context */
  defaultRoute: string;
  /** Navigation items for sidebar */
  navItems: NavItem[];
  /** Whether this context is enabled */
  enabled: boolean;
}

/**
 * Context registry type.
 */
export type ContextRegistry = Record<AppContextId, ContextConfig>;
