/**
 * Test suite for UniversalSearchService
 *
 * Tests universal record search operations extracted from shared-handlers.ts
 * as part of Issue #489 Phase 3.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UniversalSearchService } from '../../src/services/UniversalSearchService.js';
import {
  UniversalResourceType,
  SearchType,
  MatchType,
  SortType,
} from '../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord, AttioTask } from '../../src/types/attio.js';

// Mock the dependencies
vi.mock('../../src/services/ValidationService.js', () => ({
  ValidationService: {
    validatePaginationParameters: vi.fn(),
  },
}));

vi.mock('../../src/services/CachingService.js', () => ({
  CachingService: {
    getOrLoadTasks: vi.fn(),
    getCachedTasks: vi.fn(),
  },
}));

vi.mock('../../src/services/UniversalUtilityService.js', () => ({
  UniversalUtilityService: {
    convertTaskToRecord: vi.fn(),
  },
}));

vi.mock('../../src/middleware/performance-enhanced.js', () => ({
  enhancedPerformanceTracker: {
    startOperation: vi.fn(() => 'perf-123'),
    markTiming: vi.fn(),
    markApiStart: vi.fn(() => 100),
    markApiEnd: vi.fn(),
    endOperation: vi.fn(),
  },
}));

vi.mock('../../src/objects/companies/index.js', () => ({
  advancedSearchCompanies: vi.fn(),
}));

vi.mock('../../src/objects/people/index.js', () => ({
  advancedSearchPeople: vi.fn(),
}));

vi.mock('../../src/objects/lists.js', () => ({
  searchLists: vi.fn(),
}));

vi.mock('../../src/objects/records/index.js', () => ({
  listObjectRecords: vi.fn(),
}));

vi.mock('../../src/objects/tasks.js', () => ({
  listTasks: vi.fn(),
}));

vi.mock('../../src/api/attio-client.js', () => ({
  getAttioClient: vi.fn(() => ({
    post: vi.fn(),
  })),
}));

import { ValidationService } from '../../src/services/ValidationService.js';
import { CachingService } from '../../src/services/CachingService.js';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';
import { enhancedPerformanceTracker } from '../../src/middleware/performance-enhanced.js';
import { advancedSearchCompanies } from '../../src/objects/companies/index.js';
import { advancedSearchPeople } from '../../src/objects/people/index.js';
import { searchLists } from '../../src/objects/lists.js';
import { listObjectRecords } from '../../src/objects/records/index.js';
import { listTasks } from '../../src/objects/tasks.js';
import { getAttioClient } from '../../src/api/attio-client.js';

describe('UniversalSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchRecords', () => {
    it('should search companies with query', async () => {
      const mockResults: AttioRecord[] = [
        { id: { record_id: 'comp_123' }, values: { name: 'Test Company' } },
      ];
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
        limit: 10,
        offset: 0,
      });

      expect(advancedSearchCompanies).toHaveBeenCalledWith(
        {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: 'contains',
              value: 'test',
            },
          ],
        },
        10,
        0
      );
      expect(result).toEqual(mockResults);
    });

    it('should search companies with filters', async () => {
      const mockResults: AttioRecord[] = [
        { id: { record_id: 'comp_123' }, values: { name: 'Test Company' } },
      ];
      const filters = {
        filters: [{ attribute: { slug: 'domain' }, value: 'test.com' }],
      };
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        filters,
        limit: 10,
        offset: 0,
      });

      expect(advancedSearchCompanies).toHaveBeenCalledWith(filters, 10, 0);
      expect(result).toEqual(mockResults);
    });

    it('should search companies with empty filters fallback', async () => {
      const mockResults: AttioRecord[] = [];
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        limit: 10,
        offset: 0,
      });

      expect(advancedSearchCompanies).toHaveBeenCalledWith(
        { filters: [] },
        10,
        0
      );
      expect(result).toEqual(mockResults);
    });

    it('should handle companies search with empty filters failure gracefully', async () => {
      vi.mocked(advancedSearchCompanies).mockRejectedValue(
        new Error('Empty filters not supported')
      );
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Companies search with empty filters failed, returning empty results:',
        'Empty filters not supported'
      );

      consoleSpy.mockRestore();
    });

    it('should search people with query using name and email', async () => {
      const mockResults = {
        results: [
          { id: { record_id: 'person_123' }, values: { name: 'John Doe' } },
        ],
      };
      vi.mocked(advancedSearchPeople).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.PEOPLE,
        query: 'john',
        limit: 10,
        offset: 0,
      });

      expect(advancedSearchPeople).toHaveBeenCalledWith(
        {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: 'contains',
              value: 'john',
            },
            {
              attribute: { slug: 'email_addresses' },
              condition: 'contains',
              value: 'john',
            },
          ],
          matchAny: true,
        },
        { limit: 10, offset: 0 }
      );
      expect(result).toEqual(mockResults.results);
    });

    it('should search lists and convert format', async () => {
      const mockLists = [
        {
          id: { list_id: 'list_123' },
          name: 'Test List',
          description: 'Test description',
          object_slug: 'companies',
          api_slug: 'test-list',
          workspace_id: 'ws_123',
          workspace_member_access: 'read',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];
      vi.mocked(searchLists).mockResolvedValue(mockLists);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.LISTS,
        query: 'test',
        limit: 10,
        offset: 0,
      });

      expect(searchLists).toHaveBeenCalledWith('test', 10, 0);
      expect(result).toEqual([
        {
          id: {
            record_id: 'list_123',
            list_id: 'list_123',
          },
          values: {
            name: 'Test List',
            description: 'Test description',
            parent_object: 'companies',
            api_slug: 'test-list',
            workspace_id: 'ws_123',
            workspace_member_access: 'read',
            created_at: '2024-01-01T00:00:00Z',
          },
        },
      ]);
    });

    it('should search records using object records API', async () => {
      const mockResults: AttioRecord[] = [
        { id: { record_id: 'record_123' }, values: { name: 'Test Record' } },
      ];
      vi.mocked(listObjectRecords).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.RECORDS,
        limit: 10,
        offset: 0,
      });

      expect(listObjectRecords).toHaveBeenCalledWith('records', {
        pageSize: 10,
        page: 1,
      });
      expect(result).toEqual(mockResults);
    });

    it('should search deals using query endpoint', async () => {
      const mockResults: AttioRecord[] = [
        { id: { record_id: 'deal_123' }, values: { name: 'Test Deal' } },
      ];
      const mockClient = {
        post: vi.fn().mockResolvedValue({ data: { data: mockResults } }),
      };
      vi.mocked(getAttioClient).mockReturnValue(mockClient as any);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.DEALS,
        limit: 10,
        offset: 0,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/objects/deals/records/query',
        {
          limit: 10,
          offset: 0,
        }
      );
      expect(result).toEqual(mockResults);
    });

    it('should handle deals query endpoint failure gracefully', async () => {
      const mockClient = {
        post: vi.fn().mockRejectedValue({ response: { status: 404 } }),
      };
      vi.mocked(getAttioClient).mockReturnValue(mockClient as any);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.DEALS,
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Deal query endpoint not found, falling back to empty results'
      );

      consoleSpy.mockRestore();
    });

    it('should search tasks with caching optimization', async () => {
      const mockTasks: AttioTask[] = [
        {
          id: { task_id: 'task_123' },
          content: 'Test Task',
          status: 'pending',
          assignee: null,
          due_date: null,
          linked_records: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      const mockRecord: AttioRecord = {
        id: { record_id: 'task_123', task_id: 'task_123' },
        values: { content: 'Test Task' },
      };

      vi.mocked(listTasks).mockResolvedValue(mockTasks);
      vi.mocked(UniversalUtilityService.convertTaskToRecord).mockReturnValue(
        mockRecord
      );
      vi.mocked(CachingService.getOrLoadTasks).mockResolvedValue({
        data: [mockRecord],
        fromCache: false,
      });

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.TASKS,
        limit: 10,
        offset: 0,
      });

      expect(CachingService.getOrLoadTasks).toHaveBeenCalled();
      expect(result).toEqual([mockRecord]);
    });

    it('should handle tasks pagination correctly', async () => {
      const mockTasks = Array.from({ length: 25 }, (_, i) => ({
        id: { record_id: `task_${i}`, task_id: `task_${i}` },
        values: { content: `Task ${i}` },
      }));

      vi.mocked(CachingService.getOrLoadTasks).mockResolvedValue({
        data: mockTasks,
        fromCache: true,
      });

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.TASKS,
        limit: 10,
        offset: 5,
      });

      expect(result).toHaveLength(10);
      expect(result[0]).toEqual(mockTasks[5]); // Offset 5
    });

    it('should handle tasks pagination beyond dataset size', async () => {
      const mockTasks = [
        { id: { record_id: 'task_1' }, values: { content: 'Task 1' } },
      ];

      vi.mocked(CachingService.getOrLoadTasks).mockResolvedValue({
        data: mockTasks,
        fromCache: true,
      });
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.TASKS,
        limit: 10,
        offset: 100, // Way beyond dataset size
      });

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Tasks pagination: offset 100 exceeds dataset size 1, returning empty results'
      );

      consoleSpy.mockRestore();
    });

    it('should handle large task datasets with performance warning', async () => {
      const largeMockTasks = Array.from({ length: 600 }, (_, i) => ({
        id: { record_id: `task_${i}`, task_id: `task_${i}` },
        values: { content: `Task ${i}` },
      }));

      vi.mocked(CachingService.getOrLoadTasks).mockResolvedValue({
        data: largeMockTasks,
        fromCache: false, // Fresh load to trigger warning
      });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.TASKS,
        limit: 10,
        offset: 0,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️  PERFORMANCE WARNING: Loading 600 tasks. ' +
          'Consider requesting Attio API pagination support for tasks endpoint.'
      );
      expect(result).toHaveLength(10);

      consoleSpy.mockRestore();
    });

    it('should throw error for unsupported resource type', async () => {
      await expect(
        UniversalSearchService.searchRecords({
          resource_type: 'invalid' as any,
          limit: 10,
          offset: 0,
        })
      ).rejects.toThrow('Unsupported resource type for search: invalid');
    });

    it('should handle performance tracking correctly', async () => {
      const mockResults: AttioRecord[] = [
        { id: { record_id: 'comp_123' }, values: { name: 'Test Company' } },
      ];
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
        limit: 10,
        offset: 0,
      });

      expect(enhancedPerformanceTracker.startOperation).toHaveBeenCalledWith(
        'search-records',
        'search',
        {
          resourceType: UniversalResourceType.COMPANIES,
          hasQuery: true,
          hasFilters: false,
          limit: 10,
          offset: 0,
          searchType: SearchType.BASIC,
          hasFields: false,
          matchType: MatchType.PARTIAL,
          sortType: SortType.NAME,
        }
      );
      expect(
        ValidationService.validatePaginationParameters
      ).toHaveBeenCalledWith({ limit: 10, offset: 0 }, 'perf-123');
      expect(enhancedPerformanceTracker.endOperation).toHaveBeenCalledWith(
        'perf-123',
        true,
        undefined,
        200,
        { recordCount: 1 }
      );
    });

    it('should handle API errors with performance tracking', async () => {
      const apiError = new Error('API failed');
      vi.mocked(advancedSearchCompanies).mockRejectedValue(apiError);

      await expect(
        UniversalSearchService.searchRecords({
          resource_type: UniversalResourceType.COMPANIES,
          query: 'test',
          limit: 10,
          offset: 0,
        })
      ).rejects.toThrow('API failed');

      expect(enhancedPerformanceTracker.endOperation).toHaveBeenCalledWith(
        'perf-123',
        false,
        'API failed',
        500
      );
    });
  });

  describe('Utility methods', () => {
    it('should return empty suggestions for now', async () => {
      const suggestions = await UniversalSearchService.getSearchSuggestions(
        UniversalResourceType.COMPANIES,
        'test',
        5
      );

      expect(suggestions).toEqual([]);
    });

    it('should return cached task count when available', async () => {
      const mockTasks = [
        { id: { record_id: 'task_1' }, values: { content: 'Task 1' } },
        { id: { record_id: 'task_2' }, values: { content: 'Task 2' } },
      ];
      vi.mocked(CachingService.getCachedTasks).mockReturnValue(mockTasks);

      const count = await UniversalSearchService.getRecordCount(
        UniversalResourceType.TASKS
      );

      expect(count).toBe(2);
    });

    it('should return -1 for non-tasks record count', async () => {
      const count = await UniversalSearchService.getRecordCount(
        UniversalResourceType.COMPANIES
      );

      expect(count).toBe(-1);
    });

    it('should correctly identify advanced filtering support', () => {
      expect(
        UniversalSearchService.supportsAdvancedFiltering(
          UniversalResourceType.COMPANIES
        )
      ).toBe(true);
      expect(
        UniversalSearchService.supportsAdvancedFiltering(
          UniversalResourceType.PEOPLE
        )
      ).toBe(true);
      expect(
        UniversalSearchService.supportsAdvancedFiltering(
          UniversalResourceType.LISTS
        )
      ).toBe(false);
      expect(
        UniversalSearchService.supportsAdvancedFiltering(
          UniversalResourceType.TASKS
        )
      ).toBe(false);
    });

    it('should correctly identify query search support', () => {
      expect(
        UniversalSearchService.supportsQuerySearch(
          UniversalResourceType.COMPANIES
        )
      ).toBe(true);
      expect(
        UniversalSearchService.supportsQuerySearch(UniversalResourceType.PEOPLE)
      ).toBe(true);
      expect(
        UniversalSearchService.supportsQuerySearch(UniversalResourceType.LISTS)
      ).toBe(true);
      expect(
        UniversalSearchService.supportsQuerySearch(
          UniversalResourceType.RECORDS
        )
      ).toBe(false);
      expect(
        UniversalSearchService.supportsQuerySearch(UniversalResourceType.DEALS)
      ).toBe(false);
      expect(
        UniversalSearchService.supportsQuerySearch(UniversalResourceType.TASKS)
      ).toBe(false);
    });
  });
});
