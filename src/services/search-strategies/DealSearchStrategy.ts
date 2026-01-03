/**
 * Deal search strategy implementation
 * Issue #885: Add deals support to fast path optimization
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
import type { UniversalRecord } from '@/types/attio.js';

/**
 * Search strategy for deals with fast path optimization
 */
export class DealSearchStrategy extends BaseSearchStrategy {
  constructor(dependencies: StrategyDependencies) {
    super(dependencies);
  }

  getResourceType(): string {
    return UniversalResourceType.DEALS;
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
   * Search deals using advanced filters
   */
  private async searchWithFilters(
    filters: Record<string, unknown>,
    limit?: number,
    offset?: number
  ): Promise<UniversalRecord[]> {
    if (!this.dependencies.advancedSearchFunction) {
      throw new Error('Deals advanced search function not available');
    }

    try {
      // FilterValidationError will bubble up naturally from searchFn
      return await this.dependencies.advancedSearchFunction(
        filters,
        limit,
        offset
      );
    } catch (error: unknown) {
      // Let FilterValidationError bubble up for proper error handling
      if (error instanceof FilterValidationError) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Search deals with a text query
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
    if (!this.dependencies.advancedSearchFunction) {
      throw new Error('Deals search function not available');
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

      const results = await searchObject(ResourceType.DEALS, query, {
        limit: effectiveLimit,
      });

      // Apply offset to slice the results
      const end = limit ? start + limit : undefined;
      return results.slice(start, end);
    }
  }

  /**
   * Search deals without any query or filters
   */
  private async searchWithoutQuery(
    limit?: number,
    offset?: number
  ): Promise<UniversalRecord[]> {
    if (!this.dependencies.advancedSearchFunction) {
      throw new Error('Deals search function not available');
    }

    return this.handleEmptyFilters(
      this.dependencies.advancedSearchFunction,
      limit,
      offset
    );
  }

  /**
   * Search deals by content across multiple fields
   */
  private async searchByContent(
    query: string,
    fields?: string[],
    matchType: MatchType = MatchType.PARTIAL,
    sort: SortType = SortType.NAME,
    limit?: number,
    offset?: number
  ): Promise<UniversalRecord[]> {
    // Default content fields for deals
    const searchFields =
      fields && fields.length > 0 ? fields : ['name', 'notes'];

    const contentFilters = this.createContentFilters(
      query,
      searchFields,
      matchType
    );

    if (!this.dependencies.advancedSearchFunction) {
      throw new Error('Deals search function not available');
    }

    const results = await this.dependencies.advancedSearchFunction(
      contentFilters,
      limit,
      offset
    );

    // Apply relevance ranking if requested
    return this.applyRelevanceRanking(results, query, searchFields, sort);
  }

  /**
   * Search deals by name only
   */
  private async searchByName(
    query: string,
    matchType: MatchType = MatchType.PARTIAL,
    limit?: number,
    offset?: number
  ): Promise<UniversalRecord[]> {
    const nameFilters = this.createNameFilters(query, matchType);

    if (!this.dependencies.advancedSearchFunction) {
      throw new Error('Deals search function not available');
    }

    return await this.dependencies.advancedSearchFunction(
      nameFilters,
      limit,
      offset
    );
  }
}
