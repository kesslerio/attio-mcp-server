/**
 * Error Enhancer Strategy Pattern Types
 * Issue #1001 - Refactoring crud-error-handlers.ts
 */

import type { ValidationMetadata } from '@/handlers/tool-configs/universal/core/utils.js';

/**
 * Context passed to error enhancers
 */
export interface CrudErrorContext {
  readonly operation: 'create' | 'update' | 'delete' | 'search';
  readonly resourceType: string;
  readonly recordData?: Readonly<Record<string, unknown>>;
  readonly recordId?: string;
  readonly validationMetadata?: Readonly<ValidationMetadata>;
}

/**
 * Strategy interface for error enhancement
 * Each enhancer implements pattern matching and message enhancement
 */
export interface ErrorEnhancer {
  /** Unique name for the enhancer */
  readonly name: string;

  /** Check if this enhancer can handle the error */
  readonly matches: (error: unknown, context: CrudErrorContext) => boolean;

  /** Enhance the error message with context-specific details */
  readonly enhance: (
    error: unknown,
    context: CrudErrorContext
  ) => Promise<string | null>;

  /** Error name to use when throwing the enhanced error */
  readonly errorName: string;
}

/**
 * Extract error message from Error instances, axios-style errors, or test mocks
 *
 * Handles three cases:
 * 1. Real Error instances: returns error.message
 * 2. Error-like objects (axios/mocks): extracts message property
 * 3. Primitive values: converts to string
 *
 * This helper was added to fix test compatibility issues where test mocks
 * aren't true Error instances but have message properties. It provides a
 * consistent way to extract error messages across production code and tests.
 *
 * @param error - Any error value (Error, axios error object, string, etc.)
 * @returns Error message as string (never null/undefined)
 *
 * @example
 * getErrorMessage(new Error("test")) // "test"
 * getErrorMessage({ message: "axios error" }) // "axios error"
 * getErrorMessage("string error") // "string error"
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as Record<string, unknown>).message);
  }
  return String(error);
};

/**
 * Axios-style error response structure
 * Used for type-safe extraction of validation errors from Attio API responses
 */
export interface AxiosErrorResponse {
  data?: {
    message?: string;
    validation_errors?: Array<{
      field?: string;
      path?: string;
      message?: string;
    }>;
  };
}

/**
 * Axios error with response
 * Allows type-safe access to error.response.data.validation_errors
 */
export interface AxiosError extends Error {
  response?: AxiosErrorResponse;
}

/**
 * Type guard to check if error is an Axios error
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object'
  );
}

export type { ValidationMetadata };
