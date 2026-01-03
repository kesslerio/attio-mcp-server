/**
 * RecordsSearchService - Generic records and custom objects search
 *
 * Issue #935: Extracted from UniversalSearchService.ts to reduce file size
 * Handles generic records and custom object searches
 */

import type { AxiosInstance } from 'axios';

import type { UniversalRecord } from '@/types/attio.js';
import { getLazyAttioClient } from '@/api/lazy-client.js';
import * as AttioClientModule from '@/api/attio-client.js';
import { listObjectRecords } from '@/objects/records/index.js';
import { ValidationService } from '@/services/ValidationService.js';
import { debug, createScopedLogger, OperationType } from '@/utils/logger.js';
import {
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  RateLimitError,
  ServerError,
  ResourceNotFoundError,
  createApiErrorFromAxiosError,
} from '@/errors/api-errors.js';

/**
 * Resolve API client (prefers mocked version in tests)
 */
function resolveApiClient(): AxiosInstance {
  const mod = AttioClientModule as { getAttioClient?: () => AxiosInstance };
  if (typeof mod.getAttioClient === 'function') {
    return mod.getAttioClient();
  }
  return getLazyAttioClient();
}

/**
 * Handle API errors consistently
 * Issue #935: Matches QueryApiService error handling pattern
 */
function handleRecordsApiError(
  error: unknown,
  path: string,
  context: {
    operation: string;
    metadata?: Record<string, unknown>;
  }
): UniversalRecord[] {
  const apiError = createApiErrorFromAxiosError(error, path, 'POST');

  // Re-throw critical errors that should bubble up
  if (
    apiError instanceof AuthenticationError ||
    apiError instanceof AuthorizationError ||
    apiError instanceof NetworkError ||
    apiError instanceof RateLimitError ||
    apiError instanceof ServerError
  ) {
    throw apiError;
  }

  // Handle not found gracefully - return empty results
  if (apiError instanceof ResourceNotFoundError) {
    debug(
      'RecordsSearchService',
      `No results for ${context.operation}`,
      context.metadata
    );
    return [];
  }

  // Log and return empty for other errors
  createScopedLogger(
    'RecordsSearchService',
    context.operation,
    OperationType.API_CALL
  ).error(`${context.operation} failed`, error);
  return [];
}

/**
 * Records Search Service for generic records and custom objects
 */
export class RecordsSearchService {
  /**
   * Search records using object records API with filter support
   */
  static async searchRecordsObjectType(
    limit?: number,
    offset?: number,
    filters?: Record<string, unknown>
  ): Promise<UniversalRecord[]> {
    // Handle list_membership filters - invalid UUID should return empty array
    if (filters?.list_membership) {
      const listId = String(filters.list_membership);
      if (!ValidationService.validateUUIDForSearch(listId)) {
        return []; // Return empty success for invalid UUID
      }
      createScopedLogger(
        'RecordsSearchService',
        'searchRecordsObjectType',
        OperationType.DATA_PROCESSING
      ).warn('list_membership filter not yet supported in listObjectRecords');
    }

    return await listObjectRecords('records', {
      pageSize: limit,
      page: Math.floor((offset || 0) / (limit || 10)) + 1,
    });
  }

  /**
   * Search custom objects using generic records API
   * Enables support for user-defined custom objects (Issue #918)
   *
   * @param objectSlug - The custom object type (e.g., "funds", "investment_opportunities")
   * @param limit - Maximum results
   * @param offset - Pagination offset
   * @param filters - Optional filters to apply to the search
   */
  static async searchCustomObject(
    objectSlug: string,
    limit?: number,
    offset?: number,
    filters?: Record<string, unknown>
  ): Promise<UniversalRecord[]> {
    // Handle list_membership filters - invalid UUID should return empty array
    if (filters?.list_membership) {
      const listId = String(filters.list_membership);
      if (!ValidationService.validateUUIDForSearch(listId)) {
        return []; // Return empty success for invalid UUID
      }
      createScopedLogger(
        'RecordsSearchService',
        'searchCustomObject',
        OperationType.DATA_PROCESSING
      ).warn('list_membership filter not yet supported for custom objects');
    }

    createScopedLogger(
      'RecordsSearchService',
      'searchCustomObject',
      OperationType.DATA_PROCESSING
    ).info('Searching custom object', {
      objectSlug,
      limit,
      offset,
      hasFilters: !!filters,
    });

    // Custom objects require POST to /objects/{slug}/records/query
    // The GET endpoint (/objects/{slug}/records) returns 404 for custom objects
    const path = `/objects/${objectSlug}/records/query`;

    const requestBody: Record<string, unknown> = {
      limit: limit || 20,
    };

    // Add offset if provided
    if (offset && offset > 0) {
      requestBody.offset = offset;
    }

    // Issue #935: Forward filters to request body (was silently dropped before)
    if (filters && Object.keys(filters).length > 0) {
      // Exclude list_membership from filter object as it's handled separately
      const { list_membership, ...remainingFilters } = filters;
      if (Object.keys(remainingFilters).length > 0) {
        requestBody.filter = remainingFilters;
      }
    }

    try {
      const api = resolveApiClient();
      const response = await api.post(path, requestBody);
      return Array.isArray(response?.data?.data) ? response.data.data : [];
    } catch (error: unknown) {
      return handleRecordsApiError(error, path, {
        operation: 'searchCustomObject',
        metadata: { objectSlug, limit, offset, hasFilters: !!filters },
      });
    }
  }
}
