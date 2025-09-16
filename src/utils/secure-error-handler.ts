/**
 * Secure error handler for API operations
 *
 * This module provides centralized error handling with automatic sanitization
 * for all API operations to prevent information disclosure.
 */

import {
  sanitizeErrorMessage,
  createSanitizedError,
} from './error-sanitizer.js';
import { error as logError, OperationType } from './logger.js';
import {
  getErrorMessage,
  ensureError,
  getErrorStatus,
} from './error-utilities.js';

const DEFAULT_STATUS_CODE = 500;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const resolveStatusCode = (
  error: unknown,
  fallback: number | undefined = DEFAULT_STATUS_CODE
): number | undefined => {
  const statusFromUtilities = getErrorStatus(error);
  if (typeof statusFromUtilities === 'number') {
    return statusFromUtilities;
  }

  if (!isRecord(error)) {
    return fallback;
  }

  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  if ('status' in error && typeof error.status === 'number') {
    return error.status;
  }

  if (
    'response' in error &&
    isRecord(error.response) &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  ) {
    return error.response.status;
  }

  return fallback;
};

const mapStatusToErrorType = (statusCode: number): string => {
  if (statusCode === 400) return 'validation_error';
  if (statusCode === 401) return 'authentication_error';
  if (statusCode === 403) return 'authorization_error';
  if (statusCode === 404) return 'not_found';
  if (statusCode === 429) return 'rate_limit';
  if (statusCode >= 500) return 'server_error';
  return 'internal_error';
};

/**
 * Error context for enhanced error handling
 */
export interface ErrorContext {
  operation: string;
  module: string;
  resourceType?: string;
  recordId?: string;
  userId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

/**
 * Enhanced error class with context and sanitization
 */
export class SecureApiError extends Error {
  public readonly statusCode: number;
  public readonly errorType: string;
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  public readonly safeMetadata?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    errorType: string,
    context: ErrorContext,
    originalError?: Error
  ) {
    // Always use sanitized message
    const sanitized = sanitizeErrorMessage(message, {
      includeContext: true,
      module: context.module,
      operation: context.operation,
    });

    super(sanitized);
    this.name = 'SecureApiError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.context = context;
    this.originalError = originalError;

    // Extract safe metadata that can be exposed
    this.safeMetadata = {
      operation: context.operation,
      resourceType: context.resourceType,
      timestamp: new Date().toISOString(),
    };

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, SecureApiError.prototype);
  }

  /**
   * Get a safe JSON representation for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        message: this.message,
        type: this.errorType,
        statusCode: this.statusCode,
        metadata: this.safeMetadata,
      },
    };
  }
}

/**
 * Wrap an async function with secure error handling
 *
 * @param fn - The async function to wrap
 * @param context - Error context for logging and sanitization
 * @returns Wrapped function with automatic error sanitization
 */
export function withSecureErrorHandling<
  T extends (...args: unknown[]) => Promise<unknown>,
>(fn: T, context: ErrorContext): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error: unknown) {
      // Log the full error internally
      logError(
        context.module,
        `Operation failed: ${context.operation}`,
        error,
        context,
        context.operation,
        OperationType.API_CALL
      );

      // Determine status code
      const statusCode = resolveStatusCode(error) ?? DEFAULT_STATUS_CODE;
      const errorType = mapStatusToErrorType(statusCode);

      // Create secure error with sanitized message
      throw new SecureApiError(
        getErrorMessage(error, 'An unexpected error occurred'),
        statusCode,
        errorType,
        context,
        ensureError(error)
      );
    }
  }) as T;
}

/**
 * Create a secure error response for MCP tools
 */
export interface SecureErrorResponse {
  success: false;
  error: {
    message: string;
    type: string;
    statusCode?: number;
    suggestion?: string;
  };
}

/**
 * Create a standardized secure error response
 *
 * @param error - The error to convert
 * @param context - Additional context
 * @returns Secure error response
 */
export function createSecureErrorResponse(
  error: unknown,
  context?: Partial<ErrorContext>
): SecureErrorResponse {
  // If it's already a SecureApiError, use its safe data
  if (error instanceof SecureApiError) {
    return {
      success: false,
      error: {
        message: error.message,
        type: error.errorType,
        statusCode: error.statusCode,
      },
    };
  }

  // Otherwise, sanitize the error
  const sanitized = createSanitizedError(
    error,
    resolveStatusCode(error, undefined),
    {
      module: context?.module || 'unknown',
      operation: context?.operation || 'unknown',
      includeContext: true,
    }
  );

  return {
    success: false,
    error: {
      message: sanitized.message,
      type: sanitized.type,
      statusCode: sanitized.statusCode,
    },
  };
}

/**
 * Batch error handler for multiple operations
 */
export class BatchErrorHandler {
  private errors: Array<{ index: number; error: SecureApiError }> = [];
  private context: ErrorContext;

  constructor(context: ErrorContext) {
    this.context = context;
  }

  /**
   * Add an error for a specific batch item
   */
  addError(index: number, error: unknown): void {
    const fallbackMessage = getErrorMessage(error, 'Batch operation failed');
    const statusCode = resolveStatusCode(error) ?? DEFAULT_STATUS_CODE;
    const originalError = error instanceof Error ? error : undefined;

    const secureError =
      error instanceof SecureApiError
        ? error
        : new SecureApiError(
            fallbackMessage,
            statusCode,
            'batch_error',
            { ...this.context, batchIndex: index },
            originalError
          );

    this.errors.push({ index, error: secureError });
  }

  /**
   * Check if there are any errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get a summary of batch errors
   */
  getSummary(): { totalErrors: number; errorsByType: Record<string, number> } {
    const errorsByType: Record<string, number> = {};

    for (const { error } of this.errors) {
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
    }

    return {
      totalErrors: this.errors.length,
      errorsByType,
    };
  }

  /**
   * Get safe error details for response
   */
  getErrorDetails(): Array<{ index: number; error: string; type: string }> {
    return this.errors.map(({ index, error }) => ({
      index,
      error: error.message,
      type: error.errorType,
    }));
  }
}

/**
 * Retry handler with exponential backoff and error sanitization
 */
type ShouldRetryFn = (error: unknown) => boolean;

const defaultShouldRetry: ShouldRetryFn = (error) => {
  const statusCode = resolveStatusCode(error) ?? DEFAULT_STATUS_CODE;
  return statusCode >= 500 || statusCode === 429;
};

export async function retryWithSecureErrors<T>(
  fn: () => Promise<T>,
  context: ErrorContext,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: ShouldRetryFn;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = defaultShouldRetry,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Check if we should retry
      if (attempt < maxRetries && shouldRetry(error)) {
        // Log retry attempt (internally only)
        if (process.env.NODE_ENV === 'development') {
          console.error(
            `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`
          );
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Exponential backoff
        delay = Math.min(delay * 2, maxDelay);
      } else {
        // No more retries, throw secure error
        const message = getErrorMessage(
          lastError,
          'Operation failed after retries'
        );
        const statusCode = resolveStatusCode(lastError) ?? DEFAULT_STATUS_CODE;

        throw new SecureApiError(
          message,
          statusCode,
          'retry_exhausted',
          { ...context, attempts: attempt + 1 },
          lastError instanceof Error ? lastError : undefined
        );
      }
    }
  }

  // This should never be reached, but just in case
  throw new SecureApiError(
    getErrorMessage(lastError, 'Maximum retries exceeded'),
    resolveStatusCode(lastError) ?? DEFAULT_STATUS_CODE,
    'retry_exhausted',
    { ...context, attempts: maxRetries + 1 },
    lastError instanceof Error ? lastError : undefined
  );
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class SecureCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly context: ErrorContext,
    private readonly options: {
      failureThreshold?: number;
      resetTimeout?: number;
      halfOpenRequests?: number;
    } = {}
  ) {
    this.options.failureThreshold = options.failureThreshold || 5;
    this.options.resetTimeout = options.resetTimeout || 60000;
    this.options.halfOpenRequests = options.halfOpenRequests || 1;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;

      if (timeSinceLastFailure < this.options.resetTimeout!) {
        throw new SecureApiError(
          'Service temporarily unavailable. Please try again later.',
          503,
          'circuit_open',
          this.context
        );
      }

      // Try half-open state
      this.state = 'half-open';
    }

    try {
      const result = await fn();

      // Success - reset failures
      if (this.state === 'half-open') {
        this.state = 'closed';
      }
      this.failures = 0;

      return result;
    } catch (error: unknown) {
      this.failures++;
      this.lastFailureTime = Date.now();

      // Check if we should open the circuit
      if (this.failures >= this.options.failureThreshold!) {
        this.state = 'open';

        throw new SecureApiError(
          'Service experiencing issues. Circuit breaker activated.',
          503,
          'circuit_breaker_activated',
          { ...this.context, failures: this.failures },
          error instanceof Error ? error : undefined
        );
      }

      // Re-throw the error (sanitized)
      throw new SecureApiError(
        getErrorMessage(error, 'Operation failed'),
        resolveStatusCode(error) ?? DEFAULT_STATUS_CODE,
        'circuit_breaker_error',
        this.context,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get circuit breaker status
   */
  getStatus(): { state: string; failures: number; lastFailure?: Date } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime
        ? new Date(this.lastFailureTime)
        : undefined,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}

export default {
  SecureApiError,
  withSecureErrorHandling,
  createSecureErrorResponse,
  BatchErrorHandler,
  retryWithSecureErrors,
  SecureCircuitBreaker,
};
