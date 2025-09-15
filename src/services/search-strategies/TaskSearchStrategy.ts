/**
 * Task search strategy implementation
 * Issue #574: Extract task search logic from UniversalSearchService
 */

import { AttioRecord } from '../../types/attio.js';
import {
  SearchType,
  MatchType,
  SortType,
  UniversalResourceType,
} from '../../handlers/tool-configs/universal/types.js';
import { BaseSearchStrategy } from './BaseSearchStrategy.js';
import { SearchStrategyParams, StrategyDependencies } from './interfaces.js';
import { performance } from 'perf_hooks';
import { SearchUtilities } from '../search-utilities/SearchUtilities.js';
import { createScopedLogger, OperationType } from '../../utils/logger.js';

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
    return true; // Tasks support content search via applyContentSearch method
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
    const perfId = 'tasks_search'; // Default fallback
    const apiStart = performance.now();

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
    const log = createScopedLogger(
      'TaskSearchStrategy',
      'tasks_search',
      OperationType.DATA_PROCESSING
    );
    // Use CachingService for tasks data management
    const loadTasksData = async (): Promise<AttioRecord[]> => {
      try {
        if (!this.dependencies.taskFunction) {
          throw new Error('Tasks list function not available');
        }

        const tasksList = await this.dependencies.taskFunction();

        // Convert tasks to records and ensure it's always an array
        if (!Array.isArray(tasksList)) {
          log.warn('TASKS API WARNING: listTasks() returned non-array value', {
            returnedType: typeof tasksList,
          });
          return [];
        } else {
          // Convert AttioTask[] to AttioRecord[]
          return tasksList.map(UniversalUtilityService.convertTaskToRecord);
        }
      } catch (error: unknown) {
        log.error('Failed to load tasks from API', error);
        return []; // Fallback to empty array
      }
    };

    const { data: tasks, fromCache } =
      await CachingService.getOrLoadTasks(loadTasksData);

    // Performance warning for large datasets
    if (!fromCache && tasks.length > 500) {
      log.warn('PERFORMANCE WARNING: Large tasks load', {
        taskCount: tasks.length,
        recommendation:
          'Consider requesting Attio API pagination support for tasks endpoint.',
      });
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
    const start = offset || 0;
    const requestedLimit = limit || 10;

    // Performance optimization: Don't process if offset exceeds dataset
    if (start >= filteredTasks.length) {
      log.info('Tasks pagination offset exceeds dataset size', {
        offset: start,
        filteredSize: filteredTasks.length,
        action: 'returning empty results',
      });
      return [];
    } else {
      const end = Math.min(start + requestedLimit, filteredTasks.length);
      const paginatedTasks = filteredTasks.slice(start, end);

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
    const searchFields = fields || ['content', 'title', 'content_plaintext'];
    const queryLower = query.toLowerCase();

    let filteredTasks = tasks.filter((task: AttioRecord) => {
      return searchFields.some((field) => {
        const fieldValue = SearchUtilities.getTaskFieldValue(task, field);
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
