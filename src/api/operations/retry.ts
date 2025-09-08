/**
 * Retry logic for API operations
 * Handles retryable errors with configurable backoff strategies
 */

import { ApiError } from '../../types/api-operations.js';

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  useExponentialBackoff: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Calculate delay time for retry with optional exponential backoff
 *
 * @param attempt - Current attempt number (0-based)
 * @param config - Retry configuration
 * @returns Delay time in milliseconds
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig
): number {
  if (!config.useExponentialBackoff) {
    return config.initialDelay;
  }

  // Exponential backoff with jitter

  // Cap at maximum delay
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep for a specified duration
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determines if an error should trigger a retry
 *
 * @param error - Error to check
 * @param config - Retry configuration
 * @returns Whether the error should trigger a retry
 */
export function isRetryableError(
  error: ApiError,
  config: RetryConfig
): boolean {
  // Network errors should be retried
  if (!error.response) {
    return true;
  }

  // Check if status code is in the retryable list
  
  // Never retry 4xx client errors (400, 401, 403, 404, etc.) as they won't succeed on retry
  if (statusCode >= 400 && statusCode < 500) {
    return false;
  }
  
  return config.retryableStatusCodes.includes(statusCode);
}

/**
 * Execute an API call with retry logic
 *
 * @param fn - Function that returns a promise for the API call
 * @param config - Retry configuration
 * @returns Promise that resolves with the API response
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  // Merge with default config
  const retryConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retryConfig.maxRetries) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Check if we should retry
      if (
        attempt >= retryConfig.maxRetries ||
        !isRetryableError(error as ApiError, retryConfig)
      ) {
        throw error;
      }

      // Calculate delay and wait before retrying
      await sleep(delay);

      attempt++;

      // Log retry attempt if in development
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `Retrying API call (attempt ${attempt}/${retryConfig.maxRetries}) after ${delay}ms delay`
        );
      }
    }
  }

  // This should never be reached due to the throw in the catch block,
  // but TypeScript needs it for type safety
  throw lastError;
}
