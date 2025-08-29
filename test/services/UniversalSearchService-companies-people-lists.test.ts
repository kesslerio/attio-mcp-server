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
vi.mock('../../src/services/MockService.js', () => ({
  MockService: { isUsingMockData: vi.fn().mockReturnValue(false) },
}));

import { UniversalSearchService } from '../../src/services/UniversalSearchService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../src/types/attio.js';
import { advancedSearchCompanies } from '../../src/objects/companies/index.js';
import { advancedSearchPeople } from '../../src/objects/people/index.js';
import { searchLists } from '../../src/objects/lists.js';

describe('UniversalSearchService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('searchRecords', () => {
    it('should search companies with query', async () => {
      const mockResults: AttioRecord[] = [
        {
          id: { record_id: 'comp_123' },
          values: { name: 'Test Company' },
        } as any,
      ];
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);
      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
        limit: 10,
        offset: 0,
      });
      expect(advancedSearchCompanies).toHaveBeenCalled();
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
        filters: [{ attribute: { slug: 'domain' }, value: 'test.com' }],
      };
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);
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
      vi.mocked(advancedSearchPeople).mockResolvedValue(mockResults);
      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.PEOPLE,
        query: 'Jane',
      });
      expect(advancedSearchPeople).toHaveBeenCalled();
      expect(result).toEqual(mockResults);
    });

    it('should search lists by title', async () => {
      const mockResults: AttioRecord[] = [
        { id: { record_id: 'list_1' }, values: { name: 'Prospects' } } as any,
      ];
      vi.mocked(searchLists).mockResolvedValue(mockResults as any);
      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.LISTS,
        query: 'Prospects',
      });
      expect(result).toEqual(mockResults as any);
    });
  });
});
