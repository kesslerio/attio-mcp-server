/**
 * People search strategy implementation
 * Issue #574: Extract people search logic from UniversalSearchService
 */

import { AttioRecord } from '../../types/attio.js';
import { BaseSearchStrategy } from './BaseSearchStrategy.js';
import { FilterValidationError } from '../../errors/api-errors.js';
import { SearchStrategyParams, StrategyDependencies } from './interfaces.js';
import { SearchType, MatchType, SortType, UniversalResourceType } from '../../handlers/tool-configs/universal/types.js';

/**
 * Search strategy for people with advanced filtering, name/email search, and content search
 */
export class PeopleSearchStrategy extends BaseSearchStrategy {
  constructor(dependencies: StrategyDependencies) {
    super(dependencies);
  }

  getResourceType(): string {
    return UniversalResourceType.PEOPLE;
  }

  supportsAdvancedFiltering(): boolean {
    return true;
  }

  supportsQuerySearch(): boolean {
    return true;
  }

  async search(params: SearchStrategyParams): Promise<AttioRecord[]> {
    const {
      query,
      filters,
      limit,
      offset,
      search_type = SearchType.BASIC,
      fields,
      match_type = MatchType.PARTIAL,
      sort = SortType.NAME,
      timeframeParams,
    } = params;

    // Apply timeframe filtering

    // If we have filters, use advanced search
    if (enhancedFilters) {
      return this.searchWithFilters(enhancedFilters, limit, offset);
    }

    // If we have a query, handle different search types
    if (query && query.trim().length > 0) {
      return this.searchWithQuery(
        query.trim(),
        search_type,
        fields,
        match_type,
        sort,
        limit,
        offset
      );
    }

    // No query and no filters - return paginated results
    return this.searchWithoutQuery(limit, offset);
  }

  /**
   * Search people using advanced filters
   */
  private async searchWithFilters(
    filters: Record<string, unknown>,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
    if (!this.dependencies.paginatedSearchFunction) {
      throw new Error('People search function not available');
    }

    try {
      // FilterValidationError will bubble up naturally from searchFn, including for invalid empty filters
        limit,
        offset,
      });
      return paginatedResult.results;
    } catch (error: unknown) {
      // Let FilterValidationError bubble up for proper error handling
      if (error instanceof FilterValidationError) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Search people with a text query
   */
  private async searchWithQuery(
    query: string,
    searchType: SearchType,
    fields?: string[],
    matchType: MatchType = MatchType.PARTIAL,
    sort: SortType = SortType.NAME,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
    if (!this.dependencies.paginatedSearchFunction) {
      throw new Error('People search function not available');
    }

    // Auto-detect email-like queries and search email field specifically
    if (this.looksLikeEmail(query)) {
      return this.searchByEmail(query, limit, offset);
    }

    // Handle different search types
    if (searchType === SearchType.CONTENT) {
      return this.searchByContent(query, fields, matchType, sort, limit, offset);
    } else {
      return this.searchByNameAndEmail(query, matchType, limit, offset);
    }
  }

  /**
   * Search people without any query or filters
   */
  private async searchWithoutQuery(limit?: number, offset?: number): Promise<AttioRecord[]> {
    if (!this.dependencies.paginatedSearchFunction) {
      throw new Error('People search function not available');
    }

    try {
        { filters: [] },
        { limit, offset }
      );
      return paginatedResult.results;
    } catch (error: unknown) {
      // If empty filters aren't supported, return empty array rather than failing
      console.warn(
        `People search with empty filters failed, returning empty results: ${errorMessage}`
      );
      return [];
    }
  }

  /**
   * Search people by email address
   */
  private async searchByEmail(
    query: string,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
      filters: [
        {
          attribute: { slug: 'email_addresses' },
          condition: 'contains',
          value: query,
        },
      ],
    };

    if (!this.dependencies.paginatedSearchFunction) {
      throw new Error('People search function not available');
    }

      limit,
      offset,
    });
    return paginatedResult.results;
  }

  /**
   * Search people by content across multiple fields
   */
  private async searchByContent(
    query: string,
    fields?: string[],
    matchType: MatchType = MatchType.PARTIAL,
    sort: SortType = SortType.NAME,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
    // Default content fields for people
      ? fields
      : ['name', 'notes', 'email_addresses', 'job_title'];


    if (!this.dependencies.paginatedSearchFunction) {
      throw new Error('People search function not available');
    }

      limit,
      offset,
    });

    // Apply relevance ranking if requested
    return results;
  }

  /**
   * Search people by name and email (basic search)
   */
  private async searchByNameAndEmail(
    query: string,
    matchType: MatchType = MatchType.PARTIAL,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
      filters: [
        {
          attribute: { slug: 'name' },
          condition: matchType === MatchType.EXACT ? 'equals' : 'contains',
          value: query,
        },
        {
          attribute: { slug: 'email_addresses' },
          condition: matchType === MatchType.EXACT ? 'equals' : 'contains',
          value: query,
        },
      ],
      matchAny: true, // Use OR logic to match either name or email
    };

    if (!this.dependencies.paginatedSearchFunction) {
      throw new Error('People search function not available');
    }

      limit,
      offset,
    });
    return paginatedResult.results;
  }
}