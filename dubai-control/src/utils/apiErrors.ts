// dubai-control/src/utils/apiErrors.ts

/**
 * Standardized API error handling utilities
 *
 * Extracts error information from Settings API v1.1 error responses
 * with standardized format: { code, message, fields? }
 */

export interface APIError {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
  status?: number;
}

/**
 * Extract standardized error from API response
 *
 * @param error - Error object from catch block
 * @returns Parsed API error with code, message, and optional fields
 */
export function extractAPIError(error: any): APIError {
  // Default fallback error
  const fallback: APIError = {
    code: "UNKNOWN_ERROR",
    message: "An unexpected error occurred. Please try again.",
    status: 500,
  };

  // Check if error has response property (from apiFetch)
  if (!error?.response) {
    return fallback;
  }

  const { status, data } = error.response;

  // Settings API v1.1 standardized error format
  if (data?.code && data?.message) {
    return {
      code: data.code,
      message: data.message,
      fields: data.fields || undefined,
      status,
    };
  }

  // Legacy format with just detail
  if (data?.detail) {
    return {
      code: "ERROR",
      message: data.detail,
      status,
    };
  }

  // No recognizable error format
  return {
    ...fallback,
    status,
  };
}

/**
 * Get user-friendly error message for display
 *
 * @param error - Error object from catch block
 * @returns Human-readable error message
 */
export function getErrorMessage(error: any): string {
  const apiError = extractAPIError(error);
  return apiError.message;
}

/**
 * Get first field error for display
 *
 * @param error - Error object from catch block
 * @returns First field error message or null
 */
export function getFirstFieldError(error: any): string | null {
  const apiError = extractAPIError(error);

  if (!apiError.fields) {
    return null;
  }

  const firstField = Object.values(apiError.fields)[0];
  if (Array.isArray(firstField) && firstField.length > 0) {
    return firstField[0];
  }

  return null;
}

/**
 * Check if error is a specific type
 *
 * @param error - Error object from catch block
 * @param code - Error code to check
 * @returns True if error matches code
 */
export function isErrorType(error: any, code: string): boolean {
  const apiError = extractAPIError(error);
  return apiError.code === code;
}

/**
 * Check if error is validation error (400)
 */
export function isValidationError(error: any): boolean {
  return isErrorType(error, "VALIDATION_ERROR");
}

/**
 * Check if error is forbidden (403)
 */
export function isForbiddenError(error: any): boolean {
  return isErrorType(error, "FORBIDDEN");
}

/**
 * Check if error is not implemented (501)
 */
export function isNotImplementedError(error: any): boolean {
  return isErrorType(error, "NOT_IMPLEMENTED");
}

/**
 * Check if error is unauthenticated (401)
 */
export function isUnauthenticatedError(error: any): boolean {
  return isErrorType(error, "UNAUTHENTICATED");
}
