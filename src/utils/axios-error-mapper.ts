/**
 * Axios Error Mapping Utilities
 *
 * Centralizes axios error handling to reduce duplication across core operations.
 * Provides consistent structured error responses for HTTP/MCP error mapping.
 */

import { ErrorService } from '../services/ErrorService.js';
import { getAttributeSchema, getSelectOptions } from '../api/attio-client.js';
import type { AxiosErrorLike } from '../types/service-types.js';

/**
 * Structured HTTP error response format for dispatcher mapping
 */
export interface StructuredHttpError {
  status: number;
  body: {
    code: string;
    type: string;
    message: string;
    validation_errors?: Array<{
      field?: string;
      path?: string;
      code?: string;
      message: string;
    }>;
    suggestion?: string;
    attio?: {
      status_code?: number;
      correlation_id?: string;
    };
  };
}

/**
 * Maps Axios errors to structured HTTP responses for consistent error handling
 */
export const mapAxiosToStructuredError = (
  error: AxiosErrorLike
): StructuredHttpError => {
  const mapped = ErrorService.fromAxios(error);

  return {
    status: mapped.code ?? (error as any).response?.status ?? 400,
    body: {
      code: mapped.name ?? 'validation_error',
      type: mapped.type,
      message: mapped.message,
      validation_errors: mapped.details?.validation_errors,
      suggestion: mapped.suggestion,
      attio: mapped.attio,
    },
  };
};

/**
 * Enhanced select option error handler that fetches valid options
 * and provides user-friendly error messages
 */
export const handleSelectOptionError = async (
  error: any,
  recordData: Record<string, unknown>,
  resourceType: string
): Promise<StructuredHttpError> => {
  const mapped = ErrorService.fromAxios(error);

  const err = error as {
    response?: {
      status: number;
      data?: { code: string; message: string };
    };
  };

  const status = err?.response?.status;
  const errorCode = err?.response?.data?.code;
  const errorMessage = err?.response?.data?.message;

  // Check if this is a select option error
  if (
    status === 400 &&
    errorCode === 'value_not_found' &&
    errorMessage?.includes('Cannot find select option')
  ) {
    const invalidValueMatch = errorMessage.match(
      /Cannot find select option with title "(.*)"/
    );
    const invalidValue = invalidValueMatch ? invalidValueMatch[1] : null;

    if (invalidValue) {
      // Find which field has the invalid value
      let attributeSlug: string | undefined;
      for (const [key, value] of Object.entries(recordData)) {
        if (
          value === invalidValue ||
          (Array.isArray(value) && value.includes(invalidValue))
        ) {
          attributeSlug = key;
          break;
        }
      }

      if (attributeSlug) {
        try {
          const schema = await getAttributeSchema(resourceType, attributeSlug);
          if (
            schema &&
            (schema.type === 'select' || schema.type === 'multi_select')
          ) {
            const options = await getSelectOptions(resourceType, attributeSlug);
            if (options && options.length > 0) {
              const validOptions = options
                .map((opt: any) => `'${opt.title}'`)
                .join(', ');
              const enhancedMessage = `Invalid option "${invalidValue}" for field "${attributeSlug}". Valid options are: ${validOptions}.`;

              return {
                status: mapped.code ?? status ?? 400,
                body: {
                  code: mapped.name ?? 'validation_error',
                  type: mapped.type,
                  message: enhancedMessage,
                  validation_errors: mapped.details?.validation_errors,
                  suggestion: mapped.suggestion,
                  attio: mapped.attio,
                },
              };
            } else {
              const enhancedMessage = `Invalid option "${invalidValue}" for field "${attributeSlug}". No valid options found.`;
              return {
                status: mapped.code ?? status ?? 400,
                body: {
                  code: mapped.name ?? 'validation_error',
                  type: mapped.type,
                  message: enhancedMessage,
                  validation_errors: mapped.details?.validation_errors,
                  suggestion: mapped.suggestion,
                  attio: mapped.attio,
                },
              };
            }
          }
        } catch (e) {
          // If fetching options fails, continue with original mapped error
          console.error(
            `Failed to fetch select options for attribute ${attributeSlug}:`,
            e
          );
        }
      }
    }
  }

  // Return standard mapped error if not a select option error or enhancement failed
  return mapAxiosToStructuredError(error);
};

/**
 * Universal error handler for core operations (create, update, search)
 * Handles both Axios errors and structured HTTP responses consistently
 */
export const handleCoreOperationError = async (
  error: unknown,
  operation: string,
  resourceType: string,
  recordData?: Record<string, unknown>
): Promise<never> => {
  // Check if this is an Axios error with detailed response data
  if ((error as any)?.response) {
    let structuredError: StructuredHttpError;

    // For operations with record data, try to enhance select option errors
    if (recordData && (operation === 'create' || operation === 'update')) {
      structuredError = await handleSelectOptionError(
        error as any,
        recordData,
        resourceType
      );
    } else {
      structuredError = mapAxiosToStructuredError(error as any);
    }

    throw structuredError;
  }

  // Check if this is already a structured HTTP response from our services
  if (isHttpResponseLike(error)) {
    // Let the dispatcher handle HTTP → MCP mapping
    throw error;
  }

  // For other errors, create a structured error response using ErrorService
  throw ErrorService.createUniversalError(operation, resourceType, error);
};

/**
 * Type guard to check if error is already a structured HTTP response
 */
function isHttpResponseLike(
  error: unknown
): error is { status: number; body: any } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as any).status === 'number' &&
    'body' in error
  );
}
