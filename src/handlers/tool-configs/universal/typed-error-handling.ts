/**
 * Typed error handling utilities for improved type safety
 */

import { ErrorService } from '../../../services/ErrorService.js';

export interface TypedError {
  message: string;
  name?: string;
  stack?: string;
  code?: string | number;
}

export interface ValidationError extends TypedError {
  field?: string;
  value?: unknown;
}

export interface OperationError extends TypedError {
  operation: string;
  resourceType: string;
}

/**
 * Type-safe error message extraction
 */
export function getTypedErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const errorObj = error as { message: unknown };
    if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }

  return 'Unknown error occurred';
}

/**
 * Type-safe error conversion for better error handling
 */
export function convertToTypedError(error: unknown): TypedError {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
      name: 'StringError',
    };
  }

  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    return {
      message: getTypedErrorMessage(error),
      name: typeof errorObj.name === 'string' ? errorObj.name : 'ObjectError',
      stack: typeof errorObj.stack === 'string' ? errorObj.stack : undefined,
      code:
        typeof errorObj.code === 'string' || typeof errorObj.code === 'number'
          ? errorObj.code
          : undefined,
    };
  }

  return {
    message: 'Unknown error occurred',
    name: 'UnknownError',
  };
}

/**
 * Enhanced error wrapper with better type safety
 */
export function withTypedErrorHandling<T, P extends unknown[]>(
  operation: string,
  resourceType: string,
  handler: (...args: P) => Promise<T>
): (...args: P) => Promise<T> {
  return async (...args: P): Promise<T> => {
    try {
      return await handler(...args);
    } catch (error: unknown) {
      const typedError = convertToTypedError(error);
      const operationError: OperationError = {
        ...typedError,
        operation,
        resourceType,
      };

      throw ErrorService.createUniversalError(
        operation,
        resourceType,
        operationError
      );
    }
  };
}

/**
 * Create validation error with specific typing
 */
export function createValidationError(
  field: string,
  value: unknown,
  message: string
): ValidationError {
  return {
    message: `Validation failed for field '${field}': ${message}`,
    name: 'ValidationError',
    field,
    value,
  };
}

/**
 * Type guard for Error instances
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard for ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'field' in error &&
    typeof (error as Record<string, unknown>).field === 'string'
  );
}

/**
 * Type guard for OperationError
 */
export function isOperationError(error: unknown): error is OperationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'operation' in error &&
    'resourceType' in error &&
    typeof (error as Record<string, unknown>).operation === 'string' &&
    typeof (error as Record<string, unknown>).resourceType === 'string'
  );
}
