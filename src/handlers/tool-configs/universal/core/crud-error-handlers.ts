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

/**
 * Calculate Levenshtein distance between two strings
 * Used for suggesting similar attribute names
 */
const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[a.length][b.length];
};

/**
 * Find similar attribute names using Levenshtein distance
 */
const findSimilarAttributes = (
  target: string,
  candidates: string[],
  maxResults: number
): string[] => {
  const scored = candidates.map((c) => ({
    name: c,
    distance: levenshteinDistance(target.toLowerCase(), c.toLowerCase()),
  }));
  return scored
    .filter((s) => s.distance <= 3) // Max 3 edits
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults)
    .map((s) => s.name);
};

/**
 * Enhance error messages for attribute-not-found errors
 * Detects "Cannot find attribute with slug/ID" errors and provides suggestions
 *
 * @param error - The original error
 * @param resourceType - The resource type (companies, people, etc.)
 * @returns Enhanced error message with suggestions, or null if not an attribute-not-found error
 */
const enhanceAttributeNotFoundError = async (
  error: unknown,
  resourceType: string
): Promise<string | null> => {
  const msg = error instanceof Error ? error.message : String(error);

  // Pattern: "Cannot find attribute with slug/ID "X"."
  const attrMatch = msg.match(/Cannot find attribute with slug\/ID "(.+?)"/);
  if (!attrMatch) return null;

  const invalidAttr = attrMatch[1];

  try {
    // Fetch valid attributes and find similar ones
    const { handleUniversalDiscoverAttributes } = await import(
      '../shared-handlers.js'
    );
    const schema = await handleUniversalDiscoverAttributes(
      resourceType as UniversalResourceType
    );
    const allAttrs = ((schema as Record<string, unknown>).all || []) as Array<{
      name?: string;
      title?: string;
      api_slug?: string;
    }>;
    const attrNames = allAttrs
      .flatMap((a) => [a.name, a.title, a.api_slug])
      .filter(Boolean) as string[];

    // Find similar attribute names using Levenshtein distance
    const suggestions = findSimilarAttributes(invalidAttr, attrNames, 3);

    let message = `Attribute "${invalidAttr}" does not exist on ${resourceType}.\n\n`;

    if (suggestions.length > 0) {
      message += `Did you mean: ${suggestions.map((s) => `"${s}"`).join(', ')}?\n\n`;
    }

    message += `Next step: Call records_discover_attributes with\n`;
    message += `  resource_type: "${resourceType}"\n`;
    message += `to see all valid attributes.`;

    return message;
  } catch {
    return (
      `Attribute "${invalidAttr}" does not exist on ${resourceType}.\n\n` +
      `Next step: Use records_discover_attributes to see valid attributes.`
    );
  }
};

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
 * Enhance error messages for select/status attribute errors
 * Detects "Cannot find select option" or "Cannot find Status" errors
 * and provides valid options from AttributeOptionsService
 *
 * @param error - The original error
 * @param resourceType - The resource type (companies, deals, etc.)
 * @param recordData - The record data that was submitted
 * @returns Enhanced error message with valid options, or null if not a select/status error
 */
const enhanceSelectStatusError = async (
  error: unknown,
  resourceType: string,
  recordData: Record<string, unknown>
): Promise<string | null> => {
  const msg = error instanceof Error ? error.message : String(error);

  // Attempt to extract validation_errors array for better detail on select fields
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
      if (Array.isArray(validationErrors)) {
        const selectErr = validationErrors.find((ve) =>
          String(ve?.message || '').includes('select option')
        );
        if (selectErr?.field) {
          try {
            const { AttributeOptionsService } = await import(
              '../../../../services/metadata/index.js'
            );
            const { options, attributeType } =
              await AttributeOptionsService.getOptions(
                resourceType,
                selectErr.field as string
              );
            const validList = options
              .slice(0, 8)
              .map((o) => o.title)
              .join(', ');
            const hasMore =
              options.length > 8 ? ` (+${options.length - 8} more)` : '';
            return `Value is not valid for ${attributeType} attribute "${selectErr.field}" on ${resourceType}.
Expected one of: ${validList}${hasMore}

Next step: Call records_get_attribute_options with
  resource_type: "${resourceType}"
  attribute: "${selectErr.field}"
to list all valid values, then retry.`;
          } catch {
            return `Value is not valid for attribute "${selectErr.field}" on ${resourceType}.
Next step: Call records_get_attribute_options with
  resource_type: "${resourceType}"
  attribute: "${selectErr.field}"
to see valid options, then retry.`;
          }
        }
      }
    }
  }

  // Pattern: "Cannot find select option with title 'X'" or "Cannot find Status with title 'X'"
  const selectMatch = msg.match(
    /Cannot find (?:select option|Status) with title "(.+?)"/
  );
  if (!selectMatch) return null;

  const invalidValue = selectMatch[1];

  // Try to identify which field has the problem by checking record data
  for (const [fieldName, fieldValue] of Object.entries(recordData)) {
    if (
      fieldValue === invalidValue ||
      (Array.isArray(fieldValue) && fieldValue.includes(invalidValue))
    ) {
      try {
        // Dynamic import to avoid circular dependencies
        const { AttributeOptionsService } = await import(
          '../../../../services/metadata/index.js'
        );
        const { options, attributeType } =
          await AttributeOptionsService.getOptions(resourceType, fieldName);
        const validList = options
          .slice(0, 8)
          .map((o) => o.title)
          .join(', ');
        const hasMore =
          options.length > 8 ? ` (+${options.length - 8} more)` : '';
        return (
          `Value "${invalidValue}" is not valid for ${attributeType} attribute "${fieldName}" on ${resourceType}.\n\n` +
          `Valid options: ${validList}${hasMore}\n\n` +
          `Next step: Call records_get_attribute_options with\n` +
          `  resource_type: "${resourceType}"\n` +
          `  attribute: "${fieldName}"\n` +
          `to list all valid values, then retry.`
        );
      } catch {
        // Can't fetch options, return generic hint
        return (
          `Value "${invalidValue}" is not valid for attribute "${fieldName}" on ${resourceType}.\n\n` +
          `Next step: Call records_get_attribute_options with\n` +
          `  resource_type: "${resourceType}"\n` +
          `  attribute: "${fieldName}"\n` +
          `to see valid options, then retry.`
        );
      }
    }
  }

  // Couldn't match to a specific field, return generic hint
  return (
    `Value "${invalidValue}" is not valid for an attribute on ${resourceType}.\n\n` +
    `Next step: Use records_get_attribute_options to discover valid options for the attribute.`
  );
};

/**
 * Enhance complex type errors (location, personal-name, phone-number)
 */
const enhanceComplexTypeError = (
  error: unknown,
  recordData?: Record<string, unknown>
): string | null => {
  const locationExample =
    '{\n' +
    '  "line_1": "123 Main St",\n' +
    '  "locality": "City",\n' +
    '  "region": "State",\n' +
    '  "postcode": "12345",\n' +
    '  "country_code": "US",\n' +
    '  "latitude": null,\n' +
    '  "longitude": null,\n' +
    '  "line_2": null,\n' +
    '  "line_3": null,\n' +
    '  "line_4": null\n' +
    '}';

  const phoneExample =
    '{ "phone_number": "+15551234567", "country_code": "US" }';
  const nameExample = '{ "first_name": "Jane", "last_name": "Doe" }';

  const msg = error instanceof Error ? error.message : String(error);

  const validationErrors =
    (error as { response?: { data?: { validation_errors?: unknown } } })
      ?.response?.data?.validation_errors ?? null;

  const recordFields = recordData ? Object.keys(recordData) : [];

  const validationErrorsArray = Array.isArray(validationErrors)
    ? (validationErrors as unknown[])
    : null;

  const containsLocation =
    /location/i.test(msg) ||
    recordFields.some((f) => /location/i.test(f)) ||
    (validationErrorsArray &&
      validationErrorsArray.some((ve) =>
        /location/i.test(
          String(
            (ve as Record<string, unknown>)?.field ||
              (ve as Record<string, unknown>)?.path ||
              (ve as Record<string, unknown>)?.message ||
              ''
          )
        )
      ));

  if (containsLocation) {
    return (
      `Invalid location value. Expected an object with all required fields.\n\n` +
      `Expected structure:\n${locationExample}\n\n` +
      `Tip: Missing fields are auto-filled with null; pass an object, not a string.`
    );
  }

  const containsPhone =
    /phone/.test(msg) ||
    (validationErrorsArray &&
      validationErrorsArray.some((ve) =>
        /phone/.test(
          String(
            (ve as Record<string, unknown>)?.field ||
              (ve as Record<string, unknown>)?.path ||
              (ve as Record<string, unknown>)?.message ||
              ''
          )
        )
      ));

  if (containsPhone) {
    return (
      `Invalid phone-number value. Provide phone_number or original_phone_number strings.\n\n` +
      `Example: ${phoneExample}\n\n` +
      `Tip: Strings are normalized to E.164; keep label/type fields if needed.`
    );
  }

  const containsPersonalName =
    /personal-name/.test(msg) ||
    (validationErrorsArray &&
      validationErrorsArray.some((ve) =>
        /name/.test(
          String(
            (ve as Record<string, unknown>)?.field ||
              (ve as Record<string, unknown>)?.path ||
              (ve as Record<string, unknown>)?.message ||
              ''
          )
        )
      ));

  if (containsPersonalName) {
    return (
      `Invalid personal-name value. Provide first_name/last_name or full_name.\n\n` +
      `Example: ${nameExample}\n\n` +
      `Tip: Strings are parsed automatically; empty strings are rejected.`
    );
  }

  return null;
};

/**
 * Issue #997: Enhance error messages for record-reference attribute errors
 * Detects "Missing target_object on record reference value" and similar errors
 *
 * @param error - The original error
 * @param recordData - The record data that was submitted (optional)
 * @returns Enhanced error message with format guidance, or null if not a record-reference error
 */
const enhanceRecordReferenceError = (
  error: unknown,
  recordData?: Record<string, unknown>
): string | null => {
  const msg = error instanceof Error ? error.message : String(error);

  // Also check for validation_errors in axios response
  let fullErrorText = msg;
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response
  ) {
    const data = (error.response as Record<string, unknown>).data;
    if (data && typeof data === 'object') {
      if ('message' in data) {
        fullErrorText +=
          ' ' + String((data as Record<string, unknown>).message);
      }
      if ('validation_errors' in data) {
        const validationErrors = (data as Record<string, unknown>)
          .validation_errors;
        if (Array.isArray(validationErrors)) {
          fullErrorText +=
            ' ' +
            validationErrors
              .map((e: Record<string, unknown>) => String(e.message || e))
              .join(' ');
        }
      }
    }
  }

  // Pattern detection for record-reference errors
  const isRecordRefError =
    fullErrorText.includes('Missing target_object') ||
    fullErrorText.includes('record reference') ||
    fullErrorText.includes('target_record_id') ||
    (fullErrorText.includes('Invalid value was passed to attribute') &&
      (fullErrorText.includes('company') ||
        fullErrorText.includes('associated_people') ||
        fullErrorText.includes('associated_company') ||
        fullErrorText.includes('main_contact')));

  if (!isRecordRefError) return null;

  // Try to identify which field might be the issue
  const potentialRefFields = [
    'company',
    'associated_company',
    'associated_people',
    'main_contact',
    'person',
    'people',
  ];

  let affectedField: string | null = null;
  if (recordData) {
    for (const field of potentialRefFields) {
      if (field in recordData) {
        affectedField = field;
        break;
      }
    }
  }

  let message = `Record reference format error`;
  if (affectedField) {
    message += ` on field "${affectedField}"`;
  }
  message += `.\n\n`;

  message += `The Attio API expects record-reference fields in this format:\n`;
  message += `  [{ "target_object": "object_type", "target_record_id": "uuid" }]\n\n`;

  message += `Simplified formats (auto-transformed by this server):\n`;
  message += `  • String: "company": "record-uuid"\n`;
  message += `  • Legacy object: "company": {"record_id": "uuid"}\n\n`;

  message += `If you're seeing this error, the auto-transformation may have failed.\n`;
  message += `Ensure the record ID is valid and the field name is correct.`;

  return message;
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
  const enhancedAttrError = await enhanceAttributeNotFoundError(
    error,
    resourceType
  );
  if (enhancedAttrError) {
    const errorResult = createErrorResult(
      `Failed to create ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedAttrError}`,
      'attribute_not_found',
      { context }
    );
    throw errorResult;
  }

  // Check for complex type errors (location, phone, personal-name)
  const complexTypeError = enhanceComplexTypeError(error, recordData);
  if (complexTypeError) {
    const errorResult = createErrorResult(
      `Failed to create ${getSingularResourceType(resourceType as UniversalResourceType)}: ${complexTypeError}`,
      'validation_error',
      { context }
    );
    throw errorResult;
  }

  // Check for select/status errors and enhance with valid options
  const enhancedSelectError = await enhanceSelectStatusError(
    error,
    resourceType,
    recordData
  );
  if (enhancedSelectError) {
    const errorResult = createErrorResult(
      `Failed to create ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedSelectError}`,
      'value_not_found',
      { context }
    );
    throw errorResult;
  }

  // Issue #997: Check for record-reference errors and enhance with format guidance
  const enhancedRefError = enhanceRecordReferenceError(error, recordData);
  if (enhancedRefError) {
    const errorResult = createErrorResult(
      `Failed to create ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedRefError}`,
      'record_reference_error',
      { context }
    );
    throw errorResult;
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
  const enhancedAttrError = await enhanceAttributeNotFoundError(
    error,
    resourceType
  );
  if (enhancedAttrError) {
    const errorResult = createErrorResult(
      `Failed to update ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedAttrError}`,
      'attribute_not_found',
      { context }
    );
    throw errorResult;
  }

  // Check for complex type errors (location, phone, personal-name)
  const complexTypeError = enhanceComplexTypeError(error, recordData);
  if (complexTypeError) {
    const errorResult = createErrorResult(
      `Failed to update ${getSingularResourceType(resourceType as UniversalResourceType)}: ${complexTypeError}`,
      'validation_error',
      { context }
    );
    throw errorResult;
  }

  // Check for select/status errors and enhance with valid options
  // (Must come before "not found" check since select errors contain "not found")
  const enhancedSelectError = await enhanceSelectStatusError(
    error,
    resourceType,
    recordData
  );
  if (enhancedSelectError) {
    const errorResult = createErrorResult(
      `Failed to update ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedSelectError}`,
      'value_not_found',
      { context }
    );
    throw errorResult;
  }

  // Issue #997: Check for record-reference errors and enhance with format guidance
  const enhancedRefError = enhanceRecordReferenceError(error, recordData);
  if (enhancedRefError) {
    const errorResult = createErrorResult(
      `Failed to update ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedRefError}`,
      'record_reference_error',
      { context }
    );
    throw errorResult;
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
