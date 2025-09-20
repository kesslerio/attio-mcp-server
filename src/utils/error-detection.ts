/**
 * Explicit error detection utilities for MCP responses
 *
 * Provides precise error detection logic to avoid false positives
 * from string-based heuristics and empty/false responses that
 * are actually valid success states.
 */

/**
 * Interface for API response that may contain error information
 */
interface ApiResponse {
  error?: unknown;
  errors?: unknown[];
}

export interface ErrorAnalysis {
  isError: boolean;
  reason?:
    | 'null_or_undefined_result'
    | 'empty_response'
    | 'explicit_success_false'
    | 'meaningful_error_object'
    | 'meaningful_error_string'
    | 'errors_array_has_items'
    | 'api_error_array'
    | 'empty_array';
}

/**
 * Compute error status with explicit detection logic only
 *
 * Avoids false positives by only flagging:
 * - Null/undefined results
 * - Explicit success: false
 * - Meaningful error objects with messages
 * - Non-empty error strings
 * - Error arrays with actual error items
 *
 * @param result - Result object to analyze
 * @param opts - Optional context for tool-specific logic
 * @returns Error analysis with explicit reasoning
 */
export function computeErrorWithContext(
  result: unknown,
  opts?: { toolName?: string; httpStatus?: number }
): ErrorAnalysis {
  const toolName = opts?.toolName;

  const isPlainObject =
    result && typeof result === 'object' && !Array.isArray(result);
  const isEmptyObject =
    isPlainObject &&
    Object.keys(result as Record<string, unknown>).length === 0;

  // 1) Always surface explicit API errors first
  const apiResponse = result as ApiResponse;
  if (
    apiResponse?.error ||
    (Array.isArray(apiResponse?.errors) && apiResponse.errors.length)
  ) {
    return { isError: true, reason: 'meaningful_error_object' };
  }

  // Handle arrays (bulk ops, list endpoints, etc.)
  if (Array.isArray(result)) {
    // explicit errors inside any element
    const hasExplicitErr = result.some(
      (r) => r?.error || (Array.isArray(r?.errors) && r.errors.length)
    );
    if (hasExplicitErr)
      return { isError: true, reason: 'api_error_array' as const };

    // empty arrays are usually a failure for create/bulk flows
    if (result.length === 0)
      return { isError: true, reason: 'empty_array' as const };

    return { isError: false };
  }

  // 2) Create-record special case:
  //    On 2xx paths the transport may hand minimal shells through;
  //    don't classify {} as an error here — let the business layer
  //    (extractor/assert) decide shape.
  if (toolName === 'create-record') {
    if (result == null)
      return { isError: true, reason: 'null_or_undefined_result' };
    if (isEmptyObject) return { isError: false };
  }

  // 3) Legacy heuristics (unchanged for other tools)
  if (result == null)
    return { isError: true, reason: 'null_or_undefined_result' };
  if (isEmptyObject) return { isError: true, reason: 'empty_response' };

  // Detect empty objects as errors (per Issue #517 analysis)
  // Empty objects {} often indicate failed API responses that should be errors

  // Detect Attio API "unknown" record responses (indicates record not found)
  // Attio sometimes returns fake records with id.record_id: 'unknown' instead of 404s
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const record = result as Record<string, unknown>;
    if (
      record.id &&
      typeof record.id === 'object' &&
      !Array.isArray(record.id)
    ) {
      const id = record.id as Record<string, unknown>;
      if (id.record_id === 'unknown') {
        return { isError: true, reason: 'empty_response' };
      }
    }
  }

  // Check for explicit success: false
  if (typeof result === 'object' && result !== null && 'success' in result) {
    const successField = (result as Record<string, unknown>).success;
    if (successField === false) {
      return { isError: true, reason: 'explicit_success_false' };
    }
  }

  // Check for meaningful error objects
  if (typeof result === 'object' && result !== null && 'error' in result) {
    const errorField = (result as Record<string, unknown>).error;

    // Error object with message
    if (
      errorField &&
      typeof errorField === 'object' &&
      'message' in errorField
    ) {
      const message = (errorField as Record<string, unknown>).message;
      if (typeof message === 'string' && message.trim()) {
        return { isError: true, reason: 'meaningful_error_object' };
      }
    }

    // Error string (non-empty)
    if (typeof errorField === 'string' && errorField.trim().length > 0) {
      return { isError: true, reason: 'meaningful_error_string' };
    }
  }

  // Check for errors array with meaningful items
  if (typeof result === 'object' && result !== null && 'errors' in result) {
    const errorsField = (result as Record<string, unknown>).errors;

    if (Array.isArray(errorsField)) {
      const hasErrors = errorsField.some((err: unknown) => {
        if (!err) return false;

        // Error with message
        if (typeof err === 'object' && 'message' in err) {
          const message = (err as Record<string, unknown>).message;
          return typeof message === 'string' && message.trim();
        }

        // Error with code
        if (typeof err === 'object' && 'code' in err) {
          return true;
        }

        // Non-empty error string
        if (typeof err === 'string') {
          return err.trim().length > 0;
        }

        return false;
      });

      if (hasErrors) {
        return { isError: true, reason: 'errors_array_has_items' };
      }
    }
  }

  // Default to no error for all other cases
  // This includes:
  // - Empty arrays: []
  // - Empty strings: ""
  // - false/null values in data fields
  // - Missing fields
  // - Zero counts
  return { isError: false };
}

/**
 * Check if a result should have empty error fields removed
 *
 * @param result - Result to clean
 * @returns Cleaned result without empty error indicators
 */
export function cleanEmptyErrorFields(result: unknown): unknown {
  if (!result || typeof result !== 'object') {
    return result;
  }

  const cleaned = { ...(result as Record<string, unknown>) };

  // Remove empty error field
  if ('error' in cleaned && (cleaned.error === '' || cleaned.error === null)) {
    delete cleaned.error;
  }

  // Remove empty errors array
  if (
    'errors' in cleaned &&
    Array.isArray(cleaned.errors) &&
    cleaned.errors.length === 0
  ) {
    delete cleaned.errors;
  }

  return cleaned;
}
