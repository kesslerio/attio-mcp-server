/**
 * List search strategy implementation
 * Issue #574: Extract list search logic from UniversalSearchService
 */

import { AttioRecord } from '../../types/attio.js';
import { SearchType, MatchType, SortType, UniversalResourceType } from '../../handlers/tool-configs/universal/types.js';
import { BaseSearchStrategy } from './BaseSearchStrategy.js';
import { SearchStrategyParams, StrategyDependencies } from './interfaces.js';
import { SearchUtilities } from '../search-utilities/SearchUtilities.js';

// Import guard functions
import { shouldUseMockData } from '../create/index.js';
import { assertNoMockInE2E } from '../_guards.js';

// Constants for search optimization
const CONTENT_SEARCH_FETCH_LIMIT = 100;

/**
 * Search strategy for lists with content search support and convert to AttioRecord format
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

  async search(params: SearchStrategyParams): Promise<AttioRecord[]> {
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

      const lists = await this.dependencies.listFunction(searchQuery, requestLimit, 0);

      // Convert AttioList[] to AttioRecord[] format
      let records = this.convertListsToRecords(lists);

      // Apply content search filtering if requested
      if (search_type === SearchType.CONTENT && query && query.trim()) {
        records = this.applyContentSearch(records, query.trim(), fields, match_type, sort);
        
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
   * Convert Attio lists to AttioRecord format
   */
  private convertListsToRecords(lists: any[]): AttioRecord[] {
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
  }

  /**
   * Apply content search filtering to lists
   */
  private applyContentSearch(
    records: AttioRecord[],
    query: string,
    fields?: string[],
    matchType: MatchType = MatchType.PARTIAL,
    sort: SortType = SortType.NAME
  ): AttioRecord[] {
    const searchFields = fields || ['name', 'description'];
    const queryLower = query.toLowerCase();

    let filteredRecords = records.filter((record: AttioRecord) => {
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
  private handleListSearchError(error: unknown): AttioRecord[] {
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