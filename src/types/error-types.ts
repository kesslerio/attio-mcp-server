/**
 * Type-safe error handling utilities
 * Created as part of TypeScript 'any' reduction initiative (Issue #502)
 */

/**
 * Type guard to check if an object has a response property with status
 */
export function hasResponseStatus(error: unknown): error is {
  response: { status: number };
  [key: string]: unknown;
} {
  return (
    isObject(error) &&
    hasProperty(error, 'response') &&
    isObject(error.response) &&
    hasProperty(error.response, 'status') &&
    typeof error.response.status === 'number'
  );
}

/**
 * Type guard for standard API error structure
 */
export function isApiError(error: unknown): error is {
  message: string;
  response?: {
    status: number;
    data?: unknown;
  };
  [key: string]: unknown;
} {
  return (
    isObject(error) &&
    hasProperty(error, 'message') &&
    typeof error.message === 'string'
  );
}

/**
 * Type guard for Attio-specific API errors
 */
export function isAttioApiError(error: unknown): error is {
  message: string;
  response?: {
    status: number;
    data?: {
      message?: string;
      error?: {
        message?: string;
        detail?: string;
        details?: unknown;
      };
      details?: unknown;
    };
  };
  code?: string;
  [key: string]: unknown;
} {
  return isApiError(error);
}

/**
 * Extract error details safely
 */
export function extractErrorDetails(error: unknown): {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
} {
  if (isAttioApiError(error)) {
    return {
      message:
        error.response?.data?.message || error.message || 'Unknown error',
      status: error.response?.status,
      code: error.code,
      details: error.response?.data?.details,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: 'Unknown error' };
}

/**
 * Safely get a property from an unknown value
 */
export function safeGet<T = unknown>(
  obj: unknown,
  path: string,
  defaultValue?: T
): T | undefined {
  if (!isObject(obj)) {
    return defaultValue;
  }

  let current: unknown = obj;

  for (const key of keys) {
    if (!isObject(current) || !hasProperty(current, key)) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current as T;
}

/**
 * Type guard to check if a value is an object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/**
 * Type guard to check if an object has a property
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Safe property access with type assertion
 */
export function getProperty<T>(
  obj: unknown,
  key: string,
  validator?: (value: unknown) => value is T
): T | undefined {
  if (!isObject(obj) || !(key in obj)) {
    return undefined;
  }

  if (validator) {
    return validator(value) ? value : undefined;
  }

  return value as T;
}
