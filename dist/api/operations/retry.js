/**
 * Retry logic for API operations
 * Handles retryable errors with configurable backoff strategies
 */
/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    useExponentialBackoff: true,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};
/**
 * Calculate delay time for retry with optional exponential backoff
 *
 * @param attempt - Current attempt number (0-based)
 * @param config - Retry configuration
 * @returns Delay time in milliseconds
 */
export function calculateRetryDelay(attempt, config) {
    if (!config.useExponentialBackoff) {
        return config.initialDelay;
    }
    // Exponential backoff with jitter
    const exponentialDelay = config.initialDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.5 + 0.75; // Random value between 0.75 and 1.25
    const delay = exponentialDelay * jitter;
    // Cap at maximum delay
    return Math.min(delay, config.maxDelay);
}
/**
 * Sleep for a specified duration
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the specified duration
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Determines if an error should trigger a retry
 *
 * @param error - Error to check
 * @param config - Retry configuration
 * @returns Whether the error should trigger a retry
 */
export function isRetryableError(error, config) {
    // Network errors should be retried
    if (!error.response) {
        return true;
    }
    // Check if status code is in the retryable list
    const statusCode = error.response.status;
    return config.retryableStatusCodes.includes(statusCode);
}
/**
 * Execute an API call with retry logic
 *
 * @param fn - Function that returns a promise for the API call
 * @param config - Retry configuration
 * @returns Promise that resolves with the API response
 */
export async function callWithRetry(fn, config = {}) {
    // Merge with default config
    const retryConfig = {
        ...DEFAULT_RETRY_CONFIG,
        ...config
    };
    let attempt = 0;
    let lastError;
    while (attempt <= retryConfig.maxRetries) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            // Check if we should retry
            if (attempt >= retryConfig.maxRetries || !isRetryableError(error, retryConfig)) {
                throw error;
            }
            // Calculate delay and wait before retrying
            const delay = calculateRetryDelay(attempt, retryConfig);
            await sleep(delay);
            attempt++;
            // Log retry attempt if in development
            if (process.env.NODE_ENV === 'development') {
                console.log(`Retrying API call (attempt ${attempt}/${retryConfig.maxRetries}) after ${delay}ms delay`);
            }
        }
    }
    // This should never be reached due to the throw in the catch block,
    // but TypeScript needs it for type safety
    throw lastError;
}
//# sourceMappingURL=retry.js.map