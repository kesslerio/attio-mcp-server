/**
 * UUID Validation Utilities for Issue #416
 *
 * This module provides UUID format validation to properly distinguish between
 * "Invalid format" and "Not found" errors, addressing the misleading error
 * messages reported in Issue #416.
 */

import {
  EnhancedApiError,
  ErrorTemplates,
} from '../../errors/enhanced-api-errors.js';

/**
 * UUID format validation regex
 * Matches standard UUID v4 format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is in proper UUID format
 *
 * @param uuid - String to validate
 * @returns true if the string is a valid UUID format
 */
export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

/**
 * Validate record ID format and throw appropriate error if invalid
 *
 * This function addresses Issue #416 by ensuring that format validation
 * errors are distinct from "not found" errors.
 *
 * @param recordId - Record ID to validate
 * @param resourceType - Type of resource for context
 * @throws EnhancedApiError with proper format error message
 */
export function validateRecordId(recordId: string, resourceType: string): void {
  if (!isValidUUID(recordId)) {
    throw ErrorTemplates.INVALID_UUID_FORMAT(recordId, resourceType);
  }
}

/**
 * Enhanced UUID validation with detailed error context
 *
 * @param uuid - UUID string to validate
 * @param context - Additional context for error messages
 * @returns Validation result with error details
 */
export interface UUIDValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

export function validateUUIDWithDetails(
  uuid: string,
  _options?: { resourceType?: string; operation?: string }
): UUIDValidationResult {
  if (!uuid || typeof uuid !== 'string') {
    return {
      isValid: false,
      error: 'Record ID is required and must be a string',
      suggestion:
        'Provide a valid UUID format (e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890")',
    };
  }

  if (uuid.length !== 36) {
    return {
      isValid: false,
      error: `Invalid UUID length: ${uuid.length} characters (expected 36)`,
      suggestion:
        'UUIDs must be exactly 36 characters long with dashes at positions 8, 13, 18, 23',
    };
  }

  if (!UUID_REGEX.test(uuid)) {
    // Analyze what's wrong with the format
    const issues: string[] = [];

    if (
      uuid.charAt(8) !== '-' ||
      uuid.charAt(13) !== '-' ||
      uuid.charAt(18) !== '-' ||
      uuid.charAt(23) !== '-'
    ) {
      issues.push('incorrect dash positions (should be at 8, 13, 18, 23)');
    }

    const nonHexChars = uuid.replace(/-/g, '').match(/[^0-9a-fA-F]/g);
    if (nonHexChars) {
      issues.push(
        `invalid characters: ${[...new Set(nonHexChars)].join(', ')}`
      );
    }

    return {
      isValid: false,
      error: `Invalid UUID format: ${issues.join('; ')}`,
      suggestion:
        'Use hexadecimal characters (0-9, a-f) with dashes at positions 8, 13, 18, 23',
    };
  }

  return { isValid: true };
}

/**
 * Create a properly formatted error for invalid UUIDs
 *
 * @param recordId - The invalid record ID
 * @param resourceType - Resource type for context
 * @param operation - Operation being performed
 * @returns EnhancedApiError with detailed UUID format guidance
 */
export function createInvalidUUIDError(
  recordId: string,
  resourceType: string,
  operation: string = 'GET'
): EnhancedApiError {
  const validation = validateUUIDWithDetails(recordId, {
    resourceType,
    operation,
  });

  return new EnhancedApiError(
    `Invalid record identifier format: '${recordId}'`,
    400,
    `/objects/${resourceType}`,
    operation,
    {
      field: 'record_id',
      resourceType,
      documentationHint:
        validation.suggestion ||
        'Expected UUID format (e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890")',
    }
  );
}

/**
 * Create a properly formatted error for records not found
 *
 * @param recordId - The record ID that wasn't found
 * @param resourceType - Resource type for context
 * @returns EnhancedApiError with clear "not found" message
 */
export function createRecordNotFoundError(
  recordId: string,
  resourceType: string
): EnhancedApiError {
  return new EnhancedApiError(
    `Record not found`,
    404,
    `/objects/${resourceType}/${recordId}`,
    'GET',
    {
      recordId,
      resourceType,
      httpStatus: 404,
      documentationHint: `Use search-records to find valid ${resourceType} IDs.`,
    }
  );
}

/**
 * Utility to distinguish between format errors and not found errors
 *
 * This function encapsulates the core logic for Issue #416 - it determines
 * whether an error should be treated as a format issue or a not found issue.
 *
 * @param error - Original error from API
 * @param recordId - Record ID that was requested
 * @param resourceType - Resource type for context
 * @returns Appropriate EnhancedApiError
 */
export function classifyRecordError(
  error: Error,
  recordId: string,
  resourceType: string
): EnhancedApiError {
  const errorMessage = error.message.toLowerCase();

  // If the UUID format is invalid, it's definitely a format error
  if (!isValidUUID(recordId)) {
    return createInvalidUUIDError(recordId, resourceType);
  }

  // If UUID format is valid but we got an error, check the error type
  if (
    errorMessage.includes('not found') ||
    errorMessage.includes('does not exist') ||
    (error as any).status === 404 ||
    (error as any).statusCode === 404
  ) {
    return createRecordNotFoundError(recordId, resourceType);
  }

  // For other errors with valid UUIDs, preserve the original error but enhance it
  return new EnhancedApiError(
    error.message,
    (error as any).statusCode || (error as any).status || 500,
    `/objects/${resourceType}/${recordId}`,
    'GET',
    {
      recordId,
      resourceType,
      originalError: error,
    }
  );
}

/**
 * Generate example UUIDs for error messages and documentation
 */
export function generateExampleUUID(): string {
  // Generate a valid UUID v4 for examples
  const hex = '0123456789abcdef';
  let uuid = '';

  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else {
      uuid += hex[Math.floor(Math.random() * 16)];
    }
  }

  return uuid;
}

/**
 * Extract UUID from various input formats including URIs
 *
 * Handles:
 * - Raw UUIDs: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 * - URI paths: "https://app.attio.com/records/companies/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 * - Custom schemes: "attio://companies/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *
 * @param input - Input string that may contain a UUID
 * @returns Extracted UUID string or null if no valid UUID found
 */
export function extractRecordId(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // First try direct UUID matching
  const directMatch = input.match(UUID_REGEX);
  if (directMatch) {
    return directMatch[0];
  }

  // Try URL parsing for URI-style inputs
  try {
    const url = new URL(input);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Check each path segment for a UUID
    for (const segment of pathSegments) {
      if (UUID_REGEX.test(segment)) {
        return segment;
      }
    }
  } catch {
    // Not a valid URL, continue with other strategies
  }

  // Try extracting UUID from anywhere in the string as fallback
  const anyMatch = input.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  if (anyMatch) {
    return anyMatch[0];
  }

  return null;
}

/**
 * Common UUID validation patterns for testing
 */
export const UUIDTestPatterns = {
  VALID: [
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '123e4567-e89b-12d3-a456-426614174000',
    '00000000-0000-0000-0000-000000000000',
  ],
  INVALID_FORMAT: [
    'not-a-uuid',
    'a1b2c3d4e5f6-7890-abcd-ef1234567890', // Missing dash
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890x', // Too long
    'a1b2c3d4-e5f6-7890-abcd-ef123456789', // Too short
    'g1b2c3d4-e5f6-7890-abcd-ef1234567890', // Invalid character
    '12345678901234567890123456789012345678', // No dashes
  ],
  EDGE_CASES: [
    '', // Empty string
    null as any, // Null
    undefined as any, // Undefined
    123 as any, // Number
    {} as any, // Object
  ],
};
