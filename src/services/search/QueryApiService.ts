/**
 * QueryApiService - Attio Query API operations for advanced search
 *
 * Issue #935: Extracted from UniversalSearchService.ts to reduce file size
 * Handles relationship, timeframe, and content searches using the Query API
 *
 * U5 (KTD6): every query path returns the page plus reliable continuation
 * evidence. The API is offset-backed, so a lookahead fetch proves more results
 * exist; a full page alone never does. Native `meta.next_cursor` values, when
 * the upstream supplies them, are preserved for the result-cursor module to
 * seal — they are never exposed raw to clients.
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
import type { AxiosInstance, AxiosResponse } from 'axios';
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

/** A queried page plus the evidence that decides whether more exist. */
export interface QueryPage<T> {
  data: T[];
  /** Reliable continuation evidence: a native upstream cursor when present. */
  upstreamCursor: string | null;
}

function extractPage<T>(response: AxiosResponse | undefined): QueryPage<T> {
  // Upstream continuation evidence only. A present next_cursor proves more
  // results; its absence means we must use lookahead instead of guessing.
  const meta = response?.data?.meta as { next_cursor?: unknown } | undefined;
  const upstreamCursor =
    typeof meta?.next_cursor === 'string' && meta.next_cursor.length > 0
      ? meta.next_cursor
      : null;
  if (!Array.isArray(response?.data?.data)) throw new ResultEncodingError();
  return { data: response.data.data as T[], upstreamCursor };
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
    offset?: number,
    cursor?: string
  ): Promise<QueryPage<UniversalRecord>> {
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
        ...(cursor ? { cursor } : { offset: offset || 0 }),
      };

      const response = await client.post(path, requestBody);
      return extractPage<UniversalRecord>(response);
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
    offset?: number,
    cursor?: string
  ): Promise<QueryPage<UniversalRecord>> {
    assertSupportedTimeframeQuery(resourceType, timeframeConfig);

    const queryApiFilter = createTimeframeQuery(timeframeConfig);
    const path = `/objects/${resourceType}/records/query`;

    try {
      const client = resolveQueryApiClient();
      const requestBody = {
        ...queryApiFilter,
        limit: limit || 10,
        ...(cursor ? { cursor } : { offset: offset || 0 }),
      };

      const response = await client.post(path, requestBody);
      return extractPage<UniversalRecord>(response);
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
  ): Promise<QueryPage<UniversalRecord>> {
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
      return extractPage<UniversalRecord>(response);
    } catch (error: unknown) {
      throw createApiErrorFromAxiosError(error, path, 'POST');
    }
  }
}
