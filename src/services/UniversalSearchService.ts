/**
 * UniversalSearchService - Centralized record search operations
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 3.
 * Provides universal search functionality across all resource types with performance optimization.
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
import { debug, error } from '../utils/logger.js';

// Import services
import { ValidationService } from './ValidationService.js';
import { CachingService } from './CachingService.js';
import { UniversalUtilityService } from './UniversalUtilityService.js';

// Constants for search optimization
const CONTENT_SEARCH_FETCH_LIMIT = 100; // TODO: Consider adaptive limits based on query complexity

// Import performance tracking
import { enhancedPerformanceTracker } from '../middleware/performance-enhanced.js';

// Import error types for validation and proper error handling
import {
  FilterValidationError,
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

// Import validation for debugging circular dependencies (can be removed in production)
// console.log('UniversalSearchService: Import check');
// console.log('advancedSearchCompanies type:', typeof advancedSearchCompanies);
// console.log('advancedSearchPeople type:', typeof advancedSearchPeople);
// console.log('searchLists type:', typeof searchLists);
// console.log('listObjectRecords type:', typeof listObjectRecords);
// console.log('listTasks type:', typeof listTasks);

// Import guardrails
import { assertNoMockInE2E } from './_guards.js';

// Dynamic imports for better error handling in environments where functions might not be available
const ensureAdvancedSearchCompanies = async () => {
  try {
    // Log more details about what's happening
    debug(
      'UniversalSearchService',
      'Checking advancedSearchCompanies availability',
      { type: typeof advancedSearchCompanies }
    );
    if (typeof advancedSearchCompanies !== 'function') {
      error(
        'UniversalSearchService',
        'advancedSearchCompanies is not a function',
        { advancedSearchCompanies }
      );
      return null;
    }
    return advancedSearchCompanies;
  } catch (err) {
    error(
      'UniversalSearchService',
      'Error accessing advancedSearchCompanies',
      err
    );
    return null;
  }
};

const ensureAdvancedSearchPeople = async () => {
  try {
    debug(
      'UniversalSearchService',
      'Checking advancedSearchPeople availability',
      { type: typeof advancedSearchPeople }
    );
    if (typeof advancedSearchPeople !== 'function') {
      error(
        'UniversalSearchService',
        'advancedSearchPeople is not a function',
        { advancedSearchPeople }
      );
      return null;
    }
    return advancedSearchPeople;
  } catch (err) {
    error(
      'UniversalSearchService',
      'Error accessing advancedSearchPeople',
      err
    );
    return null;
  }
};

// Import Attio client for deal queries
import { getAttioClient } from '../api/attio-client.js';

// Import factory for guard checks
import { shouldUseMockData } from './create/index.js';

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

/**
 * UniversalSearchService provides centralized record search functionality
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
          search_type,
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
   * Perform search by resource type with type-specific handling
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

    // Handle new search types first
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
        // Otherwise, fall back to legacy content search for backward compatibility
        if (content_fields && content_fields.length > 0) {
          if (!query) {
            throw new Error('Content search requires query parameter');
          }
          return this.searchByContent(
            resource_type,
            query,
            content_fields,
            use_or_logic !== false, // Default to true
            limit,
            offset
          );
        }
        // Fall through to legacy content search behavior
        break;
    }

    switch (resource_type) {
      case UniversalResourceType.COMPANIES:
        return this.searchCompanies(
          query,
          filters,
          limit,
          offset,
          search_type,
          fields,
          match_type,
          sort,
          // Issue #475: Pass timeframe parameters
          {
            timeframe_attribute,
            start_date,
            end_date,
            date_operator,
          }
        );

      case UniversalResourceType.PEOPLE:
        return this.searchPeople(
          query,
          filters,
          limit,
          offset,
          search_type,
          fields,
          match_type,
          sort,
          // Issue #475: Pass timeframe parameters
          {
            timeframe_attribute,
            start_date,
            end_date,
            date_operator,
          }
        );

      case UniversalResourceType.LISTS:
        return this.searchLists(
          query,
          limit,
          offset,
          search_type,
          fields,
          match_type,
          sort
        );

      case UniversalResourceType.RECORDS:
        return this.searchRecords_ObjectType(limit, offset, filters);

      case UniversalResourceType.DEALS:
        return this.searchDeals(limit, offset, query);

      case UniversalResourceType.TASKS:
        return this.searchTasks(
          perfId,
          apiStart,
          query,
          limit,
          offset,
          search_type,
          fields,
          match_type,
          sort
        );

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

  /**
   * Search companies with advanced filtering and content search
   */
  private static async searchCompanies(
    query?: string,
    filters?: Record<string, unknown>,
    limit?: number,
    offset?: number,
    search_type: SearchType = SearchType.BASIC,
    fields?: string[],
    match_type: MatchType = MatchType.PARTIAL,
    sort: SortType = SortType.NAME,
    // Issue #475: Add timeframe parameters
    timeframeParams?: {
      timeframe_attribute?: string;
      start_date?: string;
      end_date?: string;
      date_operator?: 'greater_than' | 'less_than' | 'between' | 'equals';
    }
  ): Promise<AttioRecord[]> {
    // Issue #475: Merge timeframe parameters into filters
    let enhancedFilters = filters;
    if (
      timeframeParams?.timeframe_attribute &&
      (timeframeParams.start_date || timeframeParams.end_date)
    ) {
      const dateFilter = this.createDateFilter(timeframeParams);
      if (dateFilter) {
        enhancedFilters = this.mergeFilters(filters, dateFilter);
      }
    }

    if (enhancedFilters) {
      const searchFn = await ensureAdvancedSearchCompanies();
      if (!searchFn) {
        throw new Error('Companies search function not available');
      }
      // FilterValidationError will bubble up naturally from searchFn, including for invalid empty filters
      return await searchFn(enhancedFilters, limit, offset);
    } else if (query && query.trim().length > 0) {
      // Auto-detect domain-like queries and search domains field specifically
      const looksLikeDomain =
        query.includes('.') ||
        query.includes('www') ||
        query.includes('http') ||
        /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(query);

      if (looksLikeDomain) {
        // Use domain-specific search for better accuracy
        const domainFilters = {
          filters: [
            {
              attribute: { slug: 'domains' },
              condition: 'contains',
              value: query,
            },
          ],
        };
        const searchFn = await ensureAdvancedSearchCompanies();
        if (!searchFn) {
          throw new Error('Companies search function not available');
        }
        return await searchFn(domainFilters, limit, offset);
      }

      // Handle content search vs basic search
      if (search_type === SearchType.CONTENT) {
        // Content search - search across multiple text fields including domains
        const searchFields =
          fields && fields.length > 0
            ? fields
            : ['name', 'description', 'notes', 'domains']; // Default content fields for companies

        const contentFilters = {
          filters: searchFields.map((field) => ({
            attribute: { slug: field },
            condition: match_type === MatchType.EXACT ? 'equals' : 'contains',
            value: query,
          })),
          matchAny: true, // Use OR logic to match any field
        };

        const searchFn = await ensureAdvancedSearchCompanies();
        if (!searchFn) {
          throw new Error('Companies search function not available');
        }
        // FilterValidationError will bubble up naturally from searchFn
        const results = await searchFn(contentFilters, limit, offset);

        // Apply relevance ranking if requested
        if (sort === SortType.RELEVANCE) {
          return this.rankByRelevance(results, query, searchFields);
        }

        return results;
      } else {
        // Basic search - search name field only
        const nameFilters = {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: match_type === MatchType.EXACT ? 'equals' : 'contains',
              value: query,
            },
          ],
        };
        const searchFn = await ensureAdvancedSearchCompanies();
        if (!searchFn) {
          throw new Error('Companies search function not available');
        }
        // FilterValidationError will bubble up naturally from searchFn
        return await searchFn(nameFilters, limit, offset);
      }
    } else {
      // No query and no filters - use advanced search with empty filters for pagination
      // Defensive: Some APIs may not support empty filters, handle gracefully
      try {
        const searchFn = await ensureAdvancedSearchCompanies();
        if (!searchFn) {
          throw new Error('Companies search function not available');
        }
        return await searchFn({ filters: [] }, limit, offset);
      } catch (error: unknown) {
        // Let FilterValidationError bubble up for proper error handling
        if (error instanceof FilterValidationError) {
          throw error;
        }

        // If empty filters aren't supported, return empty array rather than failing
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.warn(
          'Companies search with empty filters failed, returning empty results:',
          errorMessage
        );
        return [];
      }
    }
  }

  /**
   * Search people with advanced filtering, name/email search, and content search
   */
  private static async searchPeople(
    query?: string,
    filters?: Record<string, unknown>,
    limit?: number,
    offset?: number,
    search_type: SearchType = SearchType.BASIC,
    fields?: string[],
    match_type: MatchType = MatchType.PARTIAL,
    sort: SortType = SortType.NAME,
    // Issue #475: Add timeframe parameters
    timeframeParams?: {
      timeframe_attribute?: string;
      start_date?: string;
      end_date?: string;
      date_operator?: 'greater_than' | 'less_than' | 'between' | 'equals';
    }
  ): Promise<AttioRecord[]> {
    // Issue #475: Merge timeframe parameters into filters
    let enhancedFilters = filters;
    if (
      timeframeParams?.timeframe_attribute &&
      (timeframeParams.start_date || timeframeParams.end_date)
    ) {
      const dateFilter = this.createDateFilter(timeframeParams);
      if (dateFilter) {
        enhancedFilters = this.mergeFilters(filters, dateFilter);
      }
    }

    if (enhancedFilters) {
      const searchFn = await ensureAdvancedSearchPeople();
      if (!searchFn) {
        throw new Error('People search function not available');
      }
      // FilterValidationError will bubble up naturally from searchFn, including for invalid empty filters
      const paginatedResult = await searchFn(enhancedFilters, {
        limit,
        offset,
      });
      return paginatedResult.results;
    } else if (query && query.trim().length > 0) {
      // Auto-detect email-like queries and search email field specifically
      const looksLikeEmail =
        query.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);

      if (looksLikeEmail) {
        // Use email-specific search for better accuracy
        const emailFilters = {
          filters: [
            {
              attribute: { slug: 'email_addresses' },
              condition: 'contains',
              value: query,
            },
          ],
        };
        const searchFn = await ensureAdvancedSearchPeople();
        if (!searchFn) {
          throw new Error('People search function not available');
        }
        const paginatedResult = await searchFn(emailFilters, {
          limit,
          offset,
        });
        return paginatedResult.results;
      }

      // Handle content search vs basic search
      if (search_type === SearchType.CONTENT) {
        // Content search - search across multiple text fields
        const searchFields =
          fields && fields.length > 0
            ? fields
            : ['name', 'notes', 'email_addresses', 'job_title']; // Default content fields for people

        const contentFilters = {
          filters: searchFields.map((field) => ({
            attribute: { slug: field },
            condition: match_type === MatchType.EXACT ? 'equals' : 'contains',
            value: query,
          })),
          matchAny: true, // Use OR logic to match any field
        };

        const searchFn = await ensureAdvancedSearchPeople();
        if (!searchFn) {
          throw new Error('People search function not available');
        }
        const paginatedResult = await searchFn(contentFilters, {
          limit,
          offset,
        });

        // Apply relevance ranking if requested
        if (sort === SortType.RELEVANCE) {
          return this.rankByRelevance(
            paginatedResult.results,
            query,
            searchFields
          );
        }

        return paginatedResult.results;
      } else {
        // Basic search - search name and email fields only
        const nameEmailFilters = {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: match_type === MatchType.EXACT ? 'equals' : 'contains',
              value: query,
            },
            {
              attribute: { slug: 'email_addresses' },
              condition: match_type === MatchType.EXACT ? 'equals' : 'contains',
              value: query,
            },
          ],
          matchAny: true, // Use OR logic to match either name or email
        };
        const searchFn = await ensureAdvancedSearchPeople();
        if (!searchFn) {
          throw new Error('People search function not available');
        }
        const paginatedResult = await searchFn(nameEmailFilters, {
          limit,
          offset,
        });
        return paginatedResult.results;
      }
    } else {
      // No query and no filters - use advanced search with empty filters for pagination
      // Defensive: Some APIs may not support empty filters, handle gracefully
      try {
        const searchFn = await ensureAdvancedSearchPeople();
        if (!searchFn) {
          throw new Error('People search function not available');
        }
        const paginatedResult = await searchFn(
          { filters: [] },
          { limit, offset }
        );
        return paginatedResult.results;
      } catch (error: unknown) {
        // If empty filters aren't supported, return empty array rather than failing
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.warn(
          'People search with empty filters failed, returning empty results:',
          errorMessage
        );
        return [];
      }
    }
  }

  /**
   * Search lists with content search support and convert to AttioRecord format
   */
  private static async searchLists(
    query?: string,
    limit?: number,
    offset?: number,
    search_type: SearchType = SearchType.BASIC,
    fields?: string[],
    match_type: MatchType = MatchType.PARTIAL,
    sort: SortType = SortType.NAME
  ): Promise<AttioRecord[]> {
    // Check for mock usage in E2E mode and throw if forbidden
    if (shouldUseMockData()) {
      assertNoMockInE2E();
      // Mock service doesn't support list search - return empty array
      return [];
    }

    try {
      // For content search, fetch all lists to enable client-side filtering
      let searchQuery = '';
      let requestLimit = limit || 10;

      if (search_type === SearchType.CONTENT && query && query.trim()) {
        // Fetch more lists for client-side filtering
        searchQuery = '';
        requestLimit = CONTENT_SEARCH_FETCH_LIMIT; // Increased to allow for filtering
      } else if (query && query.trim().length > 0) {
        searchQuery = query;
      }

      const lists = await searchLists(searchQuery, requestLimit, 0);

      // Convert AttioList[] to AttioRecord[] format
      let records = lists.map(
        (list) =>
          ({
            id: {
              record_id: list.id.list_id,
              list_id: list.id.list_id,
            },
            values: {
              name: list.name || list.title,
              description: list.description,
              parent_object: list.object_slug || list.parent_object,
              api_slug: list.api_slug,
              workspace_id: list.workspace_id,
              workspace_member_access: list.workspace_member_access,
              created_at: list.created_at,
            },
          }) as unknown as AttioRecord
      );

      // Apply content search filtering if requested
      if (search_type === SearchType.CONTENT && query && query.trim()) {
        const searchFields = fields || ['name', 'description'];
        const queryLower = query.trim().toLowerCase();

        records = records.filter((record: AttioRecord) => {
          return searchFields.some((field) => {
            const fieldValue = this.getListFieldValue(record, field);
            if (match_type === MatchType.EXACT) {
              return fieldValue.toLowerCase() === queryLower;
            } else {
              return fieldValue.toLowerCase().includes(queryLower);
            }
          });
        });

        // Apply relevance ranking if requested
        if (sort === SortType.RELEVANCE) {
          records = this.rankByRelevance(records, query, searchFields);
        }

        // Apply pagination to filtered results
        const start = offset || 0;
        const end = start + (limit || 10);
        return records.slice(start, end);
      }

      return records;
    } catch (error: unknown) {
      // Handle benign status codes (404/204) by returning empty success
      if (error && typeof error === 'object' && 'status' in error) {
        const statusError = error as { status?: number };
        if (statusError.status === 404 || statusError.status === 204) {
          // Lists discovery should never fail - return empty array for benign errors
          return [];
        }
      }

      // Check error message for common "not found" scenarios
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message).toLowerCase();
        if (message.includes('not found') || message.includes('no lists')) {
          return [];
        }
      }

      // For other errors (network/transport), bubble them up
      throw error;
    }
  }

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
      // For valid UUID, we would normally pass this to the API
      // but listObjectRecords doesn't support filters yet
      console.warn(
        'list_membership filter not yet supported in listObjectRecords'
      );
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
    // Use POST query endpoint for deals with optional name filtering
    return this.queryDealRecords({ limit, offset, query });
  }

  /**
   * Query deal records using the proper Attio API endpoint with client-side filtering
   * Note: Attio deals API only supports exact matching, so we implement client-side filtering
   */
  private static async queryDealRecords(params: {
    limit?: number;
    offset?: number;
    query?: string;
  }): Promise<AttioRecord[]> {
    const { limit = 10, offset = 0, query } = params;
    const client = getAttioClient();
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
            return exactResults; // Return exact match results
          }
        } catch {
          // If exact match fails, fall through to partial matching
          console.debug('Exact match failed, trying client-side filtering');
        }
      }

      // Fetch all deals for client-side filtering (Attio doesn't support partial matching)
      const allDealsResponse = await client.post(
        '/objects/deals/records/query',
        {
          limit: 100, // Fetch up to 100 deals for filtering
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
      console.error('Failed to query deal records:', error);
      // If the query endpoint also fails, try the simpler approach
      if (error && typeof error === 'object' && 'response' in error) {
        const httpError = error as { response: { status: number } };
        if (httpError.response.status === 404) {
          console.error(
            'Deal query endpoint not found, falling back to empty results'
          );
          return [];
        }
      }
      // For other errors, return empty array rather than propagating the error
      console.warn(
        'Deal query failed with unexpected error, returning empty results'
      );
      return [];
    }
  }

  /**
   * Search tasks with performance optimization, caching, and content search support
   */
  private static async searchTasks(
    perfId: string,
    apiStart: number,
    query?: string,
    limit?: number,
    offset?: number,
    search_type: SearchType = SearchType.BASIC,
    fields?: string[],
    match_type: MatchType = MatchType.PARTIAL,
    sort: SortType = SortType.NAME
  ): Promise<AttioRecord[]> {
    /**
     * PERFORMANCE-OPTIMIZED TASKS PAGINATION
     *
     * The Attio Tasks API does not support native pagination parameters.
     * This implementation uses smart caching and performance monitoring to
     * minimize the performance impact of loading all tasks.
     *
     * Optimizations:
     * - Smart caching with 30-second TTL to avoid repeated full loads
     * - Performance warnings for large datasets (>500 tasks)
     * - Early termination for large offsets
     * - Memory usage monitoring and cleanup
     */

    // Use CachingService for tasks data management
    const loadTasksData = async (): Promise<AttioRecord[]> => {
      try {
        const tasksList = await listTasks();

        // Convert tasks to records and ensure it's always an array
        if (!Array.isArray(tasksList)) {
          console.warn(
            `⚠️  TASKS API WARNING: listTasks() returned non-array value:`,
            typeof tasksList
          );
          return [];
        } else {
          // Convert AttioTask[] to AttioRecord[]
          return tasksList.map(UniversalUtilityService.convertTaskToRecord);
        }
      } catch (error: unknown) {
        console.error(`Failed to load tasks from API:`, error);
        return []; // Fallback to empty array
      }
    };

    const { data: tasks, fromCache } =
      await CachingService.getOrLoadTasks(loadTasksData);

    // Performance warning for large datasets
    if (!fromCache && tasks.length > 500) {
      console.warn(
        `⚠️  PERFORMANCE WARNING: Loading ${tasks.length} tasks. ` +
          `Consider requesting Attio API pagination support for tasks endpoint.`
      );
    }

    // Log performance metrics
    if (!fromCache) {
      enhancedPerformanceTracker.markTiming(
        perfId,
        'attioApi',
        performance.now() - apiStart
      );
    } else {
      enhancedPerformanceTracker.markTiming(perfId, 'other', 1);
    }

    // Handle empty dataset cleanly
    if (tasks.length === 0) {
      return []; // No warning for empty datasets
    }

    // Apply content search filtering if requested
    let filteredTasks = tasks;
    if (search_type === SearchType.CONTENT && query && query.trim()) {
      const searchFields = fields || ['content', 'title', 'content_plaintext'];
      const queryLower = query.trim().toLowerCase();

      filteredTasks = tasks.filter((task: AttioRecord) => {
        return searchFields.some((field) => {
          const fieldValue = this.getTaskFieldValue(task, field);
          if (match_type === MatchType.EXACT) {
            return fieldValue.toLowerCase() === queryLower;
          } else {
            return fieldValue.toLowerCase().includes(queryLower);
          }
        });
      });

      // Apply relevance ranking if requested
      if (sort === SortType.RELEVANCE) {
        filteredTasks = this.rankByRelevance(
          filteredTasks,
          query,
          searchFields
        );
      }
    }

    // Smart pagination with early termination for unreasonable offsets
    const start = offset || 0;
    const requestedLimit = limit || 10;

    // Performance optimization: Don't process if offset exceeds dataset
    if (start >= filteredTasks.length) {
      console.info(
        `Tasks pagination: offset ${start} exceeds filtered dataset size ${filteredTasks.length}, returning empty results`
      );
      return [];
    } else {
      const end = Math.min(start + requestedLimit, filteredTasks.length);
      const paginatedTasks = filteredTasks.slice(start, end);

      // Log pagination performance metrics
      enhancedPerformanceTracker.markTiming(
        perfId,
        'serialization',
        fromCache ? 1 : performance.now() - apiStart
      );

      return paginatedTasks;
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

      // Apply query-based filtering if query provided (client-side filtering)
      let results = normalizedNotes;
      if (query && query.trim()) {
        const queryLower = query.toLowerCase().trim();
        results = normalizedNotes.filter((record) => {
          // Search in title and content fields
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

      // Log serialization performance
      enhancedPerformanceTracker.markTiming(
        perfId,
        'serialization',
        performance.now() - apiStart
      );

      return results;
    } catch (error: unknown) {
      console.error('Failed to search notes:', error);

      // Log error metrics
      enhancedPerformanceTracker.markTiming(
        perfId,
        'other',
        performance.now() - apiStart
      );

      // Return empty array on error to maintain consistent behavior
      return [];
    }
  }

  /**
   * Search records by relationship (TC-010)
   * Uses proper query API with path-based filtering for connected records
   */
  static async searchByRelationship(
    sourceResourceType: UniversalResourceType,
    targetResourceType: UniversalResourceType,
    targetRecordId: string,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
    const client = getAttioClient();

    // Create relationship query using the proper query API format
    const relationshipQuery: RelationshipQuery = {
      sourceObjectType: sourceResourceType,
      targetObjectType: targetResourceType,
      targetAttribute: 'id',
      condition: 'equals',
      value: targetRecordId,
    };

    const queryApiFilter = createRelationshipQuery(relationshipQuery);

    try {
      const path = `/objects/${sourceResourceType}/records/query`;
      const requestBody = {
        ...queryApiFilter,
        limit: limit || 10,
        offset: offset || 0,
      };

      const response = await client.post(path, requestBody);
      return response?.data?.data || [];
    } catch (error: unknown) {
      // Handle critical errors that should not be silently ignored
      const apiError = createApiErrorFromAxiosError(
        error,
        `/objects/${sourceResourceType}/records/query`,
        'POST'
      );

      // Re-throw critical errors (auth, network, server errors)
      if (
        apiError instanceof AuthenticationError ||
        apiError instanceof AuthorizationError ||
        apiError instanceof NetworkError ||
        apiError instanceof RateLimitError ||
        apiError instanceof ServerError
      ) {
        throw apiError;
      }

      // For benign errors (404 - no relationships found), return empty array gracefully
      if (apiError instanceof ResourceNotFoundError) {
        debug(
          'UniversalSearchService',
          `No relationship found between ${sourceResourceType} -> ${targetResourceType}`,
          { targetRecordId }
        );
        return [];
      }

      // For other errors, log and return empty (graceful degradation)
      console.error(
        `Relationship search failed for ${sourceResourceType} -> ${targetResourceType}:`,
        error
      );
      return [];
    }
  }

  /**
   * Search records by timeframe (TC-012)
   * Uses proper query API with date constraints
   */
  static async searchByTimeframe(
    resourceType: UniversalResourceType,
    timeframeConfig: TimeframeQuery,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
    const client = getAttioClient();

    const queryApiFilter = createTimeframeQuery(timeframeConfig);

    try {
      const path = `/objects/${resourceType}/records/query`;
      const requestBody = {
        ...queryApiFilter,
        limit: limit || 10,
        offset: offset || 0,
      };

      const response = await client.post(path, requestBody);
      return response?.data?.data || [];
    } catch (error: unknown) {
      // Handle critical errors that should not be silently ignored
      const apiError = createApiErrorFromAxiosError(
        error,
        `/objects/${resourceType}/records/query`,
        'POST'
      );

      // Re-throw critical errors (auth, network, server errors)
      if (
        apiError instanceof AuthenticationError ||
        apiError instanceof AuthorizationError ||
        apiError instanceof NetworkError ||
        apiError instanceof RateLimitError ||
        apiError instanceof ServerError
      ) {
        throw apiError;
      }

      // For benign errors (404 - no records in timeframe), return empty array gracefully
      if (apiError instanceof ResourceNotFoundError) {
        debug(
          'UniversalSearchService',
          `No ${resourceType} records found in specified timeframe`,
          { timeframeConfig }
        );
        return [];
      }

      // For other errors, log and return empty (graceful degradation)
      console.error(`Timeframe search failed for ${resourceType}:`, error);
      return [];
    }
  }

  /**
   * Enhanced content search using proper query API (TC-011)
   * Uses path-based filtering instead of the old filter format
   */
  static async searchByContent(
    resourceType: UniversalResourceType,
    query: string,
    searchFields: string[] = [],
    useOrLogic: boolean = true,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
    const client = getAttioClient();

    // Use default fields based on resource type if none provided
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
      const path = `/objects/${resourceType}/records/query`;
      const requestBody = {
        ...queryApiFilter,
        limit: limit || 10,
        offset: offset || 0,
      };

      const response = await client.post(path, requestBody);
      return response?.data?.data || [];
    } catch (error: unknown) {
      // Handle critical errors that should not be silently ignored
      const apiError = createApiErrorFromAxiosError(
        error,
        `/objects/${resourceType}/records/query`,
        'POST'
      );

      // Re-throw critical errors (auth, network, server errors)
      if (
        apiError instanceof AuthenticationError ||
        apiError instanceof AuthorizationError ||
        apiError instanceof NetworkError ||
        apiError instanceof RateLimitError ||
        apiError instanceof ServerError
      ) {
        throw apiError;
      }

      // For benign errors (404 - no content matches), return empty array gracefully
      if (apiError instanceof ResourceNotFoundError) {
        debug(
          'UniversalSearchService',
          `No ${resourceType} records found matching content search`,
          { query, fields }
        );
        return [];
      }

      // For other errors, log and return empty (graceful degradation)
      console.error(`Content search failed for ${resourceType}:`, error);
      return [];
    }
  }

  /**
   * Get search suggestions for a resource type
   */
  static async getSearchSuggestions(
    _resource_type: UniversalResourceType,
    _partialQuery: string
  ): Promise<string[]> {
    // For now, return empty array - could be enhanced with actual suggestion logic
    // TODO: implement limit parameter when actual suggestion logic is added
    return [];
  }

  /**
   * Count total records for a resource type (without loading all data)
   */
  static async getRecordCount(
    resource_type: UniversalResourceType
  ): Promise<number> {
    // TODO: implement filters parameter when count-specific endpoints are added
    // For most resource types, we'd need to implement count-specific endpoints
    // For now, return -1 to indicate count is not available without full search
    switch (resource_type) {
      case UniversalResourceType.TASKS: {
        // For tasks, we can get the cached count if available
        const cachedTasks = CachingService.getCachedTasks('tasks_cache');
        return cachedTasks ? cachedTasks.length : -1;
      }
      default:
        return -1; // Count not available without full search
    }
  }

  /**
   * Check if a resource type supports advanced filtering
   */
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
        return false; // Basic search only
      default:
        return false;
    }
  }

  /**
   * Check if a resource type supports query-based search
   */
  static supportsQuerySearch(resource_type: UniversalResourceType): boolean {
    switch (resource_type) {
      case UniversalResourceType.COMPANIES:
      case UniversalResourceType.PEOPLE:
      case UniversalResourceType.LISTS:
        return true;
      case UniversalResourceType.RECORDS:
      case UniversalResourceType.DEALS:
      case UniversalResourceType.TASKS:
        return false; // List all only
      default:
        return false;
    }
  }

  /**
   * Rank search results by relevance based on query match frequency
   * This provides client-side relevance scoring since Attio API doesn't have native relevance ranking
   */
  private static rankByRelevance(
    results: AttioRecord[],
    query: string,
    searchFields: string[]
  ): AttioRecord[] {
    // Calculate relevance score for each result
    const scoredResults = results.map((record) => {
      let score = 0;
      const queryLower = query.toLowerCase();

      // Check each search field for matches
      searchFields.forEach((field) => {
        const fieldValue = this.getFieldValue(record, field);
        if (fieldValue) {
          const valueLower = fieldValue.toLowerCase();

          // Exact match gets highest score
          if (valueLower === queryLower) {
            score += 100;
          }
          // Starts with query gets high score
          else if (valueLower.startsWith(queryLower)) {
            score += 50;
          }
          // Contains query gets moderate score
          else if (valueLower.includes(queryLower)) {
            score += 25;
            // Additional score for more occurrences
            const matches = valueLower.split(queryLower).length - 1;
            score += matches * 10;
          }
          // Partial word match gets lower score
          else {
            const queryWords = queryLower.split(/\s+/);
            queryWords.forEach((word) => {
              if (valueLower.includes(word)) {
                score += 5;
              }
            });
          }
        }
      });

      return { record, score };
    });

    // Sort by score (descending) then by name
    scoredResults.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Secondary sort by name if scores are equal
      const nameA = this.getFieldValue(a.record, 'name') || '';
      const nameB = this.getFieldValue(b.record, 'name') || '';
      return nameA.localeCompare(nameB);
    });

    return scoredResults.map((item) => item.record);
  }

  /**
   * Helper method to extract field value from a list record for content search
   * @param list - The list record to extract the field value from
   * @param field - The field name to extract (e.g., 'name', 'description')
   * @returns The field value as a string, or empty string if not found
   */
  private static getListFieldValue(list: AttioRecord, field: string): string {
    const values = list.values as Record<string, unknown>;
    if (!values) return '';

    const fieldValue = values[field];

    // Handle different field value structures for lists
    if (typeof fieldValue === 'string') {
      return fieldValue;
    } else if (
      fieldValue &&
      typeof fieldValue === 'object' &&
      'value' in fieldValue
    ) {
      return String((fieldValue as { value: unknown }).value || '');
    }

    return '';
  }

  /**
   * Helper method to extract field value from a task record for content search
   * @param task - The task record to extract the field value from
   * @param field - The field name to extract (e.g., 'content', 'title', 'content_plaintext')
   * @returns The field value as a string, or empty string if not found
   */
  private static getTaskFieldValue(task: AttioRecord, field: string): string {
    const values = task.values as Record<string, unknown>;
    if (!values) return '';

    const fieldValue = values[field];

    // Handle different field value structures for tasks
    if (typeof fieldValue === 'string') {
      return fieldValue;
    } else if (
      fieldValue &&
      typeof fieldValue === 'object' &&
      'value' in fieldValue
    ) {
      return String((fieldValue as { value: unknown }).value || '');
    }

    return '';
  }

  /**
   * Helper method to extract field value from a record
   */
  private static getFieldValue(record: AttioRecord, field: string): string {
    const values = record.values as Record<string, unknown>;
    if (!values) return '';

    const fieldValue = values[field];

    // Handle different field value structures
    if (typeof fieldValue === 'string') {
      return fieldValue;
    } else if (Array.isArray(fieldValue) && fieldValue.length > 0) {
      // For array fields like email_addresses, get the first value
      const firstItem = fieldValue[0];
      if (typeof firstItem === 'string') {
        return firstItem;
      } else if (
        firstItem &&
        typeof firstItem === 'object' &&
        'value' in firstItem
      ) {
        return String(firstItem.value || '');
      }
    } else if (
      fieldValue &&
      typeof fieldValue === 'object' &&
      'value' in fieldValue
    ) {
      return String((fieldValue as { value: unknown }).value || '');
    }

    return '';
  }

  /**
   * Issue #475: Create date filter from timeframe parameters
   */
  private static createDateFilter(timeframeParams: {
    timeframe_attribute?: string;
    start_date?: string;
    end_date?: string;
    date_operator?: 'greater_than' | 'less_than' | 'between' | 'equals';
  }): Record<string, unknown> | null {
    const { timeframe_attribute, start_date, end_date, date_operator } =
      timeframeParams;

    if (!timeframe_attribute) {
      return null;
    }

    const filters: Array<Record<string, unknown>> = [];

    if (date_operator === 'between' && start_date && end_date) {
      // Between date range
      filters.push({
        attribute: { slug: timeframe_attribute },
        condition: 'greater_than_or_equal_to',
        value: start_date,
      });
      filters.push({
        attribute: { slug: timeframe_attribute },
        condition: 'less_than_or_equal_to',
        value: end_date,
      });
    } else if (date_operator === 'greater_than' && start_date) {
      // After start date
      filters.push({
        attribute: { slug: timeframe_attribute },
        condition: 'greater_than_or_equal_to',
        value: start_date,
      });
    } else if (date_operator === 'less_than' && end_date) {
      // Before end date
      filters.push({
        attribute: { slug: timeframe_attribute },
        condition: 'less_than_or_equal_to',
        value: end_date,
      });
    } else if (date_operator === 'equals' && start_date) {
      // Exact date match
      filters.push({
        attribute: { slug: timeframe_attribute },
        condition: 'equals',
        value: start_date,
      });
    }

    if (filters.length === 0) {
      return null;
    }

    return {
      filters,
      matchAny: false, // Use AND logic for date ranges
    };
  }

  /**
   * Issue #475: Merge timeframe filters with existing filters
   */
  private static mergeFilters(
    existingFilters: Record<string, unknown> | undefined,
    dateFilter: Record<string, unknown>
  ): Record<string, unknown> {
    if (!existingFilters) {
      return dateFilter;
    }

    // If existing filters already has a filters array, merge them
    if (
      Array.isArray(existingFilters.filters) &&
      Array.isArray(dateFilter.filters)
    ) {
      return {
        ...existingFilters,
        filters: [...existingFilters.filters, ...dateFilter.filters],
      };
    }

    // Otherwise, create a new structure with both sets of filters
    const existingFilterArray = Array.isArray(existingFilters.filters)
      ? existingFilters.filters
      : [];
    const dateFilterArray = Array.isArray(dateFilter.filters)
      ? dateFilter.filters
      : [];

    return {
      ...existingFilters,
      filters: [...existingFilterArray, ...dateFilterArray],
      // Preserve existing matchAny logic if it exists
      matchAny: existingFilters.matchAny || false,
    };
  }
}
