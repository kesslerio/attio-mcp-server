/**
 * Enhanced error response utilities for structured error handling
 *
 * This module provides structured error response formats that include:
 * - Human-readable error messages
 * - Machine-readable error codes
 * - Actionable suggestions
 * - Context information
 * - Links to documentation
 */

export interface EnhancedErrorResponse {
  error: string; // Human-readable error message
  error_code: string; // Machine-readable error code
  field?: string; // Field that caused the error
  suggestions?: string[]; // Actionable suggestions
  help_url?: string; // Link to documentation
  context?: Record<string, unknown>; // Additional context
}

/**
 * Error codes for different types of validation failures
 */
export enum ValidationErrorCode {
  FIELD_VALIDATION_ERROR = 'FIELD_VALIDATION_ERROR',
  INVALID_SELECT_OPTION = 'INVALID_SELECT_OPTION',
  INVALID_MULTI_SELECT_OPTION = 'INVALID_MULTI_SELECT_OPTION',
  READ_ONLY_FIELD_UPDATE = 'READ_ONLY_FIELD_UPDATE',
  UNKNOWN_FIELD = 'UNKNOWN_FIELD',
  FIELD_TYPE_MISMATCH = 'FIELD_TYPE_MISMATCH',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
}

/**
 * Create a field validation error response
 */
export function createFieldValidationError(
  fieldName: string,
  resourceType: string,
  issue: string,
  suggestions: string[] = []
): EnhancedErrorResponse {
  return {
    error: `Field validation failed for '${fieldName}' in ${resourceType}: ${issue}`,
    error_code: ValidationErrorCode.FIELD_VALIDATION_ERROR,
    field: fieldName,
    suggestions:
      suggestions.length > 0
        ? suggestions
        : [`Use get-attributes to see valid fields for ${resourceType}`],
    help_url: `https://docs.attio.com/api-reference/${resourceType}`,
    context: { resource_type: resourceType, field_name: fieldName },
  };
}

/**
 * Create a select option validation error response
 */
export function createSelectOptionError(
  fieldName: string,
  invalidValue: string,
  validOptions: string[]
): EnhancedErrorResponse {
  return {
    error: `Invalid value '${invalidValue}' for select field '${fieldName}'. Valid options are: [${validOptions
      .map((opt) => `'${opt}'`)
      .join(', ')}].`,
    error_code: ValidationErrorCode.INVALID_SELECT_OPTION,
    field: fieldName,
    suggestions: [
      `Choose one of: ${validOptions.slice(0, 3).join(', ')}${
        validOptions.length > 3 ? '...' : ''
      }`,
      'Use get-attributes to see all available options',
    ],
    context: {
      field_name: fieldName,
      provided_value: invalidValue,
      valid_options: validOptions,
    },
  };
}

/**
 * Create a multi-select option validation error response
 */
export function createMultiSelectOptionError(
  fieldName: string,
  invalidValues: string[],
  validOptions: string[]
): EnhancedErrorResponse {
  return {
    error: `Invalid values [${invalidValues
      .map((v) => `'${v}'`)
      .join(
        ', '
      )}] for multi-select field '${fieldName}'. Valid options are: [${validOptions
      .map((opt) => `'${opt}'`)
      .join(', ')}].`,
    error_code: ValidationErrorCode.INVALID_MULTI_SELECT_OPTION,
    field: fieldName,
    suggestions: [
      `Valid options include: ${validOptions.slice(0, 5).join(', ')}${
        validOptions.length > 5 ? '...' : ''
      }`,
      'Use get-attributes to see all available options',
    ],
    context: {
      field_name: fieldName,
      invalid_values: invalidValues,
      valid_options: validOptions,
    },
  };
}

/**
 * Create a read-only field error response
 */
export function createReadOnlyFieldError(
  fieldNames: string[],
  resourceType: string
): EnhancedErrorResponse {
  const plural = fieldNames.length > 1;
  const fieldList = fieldNames.map((field) => `'${field}'`).join(', ');

  return {
    error: `Cannot update read-only field${plural ? 's' : ''} ${fieldList}. ${
      plural ? 'These fields are' : 'This field is'
    } automatically managed by the system and cannot be modified.`,
    error_code: ValidationErrorCode.READ_ONLY_FIELD_UPDATE,
    field: fieldNames.length === 1 ? fieldNames[0] : undefined,
    suggestions: [
      `Remove ${
        plural ? 'these fields' : 'this field'
      } from your update request`,
      `Use get-attributes to see which fields are read-only for ${resourceType}`,
    ],
    help_url: `https://docs.attio.com/api-reference/${resourceType}`,
    context: {
      resource_type: resourceType,
      read_only_fields: fieldNames,
    },
  };
}

/**
 * Create an unknown field error response
 */
export function createUnknownFieldError(
  fieldName: string,
  resourceType: string,
  suggestions: string[] = []
): EnhancedErrorResponse {
  let errorMessage = `Unknown field '${fieldName}' for resource type '${resourceType}'.`;
  const actionableSuggestions = [];

  if (suggestions.length > 0) {
    errorMessage += ` Did you mean: ${suggestions
      .map((s) => `'${s}'`)
      .join(', ')}?`;
    actionableSuggestions.push(`Try using: ${suggestions[0]}`);
  }

  actionableSuggestions.push(
    `Use get-attributes to see all available fields for ${resourceType}`
  );

  return {
    error: errorMessage,
    error_code: ValidationErrorCode.UNKNOWN_FIELD,
    field: fieldName,
    suggestions: actionableSuggestions,
    help_url: `https://docs.attio.com/api-reference/${resourceType}`,
    context: {
      resource_type: resourceType,
      invalid_field: fieldName,
      suggested_fields: suggestions,
    },
  };
}

/**
 * Create a field type mismatch error response
 */
export function createFieldTypeMismatchError(
  fieldName: string,
  expectedType: string,
  actualType: string,
  resourceType: string
): EnhancedErrorResponse {
  return {
    error: `Field '${fieldName}' expects type '${expectedType}' but received '${actualType}'.`,
    error_code: ValidationErrorCode.FIELD_TYPE_MISMATCH,
    field: fieldName,
    suggestions: [
      `Convert the value to ${expectedType} format`,
      `Check the field definition using get-attributes`,
    ],
    help_url: `https://docs.attio.com/api-reference/${resourceType}`,
    context: {
      resource_type: resourceType,
      field_name: fieldName,
      expected_type: expectedType,
      actual_type: actualType,
    },
  };
}

/**
 * Create a required field missing error response
 */
export function createRequiredFieldError(
  fieldNames: string[],
  resourceType: string
): EnhancedErrorResponse {
  const plural = fieldNames.length > 1;
  const fieldList = fieldNames.map((field) => `'${field}'`).join(', ');

  return {
    error: `Required field${plural ? 's' : ''} ${fieldList} ${
      plural ? 'are' : 'is'
    } missing.`,
    error_code: ValidationErrorCode.REQUIRED_FIELD_MISSING,
    field: fieldNames.length === 1 ? fieldNames[0] : undefined,
    suggestions: [
      `Add ${
        plural ? 'these required fields' : 'this required field'
      } to your request`,
      `Use get-attributes to see all required fields for ${resourceType}`,
    ],
    help_url: `https://docs.attio.com/api-reference/${resourceType}`,
    context: {
      resource_type: resourceType,
      missing_fields: fieldNames,
    },
  };
}

/**
 * Format an enhanced error response for MCP client consumption
 */
export function formatEnhancedErrorResponse(
  errorResponse: EnhancedErrorResponse
): any {
  const formattedError = {
    content: [
      {
        type: 'text',
        text: errorResponse.error,
      },
    ],
    isError: true,
    error: {
      code: errorResponse.error_code,
      message: errorResponse.error,
      field: errorResponse.field,
      suggestions: errorResponse.suggestions,
      help_url: errorResponse.help_url,
      context: errorResponse.context,
    },
  };

  // Add suggestions to the text content if available
  if (errorResponse.suggestions && errorResponse.suggestions.length > 0) {
    formattedError.content[0].text += '\n\n💡 Suggestions:\n';
    formattedError.content[0].text += errorResponse.suggestions
      .map((s) => `  • ${s}`)
      .join('\n');
  }

  // Add help URL if available
  if (errorResponse.help_url) {
    formattedError.content[0].text += `\n\n📖 Documentation: ${errorResponse.help_url}`;
  }

  return formattedError;
}

/**
 * Create a simple error response (for backward compatibility)
 */
export function createErrorResponse(message: string): any {
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
    isError: true,
    error: {
      message: message,
    },
  };
}
