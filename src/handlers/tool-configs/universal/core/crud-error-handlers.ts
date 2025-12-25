/**
 * CRUD-Specific Error Handlers
 *
 * Replaces the generic error delegation pattern with operation-specific
 * error handling to improve error boundaries and provide more precise
 * error messages for different CRUD operations.
 */

// import { ErrorService } from '../../../../services/ErrorService.js'; // Not used yet
import { createScopedLogger } from '../../../../utils/logger.js';
import { requiredFieldsEnhancer } from './error-enhancers/required-fields-enhancer.js';
import { uniquenessEnhancer } from './error-enhancers/uniqueness-enhancer.js';
import { attributeNotFoundEnhancer } from './error-enhancers/attribute-enhancer.js';
import { selectStatusEnhancer } from './error-enhancers/select-status-enhancer.js';
import { complexTypeEnhancer } from './error-enhancers/complex-type-enhancer.js';
import { recordReferenceEnhancer } from './error-enhancers/record-reference-enhancer.js';
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

/**
 * Enhanced error context for CRUD operations
 */
interface CrudErrorContext {
  operation: 'create' | 'update' | 'delete' | 'search';
  resourceType: string;
  recordData?: Record<string, unknown>;
  recordId?: string;
  validationMetadata?: ValidationMetadata;
}

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

  // Handle creation-specific error patterns
  // Check for required field errors
  if (requiredFieldsEnhancer.matches(error, context)) {
    const enhancedMessage = await requiredFieldsEnhancer.enhance(
      error,
      context
    );
    if (enhancedMessage) {
      const resourceName = getSingularResourceType(
        resourceType as UniversalResourceType
      );
      throw createErrorResult(
        `Failed to create ${resourceName}: ${enhancedMessage}`,
        requiredFieldsEnhancer.errorName,
        { context }
      );
    }
  }

  // Check for uniqueness/duplicate errors (Issue #990)
  if (uniquenessEnhancer.matches(error, context)) {
    const enhancedMessage = await uniquenessEnhancer.enhance(error, context);
    if (enhancedMessage) {
      const resourceName = getSingularResourceType(
        resourceType as UniversalResourceType
      );
      throw createErrorResult(
        `Failed to create ${resourceName}: ${enhancedMessage}`,
        uniquenessEnhancer.errorName,
        { context }
      );
    }
  }

  // Check for attribute-not-found errors (must come before select/status check)
  if (attributeNotFoundEnhancer.matches(error, context)) {
    const enhancedMessage = await attributeNotFoundEnhancer.enhance(
      error,
      context
    );
    if (enhancedMessage) {
      throw createErrorResult(
        `Failed to create ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedMessage}`,
        attributeNotFoundEnhancer.errorName,
        { context }
      );
    }
  }

  // Check for complex type errors (location, phone, personal-name)
  if (complexTypeEnhancer.matches(error, context)) {
    const enhancedMessage = await complexTypeEnhancer.enhance(error, context);
    if (enhancedMessage) {
      throw createErrorResult(
        `Failed to create ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedMessage}`,
        complexTypeEnhancer.errorName,
        { context }
      );
    }
  }

  // Check for select/status errors and enhance with valid options
  if (selectStatusEnhancer.matches(error, context)) {
    const enhancedMessage = await selectStatusEnhancer.enhance(error, context);
    if (enhancedMessage) {
      throw createErrorResult(
        `Failed to create ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedMessage}`,
        selectStatusEnhancer.errorName,
        { context }
      );
    }
  }

  // Issue #997: Check for record-reference errors and enhance with format guidance
  if (recordReferenceEnhancer.matches(error, context)) {
    const enhancedMessage = await recordReferenceEnhancer.enhance(
      error,
      context
    );
    if (enhancedMessage) {
      throw createErrorResult(
        `Failed to create ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedMessage}`,
        recordReferenceEnhancer.errorName,
        { context }
      );
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

  // Check for attribute-not-found errors (must come before select/status check)
  if (attributeNotFoundEnhancer.matches(error, context)) {
    const enhancedMessage = await attributeNotFoundEnhancer.enhance(
      error,
      context
    );
    if (enhancedMessage) {
      throw createErrorResult(
        `Failed to update ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedMessage}`,
        attributeNotFoundEnhancer.errorName,
        { context }
      );
    }
  }

  // Check for complex type errors (location, phone, personal-name)
  if (complexTypeEnhancer.matches(error, context)) {
    const enhancedMessage = await complexTypeEnhancer.enhance(error, context);
    if (enhancedMessage) {
      throw createErrorResult(
        `Failed to update ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedMessage}`,
        complexTypeEnhancer.errorName,
        { context }
      );
    }
  }

  // Check for select/status errors and enhance with valid options
  // (Must come before "not found" check since select errors contain "not found")
  if (selectStatusEnhancer.matches(error, context)) {
    const enhancedMessage = await selectStatusEnhancer.enhance(error, context);
    if (enhancedMessage) {
      throw createErrorResult(
        `Failed to update ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedMessage}`,
        selectStatusEnhancer.errorName,
        { context }
      );
    }
  }

  // Issue #997: Check for record-reference errors and enhance with format guidance
  if (recordReferenceEnhancer.matches(error, context)) {
    const enhancedMessage = await recordReferenceEnhancer.enhance(
      error,
      context
    );
    if (enhancedMessage) {
      throw createErrorResult(
        `Failed to update ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedMessage}`,
        recordReferenceEnhancer.errorName,
        { context }
      );
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
    default:
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
};
