/**
 * Split: UniversalSearchService companies/people/lists
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('../../src/services/ValidationService.js', () => ({
  ValidationService: {
    validatePaginationParameters: vi.fn(),
    validateFiltersSchema: vi.fn(),
    validateUUIDForSearch: vi.fn().mockReturnValue(true),
  },
}));
vi.mock('../../src/services/CachingService.js', () => ({
  CachingService: { getOrLoadTasks: vi.fn(), getCachedTasks: vi.fn() },
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
vi.mock('../../src/objects/lists.js', () => ({ searchLists: vi.fn() }));
vi.mock('../../src/services/create/index.js', () => ({
  shouldUseMockData: vi.fn(() => false),
}));
vi.mock('../../src/services/UniversalUtilityService.js', () => ({
  UniversalUtilityService: { convertListToRecord: vi.fn() },
}));
vi.mock('../../src/api/operations/search.js', () => ({
  searchObject: vi.fn(),
}));

import { UniversalSearchService } from '../../src/services/UniversalSearchService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../src/types/attio.js';
import { advancedSearchCompanies } from '../../src/objects/companies/index.js';
import { advancedSearchPeople } from '../../src/objects/people/index.js';
import { searchLists } from '../../src/objects/lists.js';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';
import { shouldUseMockData } from '../../src/services/create/index.js';
import { searchObject } from '../../src/api/operations/search.js';

describe('UniversalSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to real API for these tests (they expect spies to be called)
    vi.mocked(shouldUseMockData).mockReturnValue(false);
  });

  describe('searchRecords', () => {
    it('should search companies with query', async () => {
      const mockResults: AttioRecord[] = [
        {
          id: { record_id: 'comp_123' },
          values: { name: 'Test Company' },
        } as any,
      ];
      // Basic queries now route through searchObject()
      vi.mocked(searchObject).mockResolvedValue(mockResults as any);
      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
        limit: 10,
        offset: 0,
      });
      expect(searchObject).toHaveBeenCalled();
      expect(result).toEqual(mockResults);
    });

    it('should search companies with filters', async () => {
      const mockResults: AttioRecord[] = [
        {
          id: { record_id: 'comp_123' },
          values: { name: 'Test Company' },
        } as any,
      ];
      const filters = {
        filters: [
          {
            attribute: { slug: 'domain' },
            condition: 'equals',
            value: 'test.com',
          },
        ],
      };
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults as any);
      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        filters,
        limit: 5,
        offset: 0,
      });
      expect(result).toEqual(mockResults);
    });

    it('should search people by name', async () => {
      const mockResults: AttioRecord[] = [
        { id: { record_id: 'person_1' }, values: { name: 'Jane' } } as any,
      ];
      // Basic queries now route through searchObject()
      vi.mocked(searchObject).mockResolvedValue(mockResults as any);
      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.PEOPLE,
        query: 'Jane',
      });
      expect(searchObject).toHaveBeenCalled();
      expect(result).toEqual(mockResults);
    });

    it('should search lists by title', async () => {
      const mockListResults = [
        {
          id: { list_id: 'list_1' },
          title: 'Prospects',
          name: 'Prospects',
          description: 'Prospect list',
        } as any,
      ];
      vi.mocked(searchLists).mockResolvedValue(mockListResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.LISTS,
        query: 'Prospects',
      });

      expect(searchLists).toHaveBeenCalledWith('Prospects', 10, 0);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: { record_id: 'list_1', list_id: 'list_1' },
        values: { name: 'Prospects' },
      });
    });
  });
});
