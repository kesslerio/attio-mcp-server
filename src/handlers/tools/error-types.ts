/**
 * Error types for tool operations
 */

/**
 * Interface for API errors with response data
 */
export interface ApiError extends Error {
  response?: {
    data: unknown;
    status: number;
  };
  details?: unknown;
}

/**
 * Interface for ValueMatchError with original error
 */
export interface ValueMatchApiError extends Error {
  originalError?: ApiError;
  details?: unknown;
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
): error is { response: { data: any } } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'response' in error &&
    error.response !== null &&
    typeof error.response === 'object' &&
    'data' in error.response
  );
}
