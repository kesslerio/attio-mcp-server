/**
 * Error handling utilities for the prompts module
 */
import { ErrorType, formatErrorResponse } from '../utils/error-handler.js';

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

    statusCode,
    message,
  };

  // Get the base response from the utility function

  // Create a new response object with our extended type
  const response: PromptErrorResponse = {
    ...baseResponse,
    error: {
      ...baseResponse.error,
      code: String(statusCode), // Convert to string for Express
    },
  };

  return response;
}
