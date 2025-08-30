/**
 * Error Handling E2E Test Utilities
 *
 * Common utilities for error handling tests including:
 * - Safe content extraction with null checking
 * - Test data cleanup utilities
 * - Error validation helpers
 * - Batch operation utilities
 */

import type { McpToolResponse } from './assertions.js';

/**
 * Safely extracts a record ID from MCP tool response
 */
export function extractRecordId(response: McpToolResponse): string | undefined {
  const content = response.content;
  if (!content) return undefined;

  // Handle content array structure
  const firstItem = Array.isArray(content) ? content[0] : content;
  if (!firstItem) return undefined;

  // Handle text-based responses (E2E mode format)
  if (firstItem?.text && typeof firstItem.text === 'string') {
    // Try to extract ID from formatted text like "Created company "Name" (ID: abc-123-def)"
    const idMatch = firstItem.text.match(/ID:\s*([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) {
      return idMatch[1];
    }

    // Try to parse JSON if the text is a JSON string
    try {
      const parsed = JSON.parse(firstItem.text);
      if (parsed?.id?.record_id) {
        return parsed.id.record_id;
      }
    } catch {
      // Not JSON, continue with other methods
    }
  }

  // Handle data-based responses (backward compatibility)
  return firstItem?.id?.record_id || undefined;
}

/**
 * Safely checks if a response contains valid content
 */
export function hasValidContent(response: McpToolResponse): boolean {
  return (
    !response.isError &&
    response.content !== undefined &&
    response.content !== null &&
    Array.isArray(response.content) &&
    response.content.length > 0
  );
}

/**
 * Creates a test UUID for testing invalid ID scenarios
 */
export function createTestUuid(): string {
  return 'invalid-test-uuid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Safely extracts content with null checking
 */
export function getResponseContent(
  response: McpToolResponse
): unknown[] | undefined {
  if (!hasValidContent(response)) {
    return undefined;
  }
  return response.content!;
}

/**
 * Batch cleanup utility for test records
 * Supports both string arrays (legacy) and object arrays with cleanup function
 */
export async function cleanupTestRecords(
  recordsOrCleanupFunction:
    | string[]
    | ((resourceType: string, recordId: string) => Promise<any>),
  records?: Array<{ resourceType: string; recordId: string }>
): Promise<void> {
  // Handle legacy case: cleanupTestRecords(['id1', 'id2'])
  if (Array.isArray(recordsOrCleanupFunction)) {
    // Legacy mode - just log that records would be cleaned up
    // In E2E tests, records are typically temporary test data that auto-cleanup
    if (recordIds.length > 0) {
      console.log(
        `Test cleanup: ${recordIds.length} record(s) tracked for cleanup: ${recordIds.join(', ')}`
      );
    }
    return;
  }

  // Handle new case: cleanupTestRecords(cleanupFunction, [{resourceType, recordId}])
  if (
    typeof recordsOrCleanupFunction === 'function' &&
    records &&
    Array.isArray(records)
  ) {
      ({ resourceType, recordId }) =>
        cleanupFunction(resourceType, recordId).catch(() => {}) // Ignore cleanup errors
    );

    await Promise.allSettled(cleanupPromises);
  }
}

/**
 * Creates test record and returns ID safely
 */
export async function createTestRecord(
  createFunction: (resourceType: string, data: unknown) => Promise<unknown>,
  resourceType: string,
  recordData: any
): Promise<string | undefined> {
  try {
    return recordId ?? undefined;
  } catch (error) {
    console.warn(`Failed to create test ${resourceType} record:`, error);
    return undefined;
  }
}

/**
 * Validates error response and extracts error message safely
 */
export function validateErrorResponse(
  response: McpToolResponse
): string | undefined {
  if (!response.isError) {
    return undefined;
  }
  return response.error || 'Unknown error';
}

/**
 * Creates a safe UUID for testing (valid format but non-existent)
 */
export function createTestUuid(prefix: string = '0'): string {
  return `${prefix.repeat(8)}-${prefix.repeat(4)}-${prefix.repeat(4)}-${prefix.repeat(4)}-${prefix.repeat(12)}`;
}

/**
 * Batch operation result analyzer
 */
export interface BatchOperationResult {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
}

export function analyzeBatchResults(
  results: PromiseSettledResult<any>[]
): BatchOperationResult {

  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? successful / total : 0,
  };
}

/**
 * Memory and performance test utilities
 */
export function generateLargeText(
  baseText: string,
  repeatCount: number
): string {
  return baseText.repeat(repeatCount);
}

/**
 * Concurrent operation helper
 */
export async function executeConcurrentOperations<T>(
  operations: (() => Promise<T>)[],
  maxConcurrency: number = 5
): Promise<PromiseSettledResult<T>[]> {
  const batches: (() => Promise<T>)[][] = [];
  for (let i = 0; i < operations.length; i += maxConcurrency) {
    batches.push(operations.slice(i, i + maxConcurrency));
  }

  const allResults: PromiseSettledResult<T>[] = [];

  for (const batch of batches) {
    allResults.push(...batchResults);
  }

  return allResults;
}

/**
 * Retry mechanism for flaky operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 100
): Promise<{ result: T | null; attempts: number; success: boolean }> {
  let attempts = 0;
  let lastError: unknown;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      return { result, attempts, success: true };
    } catch (error) {
      lastError = error;
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return { result: null, attempts, success: false };
}
