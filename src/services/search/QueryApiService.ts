/**
 * QueryApiService - Attio Query API operations for advanced search
 *
 * Issue #935: Extracted from UniversalSearchService.ts to reduce file size
 * Handles relationship, timeframe, and content searches using the Query API
 */

import { AttioRecord } from '@/types/attio.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
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
import {
  createRelationshipQuery,
  createTimeframeQuery,
  createContentSearchQuery,
} from '@/utils/filters/index.js';
import { RelationshipQuery, TimeframeQuery } from '@/utils/filters/types.js';
import { getLazyAttioClient } from '@/api/lazy-client.js';
import * as AttioClientModule from '@/api/attio-client.js';
import type { AxiosInstance } from 'axios';

/**
 * Resolve Query API client (prefers mocked version in tests)
 */
function resolveQueryApiClient(): AxiosInstance {
  const mod = AttioClientModule as { getAttioClient?: () => AxiosInstance };
  if (typeof mod.getAttioClient === 'function') {
    return mod.getAttioClient();
  }
  return getLazyAttioClient();
}

/**
 * Query API Service for advanced search operations
 */
export class QueryApiService {
  /**
   * Search records by relationship to another record
   */
  static async searchByRelationship(
    sourceResourceType: UniversalResourceType,
    targetResourceType: UniversalResourceType,
    targetRecordId: string,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
    const relationshipQuery: RelationshipQuery = {
      sourceObjectType: sourceResourceType,
      targetObjectType: targetResourceType,
      targetAttribute: 'id',
      condition: 'equals',
      value: targetRecordId,
    };

    const queryApiFilter = createRelationshipQuery(relationshipQuery);

    try {
      const client = resolveQueryApiClient();
      const path = `/objects/${sourceResourceType}/records/query`;
      const requestBody = {
        ...queryApiFilter,
        limit: limit || 10,
        offset: offset || 0,
      };

      const response = await client.post(path, requestBody);
      return response?.data?.data || [];
    } catch (error: unknown) {
      const apiError = createApiErrorFromAxiosError(
        error,
        `/objects/${sourceResourceType}/records/query`,
        'POST'
      );

      if (
        apiError instanceof AuthenticationError ||
        apiError instanceof AuthorizationError ||
        apiError instanceof NetworkError ||
        apiError instanceof RateLimitError ||
        apiError instanceof ServerError
      ) {
        throw apiError;
      }

      if (apiError instanceof ResourceNotFoundError) {
        debug(
          'QueryApiService',
          `No relationship found between ${sourceResourceType} -> ${targetResourceType}`,
          { targetRecordId }
        );
        return [];
      }

      createScopedLogger(
        'QueryApiService',
        'searchByRelationship',
        OperationType.API_CALL
      ).error(
        `Relationship search failed for ${sourceResourceType} -> ${targetResourceType}`,
        error
      );
      return [];
    }
  }

  /**
   * Search records within a specific timeframe
   */
  static async searchByTimeframe(
    resourceType: UniversalResourceType,
    timeframeConfig: TimeframeQuery,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
    const queryApiFilter = createTimeframeQuery(timeframeConfig);

    try {
      const client = resolveQueryApiClient();
      const path = `/objects/${resourceType}/records/query`;
      const requestBody = {
        ...queryApiFilter,
        limit: limit || 10,
        offset: offset || 0,
      };

      const response = await client.post(path, requestBody);
      return response?.data?.data || [];
    } catch (error: unknown) {
      const apiError = createApiErrorFromAxiosError(
        error,
        `/objects/${resourceType}/records/query`,
        'POST'
      );

      if (
        apiError instanceof AuthenticationError ||
        apiError instanceof AuthorizationError ||
        apiError instanceof NetworkError ||
        apiError instanceof RateLimitError ||
        apiError instanceof ServerError
      ) {
        throw apiError;
      }

      if (apiError instanceof ResourceNotFoundError) {
        debug(
          'QueryApiService',
          `No ${resourceType} records found in specified timeframe`,
          { timeframeConfig }
        );
        return [];
      }

      createScopedLogger(
        'QueryApiService',
        'searchByTimeframe',
        OperationType.API_CALL
      ).error(`Timeframe search failed for ${resourceType}`, error);
      return [];
    }
  }

  /**
   * Search records by content across multiple fields
   */
  static async searchByContent(
    resourceType: UniversalResourceType,
    query: string,
    searchFields: string[] = [],
    useOrLogic: boolean = true,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
    let fields = searchFields;
    if (fields.length === 0) {
      switch (resourceType) {
        case UniversalResourceType.COMPANIES:
          fields = ['name', 'description', 'domains'];
          break;
        case UniversalResourceType.PEOPLE:
          fields = ['name', 'email_addresses', 'job_title'];
          break;
        default:
          fields = ['name'];
          break;
      }
    }

    const queryApiFilter = createContentSearchQuery(fields, query, useOrLogic);

    try {
      const client = getLazyAttioClient();
      const path = `/objects/${resourceType}/records/query`;
      const requestBody = {
        ...queryApiFilter,
        limit: limit || 10,
        offset: offset || 0,
      };

      const response = await client.post(path, requestBody);
      return response?.data?.data || [];
    } catch (error: unknown) {
      const apiError = createApiErrorFromAxiosError(
        error,
        `/objects/${resourceType}/records/query`,
        'POST'
      );

      if (
        apiError instanceof AuthenticationError ||
        apiError instanceof AuthorizationError ||
        apiError instanceof NetworkError ||
        apiError instanceof RateLimitError ||
        apiError instanceof ServerError
      ) {
        throw apiError;
      }

      if (apiError instanceof ResourceNotFoundError) {
        debug(
          'QueryApiService',
          `No ${resourceType} records found matching content search`,
          { query, fields }
        );
        return [];
      }

      createScopedLogger(
        'QueryApiService',
        'searchByContent',
        OperationType.API_CALL
      ).error(`Content search failed for ${resourceType}`, error);
      return [];
    }
  }
}
