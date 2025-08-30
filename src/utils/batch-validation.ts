/**
 * Batch operation validation utilities for DoS protection
 *
 * Provides comprehensive validation for batch operations including
 * size limits, payload validation, and rate limiting checks.
 */

import { ErrorType } from './error-handler.js';

/**
 * Calculate the approximate size of a JavaScript object in bytes
 * This is used to estimate payload sizes for validation
 */
function getObjectSize(obj: unknown): number {
  let size = 0;

  if (obj === null || obj === undefined) {
    return 0;
  }

  if (typeof obj === 'string') {
    return obj.length * 2; // Unicode characters can be up to 2 bytes
  }

  if (typeof obj === 'number') {
    return 8; // Numbers are typically 8 bytes
  }

  if (typeof obj === 'boolean') {
    return 4; // Booleans are typically 4 bytes
  }

  if (obj instanceof Date) {
    return 8; // Dates are stored as numbers
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      size += getObjectSize(item);
    }
    return size;
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      size += key.length * 2; // Key size
      size += getObjectSize(value); // Value size
    }
    return size;
  }

  return 0;
}

/**
 * Validates the size of a batch operation
 *
 * @param items - Array of items in the batch
 * @param operationType - Type of operation (create, update, delete, etc.)
 * @param resourceType - Type of resource (companies, people, etc.)
 * @returns Validation result
 */
export function validateBatchSize(
  items: unknown[] | undefined | null,
  operationType: string,
  resourceType?: string
): BatchValidationResult {
  // Check if items is a valid array
  if (!items || !Array.isArray(items)) {
    return {
      isValid: false,
      error: 'Batch items must be a non-empty array',
      errorType: ErrorType.VALIDATION_ERROR,
    };
  }

  // Check for empty array
  if (items.length === 0) {
    return {
      isValid: false,
      error: 'Batch operation requires at least one item',
      errorType: ErrorType.VALIDATION_ERROR,
    };
  }

  // Get the appropriate size limit
  let maxSize = getBatchSizeLimit(resourceType);

  // Apply more restrictive limits for certain operations
  if (operationType.toLowerCase() === 'delete') {
    maxSize = Math.min(maxSize, BATCH_SIZE_LIMITS.DELETE);
  } else if (operationType.toLowerCase() === 'search') {
    maxSize = Math.min(maxSize, BATCH_SIZE_LIMITS.SEARCH);
  }

  // Check if batch size exceeds limit
  if (items.length > maxSize) {
    return {
      isValid: false,
      error: LIMIT_ERROR_MESSAGES.BATCH_SIZE_EXCEEDED(
        items.length,
        maxSize,
        `${operationType} ${resourceType || ''}`.trim()
      ),
      errorType: ErrorType.VALIDATION_ERROR,
      details: {
        actualSize: items.length,
        maxSize,
      },
    };
  }

  return { isValid: true };
}

/**
 * Validates the payload size of a batch operation
 *
 * @param payload - The payload to validate
 * @param checkSingleRecords - Whether to check individual record sizes
 * @returns Validation result
 */
export function validatePayloadSize(
  payload: unknown,
  checkSingleRecords: boolean = true
): BatchValidationResult {
  // Calculate total payload size

  // Check total payload size
  if (totalSize > PAYLOAD_SIZE_LIMITS.BATCH_TOTAL) {
    return {
      isValid: false,
      error: LIMIT_ERROR_MESSAGES.PAYLOAD_SIZE_EXCEEDED(
        totalSize,
        PAYLOAD_SIZE_LIMITS.BATCH_TOTAL
      ),
      errorType: ErrorType.VALIDATION_ERROR,
      details: {
        payloadSize: totalSize,
        maxPayloadSize: PAYLOAD_SIZE_LIMITS.BATCH_TOTAL,
      },
    };
  }

  // Check individual record sizes if requested
  if (checkSingleRecords && Array.isArray(payload)) {
    for (let i = 0; i < payload.length; i++) {
      if (recordSize > PAYLOAD_SIZE_LIMITS.SINGLE_RECORD) {
        return {
          isValid: false,
          error:
            `Record at index ${i}: ` +
            LIMIT_ERROR_MESSAGES.SINGLE_RECORD_SIZE_EXCEEDED(
              recordSize,
              PAYLOAD_SIZE_LIMITS.SINGLE_RECORD
            ),
          errorType: ErrorType.VALIDATION_ERROR,
          details: {
            payloadSize: recordSize,
            maxPayloadSize: PAYLOAD_SIZE_LIMITS.SINGLE_RECORD,
          },
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Validates search query parameters
 *
 * @param query - Search query string
 * @param filters - Optional filter object
 * @returns Validation result
 */
export function validateSearchQuery(
  query?: string,
  filters?: any
): BatchValidationResult {
  // Validate query string length
  if (query && query.length > PAYLOAD_SIZE_LIMITS.SEARCH_QUERY) {
    return {
      isValid: false,
      error: LIMIT_ERROR_MESSAGES.SEARCH_QUERY_TOO_LONG(
        query.length,
        PAYLOAD_SIZE_LIMITS.SEARCH_QUERY
      ),
      errorType: ErrorType.VALIDATION_ERROR,
    };
  }

  // Validate filter object size
  if (filters) {
    if (filterSize > PAYLOAD_SIZE_LIMITS.FILTER_OBJECT) {
      return {
        isValid: false,
        error: LIMIT_ERROR_MESSAGES.FILTER_TOO_COMPLEX(
          filterSize,
          PAYLOAD_SIZE_LIMITS.FILTER_OBJECT
        ),
        errorType: ErrorType.VALIDATION_ERROR,
      };
    }
  }

  return { isValid: true };
}

/**
 * Comprehensive validation for batch operations
 * Combines size, payload, and other validations
 *
 * @param params - Parameters object containing batch operation details
 * @returns Validation result
 */
export function validateBatchOperation(params: {
  items?: unknown[];
  operationType: string;
  resourceType?: string;
  checkPayload?: boolean;
}): BatchValidationResult {
  const { items, operationType, resourceType, checkPayload = true } = params;

  // Validate batch size
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  // Validate payload size if requested
  if (checkPayload && items) {
    if (!payloadValidation.isValid) {
      return payloadValidation;
    }
  }

  return { isValid: true };
}

/**
 * Splits a large batch into smaller chunks that respect size limits
 *
 * @param items - Array of items to split
 * @param resourceType - Type of resource for determining limits
 * @returns Array of batches
 */
export function splitBatchIntoChunks<T>(
  items: T[],
  resourceType?: string
): T[][] {
  if (!items || items.length === 0) {
    return [];
  }

  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += maxSize) {
    chunks.push(items.slice(i, i + maxSize));
  }

  return chunks;
}

/**
 * Creates a safe error message for batch validation failures
 * This ensures no sensitive information is exposed in error messages
 *
 * @param validation - Validation result
 * @returns Safe error message
 */
export function createSafeBatchError(
  validation: BatchValidationResult
): string {
  if (validation.isValid) {
    return '';
  }

  // Return the error message without exposing internal limits
  // The error messages already handle this safely
  return validation.error || 'Batch validation failed';
}
