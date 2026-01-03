/**
 * People search strategy implementation
 * Issue #574: Extract people search logic from UniversalSearchService
 */

import {
  SearchType,
  MatchType,
  SortType,
  UniversalResourceType,
} from '@/handlers/tool-configs/universal/types.js';
import { FilterValidationError } from '@/errors/api-errors.js';
import { BaseSearchStrategy } from '@/services/search-strategies/BaseSearchStrategy.js';
import type {
  SearchStrategyParams,
  StrategyDependencies,
} from '@/services/search-strategies/interfaces.js';
import { buildPeopleQueryFilters } from '@/services/search-strategies/query-filter-builder.js';
import type { UniversalRecord } from '@/types/attio.js';
import { createScopedLogger } from '../../utils/logger.js';

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

  async search(params: SearchStrategyParams): Promise<UniversalRecord[]> {
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
    const enhancedFilters = this.applyTimeframeFiltering(
      filters,
      timeframeParams
    );

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
  ): Promise<UniversalRecord[]> {
    if (!this.dependencies.paginatedSearchFunction) {
      throw new Error('People search function not available');
    }

    try {
      // FilterValidationError will bubble up naturally from searchFn, including for invalid empty filters
      const paginatedResult = await this.dependencies.paginatedSearchFunction(
        filters,
        {
          limit,
          offset,
        }
      );
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
  ): Promise<UniversalRecord[]> {
    if (!this.dependencies.paginatedSearchFunction) {
      throw new Error('People search function not available');
    }

    // Handle different search types
    if (searchType === SearchType.CONTENT) {
      return this.searchByContent(
        query,
        fields,
        matchType,
        sort,
        limit,
        offset
      );
    } else {
      // For simple text queries without special fields/filters,
      // use searchObject which includes fast path optimization
      const { searchObject } = await import('../../api/operations/search.js');
      const { ResourceType } = await import('../../types/attio.js');

      // Calculate total records needed: offset + limit
      const start = offset || 0;
      const effectiveLimit = limit ? start + limit : undefined;

      const results = await searchObject(ResourceType.PEOPLE, query, {
        limit: effectiveLimit,
      });

      // Apply offset to slice the results
      const end = limit ? start + limit : undefined;
      return results.slice(start, end);
    }
  }

  /**
   * Search people without any query or filters
   */
  private async searchWithoutQuery(
    limit?: number,
    offset?: number
  ): Promise<UniversalRecord[]> {
    if (!this.dependencies.paginatedSearchFunction) {
      throw new Error('People search function not available');
    }

    return this.handleEmptyFilters(
      async (filters, limitArg, offsetArg) => {
        const paginatedResult = await this.dependencies
          .paginatedSearchFunction!(filters, {
          limit: limitArg,
          offset: offsetArg,
        });
        return paginatedResult.results;
      },
      limit,
      offset
    );
  }

  /**
   * Search people by email address
   */
  private async searchByEmail(
    query: string,
    limit?: number,
    offset?: number
  ): Promise<UniversalRecord[]> {
    const emailFilters = {
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

    const paginatedResult = await this.dependencies.paginatedSearchFunction(
      emailFilters,
      {
        limit,
        offset,
      }
    );
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
  ): Promise<UniversalRecord[]> {
    // Default content fields for people
    const searchFields =
      fields && fields.length > 0
        ? fields
        : ['name', 'notes', 'email_addresses', 'job_title'];

    const contentFilters = this.createContentFilters(
      query,
      searchFields,
      matchType
    );

    if (!this.dependencies.paginatedSearchFunction) {
      throw new Error('People search function not available');
    }

    const paginatedResult = await this.dependencies.paginatedSearchFunction(
      contentFilters,
      {
        limit,
        offset,
      }
    );

    // Apply relevance ranking if requested
    const results = this.applyRelevanceRanking(
      paginatedResult.results,
      query,
      searchFields,
      sort
    );
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
  ): Promise<UniversalRecord[]> {
    const nameEmailFilters = {
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

    const paginatedResult = await this.dependencies.paginatedSearchFunction(
      nameEmailFilters,
      {
        limit,
        offset,
      }
    );
    return paginatedResult.results;
  }
}
