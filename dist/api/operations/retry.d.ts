/**
 * Retry logic for API operations
 * Handles retryable errors with configurable backoff strategies
 */
/**
 * Configuration options for API call retry
 */
export interface RetryConfig {
    /** Maximum number of retry attempts */
    maxRetries: number;
    /** Initial delay in milliseconds before the first retry */
    initialDelay: number;
    /** Maximum delay in milliseconds between retries */
    maxDelay: number;
    /** Whether to use exponential backoff for retry delays */
    useExponentialBackoff: boolean;
    /** HTTP status codes that should trigger a retry */
    retryableStatusCodes: number[];
}
/**
 * Default retry configuration
 */
export declare const DEFAULT_RETRY_CONFIG: RetryConfig;
/**
 * Calculate delay time for retry with optional exponential backoff
 *
 * @param attempt - Current attempt number (0-based)
 * @param config - Retry configuration
 * @returns Delay time in milliseconds
 */
export declare function calculateRetryDelay(attempt: number, config: RetryConfig): number;
/**
 * Determines if an error should trigger a retry
 *
 * @param error - Error to check
 * @param config - Retry configuration
 * @returns Whether the error should trigger a retry
 */
export declare function isRetryableError(error: any, config: RetryConfig): boolean;
/**
 * Execute an API call with retry logic
 *
 * @param fn - Function that returns a promise for the API call
 * @param config - Retry configuration
 * @returns Promise that resolves with the API response
 */
export declare function callWithRetry<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>;
//# sourceMappingURL=retry.d.ts.map