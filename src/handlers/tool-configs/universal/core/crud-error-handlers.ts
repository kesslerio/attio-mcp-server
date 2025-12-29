/**
 * CRUD-Specific Error Handlers
 *
 * Uses Strategy Pattern with error enhancers for operation-specific
 * error handling with precise error messages.
 *
 * Architecture:
 * - Error enhancers in ./error-enhancers/ handle specific patterns
 * - Handlers run enhancers in priority order via pipelines
 * - First matching enhancer wins (order matters)
 * - Fallback to generic error if no match
 *
 * Enhancer Pipelines:
 * - CREATE_ERROR_ENHANCERS: required-fields → uniqueness → attribute-not-found
 *   → complex-type → select-status → record-reference
 * - UPDATE_ERROR_ENHANCERS: attribute-not-found → complex-type → select-status
 *   → record-reference
 *
 * Benefits:
 * - 62% code reduction (1156 → 440 lines)
 * - Enhanced error messages with actionable guidance
 * - Maintainable: add new enhancers without touching core logic
 * - Testable: each enhancer can be tested in isolation
 *
 * @see ./error-enhancers/ for individual enhancer implementations
 * @see Issue #1001: Strategy Pattern refactoring
 * @see Issue #990: Uniqueness constraint violation handling
 * @see Issue #997: Record-reference format error handling
 */

// import { ErrorService } from '../../../../services/ErrorService.js'; // Not used yet
import { createScopedLogger } from '../../../../utils/logger.js';
import {
  CREATE_ERROR_ENHANCERS,
  UPDATE_ERROR_ENHANCERS,
  type CrudErrorContext,
} from './error-enhancers/index.js';
// Create a simple error result function
const createErrorResult = (
  message: string,
  name: string,
  details?: unknown
): Error => {
  const error = new Error(message);
  error.name = name;
  if (details) {
    (error as Error & { details?: unknown }).details = details;
  }
  return error;
};
import { getSingularResourceType } from '../shared-handlers.js';
import { UniversalResourceType } from '../types.js';
import type { ValidationMetadata } from './utils.js';
import { sanitizedLog } from './pii-sanitizer.js';

const logger = createScopedLogger('crud-error-handlers');

// Enhancer functions moved to error-enhancers/:
// - attribute-enhancer.ts: levenshteinDistance, findSimilarAttributes, enhanceAttributeNotFoundError
// - select-status-enhancer.ts: enhanceSelectStatusError
// - complex-type-enhancer.ts: enhanceComplexTypeError
// - record-reference-enhancer.ts: enhanceRecordReferenceError

/**
 * Extract Attio API validation errors from error response
 * HOTFIX: Improve error messaging for relationship field failures
 */
const extractAttioValidationErrors = (error: unknown): string | null => {
  try {
    // Check for axios-style error response
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'data' in error.response
    ) {
      const data = (error.response as Record<string, unknown>).data;
      if (data && typeof data === 'object' && 'validation_errors' in data) {
        const validationErrors = (data as Record<string, unknown>)
          .validation_errors;
        if (Array.isArray(validationErrors) && validationErrors.length > 0) {
          return validationErrors
            .map((err: Record<string, unknown>) => {
              const field = err.field || err.path;
              const base = err.message || String(err);
              return field ? `${field}: ${base}` : String(base);
            })
            .join('; ');
        }
      }
      // Also check for main error message
      if (data && typeof data === 'object' && 'message' in data) {
        return String((data as Record<string, unknown>).message);
      }
    }
  } catch {
    // If extraction fails, return null and fall back to generic error handling
  }
  return null;
};

/**
 * Extract top-level Attio message from axios-style errors
 */
const extractAttioMessage = (error: unknown): string | null => {
  try {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'data' in error.response
    ) {
      const data = (error.response as Record<string, unknown>).data;
      if (data && typeof data === 'object' && 'message' in data) {
        return String((data as Record<string, unknown>).message);
      }
    }
  } catch {
    // ignore
  }
  return null;
};

// Required fields enhancer functions moved to error-enhancers/required-fields-enhancer.ts
// Uniqueness enhancer functions moved to error-enhancers/uniqueness-enhancer.ts

/**
 * Handles errors specific to record creation operations
 */
export const handleCreateError = async (
  error: unknown,
  resourceType: string,
  recordData: Record<string, unknown>
): Promise<never> => {
  const context: CrudErrorContext = {
    operation: 'create',
    resourceType,
    recordData,
  };

  sanitizedLog(logger, 'error', 'Create operation failed', {
    resourceType,
    error: error instanceof Error ? error.message : String(error),
    hasRecordData: !!recordData,
    recordDataKeys: recordData ? Object.keys(recordData) : [],
    recordData, // This will be sanitized by sanitizedLog
  });

  // Run enhancer pipeline - order matters (specific errors before generic)
  for (const enhancer of CREATE_ERROR_ENHANCERS) {
    if (enhancer.matches(error, context)) {
      const enhancedMessage = await enhancer.enhance(error, context);
      if (enhancedMessage) {
        const resourceName = getSingularResourceType(
          resourceType as UniversalResourceType
        );
        throw createErrorResult(
          `Failed to create ${resourceName}: ${enhancedMessage}`,
          enhancer.errorName,
          { context }
        );
      }
    }
  }

  // Fallback to general create error handling
  const baseError = error instanceof Error ? error.message : String(error);
  const apiErrors = extractAttioValidationErrors(error);
  const attioMessage = extractAttioMessage(error);
  const errorMessage = apiErrors
    ? `${baseError}. Details: ${apiErrors}`
    : attioMessage
      ? `${baseError}. Details: ${attioMessage}`
      : baseError;
  const errorResult = createErrorResult(
    `Failed to create ${getSingularResourceType(resourceType as UniversalResourceType)}: ${errorMessage}`,
    'create_error',
    { context, original: error }
  );
  throw errorResult;
};

/**
 * Handles errors specific to record update operations with validation support
 */
export const handleUpdateError = async (
  error: unknown,
  resourceType: string,
  recordData: Record<string, unknown>,
  recordId?: string,
  validationMetadata?: ValidationMetadata
): Promise<never> => {
  const context: CrudErrorContext = {
    operation: 'update',
    resourceType,
    recordData,
    recordId,
    validationMetadata,
  };

  sanitizedLog(logger, 'error', 'Update operation failed', {
    resourceType,
    recordId,
    error: error instanceof Error ? error.message : String(error),
    hasValidationMetadata: !!validationMetadata,
    validationWarnings: validationMetadata?.warnings?.length || 0,
    recordData, // This will be sanitized by sanitizedLog
    validationMetadata, // This will be sanitized by sanitizedLog
  });

  // Handle validation-specific errors with enhanced context
  if (error instanceof Error && error.message.includes('validation')) {
    const resourceName = getSingularResourceType(
      resourceType as UniversalResourceType
    );
    let errorMessage = `Failed to update ${resourceName}: Validation failed.`;

    if (validationMetadata?.warnings?.length) {
      errorMessage += `\n\nValidation warnings:\n${validationMetadata.warnings.join('\n')}`;
    }

    if (validationMetadata?.suggestions?.length) {
      errorMessage += `\n\nSuggestions:\n${validationMetadata.suggestions.join('\n')}`;
    }

    const errorResult = createErrorResult(errorMessage, 'validation_error', {
      context,
    });
    throw errorResult;
  }

  // Run enhancer pipeline - order matters (specific errors before generic)
  for (const enhancer of UPDATE_ERROR_ENHANCERS) {
    if (enhancer.matches(error, context)) {
      const enhancedMessage = await enhancer.enhance(error, context);
      if (enhancedMessage) {
        const resourceName = getSingularResourceType(
          resourceType as UniversalResourceType
        );
        throw createErrorResult(
          `Failed to update ${resourceName}: ${enhancedMessage}`,
          enhancer.errorName,
          { context }
        );
      }
    }
  }

  // Handle record not found errors
  if (error instanceof Error && error.message.includes('not found')) {
    const resourceName = getSingularResourceType(
      resourceType as UniversalResourceType
    );
    const errorResult = createErrorResult(
      `Failed to update ${resourceName}: Record not found. Please verify the record ID: ${recordId}`,
      'not_found_error',
      { context }
    );
    throw errorResult;
  }

  // Fallback to general update error handling
  const baseErrorMessage =
    error instanceof Error ? error.message : String(error);
  const validationDetail = extractAttioValidationErrors(error);
  const attioMessage = extractAttioMessage(error);
  const errorMessage = validationDetail
    ? `${baseErrorMessage}. Details: ${validationDetail}`
    : attioMessage
      ? `${baseErrorMessage}. Details: ${attioMessage}`
      : baseErrorMessage;
  const errorResult = createErrorResult(
    `Failed to update ${getSingularResourceType(resourceType as UniversalResourceType)}: ${errorMessage}`,
    'update_error',
    { context, original: error }
  );
  throw errorResult;
};

/**
 * Handles errors specific to record deletion operations
 */
export const handleDeleteError = async (
  error: unknown,
  resourceType: string,
  recordId: string
): Promise<never> => {
  const context: CrudErrorContext = {
    operation: 'delete',
    resourceType,
    recordId,
  };

  sanitizedLog(logger, 'error', 'Delete operation failed', {
    resourceType,
    recordId,
    error: error instanceof Error ? error.message : String(error),
  });

  // Handle delete-specific error patterns
  if (error instanceof Error && error.message.includes('not found')) {
    const resourceName = getSingularResourceType(
      resourceType as UniversalResourceType
    );
    const errorResult = createErrorResult(
      `Failed to delete ${resourceName}: Record not found. The record may have already been deleted.`,
      'not_found_error',
      { context }
    );
    throw errorResult;
  }

  if (error instanceof Error && error.message.includes('referenced')) {
    const resourceName = getSingularResourceType(
      resourceType as UniversalResourceType
    );
    const errorResult = createErrorResult(
      `Failed to delete ${resourceName}: Record is referenced by other records and cannot be deleted.`,
      'reference_constraint_error',
      { context }
    );
    throw errorResult;
  }

  // Fallback to general delete error handling
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorResult = createErrorResult(
    `Failed to delete ${getSingularResourceType(resourceType as UniversalResourceType)}: ${errorMessage}`,
    'delete_error',
    { context, original: error }
  );
  throw errorResult;
};

/**
 * Handles errors specific to search operations
 */
export const handleSearchError = async (
  error: unknown,
  resourceType: string,
  searchParams?: Record<string, unknown>
): Promise<never> => {
  const context: CrudErrorContext = {
    operation: 'search',
    resourceType,
    recordData: searchParams,
  };

  sanitizedLog(logger, 'error', 'Search operation failed', {
    resourceType,
    error: error instanceof Error ? error.message : String(error),
    hasSearchParams: !!searchParams,
    searchParamKeys: searchParams ? Object.keys(searchParams) : [],
    searchParams, // This will be sanitized by sanitizedLog
  });

  // Handle search-specific error patterns
  if (error instanceof Error && error.message.includes('invalid filter')) {
    const resourceName = getSingularResourceType(
      resourceType as UniversalResourceType
    );
    const errorResult = createErrorResult(
      `Failed to search ${resourceName}s: Invalid search filters. Please check your search criteria.`,
      'invalid_filter_error',
      { context }
    );
    throw errorResult;
  }

  if (error instanceof Error && error.message.includes('timeout')) {
    const resourceName = getSingularResourceType(
      resourceType as UniversalResourceType
    );
    const errorResult = createErrorResult(
      `Search for ${resourceName}s timed out. Please try with more specific search criteria.`,
      'timeout_error',
      { context }
    );
    throw errorResult;
  }

  // Fallback to general search error handling
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorResult = createErrorResult(
    `Failed to search ${getSingularResourceType(resourceType as UniversalResourceType)}s: ${errorMessage}`,
    'search_error',
    { context, original: error }
  );
  throw errorResult;
};

/**
 * Legacy compatibility function - maintains existing API
 * @deprecated Use specific error handlers instead
 */
export const handleCoreOperationError = async (
  error: unknown,
  operation:
    | 'create'
    | 'update'
    | 'delete'
    | 'search'
    | 'get details'
    | 'delete record',
  resourceType: string,
  recordData?: Record<string, unknown>,
  recordId?: string,
  validationMetadata?: ValidationMetadata
): Promise<never> => {
  sanitizedLog(
    logger,
    'warn',
    'Using deprecated handleCoreOperationError - consider using specific handlers',
    {
      operation,
      resourceType,
    }
  );

  switch (operation) {
    case 'create':
      return handleCreateError(error, resourceType, recordData || {});
    case 'update':
      return handleUpdateError(
        error,
        resourceType,
        recordData || {},
        recordId,
        validationMetadata
      );
    case 'delete':
    case 'delete record':
      return handleDeleteError(error, resourceType, recordId || 'unknown');
    case 'search':
    case 'get details':
      return handleSearchError(error, resourceType, recordData);
    default: {
      // Fallback to general error handling
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorResult = createErrorResult(
        `Operation failed: ${errorMessage}`,
        'operation_error',
        { operation, resourceType, recordData }
      );
      throw errorResult;
    }
  }
};
