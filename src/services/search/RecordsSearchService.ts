/**
 * RecordsSearchService - Generic records and custom objects search
 *
 * Issue #935: Extracted from UniversalSearchService.ts to reduce file size
 * Handles generic records and custom object searches
 */

import type { AxiosInstance } from 'axios';

import type { UniversalRecord } from '@/types/attio.js';
import { getLazyAttioClient } from '@/api/lazy-client.js';
import { ValidationService } from '@/services/ValidationService.js';
import { createScopedLogger, OperationType } from '@/utils/logger.js';
import { createApiErrorFromAxiosError } from '@/errors/api-errors.js';
import { ResultEncodingError } from '@/handlers/tools/result-contract.js';

/**
 * Resolve API client from context-aware lazy client.
 */
function resolveApiClient(): AxiosInstance {
  return getLazyAttioClient();
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
    return this.searchCustomObject('records', limit ?? 10, offset, filters);
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
      const { list_membership: _listMembership, ...remainingFilters } = filters;
      if (Object.keys(remainingFilters).length > 0) {
        requestBody.filter = remainingFilters;
      }
    }

    try {
      const api = resolveApiClient();
      const response = await api.post(path, requestBody);
      if (!Array.isArray(response?.data?.data)) throw new ResultEncodingError();
      return response.data.data;
    } catch (error: unknown) {
      throw createApiErrorFromAxiosError(error, path, 'POST');
    }
  }
}
