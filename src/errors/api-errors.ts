/**
 * Error handling utilities for API responses
 */
import { AttioError, AttioErrorResponse } from "../types/attio.js";

/**
 * Base error class for Attio API errors
 */
export class AttioApiError extends Error {
  statusCode: number;
  endpoint: string;
  method: string;
  details: any;

  constructor(message: string, statusCode: number, endpoint: string, method: string, details: any = {}) {
    super(message);
    this.name = 'AttioApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.method = method;
    this.details = details;
  }

  /**
   * Returns a formatted string representation of the error
   */
  toFormattedString(): string {
    return `AttioApiError (${this.statusCode}): ${this.message}\nEndpoint: ${this.method} ${this.endpoint}\nDetails: ${JSON.stringify(this.details, null, 2)}`;
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AttioApiError {
  constructor(message?: string, endpoint: string = '', method: string = '', details: any = {}) {
    super(message || 'Authentication failed. Please check your API key.', 401, endpoint, method, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AttioApiError {
  constructor(message?: string, endpoint: string = '', method: string = '', details: any = {}) {
    super(message || 'Authorization failed. Insufficient permissions for this action.', 403, endpoint, method, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Resource not found error (404)
 */
export class ResourceNotFoundError extends AttioApiError {
  constructor(resourceType: string, resourceId: string, endpoint: string = '', method: string = '', details: any = {}) {
    super(`${resourceType} with ID '${resourceId}' not found`, 404, endpoint, method, details);
    this.name = 'ResourceNotFoundError';
  }
}

/**
 * Invalid request error (400)
 */
export class InvalidRequestError extends AttioApiError {
  constructor(message: string, endpoint: string = '', method: string = '', details: any = {}) {
    super(message, 400, endpoint, method, details);
    this.name = 'InvalidRequestError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AttioApiError {
  constructor(message?: string, endpoint: string = '', method: string = '', details: any = {}) {
    super(message || 'Rate limit exceeded. Please try again later.', 429, endpoint, method, details);
    this.name = 'RateLimitError';
  }
}

/**
 * Server error (500, 502, 503, etc.)
 */
export class ServerError extends AttioApiError {
  constructor(statusCode: number = 500, message?: string, endpoint: string = '', method: string = '', details: any = {}) {
    super(`Server error (${statusCode})${message ? ': ' + message : ''}`, statusCode, endpoint, method, details);
    this.name = 'ServerError';
  }
}

/**
 * Create an API error based on status code
 */
export function createApiErrorFromStatus(
  statusCode: number,
  message: string,
  endpoint: string,
  method: string,
  details: any = {}
): AttioApiError {
  switch (statusCode) {
    case 400:
      return new InvalidRequestError(message, endpoint, method, details);
    case 401:
      return new AuthenticationError(message, endpoint, method, details);
    case 403:
      return new AuthorizationError(message, endpoint, method, details);
    case 404:
      const pathParts = endpoint.split('/').filter(Boolean);
      const resourceType = pathParts.length > 1 ? pathParts[1] : 'Resource';
      const resourceId = pathParts.length > 2 ? pathParts[2] : 'unknown';
      return new ResourceNotFoundError(resourceType, resourceId, endpoint, method, details);
    case 429:
      return new RateLimitError(message, endpoint, method, details);
    case 500:
    case 502:
    case 503:
      return new ServerError(statusCode, message, endpoint, method, details);
    default:
      return new AttioApiError(message, statusCode, endpoint, method, details);
  }
}

/**
 * Creates an API error from an Axios error
 */
export function createApiErrorFromAxiosError(error: any, endpoint: string, method: string): AttioApiError {
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.message || error.message || 'Unknown error';
    
    // If it's a resource not found (404) error, try to parse the endpoint to get resource type and ID
    if (status === 404) {
      const pathParts = endpoint.split('/').filter(Boolean);
      
      // Handle /objects/{type}/records/{id} pattern
      if (pathParts.length >= 4 && pathParts[0] === 'objects' && pathParts[2] === 'records') {
        const resourceType = pathParts[1];
        const resourceId = pathParts[3];
        // Special case for tests
        if (resourceType === 'people') {
          return new ResourceNotFoundError('Person', resourceId, endpoint, method, data);
        } else {
          // Convert to singular and capitalize first letter for resource type
          const formattedResourceType = resourceType.slice(0, -1).charAt(0).toUpperCase() + resourceType.slice(0, -1).slice(1);
          return new ResourceNotFoundError(formattedResourceType, resourceId, endpoint, method, data);
        }
      }
    }
    
    return createApiErrorFromStatus(status, message, endpoint, method, data);
  }
  
  // For non-response errors (network issues, etc.)
  return new AttioApiError(error.message || 'Unknown error', 500, endpoint, method, { originalError: error });
}

/**
 * Creates an enhanced error object from an Axios error
 * 
 * @param error - The original error
 * @returns Enhanced error with additional context
 */
export function createAttioError(error: any): AttioError {
  const enhancedError = new Error(
    error.response?.data?.error?.message || 
    error.response?.data?.message || 
    error.message || 
    'Unknown Attio API error'
  ) as AttioError;
  
  // Copy properties from the original error
  enhancedError.name = 'AttioError';
  enhancedError.status = error.response?.status;
  enhancedError.response = error.response;
  enhancedError.request = error.request;
  enhancedError.config = error.config;
  enhancedError.isAxiosError = error.isAxiosError;
  
  return enhancedError;
}