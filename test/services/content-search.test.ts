/**
 * Unit tests for content search functionality
 * Tests the implementation of Issue #474: Content Search
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UniversalSearchService } from '../../src/services/UniversalSearchService.js';
import {
  UniversalResourceType,
  SearchType,
  MatchType,
  SortType,
} from '../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../src/types/attio.js';

// Mock the imported modules
vi.mock('../../src/objects/companies/index.js', () => ({
  advancedSearchCompanies: vi.fn(),
}));

vi.mock('../../src/objects/people/index.js', () => ({
  advancedSearchPeople: vi.fn(),
}));

vi.mock('../../src/api/attio-client.js', () => ({
  getAttioClient: vi.fn(() => ({
    post: vi.fn(),
  })),
}));

vi.mock('../../src/middleware/performance-enhanced.js', () => ({
  enhancedPerformanceTracker: {
    startOperation: vi.fn(() => 'test-perf-id'),
    markApiStart: vi.fn(() => Date.now()),
    markApiEnd: vi.fn(),
    markTiming: vi.fn(),
    endOperation: vi.fn(),
  },
}));

import { advancedSearchCompanies } from '../../src/objects/companies/index.js';
import { advancedSearchPeople } from '../../src/objects/people/index.js';

describe('Content Search Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('UniversalSearchService.searchRecords', () => {
    it('should default to basic search when search_type is not specified', async () => {
      const mockResults = [
        {
          id: { record_id: '1' },
          values: { name: 'Test Company' },
        } as AttioRecord,
      ];

      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
      });

      expect(advancedSearchCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: [
            {
              attribute: { slug: 'name' },
              condition: 'contains',
              value: 'test',
            },
          ],
        }),
        undefined,
        undefined
      );
      expect(result).toEqual(mockResults);
    });

    it('should use content search when search_type is CONTENT', async () => {
      const mockResults = [
        {
          id: { record_id: '1' },
          values: {
            name: 'Alpha Technologies',
            description: 'AI solutions for healthcare',
          },
        } as AttioRecord,
      ];

      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'AI',
        search_type: SearchType.CONTENT,
      });

      expect(advancedSearchCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              attribute: { slug: 'name' },
              condition: 'contains',
              value: 'AI',
            }),
            expect.objectContaining({
              attribute: { slug: 'description' },
              condition: 'contains',
              value: 'AI',
            }),
            expect.objectContaining({
              attribute: { slug: 'notes' },
              condition: 'contains',
              value: 'AI',
            }),
          ]),
          matchAny: true,
        }),
        undefined,
        undefined
      );
      expect(result).toEqual(mockResults);
    });

    it('should use custom fields when specified', async () => {
      const mockResults = [] as AttioRecord[];
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
        search_type: SearchType.CONTENT,
        fields: ['name', 'website'],
      });

      expect(advancedSearchCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              attribute: { slug: 'name' },
              condition: 'contains',
              value: 'test',
            }),
            expect.objectContaining({
              attribute: { slug: 'website' },
              condition: 'contains',
              value: 'test',
            }),
          ]),
          matchAny: true,
        }),
        undefined,
        undefined
      );
    });

    it('should use exact match when match_type is EXACT', async () => {
      const mockResults = [] as AttioRecord[];
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'Exact Company Name',
        search_type: SearchType.CONTENT,
        match_type: MatchType.EXACT,
      });

      expect(advancedSearchCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              attribute: { slug: 'name' },
              condition: 'equals',
              value: 'Exact Company Name',
            }),
          ]),
        }),
        undefined,
        undefined
      );
    });

    it('should apply relevance ranking when sort is RELEVANCE', async () => {
      const mockResults = [
        {
          id: { record_id: '1' },
          values: {
            name: 'AI Company',
            description: 'Specializes in AI and AI technologies',
          },
        } as AttioRecord,
        {
          id: { record_id: '2' },
          values: {
            name: 'Tech Corp',
            description: 'General technology with some AI',
          },
        } as AttioRecord,
      ];

      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'AI',
        search_type: SearchType.CONTENT,
        sort: SortType.RELEVANCE,
      });

      // First result should have more AI mentions and rank higher
      expect(result[0].id).toEqual({ record_id: '1' });
    });
  });

  describe('Content Search for People', () => {
    it('should search across default people fields', async () => {
      const mockResults = {
        results: [
          {
            id: { record_id: '1' },
            values: {
              name: 'Alice Smith',
              notes: 'Expert in machine learning',
            },
          } as AttioRecord,
        ],
        pagination: {
          totalCount: 1,
          currentPage: 1,
          pageSize: 10,
          totalPages: 1,
          hasMore: false,
          nextPageUrl: undefined,
          prevPageUrl: undefined,
        },
      };

      vi.mocked(advancedSearchPeople).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.PEOPLE,
        query: 'machine learning',
        search_type: SearchType.CONTENT,
      });

      expect(advancedSearchPeople).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              attribute: { slug: 'name' },
              condition: 'contains',
              value: 'machine learning',
            }),
            expect.objectContaining({
              attribute: { slug: 'job_title' },
              condition: 'contains',
              value: 'machine learning',
            }),
            expect.objectContaining({
              attribute: { slug: 'notes' },
              condition: 'contains',
              value: 'machine learning',
            }),
            expect.objectContaining({
              attribute: { slug: 'email_addresses' },
              condition: 'contains',
              value: 'machine learning',
            }),
          ]),
          matchAny: true,
        }),
        { limit: undefined, offset: undefined }
      );
      expect(result).toEqual(mockResults.results);
    });

    it('should handle people search with custom fields', async () => {
      const mockResults = {
        results: [] as AttioRecord[],
        pagination: {
          totalCount: 0,
          currentPage: 1,
          pageSize: 10,
          totalPages: 0,
          hasMore: false,
          nextPageUrl: undefined,
          prevPageUrl: undefined,
        },
      };

      vi.mocked(advancedSearchPeople).mockResolvedValue(mockResults);

      await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.PEOPLE,
        query: 'test',
        search_type: SearchType.CONTENT,
        fields: ['name', 'notes'],
      });

      expect(advancedSearchPeople).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              attribute: { slug: 'name' },
              condition: 'contains',
              value: 'test',
            }),
            expect.objectContaining({
              attribute: { slug: 'notes' },
              condition: 'contains',
              value: 'test',
            }),
          ]),
          matchAny: true,
        }),
        { limit: undefined, offset: undefined }
      );
    });
  });

  describe('Relevance Ranking Algorithm', () => {
    it('should rank exact matches highest', async () => {
      const mockResults = [
        {
          id: { record_id: '1' },
          values: { name: 'Other Company' },
        } as AttioRecord,
        {
          id: { record_id: '2' },
          values: { name: 'AI' },
        } as AttioRecord,
        {
          id: { record_id: '3' },
          values: { name: 'AI Technologies' },
        } as AttioRecord,
      ];

      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'AI',
        search_type: SearchType.CONTENT,
        sort: SortType.RELEVANCE,
      });

      // Exact match 'AI' should rank first
      expect(result[0].id).toEqual({ record_id: '2' });
      // Starts with 'AI' should rank second
      expect(result[1].id).toEqual({ record_id: '3' });
    });

    it('should rank by number of occurrences', async () => {
      const mockResults = [
        {
          id: { record_id: '1' },
          values: {
            name: 'Tech Company',
            description: 'AI is mentioned once',
          },
        } as AttioRecord,
        {
          id: { record_id: '2' },
          values: {
            name: 'AI Corp',
            description: 'AI solutions using AI technology for AI applications',
          },
        } as AttioRecord,
      ];

      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'AI',
        search_type: SearchType.CONTENT,
        sort: SortType.RELEVANCE,
      });

      // Company with more AI mentions should rank first
      expect(result[0].id).toEqual({ record_id: '2' });
    });

    it('should handle partial word matches', async () => {
      const mockResults = [
        {
          id: { record_id: '1' },
          values: {
            name: 'Company',
            description: 'automation systems',
          },
        } as AttioRecord,
      ];

      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'automat',
        search_type: SearchType.CONTENT,
        match_type: MatchType.PARTIAL,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual({ record_id: '1' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query gracefully', async () => {
      const mockResults = [] as AttioRecord[];
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: '',
        search_type: SearchType.CONTENT,
      });

      expect(result).toEqual([]);
    });

    it('should handle null/undefined fields gracefully', async () => {
      const mockResults = [
        {
          id: { record_id: '1' },
          values: {
            name: 'Test Company',
            description: null,
            notes: undefined,
          },
        } as unknown as AttioRecord,
      ];

      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      const result = await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
        search_type: SearchType.CONTENT,
        sort: SortType.RELEVANCE,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual({ record_id: '1' });
    });

    it('should handle special characters in search query', async () => {
      const mockResults = [] as AttioRecord[];
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'AI & Machine Learning (ML)',
        search_type: SearchType.CONTENT,
      });

      expect(advancedSearchCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              value: 'AI & Machine Learning (ML)',
            }),
          ]),
        }),
        undefined,
        undefined
      );
    });
  });

  describe('Pagination with Content Search', () => {
    it('should pass pagination parameters correctly', async () => {
      const mockResults = [] as AttioRecord[];
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

      await UniversalSearchService.searchRecords({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
        search_type: SearchType.CONTENT,
        limit: 20,
        offset: 10,
      });

      expect(advancedSearchCompanies).toHaveBeenCalledWith(
        expect.any(Object),
        20,
        10
      );
    });
  });
});
