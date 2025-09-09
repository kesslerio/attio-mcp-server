/**
 * Search strategy interfaces for UniversalSearchService refactoring
 * Issue #574: Extract resource-specific search strategies
 */

import { AttioRecord, AttioList, AttioTask } from '../../types/attio.js';
import {
  SearchType,
  MatchType,
  SortType,
} from '../../handlers/tool-configs/universal/types.js';

/**
 * Timeframe parameters for date-based filtering
 */
export interface TimeframeParams {
  timeframe_attribute?: string;
  start_date?: string;
  end_date?: string;
  date_operator?: 'greater_than' | 'less_than' | 'between' | 'equals';
}

/**
 * Common search parameters for all strategies
 */
export interface SearchStrategyParams {
  query?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  search_type?: SearchType;
  fields?: string[];
  match_type?: MatchType;
  sort?: SortType;
  timeframeParams?: TimeframeParams;
}

/**
 * Interface for search strategy implementations
 */
export interface ISearchStrategy {
  /**
   * Execute the search for this resource type
   */
  search(params: SearchStrategyParams): Promise<AttioRecord[]>;

  /**
   * Get the resource type this strategy handles
   */
  getResourceType(): string;

  /**
   * Check if advanced filtering is supported
   */
  supportsAdvancedFiltering(): boolean;

  /**
   * Check if query-based search is supported
   */
  supportsQuerySearch(): boolean;
}

/**
 * Dependencies that strategies may need
 */
export interface StrategyDependencies {
  // Search functions from API layer
  advancedSearchFunction?:
    | ((
        filters: Record<string, unknown>,
        limit?: number,
        offset?: number
      ) => Promise<AttioRecord[]>)
    | null;
  paginatedSearchFunction?:
    | ((
        filters: Record<string, unknown>,
        pagination: { limit?: number; offset?: number }
      ) => Promise<{ results: AttioRecord[] }>)
    | null;
  listFunction?: (
    query?: string,
    limit?: number,
    offset?: number
  ) => Promise<AttioList[]>;
  taskFunction?: (
    status?: string,
    assigneeId?: string,
    page?: number,
    pageSize?: number
  ) => Promise<AttioTask[]>;

  // Utility functions
  createDateFilter?: (
    params: TimeframeParams
  ) => Record<string, unknown> | null;
  mergeFilters?: (
    existing: Record<string, unknown> | undefined,
    dateFilter: Record<string, unknown>
  ) => Record<string, unknown>;
  rankByRelevance?: (
    results: AttioRecord[],
    query: string,
    searchFields: string[]
  ) => AttioRecord[];
  getFieldValue?: (record: AttioRecord, field: string) => string;
}
