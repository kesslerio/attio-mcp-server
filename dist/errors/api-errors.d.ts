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
/**
 * Error for relationship filter validation issues
 *
 * @example
 * ```typescript
 * try {
 *   if (!isValidRelationshipType(type)) {
 *     throw new RelationshipFilterError(`Invalid relationship type: ${type}`, 'people', 'companies');
 *   }
 * } catch (error) {
 *   if (error instanceof RelationshipFilterError) {
 *     // Handle relationship filter error
 *   }
 * }
 * ```
 */
export declare class RelationshipFilterError extends FilterValidationError {
    readonly sourceType?: string | undefined;
    readonly targetType?: string | undefined;
    readonly relationshipType?: string | undefined;
    /**
     * Create a RelationshipFilterError
     *
     * @param message - Error message
     * @param sourceType - The source entity type (e.g., 'people', 'companies')
     * @param targetType - The target entity type (e.g., 'companies', 'lists')
     * @param relationshipType - The type of relationship that failed validation
     */
    constructor(message: string, sourceType?: string | undefined, targetType?: string | undefined, relationshipType?: string | undefined);
}
/**
 * Error specifically for list relationship issues
 *
 * @example
 * ```typescript
 * try {
 *   if (!isValidListId(listId)) {
 *     throw new ListRelationshipError(`Invalid list ID: ${listId}`, 'people', listId);
 *   }
 * } catch (error) {
 *   if (error instanceof ListRelationshipError) {
 *     // Handle list relationship error
 *   }
 * }
 * ```
 */
export declare class ListRelationshipError extends RelationshipFilterError {
    readonly listId?: string | undefined;
    /**
     * Create a ListRelationshipError
     *
     * @param message - Error message
     * @param sourceType - The source entity type (e.g., 'people', 'companies')
     * @param listId - The list ID that caused the error
     */
    constructor(message: string, sourceType?: string, listId?: string | undefined);
}
//# sourceMappingURL=api-errors.d.ts.map