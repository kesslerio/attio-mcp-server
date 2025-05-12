/**
 * Error handling utility for creating consistent error responses
 */
import { AttioErrorResponse } from "../types/attio.js";

/**
 * Custom error class for Attio API errors
 */
export class AttioApiError extends Error {
  status: number;
  detail: string;
  path: string;
  method: string;
  responseData: any;

  constructor(message: string, status: number, detail: string, path: string, method: string, responseData: any = {}) {
    super(message);
    this.name = 'AttioApiError';
    this.status = status;
    this.detail = detail;
    this.path = path;
    this.method = method;
    this.responseData = responseData;
  }
}

/**
 * Creates a specific API error based on status code and context
 * 
 * @param status - HTTP status code
 * @param path - API path
 * @param method - HTTP method
 * @param responseData - Response data from API
 * @returns Appropriate error instance
 */
export function createAttioError(error: any): Error {
  // If it's already an AttioApiError, return it
  if (error instanceof AttioApiError) {
    return error;
  }
  
  // Handle Axios errors
  if (error.isAxiosError && error.response) {
    const { status, data, config } = error.response;
    const path = config?.url || 'unknown';
    const method = config?.method?.toUpperCase() || 'UNKNOWN';
    return createApiError(status, path, method, data);
  }
  
  // Return the original error if we can't enhance it
  return error;
}

/**
 * Creates a specific API error based on status code and context
 * 
 * @param status - HTTP status code
 * @param path - API path
 * @param method - HTTP method
 * @param responseData - Response data from API
 * @returns Appropriate error instance
 */
export function createApiError(status: number, path: string, method: string, responseData: any = {}): Error {
  const defaultMessage = responseData?.error?.message || responseData?.message || 'Unknown API error';
  const detail = responseData?.error?.detail || responseData?.detail || 'No additional details';
  
  // Create specific error messages based on status code and context
  switch (status) {
    case 400:
      return new AttioApiError(
        `Bad Request: ${defaultMessage}`, 
        status, 
        detail, 
        path, 
        method, 
        responseData
      );
    
    case 401:
      return new AttioApiError(
        'Authentication failed. Please check your API key.', 
        status, 
        detail, 
        path, 
        method, 
        responseData
      );
    
    case 403:
      return new AttioApiError(
        'Permission denied. Your API key lacks the necessary permissions.', 
        status, 
        detail, 
        path, 
        method, 
        responseData
      );
    
    case 404:
      // Customize 404 message based on path
      if (path.includes('/objects/people/')) {
        return new AttioApiError(
          `Person not found: ${path.split('/').pop()}`, 
          status, 
          detail, 
          path, 
          method, 
          responseData
        );
      } else if (path.includes('/objects/companies/')) {
        return new AttioApiError(
          `Company not found: ${path.split('/').pop()}`, 
          status, 
          detail, 
          path, 
          method, 
          responseData
        );
      }
      return new AttioApiError(
        `Resource not found: ${path}`, 
        status, 
        detail, 
        path, 
        method, 
        responseData
      );
    
    case 429:
      return new AttioApiError(
        'Rate limit exceeded. Please try again later.', 
        status, 
        detail, 
        path, 
        method, 
        responseData
      );
      
    case 500:
    case 502:
    case 503:
    case 504:
      return new AttioApiError(
        `Attio API server error (${status}): ${defaultMessage}`, 
        status, 
        detail, 
        path, 
        method, 
        responseData
      );
      
    default:
      return new AttioApiError(
        `API Error (${status}): ${defaultMessage}`, 
        status, 
        detail, 
        path, 
        method, 
        responseData
      );
  }
}

/**
 * Creates a detailed error response for API errors, suitable for returning to MCP clients
 * 
 * @param error - The caught error
 * @param url - The API URL that was called
 * @param method - The HTTP method used
 * @param responseData - Any response data received
 * @returns Formatted error result
 */
export function createErrorResult(error: Error, url: string, method: string, responseData: AttioErrorResponse = {}) {
  // If it's already an AttioApiError, use it directly
  if (error instanceof AttioApiError) {
    return formatErrorResponse(error);
  }
  
  // For Axios errors with response data
  if (responseData && responseData.status) {
    // Create a specific API error
    const apiError = createApiError(
      responseData.status, 
      url, 
      method, 
      responseData
    );
    return formatErrorResponse(apiError as AttioApiError);
  }
  
  // For other errors
  return {
    content: [
      {
        type: "text",
        text: `ERROR: ${error.message}\n\n` +
          `=== Request Details ===\n` +
          `- Method: ${method}\n` +
          `- URL: ${url}\n\n` +
          `=== Response Details ===\n` +
          `- Status: ${responseData.status || 'Unknown'}\n` +
          `- Headers: ${JSON.stringify(responseData.headers || {}, null, 2)}\n` +
          `- Data: ${JSON.stringify(responseData.data || {}, null, 2)}\n`
      },
    ],
    isError: true,
    error: {
      code: responseData.status || 500,
      message: error.message,
      details: responseData.error || "Unknown error occurred"
    }
  };
}

/**
 * Format an AttioApiError into a standardized error response for MCP
 * 
 * @param error - The API error to format
 * @returns Formatted error response
 */
function formatErrorResponse(error: AttioApiError) {
  return {
    content: [
      {
        type: "text",
        text: `ERROR: ${error.message}\n\n` +
          `=== Request Details ===\n` +
          `- Method: ${error.method}\n` +
          `- URL: ${error.path}\n\n` +
          `=== Response Details ===\n` +
          `- Status: ${error.status}\n` +
          `- Detail: ${error.detail}\n` +
          `- Data: ${JSON.stringify(error.responseData || {}, null, 2)}\n`
      },
    ],
    isError: true,
    error: {
      code: error.status,
      message: error.message,
      details: error.detail
    }
  };
}
