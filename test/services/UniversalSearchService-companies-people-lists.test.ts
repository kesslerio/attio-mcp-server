/**
 * Split: UniversalSearchService companies/people/lists
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { advancedSearchCompanies } from '../../src/objects/companies/index.js';
import { advancedSearchPeople } from '../../src/objects/people/index.js';
import { AttioRecord } from '../../src/types/attio.js';
import { searchLists } from '../../src/objects/lists.js';
import { shouldUseMockData } from '../../src/services/create/index.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { UniversalSearchService } from '../../src/services/UniversalSearchService.js';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';

import { UniversalSearchService } from '../../src/services/UniversalSearchService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../src/types/attio.js';
import { advancedSearchCompanies } from '../../src/objects/companies/index.js';
import { advancedSearchPeople } from '../../src/objects/people/index.js';
import { searchLists } from '../../src/objects/lists.js';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';
import { shouldUseMockData } from '../../src/services/create/index.js';

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
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults as any);
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
        filters: [
          {
            attribute: { slug: 'domain' },
            condition: 'equals',
            value: 'test.com',
          },
        ],
      };
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults as any);
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
      vi.mocked(advancedSearchPeople).mockResolvedValue({
        results: mockResults,
      } as any);
        resource_type: UniversalResourceType.PEOPLE,
        query: 'Jane',
      });
      expect(advancedSearchPeople).toHaveBeenCalled();
      expect(result).toEqual(mockResults);
    });

    it('should search lists by title', async () => {
        {
          id: { list_id: 'list_1' },
          title: 'Prospects',
          name: 'Prospects',
          description: 'Prospect list',
        } as any,
      ];
      vi.mocked(searchLists).mockResolvedValue(mockListResults);

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
