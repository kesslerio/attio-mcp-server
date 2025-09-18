/**
 * Error types for tool operations
 */

/**
 * Interface for API errors with response data
 */
export interface ApiError extends Error {
  response?: {
    data: Record<string, unknown>;
    status: number;
  };
  details?: Record<string, unknown>;
}

/**
 * Interface for ValueMatchError with original error
 */
export interface ValueMatchApiError extends Error {
  originalError?: ApiError;
  details?: Record<string, unknown>;
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'response' in error;
}

/**
 * Type guard to check if error has response data
 */
export function hasResponseData(
  error: unknown
): error is { response: { data: Record<string, unknown> } } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'response' in error &&
    error.response !== null &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null
  );
}
