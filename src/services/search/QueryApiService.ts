/**
 * QueryApiService - Attio Query API operations for advanced search
 *
 * Issue #935: Extracted from UniversalSearchService.ts to reduce file size
 * Handles relationship, timeframe, and content searches using the Query API
 */

import type { UniversalRecord } from '@/types/attio.js';
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
 * Handle Query API errors consistently across methods
 * Issue #935: Extracted to reduce code duplication
 */
function handleQueryApiError(
  error: unknown,
  path: string,
  context: {
    resourceType: string;
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
      'QueryApiService',
      `No results for ${context.operation}`,
      context.metadata
    );
    return [];
  }

  // Log and return empty for other errors
  createScopedLogger(
    'QueryApiService',
    context.operation,
    OperationType.API_CALL
  ).error(`${context.operation} failed for ${context.resourceType}`, error);
  return [];
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
  ): Promise<UniversalRecord[]> {
    const relationshipQuery: RelationshipQuery = {
      sourceObjectType: sourceResourceType,
      targetObjectType: targetResourceType,
      targetAttribute: 'id',
      condition: 'equals',
      value: targetRecordId,
    };

    const queryApiFilter = createRelationshipQuery(relationshipQuery);

    const path = `/objects/${sourceResourceType}/records/query`;
    try {
      const client = resolveQueryApiClient();
      const requestBody = {
        ...queryApiFilter,
        limit: limit || 10,
        offset: offset || 0,
      };

      const response = await client.post(path, requestBody);
      return response?.data?.data || [];
    } catch (error: unknown) {
      return handleQueryApiError(error, path, {
        resourceType: sourceResourceType,
        operation: 'searchByRelationship',
        metadata: { targetResourceType, targetRecordId },
      });
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
  ): Promise<UniversalRecord[]> {
    const queryApiFilter = createTimeframeQuery(timeframeConfig);
    const path = `/objects/${resourceType}/records/query`;

    try {
      const client = resolveQueryApiClient();
      const requestBody = {
        ...queryApiFilter,
        limit: limit || 10,
        offset: offset || 0,
      };

      const response = await client.post(path, requestBody);
      return response?.data?.data || [];
    } catch (error: unknown) {
      return handleQueryApiError(error, path, {
        resourceType,
        operation: 'searchByTimeframe',
        metadata: { timeframeConfig },
      });
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
  ): Promise<UniversalRecord[]> {
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
    const path = `/objects/${resourceType}/records/query`;

    try {
      const client = resolveQueryApiClient();
      const requestBody = {
        ...queryApiFilter,
        limit: limit || 10,
        offset: offset || 0,
      };

      const response = await client.post(path, requestBody);
      return response?.data?.data || [];
    } catch (error: unknown) {
      return handleQueryApiError(error, path, {
        resourceType,
        operation: 'searchByContent',
        metadata: { query, fields },
      });
    }
  }
}
