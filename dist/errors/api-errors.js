/**
 * Error class hierarchy for Attio API errors
 * Includes specialized error types for API interactions and validation
 */
/**
 * Base class for all Attio API errors
 */
export class AttioApiError extends Error {
    statusCode;
    endpoint;
    method;
    details;
    /**
     * Create an AttioApiError
     *
     * @param message - Error message
     * @param statusCode - HTTP status code
     * @param endpoint - API endpoint that was called
     * @param details - Additional error details
     */
    constructor(message, statusCode, endpoint, method, details) {
        super(message);
        this.statusCode = statusCode;
        this.endpoint = endpoint;
        this.method = method;
        this.details = details;
        this.name = 'AttioApiError';
        // This line is needed to properly capture the stack trace in derived classes
        Object.setPrototypeOf(this, AttioApiError.prototype);
    }
    /**
     * Get a formatted representation of the error for logging
     */
    toFormattedString() {
        return `${this.name} (${this.statusCode}): ${this.message}\n`
            + `Endpoint: ${this.method} ${this.endpoint}\n`
            + `Details: ${JSON.stringify(this.details || {}, null, 2)}`;
    }
}
/**
 * Error for authentication issues (401)
 */
export class AuthenticationError extends AttioApiError {
    constructor(message = 'Authentication failed. Please check your API key.', endpoint, method, details) {
        super(message, 401, endpoint, method, details);
        this.name = 'AuthenticationError';
        // This line is needed to properly capture the stack trace
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}
/**
 * Error for authorization issues (403)
 */
export class AuthorizationError extends AttioApiError {
    constructor(message = 'Authorization failed. Your API key lacks the necessary permissions.', endpoint, method, details) {
        super(message, 403, endpoint, method, details);
        this.name = 'AuthorizationError';
        // This line is needed to properly capture the stack trace
        Object.setPrototypeOf(this, AuthorizationError.prototype);
    }
}
/**
 * Error for resource not found issues (404)
 */
export class ResourceNotFoundError extends AttioApiError {
    constructor(resourceType, resourceId, endpoint, method, details) {
        super(`${resourceType} with ID '${resourceId}' not found`, 404, endpoint, method, details);
        this.name = 'ResourceNotFoundError';
        // This line is needed to properly capture the stack trace
        Object.setPrototypeOf(this, ResourceNotFoundError.prototype);
    }
}
/**
 * Error for invalid request issues (400)
 */
export class InvalidRequestError extends AttioApiError {
    constructor(message, endpoint, method, details) {
        super(message, 400, endpoint, method, details);
        this.name = 'InvalidRequestError';
        // This line is needed to properly capture the stack trace
        Object.setPrototypeOf(this, InvalidRequestError.prototype);
    }
}
/**
 * Error for rate limit issues (429)
 */
export class RateLimitError extends AttioApiError {
    constructor(message = 'Rate limit exceeded. Please try again later.', endpoint, method, details) {
        super(message, 429, endpoint, method, details);
        this.name = 'RateLimitError';
        // This line is needed to properly capture the stack trace
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}
/**
 * Error for server-side issues (500, 502, 503, 504)
 */
export class ServerError extends AttioApiError {
    constructor(statusCode, message = 'Server error occurred', endpoint, method, details) {
        super(`Server error (${statusCode}): ${message}`, statusCode, endpoint, method, details);
        this.name = 'ServerError';
        // This line is needed to properly capture the stack trace
        Object.setPrototypeOf(this, ServerError.prototype);
    }
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
export function createApiErrorFromStatus(statusCode, message, endpoint, method, details) {
    switch (statusCode) {
        case 400:
            return new InvalidRequestError(message, endpoint, method, details);
        case 401:
            return new AuthenticationError(message, endpoint, method, details);
        case 403:
            return new AuthorizationError(message, endpoint, method, details);
        case 404:
            // This is a generic case - for specific resources, use ResourceNotFoundError constructor directly
            return new ResourceNotFoundError('Resource', 'unknown', endpoint, method, details);
        case 429:
            return new RateLimitError(message, endpoint, method, details);
        case 500:
        case 502:
        case 503:
        case 504:
            return new ServerError(statusCode, message, endpoint, method, details);
        default:
            return new AttioApiError(message, statusCode, endpoint, method, details);
    }
}
/**
 * Create an appropriate error from Axios error response
 *
 * @param error - The caught error
 * @param endpoint - API endpoint that was called
 * @param method - HTTP method used
 * @returns The appropriate error instance
 */
export function createApiErrorFromAxiosError(error, endpoint, method) {
    const statusCode = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'Unknown API error';
    const details = error.response?.data || {};
    // Special case for ResourceNotFoundError with object types
    if (statusCode === 404 && endpoint.includes('/objects/')) {
        // Extract resource type and ID from endpoint
        // Assuming endpoint format like /objects/{type}/records/{id}
        const matches = endpoint.match(/\/objects\/([^\/]+)\/records\/([^\/]+)/);
        if (matches && matches.length >= 3) {
            const [, resourceType, resourceId] = matches;
            // Format resource type properly: 'people' -> 'Person', 'companies' -> 'Company'
            let formattedType;
            if (resourceType === 'people') {
                formattedType = 'Person';
            }
            else if (resourceType === 'companies') {
                formattedType = 'Company';
            }
            else {
                // Default formatting for other types
                formattedType = resourceType.charAt(0).toUpperCase() + resourceType.slice(1, -1);
            }
            return new ResourceNotFoundError(formattedType, resourceId, endpoint, method, details);
        }
    }
    return createApiErrorFromStatus(statusCode, message, endpoint, method, details);
}
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
export class FilterValidationError extends Error {
    /**
     * Create a new FilterValidationError
     *
     * @param message - Detailed error message explaining the validation issue
     */
    constructor(message) {
        super(message);
        this.name = 'FilterValidationError';
        // This line is needed to properly capture the stack trace
        Object.setPrototypeOf(this, FilterValidationError.prototype);
    }
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
export class RelationshipFilterError extends FilterValidationError {
    sourceType;
    targetType;
    relationshipType;
    /**
     * Create a RelationshipFilterError
     *
     * @param message - Error message
     * @param sourceType - The source entity type (e.g., 'people', 'companies')
     * @param targetType - The target entity type (e.g., 'companies', 'lists')
     * @param relationshipType - The type of relationship that failed validation
     */
    constructor(message, sourceType, targetType, relationshipType) {
        super(message);
        this.sourceType = sourceType;
        this.targetType = targetType;
        this.relationshipType = relationshipType;
        this.name = 'RelationshipFilterError';
        // This line is needed to properly capture the stack trace in derived classes
        Object.setPrototypeOf(this, RelationshipFilterError.prototype);
    }
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
export class ListRelationshipError extends RelationshipFilterError {
    listId;
    /**
     * Create a ListRelationshipError
     *
     * @param message - Error message
     * @param sourceType - The source entity type (e.g., 'people', 'companies')
     * @param listId - The list ID that caused the error
     */
    constructor(message, sourceType, listId) {
        super(message, sourceType, 'lists', 'in_list');
        this.listId = listId;
        this.name = 'ListRelationshipError';
        // This line is needed to properly capture the stack trace
        Object.setPrototypeOf(this, ListRelationshipError.prototype);
    }
}
//# sourceMappingURL=api-errors.js.map