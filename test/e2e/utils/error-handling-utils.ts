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
 * Safely extracts record ID from MCP tool response with proper null checking
 */
export function extractRecordId(response: McpToolResponse): string | undefined {
  if (
    response.isError ||
    !response.content ||
    !Array.isArray(response.content) ||
    response.content.length === 0
  ) {
    return undefined;
  }

  const data = response.content[0]?.data as any;
  return data?.id?.record_id || undefined;
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
 * Safely extracts content with null checking
 */
export function getResponseContent(
  response: McpToolResponse
): any[] | undefined {
  if (!hasValidContent(response)) {
    return undefined;
  }
  return response.content!;
}

/**
 * Batch cleanup utility for test records
 */
export async function cleanupTestRecords(
  cleanupFunction: (resourceType: string, recordId: string) => Promise<any>,
  records: Array<{ resourceType: string; recordId: string }>
): Promise<void> {
  const cleanupPromises = records.map(
    ({ resourceType, recordId }) =>
      cleanupFunction(resourceType, recordId).catch(() => {}) // Ignore cleanup errors
  );

  await Promise.allSettled(cleanupPromises);
}

/**
 * Creates test record and returns ID safely
 */
export async function createTestRecord(
  createFunction: (resourceType: string, data: any) => Promise<unknown>,
  resourceType: string,
  recordData: any
): Promise<string | undefined> {
  try {
    const response = await createFunction(resourceType, recordData);
    const recordId = extractRecordId(response as McpToolResponse);
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
  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  const total = results.length;

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
    const batchResults = await Promise.allSettled(batch.map((op) => op()));
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
  let lastError: any;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const result = await operation();
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
