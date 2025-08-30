/**
 * Secure error handler for API operations
 *
 * This module provides centralized error handling with automatic sanitization
 * for all API operations to prevent information disclosure.
 */

import { error as logError, OperationType } from './logger.js';

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
        (error as any)?.statusCode || (error as any)?.response?.status || 500;

      // Determine error type
      let errorType = 'internal_error';
      if (statusCode === 400) errorType = 'validation_error';
      else if (statusCode === 401) errorType = 'authentication_error';
      else if (statusCode === 403) errorType = 'authorization_error';
      else if (statusCode === 404) errorType = 'not_found';
      else if (statusCode === 429) errorType = 'rate_limit';
      else if (statusCode >= 500) errorType = 'server_error';

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
    module: context?.module || 'unknown',
    operation: context?.operation || 'unknown',
    includeContext: true,
  });

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
      error instanceof SecureApiError
        ? error
        : new SecureApiError(
            error.message || 'Batch operation failed',
            error?.statusCode || 500,
            'batch_error',
            { ...this.context, batchIndex: index },
            error instanceof Error ? error : undefined
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
export async function retryWithSecureErrors<T>(
  fn: () => Promise<T>,
  context: ErrorContext,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => {
      return statusCode >= 500 || statusCode === 429;
    },
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
        throw new SecureApiError(
          lastError.message || 'Operation failed after retries',
          lastError?.statusCode || 500,
          'retry_exhausted',
          { ...context, attempts: attempt + 1 },
          lastError instanceof Error ? lastError : undefined
        );
      }
    }
  }

  // This should never be reached, but just in case
  throw new SecureApiError(
    'Maximum retries exceeded',
    500,
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
        (error as Error).message || 'Operation failed',
        (error as any)?.statusCode || 500,
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
