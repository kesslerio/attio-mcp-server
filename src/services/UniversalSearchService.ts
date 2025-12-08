/**
 * UniversalSearchService - Centralized record search operations
 *
 * Issue #574: Refactored to use Strategy Pattern for resource-specific search logic
 * Issue #935: Search routing delegated to SearchCoordinator and extracted services
 */

import {
  UniversalResourceType,
  SearchType,
  MatchType,
  SortType,
} from '../handlers/tool-configs/universal/types.js';
import type { UniversalSearchParams } from '../handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../types/attio.js';
import { performance } from 'perf_hooks';
import { debug } from '../utils/logger.js';

// Import services
import { ValidationService } from './ValidationService.js';
import { CachingService } from './CachingService.js';

// Import performance tracking
import { enhancedPerformanceTracker } from '../middleware/performance-enhanced.js';

// Import timeframe utility functions for Issue #475
import { convertDateParamsToTimeframeQuery } from '../utils/filters/timeframe-utils.js';

// Issue #935: Search routing delegated to SearchCoordinator
import { SearchCoordinator } from './search/SearchCoordinator.js';

/**
 * UniversalSearchService provides centralized record search functionality
 * Issue #935: Strategy initialization delegated to StrategyFactory via SearchCoordinator
 */
export class UniversalSearchService {
  /**
   * Universal search handler with performance tracking
   */
  static async searchRecords(
    params: UniversalSearchParams
  ): Promise<AttioRecord[]> {
    const {
      resource_type,
      query,
      filters,
      limit,
      offset,
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
    let results: AttioRecord[];

    try {
      results = await this.performSearchByResourceType(resource_type, {
        query,
        filters,
        limit,
        offset,
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
  ): Promise<AttioRecord[]> {
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
