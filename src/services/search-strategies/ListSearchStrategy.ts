/**
 * List search strategy implementation
 * Issue #574: Extract list search logic from UniversalSearchService
 * Issue #1068: Returns list-native format
 */

import type { AttioList, UniversalRecordResult } from '@/types/attio.js';
import {
  SearchType,
  MatchType,
  SortType,
  UniversalResourceType,
} from '@/handlers/tool-configs/universal/types.js';
import { SearchUtilities } from '@/services/search-utilities/SearchUtilities.js';
import { BaseSearchStrategy } from '@/services/search-strategies/BaseSearchStrategy.js';
import type {
  SearchStrategyParams,
  StrategyDependencies,
} from '@/services/search-strategies/interfaces.js';

// Import guard functions
import { shouldUseMockData } from '@/services/create/index.js';
import { assertNoMockInE2E } from '@/services/_guards.js';

// Constants for search optimization
const CONTENT_SEARCH_FETCH_LIMIT = 100;

/**
 * Search strategy for lists with content search support
 * Issue #1068: Returns list-native format (top-level fields, list_id only)
 */
export class ListSearchStrategy extends BaseSearchStrategy {
  constructor(dependencies: StrategyDependencies) {
    super(dependencies);
  }

  getResourceType(): string {
    return UniversalResourceType.LISTS;
  }

  supportsAdvancedFiltering(): boolean {
    return false; // Lists only support basic search
  }

  supportsQuerySearch(): boolean {
    return true;
  }

  async search(params: SearchStrategyParams): Promise<UniversalRecordResult[]> {
    const {
      query,
      limit,
      offset,
      search_type = SearchType.BASIC,
      fields,
      match_type = MatchType.PARTIAL,
      sort = SortType.NAME,
    } = params;

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

      if (!this.dependencies.listFunction) {
        throw new Error('Lists search function not available');
      }

      // For content search, fetch all lists and apply pagination after filtering
      // For regular search, pass offset to the list function
      const requestOffset =
        search_type === SearchType.CONTENT ? 0 : offset || 0;

      const lists = await this.dependencies.listFunction(
        searchQuery,
        requestLimit,
        requestOffset
      );

      // Normalize list shapes for list-native handling
      let records = this.normalizeLists(lists);

      // Apply content search filtering if requested
      if (search_type === SearchType.CONTENT && query && query.trim()) {
        records = this.applyContentSearch(
          records,
          query.trim(),
          fields,
          match_type,
          sort
        );

        // Apply pagination to filtered results
        const start = offset || 0;
        const end = start + (limit || 10);
        return records.slice(start, end);
      }

      return records;
    } catch (error: unknown) {
      return this.handleListSearchError(error);
    }
  }

  /**
   * Normalize Attio lists for list-native format
   * Fix for Issue #1068: Lists should remain list-native (no values wrapper)
   *
   * Lists use `list_id` in the id object and have top-level fields (no values wrapper).
   * This method transforms lists to be compatible with universal record tools while
   * maintaining the proper list-native structure.
   *
   * @example Input (AttioList from API):
   * {
   *   id: { list_id: 'list-abc-123', workspace_id: 'ws-xyz' },
   *   name: 'Sales Pipeline',
   *   title: 'Sales Pipeline',
   *   workspace_id: 'ws-xyz',
   *   ...
   * }
   *
   * @example Output (AttioList normalized):
   * {
   *   id: { list_id: 'list-abc-123' },
   *   name: 'Sales Pipeline',
   *   workspace_id: 'ws-xyz',
   *   ...
   * }
   *
   * @param lists - Array of AttioList objects from the API
   * @returns Array of AttioList objects with normalized id/name fields
   */
  private normalizeLists(lists: AttioList[]): AttioList[] {
    return lists.map((list) => {
      // Prioritize existing top-level workspace_id, fallback to id.workspace_id
      // Use ?? (nullish coalescing) to preserve empty strings as valid values
      const existingWorkspaceId = (list as { workspace_id?: string })
        .workspace_id;
      const idWorkspaceId = (list.id as { workspace_id?: string })
        ?.workspace_id;
      const workspaceId = existingWorkspaceId ?? idWorkspaceId;

      // Build result object without overwriting existing workspace_id
      const result: Record<string, unknown> = {
        ...list,
        // Ensure id structure is consistent
        id: {
          ...list.id,
          list_id: list.id.list_id,
        },
        // Use name field (fallback to title for backward compatibility)
        name: list.name || list.title,
      };

      // Set workspace_id if we found one (null/undefined are excluded by ??)
      // Empty strings are valid values and will be preserved
      if (workspaceId !== undefined) {
        result.workspace_id = workspaceId;
      }

      return result as AttioList;
    });
  }

  /**
   * Apply content search filtering to lists
   */
  private applyContentSearch(
    records: AttioList[],
    query: string,
    fields?: string[],
    matchType: MatchType = MatchType.PARTIAL,
    sort: SortType = SortType.NAME
  ): AttioList[] {
    const searchFields = fields || ['name', 'description'];
    const queryLower = query.toLowerCase();

    let filteredRecords = records.filter((record: AttioList) => {
      return searchFields.some((field) => {
        const fieldValue = SearchUtilities.getListFieldValue(record, field);
        if (matchType === MatchType.EXACT) {
          return fieldValue.toLowerCase() === queryLower;
        } else {
          return fieldValue.toLowerCase().includes(queryLower);
        }
      });
    });

    // Apply relevance ranking if requested
    if (sort === SortType.RELEVANCE) {
      filteredRecords = SearchUtilities.rankByRelevance(
        filteredRecords,
        query,
        searchFields
      );
    }

    return filteredRecords;
  }

  /**
   * Handle list search errors gracefully
   */
  private handleListSearchError(error: unknown): UniversalRecordResult[] {
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
