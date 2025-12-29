/**
 * Error Enhancer Strategy Pattern Types
 * Issue #1001 - Refactoring crud-error-handlers.ts
 */

import type { ValidationMetadata } from '@/handlers/tool-configs/universal/core/utils.js';

/**
 * Context passed to error enhancers
 */
export interface CrudErrorContext {
  operation: 'create' | 'update' | 'delete' | 'search';
  resourceType: string;
  recordData?: Record<string, unknown>;
  recordId?: string;
  validationMetadata?: ValidationMetadata;
}

/**
 * Strategy interface for error enhancement
 * Each enhancer implements pattern matching and message enhancement
 */
export interface ErrorEnhancer {
  /** Unique name for the enhancer */
  name: string;

  /** Check if this enhancer can handle the error */
  matches: (error: unknown, context: CrudErrorContext) => boolean;

  /** Enhance the error message with context-specific details */
  enhance: (
    error: unknown,
    context: CrudErrorContext
  ) => Promise<string | null>;

  /** Error name to use when throwing the enhanced error */
  errorName: string;
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

export type { ValidationMetadata };
