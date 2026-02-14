// dubai-control/src/config/contexts/index.ts
// Context Registry - exports all context configurations

import type { AppContextId, ContextConfig, ContextRegistry, NavItem, ShellMode } from "./types";
import { cleaningContext } from "./cleaning";
import { maintenanceContext } from "./maintenance";

// Re-export types
export type { AppContextId, ContextConfig, NavItem, ShellMode };

/**
 * Placeholder contexts (not yet implemented).
 */
const propertyContext: ContextConfig = {
  id: "property",
  displayName: "Property",
  productName: "PropertyProof",
  basePath: "/property",
  defaultRoute: "/property",
  navItems: [],
  enabled: false,
  shellMode: "document",
};

const fitoutContext: ContextConfig = {
  id: "fitout",
  displayName: "Fitout",
  productName: "FitOutProof",
  basePath: "/fitout",
  defaultRoute: "/fitout",
  navItems: [],
  enabled: false,
  shellMode: "project",
};

/**
 * Context registry - all available contexts.
 */
export const contextRegistry: ContextRegistry = {
  cleaning: cleaningContext,
  maintenance: maintenanceContext,
  property: propertyContext,
  fitout: fitoutContext,
};

/**
 * Get context configuration by ID.
 */
export function getContextConfig(contextId: AppContextId): ContextConfig {
  return contextRegistry[contextId];
}

/**
 * Get navigation items for a context, filtered by user role.
 */
export function getNavItems(
  contextId: AppContextId,
  userRole?: "owner" | "manager" | "staff"
): NavItem[] {
  const config = contextRegistry[contextId];
  if (!config) return [];

  return config.navItems.filter((item) => {
    // If no roles specified, item is visible to all
    if (!item.roles) return true;
    // If roles specified, check if user role is included
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });
}

/**
 * Get all enabled contexts (for switcher dropdown).
 */
export function getEnabledContexts(): ContextConfig[] {
  return Object.values(contextRegistry).filter((c) => c.enabled);
}

/**
 * Get all contexts (for switcher dropdown, including disabled).
 */
export function getAllContexts(): ContextConfig[] {
  return Object.values(contextRegistry);
}

/**
 * Detect context from URL path.
 * Returns the context ID based on the current path.
 */
export function detectContextFromPath(pathname: string): AppContextId {
  // Check each enabled context's basePath
  if (pathname.startsWith("/maintenance")) {
    return "maintenance";
  }
  if (pathname.startsWith("/property")) {
    return "property";
  }
  if (pathname.startsWith("/fitout")) {
    return "fitout";
  }
  // Default to cleaning (root paths)
  return "cleaning";
}

/**
 * Storage key for persisting context.
 */
export const CONTEXT_STORAGE_KEY = "cp_context";

/**
 * Default context.
 */
export const DEFAULT_CONTEXT: AppContextId = "cleaning";
