/**
 * Base search strategy class with common functionality
 * Issue #574: Extract resource-specific search strategies
 */

import { AttioRecord } from '../../types/attio.js';
import { MatchType, SortType } from '../../handlers/tool-configs/universal/types.js';
import { ISearchStrategy, SearchStrategyParams, StrategyDependencies, TimeframeParams } from './interfaces.js';

/**
 * Abstract base class for search strategies
 */
export abstract class BaseSearchStrategy implements ISearchStrategy {
  protected dependencies: StrategyDependencies;

  constructor(dependencies: StrategyDependencies) {
    this.dependencies = dependencies;
  }

  abstract search(params: SearchStrategyParams): Promise<AttioRecord[]>;
  abstract getResourceType(): string;
  abstract supportsAdvancedFiltering(): boolean;
  abstract supportsQuerySearch(): boolean;

  /**
   * Apply timeframe filtering by merging with existing filters
   */
  protected applyTimeframeFiltering(
    filters: Record<string, unknown> | undefined,
    timeframeParams?: TimeframeParams
  ): Record<string, unknown> | undefined {
    if (!timeframeParams?.timeframe_attribute || 
        (!timeframeParams.start_date && !timeframeParams.end_date)) {
      return filters;
    }

    if (!this.dependencies.createDateFilter || !this.dependencies.mergeFilters) {
      console.warn('Date filtering dependencies not available');
      return filters;
    }

    const dateFilter = this.dependencies.createDateFilter(timeframeParams);
    if (dateFilter) {
      return this.dependencies.mergeFilters(filters, dateFilter);
    }

    return filters;
  }

  /**
   * Apply relevance ranking to results
   */
  protected applyRelevanceRanking(
    results: AttioRecord[],
    query: string,
    searchFields: string[],
    sort: SortType = SortType.NAME
  ): AttioRecord[] {
    if (sort === SortType.RELEVANCE && this.dependencies.rankByRelevance) {
      return this.dependencies.rankByRelevance(results, query, searchFields);
    }
    return results;
  }

  /**
   * Check if a search looks like a domain
   */
  protected looksLikeDomain(query: string): boolean {
    return query.includes('.') ||
           query.includes('www') ||
           query.includes('http') ||
           /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(query);
  }

  /**
   * Check if a search looks like an email
   */
  protected looksLikeEmail(query: string): boolean {
    return query.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);
  }

  /**
   * Create content search filters
   */
  protected createContentFilters(
    query: string,
    searchFields: string[],
    matchType: MatchType = MatchType.PARTIAL
  ): Record<string, unknown> {
    return {
      filters: searchFields.map((field) => ({
        attribute: { slug: field },
        condition: matchType === MatchType.EXACT ? 'equals' : 'contains',
        value: query,
      })),
      matchAny: true, // Use OR logic to match any field
    };
  }

  /**
   * Create basic name search filters
   */
  protected createNameFilters(
    query: string,
    matchType: MatchType = MatchType.PARTIAL
  ): Record<string, unknown> {
    return {
      filters: [
        {
          attribute: { slug: 'name' },
          condition: matchType === MatchType.EXACT ? 'equals' : 'contains',
          value: query,
        },
      ],
    };
  }

  /**
   * Handle empty filters for pagination
   */
  protected async handleEmptyFilters(
    searchFunction: (filters: Record<string, unknown>, limit?: number, offset?: number) => Promise<AttioRecord[]>,
    limit?: number,
    offset?: number
  ): Promise<AttioRecord[]> {
    try {
      return await searchFunction({ filters: [] }, limit, offset);
    } catch (error: unknown) {
      // If empty filters aren't supported, return empty array rather than failing
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(
        `Search with empty filters failed, returning empty results: ${errorMessage}`
      );
      return [];
    }
  }
}