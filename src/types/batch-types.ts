/**
 * Type definitions for batch operations
 * Created as part of TypeScript 'any' reduction initiative (Issue #502)
 */

import { AttioRecord } from './attio.js';

/**
 * Individual batch operation result
 */
export interface BatchItemResult<T = AttioRecord> {
  success: boolean;
  data?: T;
  error?: BatchError;
  index?: number;
  id?: string | number;
}

/**
 * Batch operation summary
 */
export interface BatchSummary {
  total: number;
  succeeded: number;
  failed: number;
  skipped?: number;
}

/**
 * Batch operation error details
 */
export interface BatchError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  index?: number;
}

/**
 * Batch operation request structure
 */
export interface BatchRequest<T = unknown> {
  operations: T[];
  options?: BatchOptions;
}

/**
 * Batch operation options
 */
export interface BatchOptions {
  stopOnError?: boolean;
  validateBeforeExecute?: boolean;
  maxConcurrent?: number;
}

/**
 * Type for batch formatter functions
 */
export type BatchFormatter<T = AttioRecord> = (
  response: BatchResponse<T>
) => string;

/**
 * Type for batch handler functions
 */
export type BatchHandler<T = AttioRecord> = (
  params: Record<string, unknown>
) => Promise<BatchResponse<T>>;

/**
 * Type guard for batch response
 */
export function isBatchResponse<T = AttioRecord>(
  value: unknown
): value is BatchResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'results' in value &&
    Array.isArray((value as Record<string, unknown>).results) &&
    'summary' in value
  );
}

/**
 * Type guard for batch item result
 */
export function isBatchItemResult<T = AttioRecord>(
  value: unknown
): value is BatchItemResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as Record<string, unknown>).success === 'boolean'
  );
}

/**
 * Safely extract batch summary
 */
export function extractBatchSummary(response: unknown): BatchSummary {
  if (isBatchResponse(response)) {
    return response.summary;
  }

  // Fallback for malformed responses
  return {
    total: obj?.summary?.total || 0,
    succeeded: obj?.summary?.succeeded || 0,
    failed: obj?.summary?.failed || 0,
    skipped: obj?.summary?.skipped || 0,
  } as BatchSummary;
}

/**
 * Safely extract batch results
 */
export function extractBatchResults<T = AttioRecord>(
  response: unknown
): BatchItemResult<T>[] {
  if (isBatchResponse<T>(response)) {
    return response.results;
  }

  // Fallback for malformed responses
  if (Array.isArray(obj?.results)) {
    return obj.results as BatchItemResult<T>[];
  }

  return [];
}
