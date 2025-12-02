/**
 * Error class hierarchy for Attio API errors
 * Includes specialized error types for API interactions and validation
 */

import { sanitizeErrorMessage } from '../utils/error-sanitizer.js';

/**
 * Base class for all Attio API errors
 */
export class AttioApiError extends Error {
  /**
   * Create an AttioApiError
   *
   * @param message - Error message
   * @param statusCode - HTTP status code
   * @param endpoint - API endpoint that was called
   * @param details - Additional error details
   */
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string,
    public readonly method: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AttioApiError';

    // This line is needed to properly capture the stack trace in derived classes
    Object.setPrototypeOf(this, AttioApiError.prototype);
  }

  /**
   * Get a formatted representation of the error for logging
   */
  toFormattedString(): string {
    // In production, sanitize the output
    if (process.env.NODE_ENV === 'production') {
      return `${this.name} (${this.statusCode}): ${sanitizeErrorMessage(
        this.message
      )}`;
    }

    // In development, include more details but still sanitize sensitive data
    const sanitizedEndpoint = this.endpoint.replace(
      /\/[a-f0-9-]{20,}/gi,
      '/[ID_REDACTED]'
    );
    return (
      `${this.name} (${this.statusCode}): ${this.message}\n` +
      `Endpoint: ${this.method} ${sanitizedEndpoint}\n` +
      `Details: ${JSON.stringify(this.details || {}, null, 2)}`
    );
  }
}

/**
 * Error for authentication issues (401)
 *
 * Supports both API key and OAuth access token authentication (Issue #928).
 * Provides helpful guidance for OAuth token expiration scenarios.
 */
export class AuthenticationError extends AttioApiError {
  /** Helpful message for OAuth token expiration scenarios */
  public readonly oauthHint: string;

  constructor(
    message: string = 'Authentication failed. Please check your credentials.',
    endpoint: string,
    method: string,
    details?: Record<string, unknown>
  ) {
    // Sanitize the message to avoid exposing API key/token format
    const sanitizedMessage = message
      .replace(
        /api[_-]?key[\s:=]*["']?[a-zA-Z0-9_-]{20,}["']?/gi,
        '[CREDENTIAL_REDACTED]'
      )
      .replace(
        /access[_-]?token[\s:=]*["']?[a-zA-Z0-9_-]{20,}["']?/gi,
        '[TOKEN_REDACTED]'
      );

    super(sanitizedMessage, 401, endpoint, method, details);
    this.name = 'AuthenticationError';

    // Helpful message for OAuth users (Issue #928)
    this.oauthHint =
      'If using an OAuth access token, it may have expired. ' +
      'Run `npm run oauth:refresh` to obtain a new token, or check your ATTIO_API_KEY/ATTIO_ACCESS_TOKEN configuration.';

    // This line is needed to properly capture the stack trace
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }

  /**
   * Get a formatted representation with OAuth guidance
   */
  override toFormattedString(): string {
    const baseMessage = super.toFormattedString();
    return `${baseMessage}\n\nTip: ${this.oauthHint}`;
  }
}

/**
 * Error for authorization issues (403)
 */
export class AuthorizationError extends AttioApiError {
  constructor(
    message: string = 'Authorization failed. You lack the necessary permissions.',
    endpoint: string,
    method: string,
    details?: Record<string, unknown>
  ) {
    // Sanitize the message to avoid exposing permission details
    const sanitizedMessage = message.replace(
      /permission[s]?[\s:]+["']?[a-z_.]+["']?/gi,
      '[PERMISSION_REDACTED]'
    );
    super(sanitizedMessage, 403, endpoint, method, details);
    this.name = 'AuthorizationError';

    // This line is needed to properly capture the stack trace
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Error for resource not found issues (404)
 */
export class ResourceNotFoundError extends AttioApiError {
  constructor(
    resourceType: string,
    resourceId: string,
    endpoint: string,
    method: string,
    details?: Record<string, unknown>
  ) {
    // Sanitize resource ID to avoid exposing internal identifiers
    const sanitizedId = resourceId.length > 10 ? '[ID_REDACTED]' : resourceId;
    super(
      `${resourceType} ${sanitizedId} not found`,
      404,
      endpoint,
      method,
      details
    );
    this.name = 'ResourceNotFoundError';

    // This line is needed to properly capture the stack trace
    Object.setPrototypeOf(this, ResourceNotFoundError.prototype);
  }
}

/**
 * Error for invalid request issues (400)
 */
export class InvalidRequestError extends AttioApiError {
  constructor(
    message: string,
    endpoint: string,
    method: string,
    details?: Record<string, unknown>
  ) {
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
  constructor(
    message: string = 'Rate limit exceeded. Please try again later.',
    endpoint: string,
    method: string,
    details?: Record<string, unknown>
  ) {
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
  constructor(
    statusCode: number,
    message: string = 'Server error occurred',
    endpoint: string,
    method: string,
    details?: Record<string, unknown>
  ) {
    super(
      `Server error (${statusCode}): ${message}`,
      statusCode,
      endpoint,
      method,
      details
    );
    this.name = 'ServerError';

    // This line is needed to properly capture the stack trace
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

/**
 * Error for network connectivity issues (timeout, connection refused, DNS issues)
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly endpoint: string,
    public readonly method: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'NetworkError';

    // This line is needed to properly capture the stack trace
    Object.setPrototypeOf(this, NetworkError.prototype);
  }

  /**
   * Check if an error is a network-related error
   */
  static isNetworkError(error: unknown): boolean {
    if (error instanceof NetworkError) return true;

    // Check for error codes that indicate network issues
    const errorObj = error as { code?: string; message?: string };
    if (errorObj.code) {
      const networkCodes = [
        'ECONNREFUSED',
        'ENOTFOUND',
        'ECONNRESET',
        'ETIMEDOUT',
        'ECONNABORTED',
        'EHOSTUNREACH',
        'ENETUNREACH',
      ];
      if (networkCodes.includes(errorObj.code)) return true;
    }

    // Check for specific network-related messages
    const errorMessage = error instanceof Error ? error.message : String(error);
    const networkKeywords = [
      'Network Error',
      'fetch failed',
      'connection refused',
      'dns lookup failed',
      'timeout',
    ];

    // Only match if the message starts with or contains these specific patterns
    return networkKeywords.some((keyword) =>
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Create a NetworkError from a caught error
   */
  static fromError(
    error: unknown,
    endpoint: string,
    method: string
  ): NetworkError {
    const originalError =
      error instanceof Error ? error : new Error(String(error));
    return new NetworkError(
      `Network error occurred: ${originalError.message}`,
      endpoint,
      method,
      originalError
    );
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
export function createApiErrorFromStatus(
  statusCode: number,
  message: string,
  endpoint: string,
  method: string,
  details?: Record<string, unknown>
): AttioApiError {
  switch (statusCode) {
    case 400:
      return new InvalidRequestError(message, endpoint, method, details);
    case 401:
      return new AuthenticationError(message, endpoint, method, details);
    case 403:
      return new AuthorizationError(message, endpoint, method, details);
    case 404:
      // This is a generic case - for specific resources, use ResourceNotFoundError constructor directly
      return new ResourceNotFoundError(
        'Resource',
        'unknown',
        endpoint,
        method,
        details
      );
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
export function createApiErrorFromAxiosError(
  error: unknown,
  endpoint: string,
  method: string
): AttioApiError | NetworkError {
  const axiosError = error as {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
  };

  // Check if this is a network error first (no response = network issue)
  if (!axiosError.response) {
    // No response means network connectivity issue
    if (NetworkError.isNetworkError(error)) {
      return NetworkError.fromError(error, endpoint, method);
    }
    // If no response but not a recognized network error, treat as generic API error
    const message = axiosError.message || 'Unknown API error';
    return new AttioApiError(message, 500, endpoint, method, {});
  }

  const statusCode = axiosError.response.status || 500;
  const message =
    axiosError.response?.data?.message ||
    axiosError.message ||
    'Unknown API error';
  const details = axiosError.response?.data || {};

  // Special case for ResourceNotFoundError with object types
  if (statusCode === 404 && endpoint.includes('/objects/')) {
    // Extract resource type and ID from endpoint
    // Assuming endpoint format like /objects/{type}/records/{id}
    const matches = endpoint.match(/\/objects\/([^/]+)\/records\/([^/]+)/);
    if (matches && matches.length >= 3) {
      const [, resourceType, resourceId] = matches;
      // Format resource type properly: 'people' -> 'Person', 'companies' -> 'Company'
      let formattedType;
      if (resourceType === 'people') {
        formattedType = 'Person';
      } else if (resourceType === 'companies') {
        formattedType = 'Company';
      } else {
        // Default formatting for other types
        formattedType =
          resourceType.charAt(0).toUpperCase() + resourceType.slice(1, -1);
      }

      return new ResourceNotFoundError(
        formattedType,
        resourceId,
        endpoint,
        method,
        details
      );
    }
  }

  return createApiErrorFromStatus(
    statusCode,
    message,
    endpoint,
    method,
    details
  );
}

/**
 * Filter error categories for more targeted error handling
 */
export enum FilterErrorCategory {
  STRUCTURE = 'structure', // Basic structure issues (missing filters array)
  ATTRIBUTE = 'attribute', // Attribute-related issues
  CONDITION = 'condition', // Condition-related issues
  VALUE = 'value', // Value-related issues
  TRANSFORMATION = 'transformation', // API format transformation issues
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
 *     throw new FilterValidationError(
 *       `Invalid filter condition: ${condition}`,
 *       FilterErrorCategory.CONDITION
 *     );
 *   }
 * } catch (error: unknown) {
 *   if (error instanceof FilterValidationError) {
 *     // Handle filter validation error based on category
 *     if (error.category === FilterErrorCategory.CONDITION) {
 *       // Handle condition-specific error
 *     }
 *   }
 * }
 * ```
 */
export class FilterValidationError extends Error {
  /**
   * Create a new FilterValidationError
   *
   * @param message - Detailed error message explaining the validation issue
   * @param category - Error category for targeted handling (default: STRUCTURE)
   */
  constructor(
    message: string,
    public readonly category: FilterErrorCategory = FilterErrorCategory.STRUCTURE
  ) {
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
 *     throw new RelationshipFilterError(
 *       `Invalid relationship type: ${type}`,
 *       'people',
 *       'companies'
 *     );
 *   }
 * } catch (error: unknown) {
 *   if (error instanceof RelationshipFilterError) {
 *     // Handle relationship filter error
 *     console.error(`Relationship error between ${error.sourceType} and ${error.targetType}`);
 *   }
 * }
 * ```
 */
export class RelationshipFilterError extends FilterValidationError {
  /**
   * Create a RelationshipFilterError
   *
   * @param message - Error message
   * @param sourceType - The source entity type (e.g., 'people', 'companies')
   * @param targetType - The target entity type (e.g., 'companies', 'lists')
   * @param relationshipType - The type of relationship that failed validation
   */
  constructor(
    message: string,
    public readonly sourceType?: string,
    public readonly targetType?: string,
    public readonly relationshipType?: string
  ) {
    // Relationships are a special type of filter condition
    super(message, FilterErrorCategory.CONDITION);
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
 * } catch (error: unknown) {
 *   if (error instanceof ListRelationshipError) {
 *     // Handle list relationship error
 *   }
 * }
 * ```
 */
export class ListRelationshipError extends RelationshipFilterError {
  /**
   * Create a ListRelationshipError
   *
   * @param message - Error message
   * @param sourceType - The source entity type (e.g., 'people', 'companies')
   * @param listId - The list ID that caused the error
   */
  constructor(
    message: string,
    sourceType?: string,
    public readonly listId?: string
  ) {
    super(message, sourceType, 'lists', 'in_list');
    this.name = 'ListRelationshipError';

    // This line is needed to properly capture the stack trace
    Object.setPrototypeOf(this, ListRelationshipError.prototype);
  }
}
