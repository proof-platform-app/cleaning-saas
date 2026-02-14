// dubai-control/src/components/layout/ProductSwitcher.tsx
// Context Switcher - allows switching between Cleaning, Maintenance, etc.

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { getAllContexts, type AppContextId } from "@/config/contexts";

export function ProductSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { currentContext, contextConfig, switchContext } = useAppContext();

  // Get all contexts from registry
  const contexts = getAllContexts();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleContextClick = (contextId: AppContextId, enabled: boolean) => {
    if (!enabled) {
      // Context not available yet
      return;
    }
    switchContext(contextId);
    setIsOpen(false);
  };

  return (
    <div className="product-switcher relative" ref={dropdownRef}>
      {/* Switcher Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="product-switcher-trigger flex items-center gap-2 rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Switch context"
      >
        {/* Current Context Name */}
        <span className="product-name">{contextConfig.productName}</span>

        {/* Dropdown Icon */}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="product-switcher-dropdown absolute left-0 top-full z-50 mt-2 min-w-[200px] rounded-lg border border-border bg-card shadow-elevated"
          data-open={isOpen}
        >
          <div className="p-2">
            {contexts.map((context) => (
              <button
                key={context.id}
                onClick={() => handleContextClick(context.id, context.enabled)}
                disabled={!context.enabled}
                className={`product-option flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  context.enabled
                    ? "cursor-pointer text-foreground hover:bg-muted"
                    : "cursor-not-allowed text-muted-foreground opacity-60"
                }`}
                aria-disabled={!context.enabled}
              >
                <div className="flex items-center gap-3">
                  {/* Check icon for current context */}
                  {context.id === currentContext ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                  <span className="font-medium">{context.productName}</span>
                </div>

                {/* Coming Soon Badge */}
                {!context.enabled && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Coming soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
