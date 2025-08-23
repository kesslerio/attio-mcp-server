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

// Import services
import { ValidationService } from './ValidationService.js';
import { CachingService } from './CachingService.js';
import { UniversalUtilityService } from './UniversalUtilityService.js';

// Import performance tracking
import { enhancedPerformanceTracker } from '../middleware/performance-enhanced.js';

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
import { assertNoMockInE2E, assertListMembershipRoute } from './_guards.js';

// Dynamic imports for better error handling in environments where functions might not be available
const ensureAdvancedSearchCompanies = async () => {
  try {
    // Log more details about what's happening
    console.log(
      'Checking advancedSearchCompanies availability:',
      typeof advancedSearchCompanies
    );
    if (typeof advancedSearchCompanies !== 'function') {
      console.error(
        'advancedSearchCompanies is not a function:',
        advancedSearchCompanies
      );
      return null;
    }
    return advancedSearchCompanies;
  } catch (error) {
    console.error('Error accessing advancedSearchCompanies:', error);
    console.error(
      'Error stack:',
      error instanceof Error ? error.stack : 'No stack'
    );
    return null;
  }
};

const ensureAdvancedSearchPeople = async () => {
  try {
    console.log(
      'Checking advancedSearchPeople availability:',
      typeof advancedSearchPeople
    );
    if (typeof advancedSearchPeople !== 'function') {
      console.error(
        'advancedSearchPeople is not a function:',
        advancedSearchPeople
      );
      return null;
    }
    return advancedSearchPeople;
  } catch (error) {
    console.error('Error accessing advancedSearchPeople:', error);
    console.error(
      'Error stack:',
      error instanceof Error ? error.stack : 'No stack'
    );
    return null;
  }
};

// Import Attio client for deal queries
import { getAttioClient } from '../api/attio-client.js';

// Import MockService for guard checks
import { MockService } from './MockService.js';

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
    } = params;

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
          sort
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
          sort
        );

      case UniversalResourceType.LISTS:
        return this.searchLists(query, limit, offset);

      case UniversalResourceType.RECORDS:
        return this.searchRecords_ObjectType(limit, offset, filters);

      case UniversalResourceType.DEALS:
        return this.searchDeals(limit, offset);

      case UniversalResourceType.TASKS:
        return this.searchTasks(perfId, apiStart, query, limit, offset);

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
    sort: SortType = SortType.NAME
  ): Promise<AttioRecord[]> {
    if (filters && Object.keys(filters).length > 0) {
      const searchFn = await ensureAdvancedSearchCompanies();
      if (!searchFn) {
        throw new Error('Companies search function not available');
      }
      return await searchFn(filters, limit, offset);
    } else if (query && query.trim().length > 0) {
      // Handle content search vs basic search
      if (search_type === SearchType.CONTENT) {
        // Content search - search across multiple text fields
        const searchFields =
          fields && fields.length > 0
            ? fields
            : ['name', 'description', 'notes']; // Default content fields for companies

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
    sort: SortType = SortType.NAME
  ): Promise<AttioRecord[]> {
    if (filters && Object.keys(filters).length > 0) {
      const searchFn = await ensureAdvancedSearchPeople();
      if (!searchFn) {
        throw new Error('People search function not available');
      }
      const paginatedResult = await searchFn(filters, {
        limit,
        offset,
      });
      return paginatedResult.results;
    } else if (query && query.trim().length > 0) {
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
   * Search lists and convert to AttioRecord format
   */
  private static async searchLists(
    query?: string,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
    // Check for MockService usage in E2E mode and throw if forbidden
    if (MockService.isUsingMockData()) {
      assertNoMockInE2E();
      // Mock service doesn't support list search - return empty array
      return [];
    }

    try {
      const lists =
        query && query.trim().length > 0
          ? await searchLists(query, limit || 10, offset || 0)
          : await searchLists('', limit || 10, offset || 0);

      // Convert AttioList[] to AttioRecord[] format
      return lists.map(
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
   * Search deals using query endpoint
   */
  private static async searchDeals(
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
    // Use POST query endpoint for deals since GET /objects/deals/records doesn't exist
    return this.queryDealRecords({ limit, offset });
  }

  /**
   * Query deal records using the proper Attio API endpoint
   */
  private static async queryDealRecords(params: {
    limit?: number;
    offset?: number;
  }): Promise<AttioRecord[]> {
    const { limit = 10, offset = 0 } = params;
    const client = getAttioClient();
    try {
      // Defensive: Ensure parameters are valid before sending to API
      const safeLimit = Math.max(1, Math.min(limit || 10, 100));
      const safeOffset = Math.max(0, offset || 0);
      // Use POST to /objects/deals/records/query (the correct Attio endpoint)
      const response = await client.post('/objects/deals/records/query', {
        limit: safeLimit,
        offset: safeOffset,
        // Add any additional query parameters as needed
      });
      return response?.data?.data || [];
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
   * Search tasks with performance optimization and caching
   */
  private static async searchTasks(
    perfId: string,
    apiStart: number,
    query?: string,
    limit?: number,
    offset?: number
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

    // Smart pagination with early termination for unreasonable offsets
    const start = offset || 0;
    const requestedLimit = limit || 10;

    // Performance optimization: Don't process if offset exceeds dataset
    if (start >= tasks.length) {
      console.info(
        `Tasks pagination: offset ${start} exceeds dataset size ${tasks.length}, returning empty results`
      );
      return [];
    } else {
      const end = Math.min(start + requestedLimit, tasks.length);
      const paginatedTasks = tasks.slice(start, end);

      // Tasks are already converted to AttioRecord[] in cache
      const results = paginatedTasks;

      // Log pagination performance metrics
      enhancedPerformanceTracker.markTiming(
        perfId,
        'serialization',
        fromCache ? 1 : performance.now() - apiStart
      );

      return results;
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
      const queryParams: Record<string, any> = {};

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
   * Get search suggestions for a resource type
   */
  static async getSearchSuggestions(
    resource_type: UniversalResourceType,
    partialQuery: string,
    limit: number = 5
  ): Promise<string[]> {
    // For now, return empty array - could be enhanced with actual suggestion logic
    return [];
  }

  /**
   * Count total records for a resource type (without loading all data)
   */
  static async getRecordCount(
    resource_type: UniversalResourceType,
    filters?: Record<string, unknown>
  ): Promise<number> {
    // For most resource types, we'd need to implement count-specific endpoints
    // For now, return -1 to indicate count is not available without full search
    switch (resource_type) {
      case UniversalResourceType.TASKS:
        // For tasks, we can get the cached count if available
        const cachedTasks = CachingService.getCachedTasks('tasks_cache');
        return cachedTasks ? cachedTasks.length : -1;
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
}
