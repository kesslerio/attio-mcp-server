/**
 * Shared validation utilities to eliminate code duplication across universal tool configs
 * Consolidates common validation patterns and error handling
 */

import { isValidUUID } from '@utils/validation/uuid-validation.js';
import { ValidationService } from '@services/ValidationService.js';
import { ErrorService } from '@services/ErrorService.js';
import {
  withTypedErrorHandling,
  type TypedError,
} from './typed-error-handling.js';
import { validateUniversalToolParams } from './schemas.js';

/**
 * Error handling wrapper that provides consistent error creation across all tool configs
 */
export function withUniversalErrorHandling<T, P extends unknown[]>(
  operation: string,
  resourceType: string,
  handler: (...args: P) => Promise<T>
): (...args: P) => Promise<T> {
  return withTypedErrorHandling(operation, resourceType, handler);
}

/**
 * UUID validation with consistent error handling across tool configs
 */
export interface UUIDValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateUUIDWithError(
  uuid: string,
  fieldName: string = 'ID'
): UUIDValidationResult {
  if (!uuid) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (!isValidUUID(uuid)) {
    return {
      isValid: false,
      error: `Invalid ${fieldName}: must be a UUID. Got: ${uuid}`,
    };
  }

  return { isValid: true };
}

/**
 * UUID validation for search operations (returns boolean for compatibility)
 */
export function validateUUIDForSearch(uuid: string): boolean {
  return ValidationService.validateUUIDForSearch(uuid);
}

/**
 * Parameter sanitization wrapper that provides consistent validation across all tool configs
 */
export function sanitizeToolParams<T = Record<string, unknown>>(
  toolName: string,
  params: Record<string, unknown>
): T {
  return validateUniversalToolParams(toolName, params) as T;
}

/**
 * Combined parameter sanitization with error handling wrapper
 * Consolidates the most common pattern: sanitize params + handle errors
 */
export function withSanitizedParams<T, P = Record<string, unknown>>(
  toolName: string,
  operation: string,
  resourceType: string,
  handler: (sanitizedParams: P) => Promise<T>
) {
  return withUniversalErrorHandling(
    operation,
    resourceType,
    async (params: Record<string, unknown>): Promise<T> => {
      const sanitizedParams = sanitizeToolParams<P>(toolName, params);
      return await handler(sanitizedParams);
    }
  );
}

/**
 * List ID validation with error handling (common pattern in list operations)
 */
export function validateListId(
  listId: string | undefined,
  operation: string = 'operation'
): void {
  if (!listId) {
    throw new Error(`List ID is required for ${operation}`);
  }

  const validation = validateUUIDWithError(listId, 'list_id');
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
}

/**
 * Pagination parameter validation wrapper
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export function validatePaginationParams(
  params: PaginationParams,
  perfId?: string
): void {
  ValidationService.validatePaginationParameters(params, perfId);
}

/**
 * Combined validation for common tool config patterns
 * Handles: parameter sanitization, UUID validation, pagination, and error wrapping
 */
export interface ToolConfigValidationOptions {
  toolName: string;
  operation: string;
  resourceType: string;
  requiresUUID?: {
    field: string;
    value: string;
  };
  pagination?: boolean;
}

export function createValidatedHandler<T, P = Record<string, unknown>>(
  options: ToolConfigValidationOptions,
  handler: (sanitizedParams: P) => Promise<T>
) {
  return withSanitizedParams<T, P>(
    options.toolName,
    options.operation,
    options.resourceType,
    async (sanitizedParams: P): Promise<T> => {
      // Optional UUID validation
      if (options.requiresUUID) {
        const { field, value } = options.requiresUUID;
        const validation = validateUUIDWithError(value, field);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
      }

      // Optional pagination validation
      if (options.pagination) {
        validatePaginationParams(sanitizedParams as PaginationParams);
      }

      return await handler(sanitizedParams);
    }
  );
}
