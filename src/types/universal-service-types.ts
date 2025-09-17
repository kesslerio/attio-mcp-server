/**
 * Universal Service Type Definitions
 *
 * Centralized type definitions for Universal*Service classes to eliminate
 * repeated inline type definitions and improve type safety.
 *
 * This file extracts common patterns found across:
 * - UniversalDeleteService
 * - UniversalUpdateService
 * - UniversalRetrievalService
 * - UniversalSearchService
 * - UniversalMetadataService
 */

import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';

/**
 * Standardized error response structure used across Universal services
 *
 * @see UniversalDeleteService lines 72-77, 90-95, 112-117, etc.
 * @see UniversalUpdateService lines 118-123, 137-142
 * @see UniversalRetrievalService lines 384-389, 405-410
 */
export interface UniversalErrorResponse {
  status: number;
  body: {
    code: string;
    message: string;
  };
}

/**
 * Common "not found" error response (404) used throughout Universal services
 *
 * **Design Decision**: Using Record<string, unknown> instead of any for type safety.
 * This allows property access while preventing unsafe operations on unknown data.
 */
export interface NotFoundErrorResponse extends UniversalErrorResponse {
  status: 404;
  body: {
    code: 'not_found';
    message: string;
  };
}

/**
 * Error object structures commonly encountered in Universal services
 *
 * **Type Safety Note**: These interfaces use Record<string, unknown> rather than any
 * to provide type safety while allowing dynamic property access. This prevents
 * accidental misuse of error properties while maintaining flexibility.
 */
export interface ApiErrorWithResponse {
  response?: {
    status?: number;
    data?: {
      code?: string;
      message?: string;
    };
  };
  status?: number;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Error structure for task-specific operations
 * Used in UniversalDeleteService task handling
 */
export interface TaskError extends Error {
  status?: number;
  body?: {
    code: string;
    message: string;
  };
}

/**
 * Generic error object structure found across Universal services
 *
 * @example
 * ```typescript
 * // Instead of:
 * const errorObj = apiError as any;
 *
 * // Use:
 * const errorObj = apiError as GenericErrorObject;
 * ```
 */
export interface GenericErrorObject {
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: {
        message?: string;
        detail?: string;
        details?: unknown;
      };
      details?: unknown;
    };
  };
  status?: number;
  statusCode?: number;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Attribute object structure for metadata operations
 *
 * **Record<string, unknown> Rationale**: Attribute objects from the API can contain
 * arbitrary properties. Using unknown ensures we handle these safely rather than
 * bypassing type checking with any.
 */
export interface AttributeObject {
  api_slug?: string;
  title?: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Data payload structure for Universal service operations
 *
 * Used in update/create operations where data can be in various formats
 */
export interface DataPayload {
  values?: Record<string, unknown>;
  object?: string;
  object_api_slug?: string;
  [key: string]: unknown;
}

/**
 * Type guards for Universal service error handling
 */

/**
 * Type guard to check if an error has the expected API error structure
 *
 * @param error - Unknown error object
 * @returns true if error matches ApiErrorWithResponse structure
 */
export function isApiErrorWithResponse(
  error: unknown
): error is ApiErrorWithResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('response' in error || 'status' in error || 'message' in error)
  );
}

/**
 * Type guard to check if an error is a 404 not found error
 *
 * **Usage Pattern**: Extracted from repeated 404 detection logic across services
 *
 * @param error - Unknown error object
 * @returns true if error indicates a 404 not found condition
 */
export function is404Error(error: unknown): boolean {
  if (!isApiErrorWithResponse(error)) {
    return false;
  }

  const status = error.response?.status ?? error.status;
  const code = error.response?.data?.code ?? error.code;
  const message = (error.response?.data?.message ?? error.message ?? '')
    .toString()
    .toLowerCase();

  return (
    status === 404 ||
    code === 'not_found' ||
    message.includes('not found') ||
    message.includes('404')
  );
}

/**
 * Type guard for checking if a value is an attribute object
 *
 * @param value - Unknown value to check
 * @returns true if value has expected attribute structure
 */
export function isAttributeObject(value: unknown): value is AttributeObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    (('api_slug' in value &&
      typeof (value as Record<string, unknown>).api_slug === 'string') ||
      ('title' in value &&
        typeof (value as Record<string, unknown>).title === 'string') ||
      ('name' in value &&
        typeof (value as Record<string, unknown>).name === 'string'))
  );
}

/**
 * Helper to create standardized not found error responses
 *
 * @param resourceType - Type of resource that was not found
 * @param recordId - ID of the record that was not found
 * @returns Standardized not found error response
 */
export function createNotFoundError(
  resourceType: UniversalResourceType | string,
  recordId: string
): NotFoundErrorResponse {
  const resourceName = getResourceDisplayName(resourceType);

  return {
    status: 404,
    body: {
      code: 'not_found',
      message: `${resourceName} record with ID "${recordId}" not found.`,
    },
  };
}

/**
 * Helper to get display name for resource types
 *
 * @param resourceType - Resource type enum or string
 * @returns Human-readable resource name
 */
function getResourceDisplayName(
  resourceType: UniversalResourceType | string
): string {
  switch (resourceType) {
    case UniversalResourceType.COMPANIES:
      return 'Company';
    case UniversalResourceType.PEOPLE:
      return 'Person';
    case UniversalResourceType.LISTS:
      return 'List';
    case UniversalResourceType.RECORDS:
      return 'Record';
    case UniversalResourceType.DEALS:
      return 'Deal';
    case UniversalResourceType.TASKS:
      return 'Task';
    case UniversalResourceType.NOTES:
      return 'Note';
    default:
      return String(resourceType);
  }
}

/**
 * Safe error status extraction utility
 *
 * **Type Safety**: Uses type guards to safely extract status codes from
 * various error formats without unsafe any casting.
 *
 * @param error - Unknown error object
 * @returns HTTP status code if found, undefined otherwise
 */
export function extractErrorStatus(error: unknown): number | undefined {
  if (!isApiErrorWithResponse(error)) {
    return undefined;
  }

  const status = error.response?.status ?? error.status;
  return typeof status === 'number' ? status : undefined;
}

/**
 * Safe error message extraction utility
 *
 * @param error - Unknown error object
 * @returns Error message if found, undefined otherwise
 */
export function extractErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }

  if (!isApiErrorWithResponse(error)) {
    return typeof error === 'string' ? error : undefined;
  }

  return error.response?.data?.message ?? error.message ?? undefined;
}
