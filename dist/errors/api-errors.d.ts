/**
 * Error class hierarchy for Attio API errors
 * Includes specialized error types for API interactions and validation
 */
/**
 * Base class for all Attio API errors
 */
export declare class AttioApiError extends Error {
    readonly statusCode: number;
    readonly endpoint: string;
    readonly method: string;
    readonly details?: any | undefined;
    /**
     * Create an AttioApiError
     *
     * @param message - Error message
     * @param statusCode - HTTP status code
     * @param endpoint - API endpoint that was called
     * @param details - Additional error details
     */
    constructor(message: string, statusCode: number, endpoint: string, method: string, details?: any | undefined);
    /**
     * Get a formatted representation of the error for logging
     */
    toFormattedString(): string;
}
/**
 * Error for authentication issues (401)
 */
export declare class AuthenticationError extends AttioApiError {
    constructor(message: string | undefined, endpoint: string, method: string, details?: any);
}
/**
 * Error for authorization issues (403)
 */
export declare class AuthorizationError extends AttioApiError {
    constructor(message: string | undefined, endpoint: string, method: string, details?: any);
}
/**
 * Error for resource not found issues (404)
 */
export declare class ResourceNotFoundError extends AttioApiError {
    constructor(resourceType: string, resourceId: string, endpoint: string, method: string, details?: any);
}
/**
 * Error for invalid request issues (400)
 */
export declare class InvalidRequestError extends AttioApiError {
    constructor(message: string, endpoint: string, method: string, details?: any);
}
/**
 * Error for rate limit issues (429)
 */
export declare class RateLimitError extends AttioApiError {
    constructor(message: string | undefined, endpoint: string, method: string, details?: any);
}
/**
 * Error for server-side issues (500, 502, 503, 504)
 */
export declare class ServerError extends AttioApiError {
    constructor(statusCode: number, message: string | undefined, endpoint: string, method: string, details?: any);
}
/**
 * Factory function to create the appropriate error type based on status code
 *
 * @param statusCode - HTTP status code
 * @param message - Error message
 * @param endpoint - API endpoint that was called
 * @param method - HTTP method used
 * @param details - Additional error details
 * @returns The appropriate error instance
 */
export declare function createApiErrorFromStatus(statusCode: number, message: string, endpoint: string, method: string, details?: any): AttioApiError;
/**
 * Create an appropriate error from Axios error response
 *
 * @param error - The caught error
 * @param endpoint - API endpoint that was called
 * @param method - HTTP method used
 * @returns The appropriate error instance
 */
export declare function createApiErrorFromAxiosError(error: any, endpoint: string, method: string): AttioApiError;
/**
 * Error class for filter validation issues
 *
 * Used when validating filter conditions and structures to ensure they meet
 * the requirements of the Attio API format.
 *
 * @example
 * ```typescript
 * try {
 *   // Validate filter conditions
 *   if (!isValidFilterCondition(condition)) {
 *     throw new FilterValidationError(`Invalid filter condition: ${condition}`);
 *   }
 * } catch (error) {
 *   if (error instanceof FilterValidationError) {
 *     // Handle filter validation error
 *   }
 * }
 * ```
 */
export declare class FilterValidationError extends Error {
    /**
     * Create a new FilterValidationError
     *
     * @param message - Detailed error message explaining the validation issue
     */
    constructor(message: string);
}
//# sourceMappingURL=api-errors.d.ts.map