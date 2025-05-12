/**
 * Error handling utilities for the prompts module
 */
import { ErrorType, formatErrorResponse } from '../utils/error-handler.js';

// Extend the error response type to allow string codes for Express
interface PromptErrorResponse {
  error: {
    code: string | number;
    message: string;
    type: ErrorType;
    details?: any;
  };
  content: Array<{ type: string; text: string }>;
  isError: boolean;
}

/**
 * Creates a standardized error response for prompt-related errors
 * 
 * @param error - The error object
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @returns Formatted error result
 */
export function createErrorResult(error: Error, message: string, statusCode: number): PromptErrorResponse {
  let errorType = ErrorType.UNKNOWN_ERROR;
  
  // Determine error type based on status code
  if (statusCode === 400) {
    errorType = ErrorType.VALIDATION_ERROR;
  } else if (statusCode === 401 || statusCode === 403) {
    errorType = ErrorType.AUTHENTICATION_ERROR;
  } else if (statusCode === 404) {
    errorType = ErrorType.NOT_FOUND_ERROR;
  } else if (statusCode === 429) {
    errorType = ErrorType.RATE_LIMIT_ERROR;
  } else if (statusCode >= 500) {
    errorType = ErrorType.SERVER_ERROR;
  }
  
  const errorDetails = {
    statusCode,
    message
  };
  
  // Get the base response from the utility function
  const baseResponse = formatErrorResponse(error, errorType, errorDetails);
  
  // Create a new response object with our extended type
  const response: PromptErrorResponse = {
    ...baseResponse,
    error: {
      ...baseResponse.error,
      code: String(statusCode) // Convert to string for Express
    }
  };
  
  return response;
}
