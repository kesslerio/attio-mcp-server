/**
 * Explicit error detection utilities for MCP responses
 *
 * Provides precise error detection logic to avoid false positives
 * from string-based heuristics and empty/false responses that
 * are actually valid success states.
 */

export interface ErrorAnalysis {
  isError: boolean;
  reason?:
    | 'null_or_undefined_result'
    | 'empty_response'
    | 'explicit_success_false'
    | 'meaningful_error_object'
    | 'meaningful_error_string'
    | 'errors_array_has_items';
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
 * @returns Error analysis with explicit reasoning
 */
export function computeErrorWithContext(result: unknown): ErrorAnalysis {
  // Null or undefined results are always errors
  if (!result) {
    return { isError: true, reason: 'null_or_undefined_result' };
  }

  // Detect empty objects as errors (per Issue #517 analysis)
  // Empty objects {} often indicate failed API responses that should be errors
  if (result && typeof result === 'object' && !Array.isArray(result) && Object.keys(result).length === 0) {
    return { isError: true, reason: 'empty_response' as any };
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
