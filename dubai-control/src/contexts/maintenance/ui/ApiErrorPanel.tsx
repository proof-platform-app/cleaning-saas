// dubai-control/src/contexts/maintenance/ui/ApiErrorPanel.tsx
// =============================================================================
// Maintenance-only API Error Panel
// =============================================================================
// Displays standardized API errors in a consistent, user-friendly format.
// Follows Lovable UI styling patterns.
// =============================================================================

import { AlertTriangle, XCircle, AlertCircle } from "lucide-react";

export interface ApiErrorPanelProps {
  /** Error code (e.g., "JOB_COMPLETION_BLOCKED") */
  code?: string;
  /** Main error message */
  message: string;
  /** List of specific error items/reasons */
  items?: string[];
  /** Visual variant */
  variant?: "warning" | "error" | "info";
  /** Optional className for additional styling */
  className?: string;
}

/**
 * API Error Panel for Maintenance Context
 *
 * Displays standardized API errors with:
 * - Icon based on severity
 * - Main message title
 * - Bullet list of specific issues
 *
 * Styled to match Lovable UI patterns.
 */
export function ApiErrorPanel({
  code,
  message,
  items,
  variant = "warning",
  className = "",
}: ApiErrorPanelProps) {
  const styles = getVariantStyles(variant);
  const Icon = getVariantIcon(variant);

  return (
    <div
      className={`rounded-lg border p-4 ${styles.container} ${className}`}
      role="alert"
      aria-live="polite"
    >
      {/* Header with icon and message */}
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 ${styles.icon}`} />
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${styles.title}`}>
            {message}
          </h3>

          {/* Subtitle with code if different from title */}
          {code && code !== "JOB_COMPLETION_BLOCKED" && (
            <p className={`mt-0.5 text-xs ${styles.subtitle}`}>
              Code: {code}
            </p>
          )}

          {/* Items list */}
          {items && items.length > 0 && (
            <ul className={`mt-2 space-y-1 text-xs ${styles.items}`}>
              {items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-current opacity-60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Completion Blockers Panel
 *
 * Specialized variant for showing what's blocking job completion.
 * Used in VisitDetail to proactively show missing requirements.
 */
export function CompletionBlockersPanel({
  blockers,
  className = "",
}: {
  blockers: string[];
  className?: string;
}) {
  if (blockers.length === 0) return null;

  return (
    <ApiErrorPanel
      message="Completion Blockers"
      items={blockers}
      variant="warning"
      className={className}
    />
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getVariantStyles(variant: "warning" | "error" | "info") {
  switch (variant) {
    case "error":
      return {
        container: "border-red-200 bg-red-50",
        icon: "text-red-600",
        title: "text-red-800",
        subtitle: "text-red-600",
        items: "text-red-700",
      };
    case "info":
      return {
        container: "border-blue-200 bg-blue-50",
        icon: "text-blue-600",
        title: "text-blue-800",
        subtitle: "text-blue-600",
        items: "text-blue-700",
      };
    case "warning":
    default:
      return {
        container: "border-amber-200 bg-amber-50",
        icon: "text-amber-600",
        title: "text-amber-800",
        subtitle: "text-amber-600",
        items: "text-amber-700",
      };
  }
}

function getVariantIcon(variant: "warning" | "error" | "info") {
  switch (variant) {
    case "error":
      return XCircle;
    case "info":
      return AlertCircle;
    case "warning":
    default:
      return AlertTriangle;
  }
}

export default ApiErrorPanel;
