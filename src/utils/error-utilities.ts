/**
 * Common error handling utility functions to reduce code duplication
 * These utilities provide consistent error handling patterns across the codebase
 */

import axios, { AxiosError } from 'axios';
import {
  createErrorResult,
  AttioApiError
} from './error-handler.js';

/**
 * Safely gets the error message from an unknown error type
 *
 * @param error - The error of unknown type
 * @param fallbackMessage - Optional fallback message if error cannot be converted to string
 * @returns A string error message
 *
 * @example
 * try {
 *   // some operation
 * } catch (error: unknown) {
 *   const message = getErrorMessage(error);
 *   console.error('Operation failed:', message);
 * }
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage = 'An unknown error occurred'
): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return fallbackMessage;
}

/**
 * Wraps an error with additional context
 *
 * @param error - The original error
 * @param context - Additional context to add to the error message
 * @returns A new Error with the enhanced message
 *
 * @example
 * try {
 *   // some operation
 * } catch (error: unknown) {
 *   throw wrapError(error, 'Failed to fetch user data');
 * }
 */
export function wrapError(error: unknown, context: string): Error {
  const originalMessage = getErrorMessage(error);
  return new Error(`${context}: ${originalMessage}`);
}

/**
 * Handles an error by wrapping it with context and optionally logging it
 *
 * @param error - The error to handle
 * @param context - Context message for the error
 * @param options - Optional configuration
 * @returns The wrapped error
 *
 * @example
 * try {
 *   // some operation
 * } catch (error: unknown) {
 *   throw handleError(error, 'Failed to process company data', { log: true });
 * }
 */
export function handleError(
  error: unknown,
  context: string,
  options?: {
    log?: boolean;
    logLevel?: 'error' | 'warn' | 'debug';
    includeStack?: boolean;
  }
): Error {
  const wrappedError = wrapError(error, context);

  if (options?.log) {
    const logLevel = options.logLevel || 'error';
    const logMessage =
      options.includeStack && error instanceof Error && error.stack
        ? `${wrappedError.message}\nStack: ${error.stack}`
        : wrappedError.message;

    console[logLevel](logMessage);
  }

  return wrappedError;
}

/**
 * Type guard to check if an error is an Axios error
 *
 * @param error - The error to check
 * @returns True if the error is an AxiosError
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

/**
 * Handles Axios errors with consistent formatting
 *
 * @param error - The error to handle
 * @param operation - Description of the operation that failed
 * @returns A formatted error with Axios response details
 *
 * @example
 * try {
 *   const response = await axios.get(url);
 * } catch (error: unknown) {
 *   throw handleAxiosError(error, 'fetch company attributes');
 * }
 */
export function handleAxiosError(error: unknown, operation: string): Error {
  if (!isAxiosError(error)) {
    return handleError(error, `Failed to ${operation}`);
  }

  if (error.response) {
    const { status, statusText, data } = error.response;
    const errorDetails =
      typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);

    return new Error(
      `Failed to ${operation}: ${status} ${statusText}\n${errorDetails}`
    );
  }

  if (error.request) {
    return new Error(
      `Failed to ${operation}: No response received from server`
    );
  }

  return new Error(`Failed to ${operation}: ${error.message}`);
}

/**
 * Creates a standardized error result for API operations
 * This is a wrapper around createErrorResult with common defaults
 *
 * @param error - The error that occurred
 * @param operation - The operation that was being performed
 * @param resource - The resource type being operated on
 * @param additionalDetails - Additional details to include in the error
 * @returns Formatted error result for MCP response
 *
 * @example
 * try {
 *   // API operation
 * } catch (error: unknown) {
 *   return createStandardErrorResult(error, 'create', 'company', { companyId: '123' });
 * }
 */
export function createStandardErrorResult(
  error: unknown,
  operation: string,
  resource: string,
  additionalDetails?: Record<string, unknown>
) {
  const errorObj =
    error instanceof Error ? error : new Error(getErrorMessage(error));
  const url = String(additionalDetails?.url || `/${resource}/${operation}`);
  const method = String(additionalDetails?.method || 'POST');

  return createErrorResult(errorObj, url, method, {
    ...additionalDetails,
    operation,
    resource,
  });
}

/**
 * Logs an error with context and returns it
 * Useful for debugging while maintaining error flow
 *
 * @param error - The error to log
 * @param context - Context for the error
 * @param details - Additional details to log
 * @returns The original error (for chaining)
 *
 * @example
 * try {
 *   // some operation
 * } catch (error: unknown) {
 *   throw logAndReturn(error, 'CompanyService.create', { companyId });
 * }
 */
export function logAndReturn(
  error: unknown,
  context: string,
  details?: Record<string, unknown>
): unknown {
  const message = getErrorMessage(error);

  if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
    console.error(`[${context}] Error:`, message);
    if (details) {
      console.error(`[${context}] Details:`, details);
    }
    if (error instanceof Error && error.stack) {
      console.error(`[${context}] Stack:`, error.stack);
    }
  }

  return error;
}

/**
 * Ensures an error is an Error instance
 * Useful when you need to guarantee an Error object
 *
 * @param error - The error to normalize
 * @param fallbackMessage - Message to use if error cannot be converted
 * @returns An Error instance
 *
 * @example
 * try {
 *   // some operation
 * } catch (error: unknown) {
 *   const errorObj = ensureError(error);
 *   // Now errorObj is guaranteed to be an Error instance
 * }
 */
export function ensureError(
  error: unknown,
  fallbackMessage = 'An unknown error occurred'
): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(getErrorMessage(error, fallbackMessage));
}

/**
 * Safely executes an async operation with error handling
 *
 * @param operation - The async operation to execute
 * @param errorHandler - Function to handle errors
 * @returns The result of the operation or the error handler
 *
 * @example
 * const result = await safeAsync(
 *   () => fetchCompanyData(id),
 *   (error) => {
 *     console.error('Failed to fetch:', error);
 *     return defaultCompanyData;
 *   }
 * );
 */
export async function safeAsync<T, E = T>(
  operation: () => Promise<T>,
  errorHandler: (error: unknown) => E | Promise<E>
): Promise<T | E> {
  try {
    return await operation();
  } catch (error: unknown) {
    return errorHandler(error);
  }
}

/**
 * Type guard to check if an error is an AttioApiError
 *
 * @param error - The error to check
 * @returns True if the error is an AttioApiError
 */
export function isAttioApiError(error: unknown): error is AttioApiError {
  return error instanceof AttioApiError;
}

/**
 * Extracts status code from various error types
 *
 * @param error - The error to extract status from
 * @returns The HTTP status code or undefined
 *
 * @example
 * try {
 *   // API call
 * } catch (error: unknown) {
 *   const status = getErrorStatus(error);
 *   if (status === 404) {
 *     // Handle not found
 *   }
 * }
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (isAttioApiError(error)) {
    return error.status;
  }

  if (isAxiosError(error) && error.response) {
    return error.response.status;
  }

  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as Record<string, unknown>).status;
    return typeof status === 'number' ? status : undefined;
  }

  return undefined;
}

/**
 * Determines if an error is retryable based on its type and status
 *
 * @param error - The error to check
 * @returns True if the error is potentially retryable
 *
 * @example
 * try {
 *   // API call
 * } catch (error: unknown) {
 *   if (isRetryableError(error)) {
 *     // Implement retry logic
 *   }
 * }
 */
export function isRetryableError(error: unknown): boolean {
  const status = getErrorStatus(error);

  // Retryable HTTP status codes
  if (status) {
    return (
      status === 429 || // Rate limit
      status === 503 || // Service unavailable
      status === 504 || // Gateway timeout
      (status >= 500 && status < 600) // Server errors
    );
  }

  // Check for network errors
  if (isAxiosError(error)) {
    return !error.response && !!error.request; // Network error, no response
  }

  // Check for specific error messages
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  );
}
