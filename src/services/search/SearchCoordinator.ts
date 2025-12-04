/**
 * SearchCoordinator - Coordinates search type routing and execution
 *
 * Issue #935: Extracted from UniversalSearchService.ts to reduce file size
 * Handles search type detection and routing to appropriate services
 */

import { AttioRecord } from '@/types/attio.js';
import {
  UniversalResourceType,
  SearchType,
  MatchType,
  SortType,
} from '@/handlers/tool-configs/universal/types.js';
import { TimeframeQuery } from '@/utils/filters/types.js';
import { QueryApiService } from './QueryApiService.js';
import { RecordsSearchService } from './RecordsSearchService.js';
import { StrategyFactory } from './StrategyFactory.js';

/**
 * Parameters for search routing
 */
export interface SearchRoutingParams {
  resource_type: UniversalResourceType;
  query?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  search_type?: SearchType;
  fields?: string[];
  match_type?: MatchType;
  sort?: SortType;
  relationship_target_type?: UniversalResourceType;
  relationship_target_id?: string;
  timeframe_attribute?: string;
  start_date?: string;
  end_date?: string;
  date_operator?: 'greater_than' | 'less_than' | 'between' | 'equals';
  content_fields?: string[];
  use_or_logic?: boolean;
}

/**
 * Coordinates search execution by routing to appropriate services
 */
export class SearchCoordinator {
  /**
   * Route search to appropriate service based on search type
   */
  static async executeSearch(
    params: SearchRoutingParams,
    perfId: string,
    apiStart: number
  ): Promise<AttioRecord[]> {
    const {
      resource_type,
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

    // Handle special search types first
    switch (search_type) {
      case SearchType.RELATIONSHIP:
        if (relationship_target_type && relationship_target_id) {
          return QueryApiService.searchByRelationship(
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
          return QueryApiService.searchByTimeframe(
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
        // Use Query API if content_fields is explicitly provided
        if (content_fields && content_fields.length > 0) {
          if (!query) {
            throw new Error('Content search requires query parameter');
          }
          return QueryApiService.searchByContent(
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

    // Use strategy pattern for resource-specific searches
    const strategy = await StrategyFactory.getStrategy(resource_type);
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

    // Fallback for resources without strategies
    // This handles both 'records' type AND custom objects
    switch (resource_type) {
      case UniversalResourceType.RECORDS:
        return RecordsSearchService.searchRecordsObjectType(
          limit,
          offset,
          filters
        );

      default:
        // Custom objects: route through generic records API with object slug
        // This enables support for user-defined custom objects (Issue #918)
        return RecordsSearchService.searchCustomObject(
          resource_type,
          limit,
          offset,
          filters
        );
    }
  }
}
