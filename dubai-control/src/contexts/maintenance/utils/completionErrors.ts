// dubai-control/src/contexts/maintenance/utils/completionErrors.ts
// =============================================================================
// Maintenance-only error parsing utilities
// =============================================================================
// Handles JOB_COMPLETION_BLOCKED and other standardized API errors
// with human-readable field mappings.
// =============================================================================

/**
 * Standardized API error structure
 */
export interface StandardizedError {
  code: string;
  message: string;
  fields?: Record<string, string | string[] | number[]>;
}

/**
 * Parsed error ready for UI display
 */
export interface ParsedCompletionError {
  title: string;
  items: string[];
  code: string;
}

/**
 * Human-readable field mappings for JOB_COMPLETION_BLOCKED
 */
const FIELD_MESSAGES: Record<string, string> = {
  "photos.before": "Before photo is required",
  "photos.after": "After photo is required",
  "status": "Job must be in progress to check out",
};

/**
 * Parse API error response into UI-friendly format
 *
 * @param error - Error from API (axios error or raw response)
 * @returns Parsed error with title and human-readable items
 */
export function parseCompletionError(error: unknown): ParsedCompletionError | null {
  // Extract error data from various formats
  const errorData = extractErrorData(error);

  if (!errorData || !errorData.code) {
    return null;
  }

  const items: string[] = [];

  // Process fields if present
  if (errorData.fields && typeof errorData.fields === "object") {
    for (const [key, value] of Object.entries(errorData.fields)) {
      const message = mapFieldToMessage(key, value);
      if (message) {
        items.push(message);
      }
    }
  }

  return {
    title: errorData.message || getDefaultTitle(errorData.code),
    items,
    code: errorData.code,
  };
}

/**
 * Extract standardized error data from various error formats
 */
function extractErrorData(error: unknown): StandardizedError | null {
  if (!error) return null;

  // Direct object with code/message
  if (typeof error === "object" && "code" in error) {
    return error as StandardizedError;
  }

  // Axios-style error with response.data
  if (
    typeof error === "object" &&
    "response" in error &&
    (error as any).response?.data
  ) {
    const data = (error as any).response.data;
    if (data.code) {
      return data as StandardizedError;
    }
  }

  // Error with data property directly
  if (typeof error === "object" && "data" in error) {
    const data = (error as any).data;
    if (data?.code) {
      return data as StandardizedError;
    }
  }

  return null;
}

/**
 * Map field key + value to human-readable message
 */
function mapFieldToMessage(key: string, value: unknown): string | null {
  // Direct mapping for known keys
  if (key in FIELD_MESSAGES) {
    return FIELD_MESSAGES[key];
  }

  // Handle checklist.required with item IDs
  if (key === "checklist.required") {
    if (Array.isArray(value) && value.length > 0) {
      return `Complete ${value.length} required checklist item(s)`;
    }
    return "Complete required checklist items";
  }

  // Handle status field with specific value
  if (key === "status" && value === "must_be_in_progress") {
    return FIELD_MESSAGES["status"];
  }

  // Generic fallback for unknown fields
  if (typeof value === "string") {
    // Convert key.name: "required" -> "Key name is required"
    const readableKey = key.replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    return `${readableKey} is ${value}`;
  }

  return null;
}

/**
 * Get default title based on error code
 */
function getDefaultTitle(code: string): string {
  const titles: Record<string, string> = {
    JOB_COMPLETION_BLOCKED: "Cannot complete job",
    VALIDATION_ERROR: "Validation error",
  };
  return titles[code] || "An error occurred";
}

/**
 * Build completion blockers list from visit data
 * (For proactive display before check-out attempt)
 *
 * @param visit - Visit data object
 * @returns Array of human-readable blocker strings
 */
export function buildCompletionBlockers(visit: {
  photos?: { before?: unknown; after?: unknown };
  checklist_items?: Array<{ id: number; text: string; is_required: boolean; is_completed: boolean }>;
}): string[] {
  const blockers: string[] = [];

  // Check photos
  if (!visit.photos?.before) {
    blockers.push(FIELD_MESSAGES["photos.before"]);
  }
  if (!visit.photos?.after) {
    blockers.push(FIELD_MESSAGES["photos.after"]);
  }

  // Check required checklist items
  const requiredIncomplete = visit.checklist_items?.filter(
    (item) => item.is_required && !item.is_completed
  ) || [];

  if (requiredIncomplete.length > 0) {
    blockers.push(`Complete ${requiredIncomplete.length} required checklist item(s)`);
  }

  return blockers;
}

/**
 * Check if error is JOB_COMPLETION_BLOCKED
 */
export function isCompletionBlockedError(error: unknown): boolean {
  const errorData = extractErrorData(error);
  return errorData?.code === "JOB_COMPLETION_BLOCKED";
}
