/**
 * Error Enhancer Strategy Pattern Types
 * Issue #1001 - Refactoring crud-error-handlers.ts
 */

import type { ValidationMetadata } from '../utils.js';

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

export type { ValidationMetadata };
