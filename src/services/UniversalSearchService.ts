/**
 * UniversalSearchService - Centralized record search operations
 *
 * Issue #574: Refactored to use Strategy Pattern for resource-specific search logic
 * Reduced from 1800+ lines to <500 lines by extracting strategies
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
import { debug, createScopedLogger, OperationType } from '../utils/logger.js';

// Import services
import { ValidationService } from './ValidationService.js';
import { CachingService } from './CachingService.js';

// Import performance tracking
import { enhancedPerformanceTracker } from '../middleware/performance-enhanced.js';

// Import error types for validation and proper error handling
import {
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  RateLimitError,
  ServerError,
  ResourceNotFoundError,
  createApiErrorFromAxiosError,
} from '../errors/api-errors.js';

// Import resource-specific search functions
import { advancedSearchCompanies } from '../objects/companies/index.js';
import { advancedSearchPeople } from '../objects/people/index.js';
import { searchLists } from '../objects/lists.js';
import { listObjectRecords } from '../objects/records/index.js';
import { listTasks } from '../objects/tasks.js';
import { listNotes, normalizeNoteResponse } from '../objects/notes.js';

// Import guardrails

// Import Attio client for deal queries
import { getLazyAttioClient } from '../api/lazy-client.js';
import * as AttioClientModule from '../api/attio-client.js';
import type { AxiosInstance } from 'axios';

// Note: Attio client resolution is centralized in getLazyAttioClient(),
// which prefers mocked getAttioClient() during tests/offline.

// Import factory for guard checks

// Prefer the module's getAttioClient (enables Vitest mocks). Fallback to lazy client.
function resolveQueryApiClient(): AxiosInstance {
  const mod = AttioClientModule as { getAttioClient?: () => AxiosInstance };
  if (typeof mod.getAttioClient === 'function') {
    return mod.getAttioClient();
  }
  return getLazyAttioClient();
}

// Import new query API utilities
import {
  createRelationshipQuery,
  createTimeframeQuery,
  createContentSearchQuery,
} from '../utils/filters/index.js';

// Import timeframe utility functions for Issue #475
import { convertDateParamsToTimeframeQuery } from '../utils/filters/timeframe-utils.js';

// Import query API types
import { RelationshipQuery, TimeframeQuery } from '../utils/filters/types.js';

// Import search strategies
import {
  ISearchStrategy,
  CompanySearchStrategy,
  PeopleSearchStrategy,
  TaskSearchStrategy,
  ListSearchStrategy,
  StrategyDependencies,
} from './search-strategies/index.js';
import { SearchUtilities } from './search-utilities/SearchUtilities.js';
import { ensureFunctionAvailability } from './search-utilities/FunctionValidator.js';

// Dynamic imports for better error handling using extracted utility pattern
const ensureAdvancedSearchCompanies = () =>
  ensureFunctionAvailability(
    advancedSearchCompanies,
    'advancedSearchCompanies'
  );

const ensureAdvancedSearchPeople = () =>
  ensureFunctionAvailability(advancedSearchPeople, 'advancedSearchPeople');

/**
 * UniversalSearchService provides centralized record search functionality
 */
export class UniversalSearchService {
  private static strategies = new Map<UniversalResourceType, ISearchStrategy>();

  /**
   * Initialize search strategies with their dependencies
   */
  private static async initializeStrategies(): Promise<void> {
    if (this.strategies.size > 0) {
      return; // Already initialized
    }

    // Create dependencies for strategies
    const companyDependencies: StrategyDependencies = {
      advancedSearchFunction: await ensureAdvancedSearchCompanies(),
      createDateFilter: SearchUtilities.createDateFilter,
      mergeFilters: SearchUtilities.mergeFilters,
      rankByRelevance: SearchUtilities.rankByRelevance.bind(SearchUtilities),
      getFieldValue: SearchUtilities.getFieldValue.bind(SearchUtilities),
    };

    const peopleDependencies: StrategyDependencies = {
      paginatedSearchFunction: await ensureAdvancedSearchPeople(),
      createDateFilter: SearchUtilities.createDateFilter,
      mergeFilters: SearchUtilities.mergeFilters,
      rankByRelevance: SearchUtilities.rankByRelevance.bind(SearchUtilities),
      getFieldValue: SearchUtilities.getFieldValue.bind(SearchUtilities),
    };

    const listDependencies: StrategyDependencies = {
      listFunction: (query?: string, limit?: number, offset?: number) =>
        searchLists(query || '', limit, offset),
      rankByRelevance: SearchUtilities.rankByRelevance.bind(SearchUtilities),
      getFieldValue: SearchUtilities.getFieldValue.bind(SearchUtilities),
    };

    const taskDependencies: StrategyDependencies = {
      taskFunction: (
        status?: string,
        assigneeId?: string,
        page?: number,
        pageSize?: number
      ) => listTasks(status, assigneeId, page, pageSize),
      rankByRelevance: SearchUtilities.rankByRelevance.bind(SearchUtilities),
      getFieldValue: SearchUtilities.getFieldValue.bind(SearchUtilities),
    };

    // Initialize strategies
    this.strategies.set(
      UniversalResourceType.COMPANIES,
      new CompanySearchStrategy(companyDependencies)
    );
    this.strategies.set(
      UniversalResourceType.PEOPLE,
      new PeopleSearchStrategy(peopleDependencies)
    );
    this.strategies.set(
      UniversalResourceType.LISTS,
      new ListSearchStrategy(listDependencies)
    );
    this.strategies.set(
      UniversalResourceType.TASKS,
      new TaskSearchStrategy(taskDependencies)
    );
  }

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
      results = await this.performSearchByResourceType(
        resource_type,
        {
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
        },
        perfId,
        apiStart
      );

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
   * Perform search by resource type with strategy pattern
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
      // New TC search parameters
      relationship_target_type?: UniversalResourceType;
      relationship_target_id?: string;
      timeframe_attribute?: string;
      start_date?: string;
      end_date?: string;
      date_operator?: 'greater_than' | 'less_than' | 'between' | 'equals';
      content_fields?: string[];
      use_or_logic?: boolean;
    },
    perfId: string,
    apiStart: number
  ): Promise<AttioRecord[]> {
    const {
      query,
      filters,
      limit,
      offset,
      search_type,
      fields,
      match_type,
      sort,
      relationship_target_type,
      relationship_target_id,
      timeframe_attribute,
      start_date,
      end_date,
      date_operator,
      content_fields,
      use_or_logic,
    } = params;

    // Handle new search types first (unchanged from original)
    switch (search_type) {
      case SearchType.RELATIONSHIP:
        if (relationship_target_type && relationship_target_id) {
          return this.searchByRelationship(
            resource_type,
            relationship_target_type,
            relationship_target_id,
            limit,
            offset
          );
        }
        throw new Error(
          'Relationship search requires target_type and target_id parameters'
        );

      case SearchType.TIMEFRAME:
        if (timeframe_attribute) {
          const timeframeConfig: TimeframeQuery = {
            resourceType: resource_type,
            attribute: timeframe_attribute,
            startDate: start_date,
            endDate: end_date,
            operator: date_operator || 'between',
          };
          return this.searchByTimeframe(
            resource_type,
            timeframeConfig,
            limit,
            offset
          );
        }
        throw new Error(
          'Timeframe search requires timeframe_attribute parameter'
        );

      case SearchType.CONTENT:
        // Use new Query API if content_fields is explicitly provided
        if (content_fields && content_fields.length > 0) {
          if (!query) {
            throw new Error('Content search requires query parameter');
          }
          return this.searchByContent(
            resource_type,
            query,
            content_fields,
            use_or_logic !== false,
            limit,
            offset
          );
        }
        // Fall through to strategy-based content search
        break;
    }

    // Initialize strategies if needed
    await this.initializeStrategies();

    // Use strategy pattern for resource-specific searches
    const strategy = this.strategies.get(resource_type);
    if (strategy) {
      return await strategy.search({
        query,
        filters,
        limit,
        offset,
        search_type,
        fields,
        match_type,
        sort,
        timeframeParams: {
          timeframe_attribute,
          start_date,
          end_date,
          date_operator,
        },
      });
    }

    // Fallback for resources without strategies (RECORDS, DEALS, NOTES)
    switch (resource_type) {
      case UniversalResourceType.RECORDS:
        return this.searchRecords_ObjectType(limit, offset, filters);

      case UniversalResourceType.DEALS:
        return this.searchDeals(limit, offset, query);

      case UniversalResourceType.NOTES:
        return this.searchNotes(
          perfId,
          apiStart,
          query,
          filters,
          limit,
          offset
        );

      default:
        throw new Error(
          `Unsupported resource type for search: ${resource_type}`
        );
    }
  }

  // LEGACY METHODS - These remain unchanged for non-strategy resources

  /**
   * Search records using object records API with filter support
   */
  private static async searchRecords_ObjectType(
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
        'UniversalSearchService',
        'searchRecords_ObjectType',
        OperationType.DATA_PROCESSING
      ).warn('list_membership filter not yet supported in listObjectRecords');
    }

    return await listObjectRecords('records', {
      pageSize: limit,
      page: Math.floor((offset || 0) / (limit || 10)) + 1,
    });
  }

  /**
   * Search deals using query endpoint with filtering support
   */
  private static async searchDeals(
    limit?: number,
    offset?: number,
    query?: string
  ): Promise<AttioRecord[]> {
    return this.queryDealRecords({ limit, offset, query });
  }

  /**
   * Query deal records using the proper Attio API endpoint
   */
  private static async queryDealRecords(params: {
    limit?: number;
    offset?: number;
    query?: string;
  }): Promise<AttioRecord[]> {
    const { limit = 10, offset = 0, query } = params;
    const client = getLazyAttioClient();
    try {
      // First try exact match if query provided
      if (query && query.trim()) {
        try {
          const exactMatchResponse = await client.post(
            '/objects/deals/records/query',
            {
              filter: {
                $and: [
                  {
                    path: [['deals', 'name']],
                    constraints: {
                      value: query.trim(),
                    },
                  },
                ],
              },
              limit: Math.min(limit || 10, 100),
              offset: offset || 0,
            }
          );

          const exactResults = exactMatchResponse?.data?.data || [];
          if (exactResults.length > 0) {
            return exactResults;
          }
        } catch {
          createScopedLogger('UniversalSearchService', 'dealExactMatch').debug(
            'Exact match failed, trying client-side filtering'
          );
        }
      }

      // Fetch all deals for client-side filtering
      const allDealsResponse = await client.post(
        '/objects/deals/records/query',
        {
          limit: 100,
          offset: 0,
        }
      );

      let allDeals = allDealsResponse?.data?.data || [];

      // Apply client-side filtering if query provided
      if (query && query.trim()) {
        const queryLower = query.trim().toLowerCase();
        allDeals = allDeals.filter((deal: AttioRecord) => {
          const nameField = deal.values?.name;
          const name =
            Array.isArray(nameField) && nameField[0]?.value
              ? String(nameField[0].value)
              : '';
          return name.toLowerCase().includes(queryLower);
        });
      }

      // Apply pagination to filtered results
      const start = offset || 0;
      const end = start + (limit || 10);
      return allDeals.slice(start, end);
    } catch (error: unknown) {
      createScopedLogger('UniversalSearchService', 'dealQuery').error(
        'Failed to query deal records',
        error
      );
      if (error && typeof error === 'object' && 'response' in error) {
        const httpError = error as { response: { status: number } };
        if (httpError.response.status === 404) {
          createScopedLogger('UniversalSearchService', 'dealQuery').error(
            'Deal query endpoint not found, falling back to empty results'
          );
          return [];
        }
      }
      createScopedLogger('UniversalSearchService', 'dealQuery').warn(
        'Deal query failed with unexpected error, returning empty results'
      );
      return [];
    }
  }

  /**
   * Search notes with filtering and pagination
   */
  private static async searchNotes(
    perfId: string,
    apiStart: number,
    query?: string,
    filters?: Record<string, unknown>,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
    try {
      // Build query parameters for Attio Notes API
      const queryParams: Record<string, unknown> = {};

      // Apply filters (mapped from universal filter names)
      if (filters) {
        if (filters.parent_object || filters.linked_record_type) {
          queryParams.parent_object =
            filters.parent_object || filters.linked_record_type;
        }
        if (filters.parent_record_id || filters.linked_record_id) {
          queryParams.parent_record_id =
            filters.parent_record_id || filters.linked_record_id;
        }
      }

      // Add pagination parameters
      if (limit) queryParams.limit = limit;
      if (offset) queryParams.offset = offset;

      // Call Notes API
      const response = await listNotes(queryParams);
      const notes = response.data || [];

      // Log performance metrics
      enhancedPerformanceTracker.markTiming(
        perfId,
        'attioApi',
        performance.now() - apiStart
      );

      // Normalize notes to AttioRecord format
      const normalizedNotes = notes.map((note) =>
        normalizeNoteResponse(note)
      ) as AttioRecord[];

      // Apply query-based filtering if query provided
      let results = normalizedNotes;
      if (query && query.trim()) {
        const queryLower = query.toLowerCase().trim();
        results = normalizedNotes.filter((record) => {
          const title = record.values?.title?.toString()?.toLowerCase() || '';
          const contentMarkdown =
            record.values?.content_markdown?.toString()?.toLowerCase() || '';
          const contentPlaintext =
            record.values?.content_plaintext?.toString()?.toLowerCase() || '';

          return (
            title.includes(queryLower) ||
            contentMarkdown.includes(queryLower) ||
            contentPlaintext.includes(queryLower)
          );
        });
      }

      enhancedPerformanceTracker.markTiming(
        perfId,
        'serialization',
        performance.now() - apiStart
      );

      return results;
    } catch (error: unknown) {
      createScopedLogger(
        'UniversalSearchService',
        'searchNotes',
        OperationType.API_CALL
      ).error('Failed to search notes', error);
      enhancedPerformanceTracker.markTiming(
        perfId,
        'other',
        performance.now() - apiStart
      );
      return [];
    }
  }

  // Query API methods remain unchanged
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
          'UniversalSearchService',
          `No relationship found between ${sourceResourceType} -> ${targetResourceType}`,
          { targetRecordId }
        );
        return [];
      }

      createScopedLogger(
        'UniversalSearchService',
        'searchByRelationship',
        OperationType.API_CALL
      ).error(
        `Relationship search failed for ${sourceResourceType} -> ${targetResourceType}`,
        error
      );
      return [];
    }
  }

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
          'UniversalSearchService',
          `No ${resourceType} records found in specified timeframe`,
          { timeframeConfig }
        );
        return [];
      }

      createScopedLogger(
        'UniversalSearchService',
        'searchByTimeframe',
        OperationType.API_CALL
      ).error(`Timeframe search failed for ${resourceType}`, error);
      return [];
    }
  }

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
          'UniversalSearchService',
          `No ${resourceType} records found matching content search`,
          { query, fields }
        );
        return [];
      }

      createScopedLogger(
        'UniversalSearchService',
        'searchByContent',
        OperationType.API_CALL
      ).error(`Content search failed for ${resourceType}`, error);
      return [];
    }
  }

  // Utility methods remain unchanged
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
