/**
 * ErrorService - Centralized error handling and suggestion utilities
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal error creation and contextual suggestions for better user experience.
 */

import {
  UniversalValidationError,
  ErrorType,
} from '../handlers/tool-configs/universal/schemas.js';
import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';
import {
  validateResourceType,
  getFieldSuggestions,
} from '../handlers/tool-configs/universal/field-mapper.js';
import type {
  AxiosErrorLike,
  ValidationErrorContext,
} from '../types/service-types.js';

/**
 * ErrorService provides centralized error handling and suggestion functionality
 */
export class ErrorService {
  /**
   * Enhanced error handling utility for universal operations
   *
   * @param operation - The operation being performed (e.g., 'create', 'update', 'search')
   * @param resourceType - Type of resource (e.g., 'companies', 'people', 'tasks')
   * @param originalError - The original error that occurred
   * @returns Enhanced error with contextual suggestions
   */
  static createUniversalError(
    operation: string,
    resourceType: string,
    originalError: unknown
  ): Error {
    // If it's already a UniversalValidationError or EnhancedApiError, pass it through
    if (
      originalError instanceof UniversalValidationError ||
      (originalError &&
        typeof originalError === 'object' &&
        (originalError.constructor.name === 'EnhancedApiError' ||
          (originalError as { name?: string }).name === 'EnhancedApiError'))
    ) {
      return originalError as Error;
    }

    // Safely extract the error message
    let errorMessage = 'Unknown error';
    if (originalError instanceof Error) {
      errorMessage = originalError.message;
    } else if (
      typeof originalError === 'object' &&
      originalError !== null &&
      'message' in originalError
    ) {
      errorMessage = String(originalError.message);
    } else if (typeof originalError === 'string') {
      errorMessage = originalError;
    }

    // Classify the error type based on the original error
    let errorType = ErrorType.SYSTEM_ERROR;
    const errorObj = originalError as Record<string, unknown>;
    const lowerErrorMessage = errorMessage.toLowerCase();

    if (
      lowerErrorMessage.includes('not found') ||
      lowerErrorMessage.includes('invalid') ||
      lowerErrorMessage.includes('required') ||
      (errorObj &&
        typeof errorObj.status === 'number' &&
        errorObj.status === 400)
    ) {
      errorType = ErrorType.USER_ERROR;
    } else if (
      (errorObj &&
        typeof errorObj.status === 'number' &&
        errorObj.status >= 500) ||
      lowerErrorMessage.includes('network') ||
      lowerErrorMessage.includes('timeout')
    ) {
      errorType = ErrorType.API_ERROR;
    }

    const message = `Universal ${operation} failed for resource type ${resourceType}: ${errorMessage}`;

    return new UniversalValidationError(message, errorType, {
      suggestion: this.getOperationSuggestion(
        operation,
        resourceType,
        originalError
      ),
      cause: originalError as Error,
    });
  }

  /**
   * Get helpful suggestions based on the operation and error
   *
   * @param operation - The operation being performed
   * @param resourceType - Type of resource
   * @param error - The error that occurred
   * @returns Contextual suggestion string or undefined
   */
  static getOperationSuggestion(
    operation: string,
    resourceType: string,
    error: unknown
  ): string | undefined {
    // Safely extract error message
    let errorMessage = '';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error
    ) {
      errorMessage = String(error.message);
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Use lowercase for pattern matching
    const lowerErrorMessage = errorMessage.toLowerCase();

    // First check if this is an invalid resource type
    const resourceValidation = validateResourceType(resourceType);
    if (!resourceValidation.valid && resourceValidation.suggestion) {
      return resourceValidation.suggestion;
    }

    // Date-related error suggestions (check daterange first to avoid conflict with general invalid date check)
    if (
      lowerErrorMessage.includes('date range') ||
      lowerErrorMessage.includes('daterange')
    ) {
      return 'Date ranges support formats like: "last 30 days", "this week", "last month", or ISO dates (2024-01-01)';
    }

    if (
      lowerErrorMessage.includes('unable to parse date') ||
      lowerErrorMessage.includes('invalid date')
    ) {
      return 'Try using relative dates like "last 7 days", "this month", "yesterday" or ISO format (YYYY-MM-DD)';
    }

    // API limitation suggestions
    if (
      lowerErrorMessage.includes('filter') &&
      lowerErrorMessage.includes('not supported')
    ) {
      return 'This filter combination is not supported by the Attio API. Try using a simpler filter or fetching all records and filtering locally.';
    }

    if (
      lowerErrorMessage.includes('batch') &&
      lowerErrorMessage.includes('limit')
    ) {
      return 'Batch operations are limited to 100 items at a time. Please split your request into smaller batches.';
    }

    if (lowerErrorMessage.includes('rate limit')) {
      return 'API rate limit reached. Please wait a moment before retrying or reduce the frequency of requests.';
    }

    // Phone number field format errors (Issue #798)
    if (
      lowerErrorMessage.includes('phone') &&
      (lowerErrorMessage.includes('unrecognized key') ||
        lowerErrorMessage.includes('phone_number') ||
        lowerErrorMessage.includes('original_phone_number'))
    ) {
      return 'Phone numbers must use the key "original_phone_number", not "phone_number". Example: [{"original_phone_number": "+1-555-0100"}]. The system will auto-format to E.164 standard (+country code).';
    }

    // Deal-specific suggestions
    if (resourceType === 'deals') {
      return this.getDealSpecificSuggestion(lowerErrorMessage);
    }

    // Handle "Cannot find attribute" errors with field suggestions
    if (lowerErrorMessage.includes('cannot find attribute')) {
      const errorMessageForMatch =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as Record<string, unknown>).message)
            : '';
      const match = errorMessageForMatch.match(
        /cannot find attribute with slug\/id["\s]*([^"]*)/i
      );
      if (match && match[1]) {
        const fieldName = match[1].replace(/["]/g, '').trim();
        // Try to get field suggestions for the resource type
        if (
          Object.values(UniversalResourceType).includes(
            resourceType as UniversalResourceType
          )
        ) {
          const suggestion = getFieldSuggestions(
            resourceType as UniversalResourceType,
            fieldName
          );
          if (suggestion) {
            // If suggestion indicates unable to provide suggestions, enhance with discover-attributes guidance
            if (suggestion.includes('Unable to provide suggestions')) {
              return `Try the discover-attributes tool to list available fields for ${resourceType}. ${suggestion}`;
            }
            return suggestion;
          }
        }
      }
    }

    // General suggestions
    if (lowerErrorMessage.includes('not found')) {
      return `Verify that the ${resourceType} record exists and you have access to it`;
    }

    if (
      lowerErrorMessage.includes('unauthorized') ||
      lowerErrorMessage.includes('forbidden')
    ) {
      return 'Check your API permissions and authentication credentials';
    }

    if (lowerErrorMessage.includes('rate limit')) {
      return 'Wait a moment before retrying - you may be making requests too quickly';
    }

    if (operation === 'create' && lowerErrorMessage.includes('duplicate')) {
      return `A ${resourceType} record with these details may already exist. Try searching first`;
    }

    if (lowerErrorMessage.includes('uniqueness constraint')) {
      return 'A record with these unique values already exists. Try searching for the existing record or use different values.';
    }

    // Check for remaining "cannot find attribute" errors not caught above
    if (lowerErrorMessage.includes('cannot find attribute')) {
      const attrMatch = lowerErrorMessage.match(
        /cannot find attribute with slug\/id["\s]*([^"]*)/
      );
      if (attrMatch && attrMatch[1]) {
        // Provide resource-specific field suggestions
        if (resourceType === 'deals') {
          return `Unknown field "${attrMatch[1]}". Available deal fields: name, stage, value, owner, associated_company, associated_people. Use discover-attributes for full list`;
        }
        return `Unknown field "${attrMatch[1]}". Use discover-attributes tool to see available fields for ${resourceType}`;
      }
    }

    return undefined;
  }

  /**
   * Get deal-specific error suggestions
   *
   * @param errorMessage - Lowercase error message
   * @returns Deal-specific suggestion or undefined
   */
  private static getDealSpecificSuggestion(
    errorMessage: string
  ): string | undefined {
    if (
      errorMessage.includes('cannot find attribute with slug/id "company_id"')
    ) {
      return 'Use "associated_company" instead of "company_id" for linking deals to companies';
    }

    if (errorMessage.includes('cannot find attribute with slug/id "company"')) {
      return 'Use "associated_company" instead of "company" for linking deals to companies';
    }

    if (errorMessage.includes('cannot find status')) {
      return 'Invalid deal stage. Check available stages with discover-attributes tool or use the default stage';
    }

    if (
      errorMessage.includes(
        'invalid value was passed to attribute with slug "value"'
      )
    ) {
      return 'Deal value should be a simple number (e.g., 9780). Attio automatically handles currency formatting.';
    }

    if (errorMessage.includes('deal_stage')) {
      return 'Use "stage" instead of "deal_stage" for deal status';
    }

    if (errorMessage.includes('deal_value')) {
      return 'Use "value" instead of "deal_value" for deal amount';
    }

    if (errorMessage.includes('deal_name')) {
      return 'Use "name" instead of "deal_name" for deal title';
    }

    if (errorMessage.includes('description')) {
      return 'Deals do not have a "description" field. Available fields: name, stage, value, owner, associated_company, associated_people';
    }

    if (
      errorMessage.includes('expected_close_date') ||
      errorMessage.includes('close_date')
    ) {
      return 'Deals do not have a built-in close date field. Consider using a custom field or tracking this separately';
    }

    if (
      errorMessage.includes('probability') ||
      errorMessage.includes('likelihood')
    ) {
      return 'Deals do not have a built-in probability field. Consider using custom fields or tracking probability in stage names';
    }

    if (
      errorMessage.includes('source') ||
      errorMessage.includes('lead_source')
    ) {
      return 'Deals do not have a built-in source field. Consider using custom fields to track deal sources';
    }

    if (
      errorMessage.includes('currency') &&
      !errorMessage.includes('currency_code')
    ) {
      return 'Currency is set automatically based on workspace settings. Just provide a numeric value for the deal amount';
    }

    if (
      errorMessage.includes('contact') ||
      errorMessage.includes('primary_contact')
    ) {
      return 'Use "associated_people" to link contacts/people to deals';
    }

    if (errorMessage.includes('notes') || errorMessage.includes('comments')) {
      return 'Deal notes should be created separately using the notes API after the deal is created';
    }

    if (errorMessage.includes('tags') || errorMessage.includes('labels')) {
      return 'Deals do not have a built-in tags field. Consider using custom fields or categories';
    }

    if (errorMessage.includes('type') || errorMessage.includes('deal_type')) {
      return 'Deal types are not built-in. Use stages or custom fields to categorize deals';
    }

    // Generic unknown field error
    if (errorMessage.includes('cannot find attribute')) {
      return 'Unknown deal field. Core fields: name, stage, value, owner, associated_company, associated_people. Use discover-attributes tool to see all available fields including custom ones';
    }

    return undefined;
  }

  /**
   * Map Axios/HTTP errors to appropriate Universal errors
   *
   * @param error - Axios error object
   * @returns Universal error object with proper classification
   */
  static fromAxios(error: AxiosErrorLike): {
    code: number;
    type:
      | 'not_found'
      | 'validation_error'
      | 'unauthorized'
      | 'forbidden'
      | 'conflict'
      | 'rate_limit'
      | 'server_error';
    name: string;
    message: string;
    details?: {
      validation_errors?: Array<{
        field?: string;
        path?: string;
        code?: string;
        message: string;
        fieldType?: string;
      }>;
    };
    suggestion?: string;
    attio?: {
      status_code?: number;
      correlation_id?: string;
    };
  } {
    const status = error?.response?.status || 500;

    // Extract validation message for 400/422 errors
    /**
     * Format multiple validation errors into a readable multi-line message
     */
    const formatValidationErrors = (
      validationErrors: Array<{
        field?: string;
        path?: string;
        code?: string;
        message: string;
        fieldType?: string;
      }> = []
    ): string => {
      if (!validationErrors.length) return '';

      const lines = validationErrors.slice(0, 10).map((v) => {
        const fieldName = v.field
          ? `Field "${v.field}"`
          : v.path
            ? `Path "${v.path}"`
            : 'Field';
        const fieldType = v.fieldType ? ` (type: ${v.fieldType})` : '';
        return `- ${fieldName}${fieldType}: ${v.message}`;
      });

      const suffix =
        validationErrors.length > 10
          ? `\n…and ${validationErrors.length - 10} more.`
          : '';

      return `Multiple validation errors:\n${lines.join('\n')}${suffix}`;
    };

    /**
     * Normalize validation errors from different response formats
     */
    const normalizeValidationErrors = (
      rawErrors: unknown[]
    ): Array<{
      field?: string;
      path?: string;
      code?: string;
      message: string;
      fieldType?: string;
    }> => {
      if (!Array.isArray(rawErrors)) return [];

      return rawErrors.map((v: unknown) => {
        const errorObj = v as {
          field?: string;
          attribute_slug?: string;
          path?: string | string[];
          code?: string;
          message?: string;
          error?: string;
          field_type?: string;
          expected_type?: string;
        };
        return {
          field: errorObj.field || errorObj.attribute_slug,
          path: Array.isArray(errorObj.path)
            ? errorObj.path.join('.')
            : errorObj.path,
          code: errorObj.code,
          message: String(
            errorObj.message || errorObj.error || 'Unknown error'
          ),
          fieldType: errorObj.field_type || errorObj.expected_type,
        };
      });
    };

    const extractValidationMessage = (
      err: ValidationErrorContext
    ): {
      message: string;
      validationErrors: Array<{
        field?: string;
        path?: string;
        code?: string;
        message: string;
        fieldType?: string;
      }>;
    } => {
      try {
        const rd = err?.response?.data as Record<string, unknown>;

        // Extract and normalize validation errors
        const validationErrors = normalizeValidationErrors(
          (rd?.validation_errors as unknown[]) || []
        );

        // Get server message
        const serverMessage =
          rd?.message ||
          rd?.detail ||
          (typeof rd?.error === 'string' ? rd.error : '');

        // Format multi-line validation errors
        const multiErrorMessage = formatValidationErrors(validationErrors);

        // Combine messages
        const combinedMessage =
          [serverMessage, multiErrorMessage]
            .filter(Boolean)
            .join(serverMessage && multiErrorMessage ? '\n' : '') ||
          'Invalid request';

        return {
          message: combinedMessage,
          validationErrors,
        };
      } catch {
        return {
          message: 'Invalid request',
          validationErrors: [],
        };
      }
    };

    // Extract Attio metadata
    const attioData = {
      status_code: error?.response?.status,
      correlation_id: (error?.response?.data as { correlation_id?: string })
        ?.correlation_id,
    };

    switch (status) {
      case 404:
        return {
          code: 404,
          type: 'not_found',
          name: 'UniversalNotFoundError',
          message: 'Record not found',
          attio: attioData,
        };

      case 400:
      case 422: {
        const { message, validationErrors } = extractValidationMessage(error);
        return {
          code: status,
          type: 'validation_error',
          name: 'UniversalValidationError',
          message,
          details:
            validationErrors.length > 0
              ? { validation_errors: validationErrors }
              : undefined,
          attio: attioData,
        };
      }

      case 401:
        return {
          code: 401,
          type: 'unauthorized',
          name: 'UniversalUnauthorizedError',
          message: 'Authentication required',
          attio: attioData,
        };

      case 403:
        return {
          code: 403,
          type: 'forbidden',
          name: 'UniversalForbiddenError',
          message: 'Access denied',
          attio: attioData,
        };

      case 409:
        return {
          code: 409,
          type: 'conflict',
          name: 'UniversalConflictError',
          message: 'Resource conflict',
          attio: attioData,
        };

      case 429:
        return {
          code: 429,
          type: 'rate_limit',
          name: 'UniversalRateLimitError',
          message: 'Rate limit exceeded',
          attio: attioData,
        };

      default:
        return {
          code: status,
          type: 'server_error',
          name: 'UniversalServerError',
          message: 'Internal server error',
          attio: attioData,
        };
    }
  }
}
