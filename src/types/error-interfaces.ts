/**
 * Centralized error interfaces for consistent error handling across the codebase
 * Used by type-safe error helpers in src/objects/
 */

/**
 * Common HTTP error structure for APIs like Axios
 */
export interface HttpErrorLike {
  response?: {
    status?: number;
    statusCode?: number;
    data?: {
      message?: string;
      error?: {
        message?: string;
      };
      code?: string;
    };
  };
  status?: number;
  statusCode?: number;
  message?: string;
  code?: string;
}

/**
 * Error structure with alternative status property names
 */
export interface StatusLikeError {
  status?: number;
  statusCode?: number;
  response?: {
    status?: number;
    statusCode?: number;
  };
}

/**
 * Type guard to check if an unknown value is an HTTP-like error
 */
export function isHttpErrorLike(error: unknown): error is HttpErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('response' in error || 'status' in error || 'message' in error)
  );
}

/**
 * Type guard to check if an unknown value has status information
 */
export function isStatusLikeError(error: unknown): error is StatusLikeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('status' in error || 'statusCode' in error || 'response' in error)
  );
}

/**
 * Safely extract HTTP status code from error
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (!isStatusLikeError(error)) {
    return undefined;
  }

  const status =
    error.status ??
    error.statusCode ??
    error.response?.status ??
    error.response?.statusCode;
  return typeof status === 'number' ? status : undefined;
}

/**
 * Safely extract error message from error
 */
export function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }

  if (!isHttpErrorLike(error)) {
    if (typeof error === 'string') {
      return error;
    }
    return undefined;
  }

  return (
    error.response?.data?.message ??
    error.response?.data?.error?.message ??
    error.message
  );
}

/**
 * Safely extract error code from error
 */
export function getErrorCode(error: unknown): string | undefined {
  if (!isHttpErrorLike(error)) {
    return undefined;
  }

  return error.response?.data?.code ?? error.code;
}
