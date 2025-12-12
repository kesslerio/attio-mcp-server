/**
 * CRUD-Specific Error Handlers
 *
 * Replaces the generic error delegation pattern with operation-specific
 * error handling to improve error boundaries and provide more precise
 * error messages for different CRUD operations.
 */

// import { ErrorService } from '../../../../services/ErrorService.js'; // Not used yet
import { findSimilarStrings } from '@/utils/string-similarity.js';

import type { ValidationMetadata } from './utils.js';
import { UniversalResourceType } from '../types.js';
import { createScopedLogger } from '../../../../utils/logger.js';
import { getSingularResourceType } from '../shared-handlers.js';
import { sanitizedLog } from './pii-sanitizer.js';


/**
 * Enhance error messages for attribute-not-found errors
 * Detects "Cannot find attribute with slug/ID" errors and provides suggestions
 * Uses centralized attribute resolution utilities
 *
 * @param error - The original error
 * @param resourceType - The resource type (companies, people, etc.)
 * @returns Enhanced error message with suggestions, or null if not an attribute-not-found error
 */
  error: unknown,
  resourceType: string
): Promise<string | null> => {

  // Pattern: "Cannot find attribute with slug/ID "X"."
  if (!attrMatch) return null;


  try {
    // Fetch valid attributes and find similar ones
    const { handleUniversalDiscoverAttributes } = await import(
      '../shared-handlers.js'
    );
      resourceType as UniversalResourceType
    );
      []) as AttributeSchema[];
      .flatMap((a) => [a.name, a.title, a.api_slug])
      .filter(Boolean) as string[];

    // Find similar attribute names using centralized utility
      maxResults: 3,
    });

    return formatAttributeNotFoundError(invalidAttr, resourceType, suggestions);
  } catch {
    return (
      `Attribute "${invalidAttr}" does not exist on ${resourceType}.\n\n` +
      formatNextStepHint(resourceType)
    );
  }
};

/**
 * Extract Attio API validation errors from error response
 * HOTFIX: Improve error messaging for relationship field failures
 */
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
      if (data && typeof data === 'object' && 'validation_errors' in data) {
          .validation_errors;
        if (Array.isArray(validationErrors) && validationErrors.length > 0) {
          return validationErrors
            .map((err: Record<string, unknown>) => {
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
  try {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'data' in error.response
    ) {
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
  error: unknown,
  resourceType: string,
  recordData: Record<string, unknown>
): Promise<string | null> => {

  // Attempt to extract validation_errors array for better detail on select fields
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response
  ) {
    if (data && typeof data === 'object' && 'validation_errors' in data) {
        .validation_errors;
      if (Array.isArray(validationErrors)) {
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
              .slice(0, 8)
              .map((o) => o.title)
              .join(', ');
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
    /Cannot find (?:select option|Status) with title "(.+?)"/
  );
  if (!selectMatch) return null;


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
          .slice(0, 8)
          .map((o) => o.title)
          .join(', ');
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
  error: unknown,
  recordData?: Record<string, unknown>
): string | null => {
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

    '{ "phone_number": "+15551234567", "country_code": "US" }';


    (error as { response?: { data?: { validation_errors?: unknown } } })
      ?.response?.data?.validation_errors ?? null;


    ? (validationErrors as unknown[])
    : null;

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
  error: unknown,
  recordData?: Record<string, unknown>
): string | null => {

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
    if (data && typeof data === 'object') {
      if ('message' in data) {
        fullErrorText +=
          ' ' + String((data as Record<string, unknown>).message);
      }
      if ('validation_errors' in data) {
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

  field.trim().toLowerCase();

  if (
    directKeys.includes('stage') ||
    directKeys.includes('deal stage') ||
    directKeys.includes('status')
  ) {
    return true;
  }

    recordData.values &&
    typeof recordData.values === 'object' &&
    recordData.values !== null
      ? (recordData.values as Record<string, unknown>)
      : null;

  if (!values) return false;

  return (
    valueKeys.includes('stage') ||
    valueKeys.includes('deal stage') ||
    valueKeys.includes('status')
  );
};

  recordData: Record<string, unknown>
): Promise<string | null> => {
  if (hasStageField(recordData)) return null;

  try {
    const { AttributeOptionsService } = await import(
      '../../../../services/metadata/index.js'
    );
    const { options } = await AttributeOptionsService.getOptions(
      'deals',
      'stage'
    );
      .slice(0, 5)
      .map((option) => `"${option.title}"`)
      .join(', ');
    return (
      `Required field "stage" is missing for deals.\n\n` +
      `Common stage values: ${preview}${hasMore}\n\n` +
      `For the full list, call: records_get_attribute_options(resource_type="deals", attribute="stage").`
    );
  } catch {
    return (
      `Required field "stage" is missing for deals.\n\n` +
      `Call records_get_attribute_options(resource_type="deals", attribute="stage") to retrieve valid stage values, then retry.`
    );
  }
};

/**
 * Issue #990: Configuration for unique field searchers per resource type
 * Maps resource types to their unique fields and search functions
 */
interface UniqueFieldSearcher {
  fields: string[];
  search: (
    value: string
  ) => Promise<Array<{ id?: { record_id?: string }; values?: unknown }>>;
}

/**
 * Issue #990: Searches for conflicting record when uniqueness constraint violation occurs
 * Returns enhanced error message with existing record ID and actionable options
 */
async function enhanceUniquenessErrorWithSearch(
  resourceType: string,
  recordData: Record<string, unknown>
): Promise<string | null> {
  const UNIQUE_FIELD_SEARCHERS: Record<string, UniqueFieldSearcher> = {
    companies: {
      fields: ['domains', 'domain'],
      search: async (value: string) => {
        const { searchCompaniesByDomain } = await import(
          '@/objects/companies/search.js'
        );
        return searchCompaniesByDomain(value);
      },
    },
    people: {
      fields: ['email_addresses', 'email', 'emails'],
      search: async (value: string) => {
        const { searchPeopleByEmail } = await import(
          '@/objects/people/search.js'
        );
        return searchPeopleByEmail(value);
      },
    },
  };

  if (!searcher) return null;

  // Find which unique field has a value in recordData
  for (const field of searcher.fields) {
    let searchValue = recordData[field];

    // Handle array format (e.g., domains: ["example.com"])
    if (Array.isArray(searchValue) && searchValue.length > 0) {
      searchValue = searchValue[0];
    }

    // Handle object format for emails (e.g., email_addresses: [{email_address: "..."}])
    if (
      searchValue &&
      typeof searchValue === 'object' &&
      !Array.isArray(searchValue)
    ) {
      searchValue = obj.email_address || obj.email || obj.value;
    }

    if (searchValue && typeof searchValue === 'string') {
      try {
        if (existing && existing.length > 0) {
          if (recordId) {
            return formatUniquenessErrorMessage(
              resourceType,
              field,
              searchValue,
              recordId
            );
          }
        }
      } catch (err) {
        // Search failed, log and continue to fallback
        sanitizedLog(logger, 'debug', 'Uniqueness search failed', {
          resourceType,
          field,
          error: String(err),
        });
      }
    }
  }

  return null;
}

/**
 * Issue #990: Formats actionable error message for uniqueness constraint violations
 */
function formatUniquenessErrorMessage(
  resourceType: string,
  field: string,
  value: string,
  recordId: string
): string {
    resourceType as UniversalResourceType
  );

  return (
    `Uniqueness conflict on "${field}": value "${value}" already exists on ${singular} record.\n\n` +
    `EXISTING RECORD ID: ${recordId}\n\n` +
    `OPTIONS:\n` +
    `1. Update existing: update-record(resource_type="${resourceType}", record_id="${recordId}", record_data={...})\n` +
    `2. View existing: records_get_details(resource_type="${resourceType}", record_id="${recordId}")\n` +
    `3. Use a different ${field} value`
  );
}

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
  if (error instanceof Error && error.message.includes('required field')) {
      resourceType as UniversalResourceType
    );
    let message = `Failed to create ${resourceName}: Missing required fields. Please check that all mandatory fields are provided.`;

    if (resourceType === UniversalResourceType.DEALS) {
      if (stageMessage) {
        message = `Failed to create ${resourceName}: ${stageMessage}`;
      }
    }

      context,
    });
    throw errorResult;
  }

  // Issue #990: Enhanced uniqueness constraint violation handling
  if (
    error instanceof Error &&
    (error.message.includes('duplicate') ||
      error.message.toLowerCase().includes('uniqueness constraint'))
  ) {
      resourceType as UniversalResourceType
    );

    // Try to find and identify the conflicting record
      resourceType,
      recordData
    );

      enhancedMessage
        ? `Failed to create ${resourceName}: ${enhancedMessage}`
        : `Failed to create ${resourceName}: A record with similar data already exists. Check unique fields like domains or email_addresses.`,
      'duplicate_error',
      { context }
    );
    throw errorResult;
  }

  // Check for attribute-not-found errors (must come before select/status check)
    error,
    resourceType
  );
  if (enhancedAttrError) {
      `Failed to create ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedAttrError}`,
      'attribute_not_found',
      { context }
    );
    throw errorResult;
  }

  // Check for complex type errors (location, phone, personal-name)
  if (complexTypeError) {
      `Failed to create ${getSingularResourceType(resourceType as UniversalResourceType)}: ${complexTypeError}`,
      'validation_error',
      { context }
    );
    throw errorResult;
  }

  // Check for select/status errors and enhance with valid options
    error,
    resourceType,
    recordData
  );
  if (enhancedSelectError) {
      `Failed to create ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedSelectError}`,
      'value_not_found',
      { context }
    );
    throw errorResult;
  }

  // Issue #997: Check for record-reference errors and enhance with format guidance
  if (enhancedRefError) {
      `Failed to create ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedRefError}`,
      'record_reference_error',
      { context }
    );
    throw errorResult;
  }

  // Fallback to general create error handling
    ? `${baseError}. Details: ${apiErrors}`
    : attioMessage
      ? `${baseError}. Details: ${attioMessage}`
      : baseError;
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
      resourceType as UniversalResourceType
    );
    let errorMessage = `Failed to update ${resourceName}: Validation failed.`;

    if (validationMetadata?.warnings?.length) {
      errorMessage += `\n\nValidation warnings:\n${validationMetadata.warnings.join('\n')}`;
    }

    if (validationMetadata?.suggestions?.length) {
      errorMessage += `\n\nSuggestions:\n${validationMetadata.suggestions.join('\n')}`;
    }

      context,
    });
    throw errorResult;
  }

  // Check for attribute-not-found errors (must come before select/status check)
    error,
    resourceType
  );
  if (enhancedAttrError) {
      `Failed to update ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedAttrError}`,
      'attribute_not_found',
      { context }
    );
    throw errorResult;
  }

  // Check for complex type errors (location, phone, personal-name)
  if (complexTypeError) {
      `Failed to update ${getSingularResourceType(resourceType as UniversalResourceType)}: ${complexTypeError}`,
      'validation_error',
      { context }
    );
    throw errorResult;
  }

  // Check for select/status errors and enhance with valid options
  // (Must come before "not found" check since select errors contain "not found")
    error,
    resourceType,
    recordData
  );
  if (enhancedSelectError) {
      `Failed to update ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedSelectError}`,
      'value_not_found',
      { context }
    );
    throw errorResult;
  }

  // Issue #997: Check for record-reference errors and enhance with format guidance
  if (enhancedRefError) {
      `Failed to update ${getSingularResourceType(resourceType as UniversalResourceType)}: ${enhancedRefError}`,
      'record_reference_error',
      { context }
    );
    throw errorResult;
  }

  // Handle record not found errors
  if (error instanceof Error && error.message.includes('not found')) {
      resourceType as UniversalResourceType
    );
      `Failed to update ${resourceName}: Record not found. Please verify the record ID: ${recordId}`,
      'not_found_error',
      { context }
    );
    throw errorResult;
  }

  // Fallback to general update error handling
    error instanceof Error ? error.message : String(error);
    ? `${baseErrorMessage}. Details: ${validationDetail}`
    : attioMessage
      ? `${baseErrorMessage}. Details: ${attioMessage}`
      : baseErrorMessage;
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
      resourceType as UniversalResourceType
    );
      `Failed to delete ${resourceName}: Record not found. The record may have already been deleted.`,
      'not_found_error',
      { context }
    );
    throw errorResult;
  }

  if (error instanceof Error && error.message.includes('referenced')) {
      resourceType as UniversalResourceType
    );
      `Failed to delete ${resourceName}: Record is referenced by other records and cannot be deleted.`,
      'reference_constraint_error',
      { context }
    );
    throw errorResult;
  }

  // Fallback to general delete error handling
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
      resourceType as UniversalResourceType
    );
      `Failed to search ${resourceName}s: Invalid search filters. Please check your search criteria.`,
      'invalid_filter_error',
      { context }
    );
    throw errorResult;
  }

  if (error instanceof Error && error.message.includes('timeout')) {
      resourceType as UniversalResourceType
    );
      `Search for ${resourceName}s timed out. Please try with more specific search criteria.`,
      'timeout_error',
      { context }
    );
    throw errorResult;
  }

  // Fallback to general search error handling
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
        error instanceof Error ? error.message : String(error);
        `Operation failed: ${errorMessage}`,
        'operation_error',
        { operation, resourceType, recordData }
      );
      throw errorResult;
  }
};
