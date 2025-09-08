/**
 * Type definitions for list operations
 * Created as part of TypeScript 'any' reduction initiative (Issue #502)
 */

import { AttioList, AttioListEntry } from './attio.js';

/**
 * Type-safe list entry values
 */
export type ListEntryValues = Record<string, unknown>;

/**
 * List operation parameters
 */
export interface ListOperationParams {
  listId: string;
  recordId?: string;
  objectType?: string;
  limit?: number;
  offset?: number;
  filters?: ListEntryFilters;
}

/**
 * List entry filters with proper typing
 */
export interface ListEntryFilters {
  filters: ListFilter[];
  sort?: ListSort[];
}

/**
 * Individual list filter
 */
export interface ListFilter {
  field: string;
  operator: string;
  value: unknown;
}

/**
 * List sorting configuration
 */
export interface ListSort {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Batch list operation request
 */
export interface BatchListRequest {
  operations: ListOperation[];
  options?: BatchListOptions;
}

/**
 * Individual list operation
 */
export interface ListOperation {
  type: 'add' | 'remove' | 'update' | 'get';
  listId: string;
  recordId?: string;
  data?: ListEntryValues;
}

/**
 * Batch list operation options
 */
export interface BatchListOptions {
  stopOnError?: boolean;
  maxConcurrent?: number;
}

/**
 * List API endpoint configuration
 */
export interface ListEndpointConfig {
  method: 'get' | 'post';
  path: string;
  data?: Record<string, unknown>;
}

/**
 * Type guard for list membership
 */
export function isListMembership(value: unknown): value is ListMembership {
  return (
    typeof value === 'object' &&
    value !== null &&
    'listId' in value &&
    'listName' in value &&
    'entryId' in value
  );
}

/**
 * Type guard for list entry filters
 */
export function isListEntryFilters(value: unknown): value is ListEntryFilters {
  return (
    typeof value === 'object' &&
    value !== null &&
    'filters' in value &&
    Array.isArray((value as Record<string, unknown>).filters)
  );
}

/**
 * Safely extract list entry values
 */
export function extractListEntryValues(entry: unknown): ListEntryValues {
  if (typeof entry !== 'object' || entry === null) {
    return {};
  }

  // Check for common value field names
  if (obj.values && typeof obj.values === 'object') {
    return obj.values as ListEntryValues;
  }

  if (obj.entryValues && typeof obj.entryValues === 'object') {
    return obj.entryValues as ListEntryValues;
  }

  // If no specific values field, return the object itself (minus metadata)
  const { id, listId, entryId, ...values } = obj;
  return values as ListEntryValues;
}

/**
 * Type for list formatter functions
 */
export type ListFormatter = (items: AttioList[] | AttioListEntry[]) => string;

/**
 * Type for list handler functions
 */
export type ListHandler = (
  params: ListOperationParams
) => Promise<AttioList[] | AttioListEntry[]>;

/**
 * Helper to check if error has axios-like response
 */
export function hasErrorResponse(error: unknown): error is {
  response?: {
    status?: number;
    data?: {
      validation_errors?: Array<{
        path?: string[];
        message?: string;
      }>;
      [key: string]: unknown;
    };
  };
  message?: string;
} {
  return typeof error === 'object' && error !== null && 'response' in error;
}
