/**
 * RecordsSearchService - Generic records and custom objects search
 *
 * Issue #935: Extracted from UniversalSearchService.ts to reduce file size
 * Handles generic records and custom object searches
 */

import { AttioRecord } from '@/types/attio.js';
import { createScopedLogger, OperationType } from '@/utils/logger.js';
import { ValidationService } from '@/services/ValidationService.js';
import { getLazyAttioClient } from '@/api/lazy-client.js';
import { listObjectRecords } from '@/objects/records/index.js';

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
  ): Promise<AttioRecord[]> {
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
   * @param filters - Optional filters
   */
  static async searchCustomObject(
    objectSlug: string,
    limit?: number,
    offset?: number,
    filters?: Record<string, unknown>
  ): Promise<AttioRecord[]> {
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
    const api = getLazyAttioClient();
    const path = `/objects/${objectSlug}/records/query`;

    const requestBody: Record<string, unknown> = {
      limit: limit || 20,
    };

    // Add offset if provided
    if (offset && offset > 0) {
      requestBody.offset = offset;
    }

    const response = await api.post(path, requestBody);
    return Array.isArray(response?.data?.data) ? response.data.data : [];
  }
}
