// dubai-control/src/contexts/AppContext.tsx
// Application Context Provider - manages the current operational context (Cleaning, Maintenance, etc.)

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  type AppContextId,
  type ContextConfig,
  getContextConfig,
  detectContextFromPath,
  CONTEXT_STORAGE_KEY,
  DEFAULT_CONTEXT,
} from "@/config/contexts";

interface AppContextValue {
  /** Current context ID */
  currentContext: AppContextId;
  /** Current context configuration */
  contextConfig: ContextConfig;
  /** Switch to a different context */
  switchContext: (contextId: AppContextId) => void;
  /** Check if a context is active */
  isContext: (contextId: AppContextId) => boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Hook to access the current application context.
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppContextProvider");
  }
  return context;
}

interface AppContextProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for application context.
 * Manages context switching and persistence.
 */
export function AppContextProvider({ children }: AppContextProviderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize context from URL or localStorage
  const [currentContext, setCurrentContext] = useState<AppContextId>(() => {
    // First, try to detect from URL
    const fromPath = detectContextFromPath(location.pathname);
    if (fromPath !== DEFAULT_CONTEXT) {
      return fromPath;
    }

    // Fallback to localStorage
    const stored = localStorage.getItem(CONTEXT_STORAGE_KEY);
    if (stored && (stored === "cleaning" || stored === "maintenance" || stored === "property" || stored === "fitout")) {
      return stored as AppContextId;
    }

    return DEFAULT_CONTEXT;
  });

  // Get current context config
  const contextConfig = getContextConfig(currentContext);

  // Sync context when URL changes (e.g., user navigates directly)
  useEffect(() => {
    const detectedContext = detectContextFromPath(location.pathname);
    if (detectedContext !== currentContext) {
      setCurrentContext(detectedContext);
      localStorage.setItem(CONTEXT_STORAGE_KEY, detectedContext);
    }
  }, [location.pathname, currentContext]);

  // Switch context handler
  const switchContext = useCallback(
    (contextId: AppContextId) => {
      if (contextId === currentContext) return;

      const config = getContextConfig(contextId);
      if (!config.enabled) {
        console.warn(`Context "${contextId}" is not enabled yet`);
        return;
      }

      // Update state and localStorage
      setCurrentContext(contextId);
      localStorage.setItem(CONTEXT_STORAGE_KEY, contextId);

      // Navigate to the context's default route
      navigate(config.defaultRoute);
    },
    [currentContext, navigate]
  );

  // Check if a context is active
  const isContext = useCallback(
    (contextId: AppContextId) => currentContext === contextId,
    [currentContext]
  );

  const value: AppContextValue = {
    currentContext,
    contextConfig,
    switchContext,
    isContext,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
