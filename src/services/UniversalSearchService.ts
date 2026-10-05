/**
 * UniversalSearchService - Centralized record search operations
 *
 * Issue #574: Refactored to use Strategy Pattern for resource-specific search logic
 * Issue #935: Search routing delegated to SearchCoordinator and extracted services
 */

import { performance } from 'perf_hooks';

import {
  UniversalResourceType,
  SearchType,
  MatchType,
  SortType,
} from '@/handlers/tool-configs/universal/types.js';
import type { UniversalSearchParams } from '@/handlers/tool-configs/universal/types.js';
import type { UniversalRecordResult } from '@/types/attio.js';
import { debug } from '@/utils/logger.js';

// Import services
import { ValidationService } from '@/services/ValidationService.js';
import { CachingService } from '@/services/CachingService.js';

// Import performance tracking
import { enhancedPerformanceTracker } from '@/middleware/performance-enhanced.js';

// Import timeframe utility functions for Issue #475
import { convertDateParamsToTimeframeQuery } from '@/utils/filters/timeframe-utils.js';

// Issue #935: Search routing delegated to SearchCoordinator
import { SearchCoordinator } from '@/services/search/SearchCoordinator.js';
import {
  InvalidCursorError,
  issueNextCursor,
  rejectCursorWithOffset,
  resolveCollectionCursor,
  splitLookaheadPage,
  type IssuedCollectionCursor,
} from '@/handlers/tools/result-cursor.js';

/**
 * A queried collection page plus its U5 continuation evidence (KTD6).
 */
export interface UniversalRecordCollectionPage {
  data: UniversalRecordResult[];
  next_cursor: string | null;
  pagination: IssuedCollectionCursor['pagination'];
}

/**
 * A cursor pins its issuing page size; replaying it with a different page
 * size would silently reshuffle the live view, so it fails before any call.
 */
function pageSizeViaCursorCheck(
  cursorPageSize: number,
  requested: number
): void {
  if (cursorPageSize !== requested) {
    throw new InvalidCursorError(
      'Continuation cursor page size does not match this request'
    );
  }
}

/**
 * Keyed fingerprint inputs for the record-search continuation scope: the
 * canonical operation, resource, and the effective query shape (filters,
 * sorts, projections, and the resolved page size). Raw values are never
 * encoded — the cursor module reduces them to keyed fingerprints.
 */
function searchContinuationScope(operation: string, params: {
  resource_type: string;
  query?: string;
  filters?: unknown;
  fields?: string[];
  match_type?: unknown;
  sort?: unknown;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search_type?: unknown;
  relationship_target_type?: unknown;
  relationship_target_id?: unknown;
  timeframe_attribute?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  date_operator?: unknown;
  content_fields?: unknown;
  use_or_logic?: unknown;
  date_from?: unknown;
  date_to?: unknown;
  created_after?: unknown;
  created_before?: unknown;
  updated_after?: unknown;
  updated_before?: unknown;
  timeframe?: unknown;
  date_field?: unknown;
}): {
  operation: string;
  resource: string;
  query: Record<string, unknown>;
} {
  const { resource_type, ...rest } = params;
  return {
    operation,
    resource: resource_type,
    // The cursor itself and the paging position are not part of the query
    // identity: continuation must re-verify the exact filters/sorts/page size
    // while advancing through pages of the same query.
    query: Object.fromEntries(
      Object.entries(rest).filter(
        ([key, value]) =>
          key !== 'cursor' &&
          key !== 'offset' &&
          value !== undefined &&
          !(key === 'query' && value === '')
      )
    ),
  };
}

/**
 * UniversalSearchService provides centralized record search functionality
 * Issue #935: Strategy initialization delegated to StrategyFactory via SearchCoordinator
 * Issue #1068: Lists returned in list-native format (UniversalRecordResult[])
 */
export class UniversalSearchService {
  /**
   * Continuation-aware page fetch for collection tools (U5/KTD6).
   *
   * A client-supplied cursor is verified against the caller's credential scope
   * and query shape BEFORE any Attio request; tampering, changed filters,
   * expiry, and cross-tenant replay all fail with INVALID_CURSOR offline.
   * Offset-backed paths fetch one lookahead item so a next cursor is only
   * issued on reliable continuation evidence, and the returned page always
   * contains exactly the requested items (the sentinel is refetched later,
   * never dropped).
   */
  static async searchRecordsPage(
    params: UniversalSearchParams,
    operation: 'records_search' | 'records_search_advanced' | 'records_search_by_timeframe' = 'records_search'
  ): Promise<UniversalRecordCollectionPage> {
    rejectCursorWithOffset({ cursor: params.cursor, offset: params.offset });
    const dateConversion = convertDateParamsToTimeframeQuery(params);
    const isQueryRoute = params.search_type === SearchType.RELATIONSHIP ||
      params.search_type === SearchType.TIMEFRAME || Boolean(dateConversion) ||
      Boolean(params.timeframe_attribute && (params.start_date || params.end_date));
    const pageSize = params.limit ?? (
      isQueryRoute || params.resource_type === UniversalResourceType.RECORDS
        ? 10
        : params.resource_type === UniversalResourceType.PEOPLE ? 100 : 20
    );
    ValidationService.validatePaginationParameters({ limit: pageSize, offset: params.offset });
    const scope = searchContinuationScope(operation, { ...params, limit: pageSize });
    const supported = isQueryRoute || (
      ![UniversalResourceType.TASKS, UniversalResourceType.LISTS, UniversalResourceType.NOTES].includes(params.resource_type) &&
      params.search_type !== SearchType.CONTENT && !params.query?.trim()
    );
    if (!supported) {
      if (params.cursor) throw new InvalidCursorError('This search does not support continuation cursors');
      const data = await this.searchRecords(params);
      return { data, next_cursor: null, pagination: { supported: false, truncated: (data as UniversalRecordResult[] & { truncated?: boolean }).truncated ?? true } };
    }

    let offset = params.offset ?? 0;
    let upstreamCursor: string | undefined;
    if (params.cursor) {
      const resolved = resolveCollectionCursor(params.cursor, scope);
      offset = resolved.offset;
      upstreamCursor = resolved.upstreamCursor;
      pageSizeViaCursorCheck(resolved.pageSize, pageSize);
    }

    const fetched = await this.searchRecords({ ...params, limit: Math.min(pageSize + 1, 100), offset }, upstreamCursor);
    const { page, hasMore: lookaheadMore } = splitLookaheadPage(fetched, pageSize);
    const nextUpstreamCursor = fetched.length <= pageSize ? (fetched as UniversalRecordResult[] & { upstreamCursor?: string }).upstreamCursor : undefined;
    const hasMore = Boolean(nextUpstreamCursor) || lookaheadMore || (pageSize === 100 && page.length === pageSize &&
      (await this.searchRecords({ ...params, limit: 1, offset: offset + page.length })).length > 0);
    const issued = issueNextCursor({
      scope,
      pageSize,
      offset: offset + page.length,
      hasMore,
      upstreamCursor: nextUpstreamCursor,
    });
    return {
      data: page,
      next_cursor: issued.next_cursor,
      pagination: issued.pagination,
    };
  }
  /**
   * Universal search handler with performance tracking
   * Issue #1068: Lists returned in list-native format (UniversalRecordResult[])
   */
  static async searchRecords(
    params: UniversalSearchParams,
    upstreamCursor?: string
  ): Promise<UniversalRecordResult[]> {
    const {
      resource_type,
      query,
      filters,
      limit,
      offset,
      cursor: _cursor,
      search_type = SearchType.BASIC,
      fields,
      match_type = MatchType.PARTIAL,
      sort = SortType.NAME,
      // New TC search parameters
      relationship_target_type,
      relationship_target_id,
      timeframe_attribute,
      start_date,
      end_date,
      date_operator,
      content_fields,
      use_or_logic,
      // Issue #475: New date filtering parameters
      date_from,
      date_to,
      created_after,
      created_before,
      updated_after,
      updated_before,
      timeframe,
      date_field,
    } = params;

    // Start performance tracking
    const perfId = enhancedPerformanceTracker.startOperation(
      'search-records',
      'search',
      {
        resourceType: resource_type,
        hasQuery: !!query,
        hasFilters: !!(filters && Object.keys(filters).length > 0),
        limit,
        offset,
        searchType: search_type,
        hasFields: !!(fields && fields.length > 0),
        matchType: match_type,
        sortType: sort,
      }
    );

    // Track validation timing
    const validationStart = performance.now();

    // Validate pagination parameters using ValidationService
    ValidationService.validatePaginationParameters({ limit, offset }, perfId);

    // Validate filter schema for malformed advanced filters
    ValidationService.validateFiltersSchema(filters);

    enhancedPerformanceTracker.markTiming(
      perfId,
      'validation',
      performance.now() - validationStart
    );

    // Issue #475: Convert user-friendly date parameters to API format
    let processedTimeframeParams = {
      timeframe_attribute,
      start_date,
      end_date,
      date_operator,
    };

    try {
      const dateConversion = convertDateParamsToTimeframeQuery({
        date_from,
        date_to,
        created_after,
        created_before,
        updated_after,
        updated_before,
        timeframe,
        date_field,
      });

      if (dateConversion) {
        // Use converted parameters, prioritizing user-friendly parameters
        processedTimeframeParams = {
          ...processedTimeframeParams,
          ...dateConversion,
        };
      }
    } catch (dateError: unknown) {
      // Re-throw date validation errors with helpful context
      const errorMessage =
        dateError instanceof Error
          ? `Date parameter validation failed: ${dateError.message}`
          : 'Invalid date parameters provided';
      throw new Error(errorMessage);
    }

    // Auto-detect timeframe searches and FORCE them to use the Query API
    let finalSearchType = search_type;
    const hasTimeframeParams =
      processedTimeframeParams.timeframe_attribute &&
      (processedTimeframeParams.start_date ||
        processedTimeframeParams.end_date);

    if (hasTimeframeParams) {
      finalSearchType = SearchType.TIMEFRAME;
      debug(
        'UniversalSearchService',
        'FORCING timeframe search to use Query API (advanced search API does not support date comparisons)',
        {
          originalSearchType: search_type,
          timeframe_attribute: processedTimeframeParams.timeframe_attribute,
          start_date: processedTimeframeParams.start_date,
          end_date: processedTimeframeParams.end_date,
          date_operator: processedTimeframeParams.date_operator,
        }
      );
    }

    // Track API call timing
    const apiStart = enhancedPerformanceTracker.markApiStart(perfId);
    let results: UniversalRecordResult[];

    try {
      results = await this.performSearchByResourceType(resource_type, {
        query,
        filters,
        limit,
        offset,
        upstreamCursor,
        search_type: finalSearchType,
        fields,
        match_type,
        sort,
        // New TC search parameters
        relationship_target_type,
        relationship_target_id,
        // Use processed timeframe parameters (Issue #475)
        timeframe_attribute: processedTimeframeParams.timeframe_attribute,
        start_date: processedTimeframeParams.start_date,
        end_date: processedTimeframeParams.end_date,
        date_operator: processedTimeframeParams.date_operator,
        content_fields,
        use_or_logic,
      });

      enhancedPerformanceTracker.markApiEnd(perfId, apiStart);
      enhancedPerformanceTracker.endOperation(perfId, true, undefined, 200, {
        recordCount: results.length,
      });

      return results;
    } catch (apiError: unknown) {
      enhancedPerformanceTracker.markApiEnd(perfId, apiStart);

      const errorObj = apiError as Record<string, unknown>;
      const statusCode =
        ((errorObj?.response as Record<string, unknown>)?.status as number) ||
        (errorObj?.statusCode as number) ||
        500;
      const errorMessage =
        apiError instanceof Error ? apiError.message : 'Search failed';
      enhancedPerformanceTracker.endOperation(
        perfId,
        false,
        errorMessage,
        statusCode
      );
      throw apiError;
    }
  }

  /**
   * Perform search by resource type
   * Issue #935: Delegates to SearchCoordinator for routing logic
   */
  private static async performSearchByResourceType(
    resource_type: UniversalResourceType,
    params: {
      query?: string;
      filters?: Record<string, unknown>;
      limit?: number;
      offset?: number;
      upstreamCursor?: string;
      search_type?: SearchType;
      fields?: string[];
      match_type?: MatchType;
      sort?: SortType;
      relationship_target_type?: UniversalResourceType;
      relationship_target_id?: string;
      timeframe_attribute?: string;
      start_date?: string;
      end_date?: string;
      date_operator?: 'greater_than' | 'less_than' | 'between' | 'equals';
      content_fields?: string[];
      use_or_logic?: boolean;
    }
  ): Promise<UniversalRecordResult[]> {
    // Issue #935: Delegate to SearchCoordinator for all search routing
    return SearchCoordinator.executeSearch({
      resource_type,
      ...params,
    });
  }

  // Utility methods
  static async getSearchSuggestions(): Promise<string[]> {
    return [];
  }

  static async getRecordCount(
    resource_type: UniversalResourceType
  ): Promise<number> {
    switch (resource_type) {
      case UniversalResourceType.TASKS: {
        const cachedTasks = CachingService.getCachedTasks('tasks_cache');
        return cachedTasks ? cachedTasks.length : -1;
      }
      default:
        return -1;
    }
  }

  static supportsAdvancedFiltering(
    resource_type: UniversalResourceType
  ): boolean {
    switch (resource_type) {
      case UniversalResourceType.COMPANIES:
      case UniversalResourceType.PEOPLE:
        return true;
      case UniversalResourceType.LISTS:
      case UniversalResourceType.RECORDS:
      case UniversalResourceType.DEALS:
      case UniversalResourceType.TASKS:
        return false;
      default:
        return false;
    }
  }

  static supportsQuerySearch(resource_type: UniversalResourceType): boolean {
    switch (resource_type) {
      case UniversalResourceType.COMPANIES:
      case UniversalResourceType.PEOPLE:
      case UniversalResourceType.LISTS:
        return true;
      case UniversalResourceType.RECORDS:
      case UniversalResourceType.DEALS:
      case UniversalResourceType.TASKS:
        return false;
      default:
        return false;
    }
  }
}
