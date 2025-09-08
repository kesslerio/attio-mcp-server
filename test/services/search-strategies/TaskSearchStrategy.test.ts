/**
 * Unit tests for TaskSearchStrategy
 * Issue #598: Add strategy-specific unit tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TaskSearchStrategy } from '../../../src/services/search-strategies/TaskSearchStrategy.js';
import { SearchType, MatchType, SortType, UniversalResourceType } from '../../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord, AttioTask } from '../../../src/types/attio.js';
import { StrategyDependencies } from '../../../src/services/search-strategies/interfaces.js';
import { CachingService } from '../../../src/services/CachingService.js';
import { UniversalUtilityService } from '../../../src/services/UniversalUtilityService.js';
import { SearchUtilities } from '../../../src/services/search-utilities/SearchUtilities.js';
import { enhancedPerformanceTracker } from '../../../src/middleware/performance-enhanced.js';

// Mock dependencies
vi.mock('../../../src/middleware/performance-enhanced.js', () => ({
  enhancedPerformanceTracker: {
    markTiming: vi.fn(),
  },
}));

vi.mock('../../../src/services/CachingService.js', () => ({
  CachingService: {
    getOrLoadTasks: vi.fn(),
  },
}));

vi.mock('../../../src/services/UniversalUtilityService.js', () => ({
  UniversalUtilityService: {
    convertTaskToRecord: vi.fn(),
  },
}));

vi.mock('../../../src/services/search-utilities/SearchUtilities.js', () => ({
  SearchUtilities: {
    getTaskFieldValue: vi.fn(),
    rankByRelevance: vi.fn(),
  },
}));

describe('TaskSearchStrategy', () => {
  let strategy: TaskSearchStrategy;
  let mockDependencies: StrategyDependencies;
  let mockTaskFunction: ReturnType<typeof vi.fn>;
  let mockTask: AttioTask;
  let mockTaskRecord: AttioRecord;

  beforeEach(() => {
    mockTaskFunction = vi.fn();
    mockDependencies = {
      taskFunction: mockTaskFunction,
    };

    mockTask = {
      id: { value: 'task-123' },
      content: 'Test task content',
      title: 'Test Task',
      status: 'open',
      assignees: [],
      created_at: '2023-01-01T00:00:00Z',
    } as AttioTask;

    mockTaskRecord = {
      id: { value: 'task-123' },
      content: 'Test task content',
      title: 'Test Task',
      status: 'open',
      content_plaintext: 'Test task content',
    } as AttioRecord;

    strategy = new TaskSearchStrategy(mockDependencies);

    // Mock SearchUtilities methods
    vi.mocked(SearchUtilities.getTaskFieldValue)
      .mockImplementation((record: AttioRecord, field: string) => {
        const value = (record as any)[field];
        return typeof value === 'string' ? value : '';
      });

    vi.mocked(SearchUtilities.rankByRelevance)
      .mockImplementation((results: AttioRecord[]) => results);

    vi.mocked(UniversalUtilityService.convertTaskToRecord)
      .mockImplementation((task: AttioTask) => mockTaskRecord);

    vi.mocked(CachingService.getOrLoadTasks)
      .mockResolvedValue({ data: [mockTaskRecord], fromCache: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('interface compliance', () => {
    it('should return correct resource type', () => {
      expect(strategy.getResourceType()).toBe(UniversalResourceType.TASKS);
    });

    it('should indicate no advanced filtering support', () => {
      expect(strategy.supportsAdvancedFiltering()).toBe(false);
    });

    it('should indicate query search support', () => {
      // This was the documentation fix from High Priority Item 1
      expect(strategy.supportsQuerySearch()).toBe(true);
    });
  });

  describe('basic search', () => {
    it('should perform basic task search without query', async () => {
      const results = await strategy.search({
        limit: 10,
        offset: 0,
      });

      expect(results).toEqual([mockTaskRecord]);
      expect(CachingService.getOrLoadTasks).toHaveBeenCalled();
    });

    it('should handle empty task list', async () => {
      vi.mocked(CachingService.getOrLoadTasks)
        .mockResolvedValue({ data: [], fromCache: false });

      const results = await strategy.search({});
      
      expect(results).toEqual([]);
    });

    it('should handle missing taskFunction gracefully', async () => {
      const strategyWithoutTask = new TaskSearchStrategy({});
      
      vi.mocked(CachingService.getOrLoadTasks)
        .mockImplementation(async (loadFunction) => {
          const data = await loadFunction();
          return { data, fromCache: false };
        });

      const results = await strategyWithoutTask.search({});
      
      expect(results).toEqual([]);
    });
  });

  describe('content search', () => {
    beforeEach(() => {
      vi.mocked(SearchUtilities.getTaskFieldValue)
        .mockImplementation((record: AttioRecord, field: string) => {
          switch (field) {
            case 'content':
              return 'Test task content';
            case 'title':
              return 'Test Task';
            case 'content_plaintext':
              return 'Test task content';
            default:
              return '';
          }
        });
    });

    it('should perform content search with query', async () => {
      const results = await strategy.search({
        query: 'test',
        search_type: SearchType.CONTENT,
        limit: 10,
        offset: 0,
      });

      expect(results).toEqual([mockTaskRecord]);
    });

    it('should filter out non-matching content', async () => {
      vi.mocked(SearchUtilities.getTaskFieldValue)
        .mockReturnValue('Different content');

      const results = await strategy.search({
        query: 'test',
        search_type: SearchType.CONTENT,
      });

      expect(results).toEqual([]);
    });

    it('should support exact match type', async () => {
      const results = await strategy.search({
        query: 'Test task content',
        search_type: SearchType.CONTENT,
        match_type: MatchType.EXACT,
      });

      expect(results).toEqual([mockTaskRecord]);
    });

    it('should support custom fields for content search', async () => {
      const results = await strategy.search({
        query: 'test',
        search_type: SearchType.CONTENT,
        fields: ['title'],
      });

      expect(results).toEqual([mockTaskRecord]);
      expect(SearchUtilities.getTaskFieldValue)
        .toHaveBeenCalledWith(mockTaskRecord, 'title');
    });

    it('should support relevance sorting', async () => {
      const results = await strategy.search({
        query: 'test',
        search_type: SearchType.CONTENT,
        sort: SortType.RELEVANCE,
      });

      expect(results).toEqual([mockTaskRecord]);
      expect(SearchUtilities.rankByRelevance)
        .toHaveBeenCalledWith([mockTaskRecord], 'test', ['content', 'title', 'content_plaintext']);
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      const multipleRecords = [
        { ...mockTaskRecord, id: { value: 'task-1' } },
        { ...mockTaskRecord, id: { value: 'task-2' } },
        { ...mockTaskRecord, id: { value: 'task-3' } },
      ];
      
      vi.mocked(CachingService.getOrLoadTasks)
        .mockResolvedValue({ data: multipleRecords, fromCache: false });
    });

    it('should handle pagination correctly', async () => {
      const results = await strategy.search({
        limit: 2,
        offset: 1,
      });

      expect(results).toHaveLength(2);
      expect(results[0].id.value).toBe('task-2');
      expect(results[1].id.value).toBe('task-3');
    });

    it('should handle offset beyond dataset size', async () => {
      const results = await strategy.search({
        offset: 10,
      });

      expect(results).toEqual([]);
    });

    it('should handle limit that exceeds remaining items', async () => {
      const results = await strategy.search({
        limit: 10,
        offset: 2,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id.value).toBe('task-3');
    });
  });

  describe('performance optimization', () => {
    it('should use cached data when available', async () => {
      vi.mocked(CachingService.getOrLoadTasks)
        .mockResolvedValue({ data: [mockTaskRecord], fromCache: true });

      const results = await strategy.search({});

      expect(results).toEqual([mockTaskRecord]);
      expect(enhancedPerformanceTracker.markTiming)
        .toHaveBeenCalledWith('tasks_search', 'other', 1);
    });

    it('should track API performance when not using cache', async () => {
      vi.mocked(CachingService.getOrLoadTasks)
        .mockResolvedValue({ data: [mockTaskRecord], fromCache: false });

      await strategy.search({});

      expect(enhancedPerformanceTracker.markTiming)
        .toHaveBeenCalledWith('tasks_search', 'attioApi', expect.any(Number));
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(CachingService.getOrLoadTasks)
        .mockImplementation(async (loadFunction) => {
          const data = await loadFunction();
          return { data, fromCache: false };
        });
      
      mockTaskFunction.mockRejectedValue(new Error('API Error'));

      const results = await strategy.search({});
      
      expect(results).toEqual([]);
    });

    it('should handle non-array task response', async () => {
      vi.mocked(CachingService.getOrLoadTasks)
        .mockImplementation(async (loadFunction) => {
          const data = await loadFunction();
          return { data, fromCache: false };
        });
      
      mockTaskFunction.mockResolvedValue('invalid response' as any);

      const results = await strategy.search({});
      
      expect(results).toEqual([]);
    });
  });
});
