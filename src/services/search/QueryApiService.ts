/**
 * QueryApiService - Attio Query API operations for advanced search
 *
 * Issue #935: Extracted from UniversalSearchService.ts to reduce file size
 * Handles relationship, timeframe, and content searches using the Query API
 */

import type { UniversalRecord } from '@/types/attio.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { createApiErrorFromAxiosError } from '@/errors/api-errors.js';
import { ResultEncodingError } from '@/handlers/tools/result-contract.js';
import {
  createRelationshipQuery,
  createTimeframeQuery,
  createContentSearchQuery,
} from '@/utils/filters/index.js';
import { RelationshipQuery, TimeframeQuery } from '@/utils/filters/types.js';
import type { AxiosInstance } from 'axios';
import { getLazyAttioClient } from '@/api/lazy-client.js';

/**
 * Resolve Query API client from context-aware lazy client.
 */
function resolveQueryApiClient(): AxiosInstance {
  return getLazyAttioClient();
}

function assertSupportedTimeframeQuery(
  resourceType: UniversalResourceType,
  timeframeConfig: TimeframeQuery
): void {
  const isPeopleOrCompanies =
    resourceType === UniversalResourceType.PEOPLE ||
    resourceType === UniversalResourceType.COMPANIES;
  const isModifiedAlias =
    timeframeConfig.attribute === 'updated_at' ||
    timeframeConfig.attribute === 'modified_at';

  if (isPeopleOrCompanies && isModifiedAlias) {
    throw new Error(
      `Modified timeframe searches are not supported by Attio for ${resourceType}. Use created_at or last_interaction instead.`
    );
  }
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
      if (!Array.isArray(response?.data?.data)) throw new ResultEncodingError();
      return response.data.data;
    } catch (error: unknown) {
      throw createApiErrorFromAxiosError(error, path, 'POST');
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
    assertSupportedTimeframeQuery(resourceType, timeframeConfig);

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
      if (!Array.isArray(response?.data?.data)) throw new ResultEncodingError();
      return response.data.data;
    } catch (error: unknown) {
      throw createApiErrorFromAxiosError(error, path, 'POST');
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
      if (!Array.isArray(response?.data?.data)) throw new ResultEncodingError();
      return response.data.data;
    } catch (error: unknown) {
      throw createApiErrorFromAxiosError(error, path, 'POST');
    }
  }
}
