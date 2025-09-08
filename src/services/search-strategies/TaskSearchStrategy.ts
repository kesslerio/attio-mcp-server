/**
 * Task search strategy implementation
 * Issue #574: Extract task search logic from UniversalSearchService
 */

import { performance } from 'perf_hooks';

import { AttioRecord } from '../../types/attio.js';
import { BaseSearchStrategy } from './BaseSearchStrategy.js';
import { CachingService } from '../CachingService.js';
import { enhancedPerformanceTracker } from '../../middleware/performance-enhanced.js';
import { SearchStrategyParams, StrategyDependencies } from './interfaces.js';
import { SearchType, MatchType, SortType, UniversalResourceType } from '../../handlers/tool-configs/universal/types.js';
import { SearchUtilities } from '../search-utilities/SearchUtilities.js';
import { UniversalUtilityService } from '../UniversalUtilityService.js';

// Import performance tracking and caching services
import { enhancedPerformanceTracker } from '../../middleware/performance-enhanced.js';
import { CachingService } from '../CachingService.js';
import { UniversalUtilityService } from '../UniversalUtilityService.js';

/**
 * Search strategy for tasks with performance optimization, caching, and content search support
 */
export class TaskSearchStrategy extends BaseSearchStrategy {
  constructor(dependencies: StrategyDependencies) {
    super(dependencies);
  }

  getResourceType(): string {
    return UniversalResourceType.TASKS;
  }

  supportsAdvancedFiltering(): boolean {
    return false; // Tasks only support basic search
  }

  supportsQuerySearch(): boolean {
    return false; // Tasks are list-all only
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

    // Extract performance tracking IDs from parameters (passed via dependencies)

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
  }

  /**
   * Search tasks with performance optimization, caching, and content search support
   * 
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
  private async searchTasks(
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
    // Use CachingService for tasks data management
      try {
        if (!this.dependencies.taskFunction) {
          throw new Error('Tasks list function not available');
        }


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

    const { data: tasks, fromCache } = await CachingService.getOrLoadTasks(loadTasksData);

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
      filteredTasks = this.applyContentSearch(
        tasks,
        query.trim(),
        fields,
        match_type,
        sort
      );
    }

    // Smart pagination with early termination for unreasonable offsets

    // Performance optimization: Don't process if offset exceeds dataset
    if (start >= filteredTasks.length) {
      console.info(
        `Tasks pagination: offset ${start} exceeds filtered dataset size ${filteredTasks.length}, returning empty results`
      );
      return [];
    } else {

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
   * Apply content search filtering to tasks
   */
  private applyContentSearch(
    tasks: AttioRecord[],
    query: string,
    fields?: string[],
    matchType: MatchType = MatchType.PARTIAL,
    sort: SortType = SortType.NAME
  ): AttioRecord[] {

    let filteredTasks = tasks.filter((task: AttioRecord) => {
      return searchFields.some((field) => {
        if (matchType === MatchType.EXACT) {
          return fieldValue.toLowerCase() === queryLower;
        } else {
          return fieldValue.toLowerCase().includes(queryLower);
        }
      });
    });

    // Apply relevance ranking if requested
    if (sort === SortType.RELEVANCE) {
      filteredTasks = SearchUtilities.rankByRelevance(
        filteredTasks,
        query,
        searchFields
      );
    }

    return filteredTasks;
  }
}