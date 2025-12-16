/**
 * Error Enhancer Types
 *
 * Defines the interfaces and types for the error enhancer system.
 * Each enhancer implements the ErrorEnhancer interface to provide
 * pattern matching and error message enhancement.
 */

import type { ValidationMetadata } from '../utils.js';

/**
 * Error enhancer interface
 * Each enhancer checks if it can handle an error and enhances the message
 */
export interface ErrorEnhancer {
  /** Human-readable name for debugging/logging */
  name: string;

  /** Check if this enhancer can handle the error */
  matches: (error: unknown, context: CrudErrorContext) => boolean;

  /** Enhance the error message */
  enhance: (
    error: unknown,
    context: CrudErrorContext
  ) => Promise<string | null>;

  /** Error name for the thrown error */
  errorName: string;
}
