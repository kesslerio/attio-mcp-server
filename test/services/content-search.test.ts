/**
 * Unit tests for content search functionality
 * Tests the implementation of Issue #474: Content Search
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { advancedSearchCompanies } from '../../src/objects/companies/index.js';
import { advancedSearchPeople } from '../../src/objects/people/index.js';
import { AttioRecord, AttioTask, AttioList } from '../../src/types/attio.js';
import { listTasks } from '../../src/objects/tasks.js';
import { searchLists } from '../../src/objects/lists.js';
import { UniversalSearchService } from '../../src/services/UniversalSearchService.js';

// Mock the imported modules
vi.mock('../../src/objects/companies/index.js', () => ({
  advancedSearchCompanies: vi.fn(),
}));

vi.mock('../../src/objects/people/index.js', () => ({
  advancedSearchPeople: vi.fn(),
}));

vi.mock('../../src/objects/tasks.js', () => ({
  listTasks: vi.fn(),
}));

vi.mock('../../src/objects/lists.js', () => ({
  searchLists: vi.fn(),
}));

vi.mock('../../src/services/CachingService.js', () => ({
  CachingService: {
    getOrLoadTasks: vi.fn().mockImplementation(async (loadFn) => {
      return { data, fromCache: false };
    }),
  },
}));

vi.mock('../../src/services/UniversalUtilityService.js', () => ({
  UniversalUtilityService: {
    convertTaskToRecord: vi.fn().mockImplementation((task) => ({
      id: { record_id: task.id.task_id, task_id: task.id.task_id },
      values: {
        content: task.content,
        title: task.title || task.content?.substring(0, 50) + '...',
        content_plaintext: task.content_plaintext || task.content,
        status: task.status,
        created_at: task.created_at,
        updated_at: task.updated_at,
      },
    })),
  },
}));

vi.mock('../../src/services/create/index.js', () => ({
  shouldUseMockData: vi.fn(() => false),
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
import { listTasks } from '../../src/objects/tasks.js';
import { searchLists } from '../../src/objects/lists.js';

describe('Content Search Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('UniversalSearchService.searchRecords', () => {
    it('should default to basic search when search_type is not specified', async () => {
        {
          id: { record_id: '1' },
          values: { name: 'Test Company' },
        } as AttioRecord,
      ];

      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

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
        {
          id: { record_id: '1' },
          values: {
            name: 'Alpha Technologies',
            description: 'AI solutions for healthcare',
          },
        } as AttioRecord,
      ];

      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

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

        resource_type: UniversalResourceType.COMPANIES,
        query: 'AI',
        search_type: SearchType.CONTENT,
        sort: SortType.RELEVANCE,
      });

      // Company with more AI mentions should rank first
      expect(result[0].id).toEqual({ record_id: '2' });
    });

    it('should handle partial word matches', async () => {
        {
          id: { record_id: '1' },
          values: {
            name: 'Company',
            description: 'automation systems',
          },
        } as AttioRecord,
      ];

      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

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
      vi.mocked(advancedSearchCompanies).mockResolvedValue(mockResults);

        resource_type: UniversalResourceType.COMPANIES,
        query: '',
        search_type: SearchType.CONTENT,
      });

      expect(result).toEqual([]);
    });

    it('should handle null/undefined fields gracefully', async () => {
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

        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
        search_type: SearchType.CONTENT,
        sort: SortType.RELEVANCE,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual({ record_id: '1' });
    });

    it('should handle special characters in search query', async () => {
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

  describe('Content Search for Tasks', () => {
    it('should search across default task fields', async () => {
        {
          id: { task_id: '1' },
          content: 'Complete project alpha testing',
          title: 'Alpha Project',
          content_plaintext: 'Complete project alpha testing',
          status: 'open',
        },
        {
          id: { task_id: '2' },
          content: 'Review beta release',
          title: 'Beta Review',
          content_plaintext: 'Review beta release',
          status: 'open',
        },
      ];

      vi.mocked(listTasks).mockResolvedValue(
        mockTasks as unknown as AttioTask[]
      );

        resource_type: UniversalResourceType.TASKS,
        query: 'project',
        search_type: SearchType.CONTENT,
      });

      expect(listTasks).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].values?.content).toContain('project alpha testing');
    });

    it('should search across custom task fields', async () => {
        {
          id: { task_id: '1' },
          content: 'Task content here',
          title: 'Important task title',
          content_plaintext: 'Task content here',
          status: 'open',
        },
      ];

      vi.mocked(listTasks).mockResolvedValue(
        mockTasks as unknown as AttioTask[]
      );

        resource_type: UniversalResourceType.TASKS,
        query: 'important',
        search_type: SearchType.CONTENT,
        fields: ['title'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].values?.title).toContain('Important task title');
    });

    it('should handle exact match for tasks', async () => {
        {
          id: { task_id: '1' },
          content: 'test',
          title: 'Test Task',
          content_plaintext: 'test',
          status: 'open',
        },
        {
          id: { task_id: '2' },
          content: 'testing something',
          title: 'Testing',
          content_plaintext: 'testing something',
          status: 'open',
        },
      ];

      vi.mocked(listTasks).mockResolvedValue(
        mockTasks as unknown as AttioTask[]
      );

        resource_type: UniversalResourceType.TASKS,
        query: 'test',
        search_type: SearchType.CONTENT,
        match_type: MatchType.EXACT,
      });

      expect(result).toHaveLength(1);
      expect(result[0].values?.content).toBe('test');
    });

    it('should apply relevance ranking for tasks', async () => {
        {
          id: { task_id: '1' },
          content: 'Some task with AI mention',
          title: 'Regular Task',
          content_plaintext: 'Some task with AI mention',
          status: 'open',
        },
        {
          id: { task_id: '2' },
          content: 'AI development task',
          title: 'AI Task',
          content_plaintext: 'AI development task',
          status: 'open',
        },
      ];

      vi.mocked(listTasks).mockResolvedValue(
        mockTasks as unknown as AttioTask[]
      );

        resource_type: UniversalResourceType.TASKS,
        query: 'AI',
        search_type: SearchType.CONTENT,
        sort: SortType.RELEVANCE,
      });

      expect(result).toHaveLength(2);
      // Task with AI in both title and content should rank higher
      expect(result[0].id?.task_id).toBe('2');
    });
  });

  describe('Content Search for Lists', () => {
    it('should search across default list fields', async () => {
        {
          id: { list_id: '1' },
          name: 'Customer Prospects',
          title: 'Customer Prospects',
          description: 'List of potential customers',
          api_slug: 'customers',
        },
        {
          id: { list_id: '2' },
          name: 'Employee List',
          title: 'Employee List',
          description: 'All company employees',
          api_slug: 'employees',
        },
      ];

      vi.mocked(searchLists).mockResolvedValue(
        mockLists as unknown as AttioList[]
      );

        resource_type: UniversalResourceType.LISTS,
        query: 'customer',
        search_type: SearchType.CONTENT,
      });

      expect(searchLists).toHaveBeenCalledWith('', 100, 0);
      expect(result).toHaveLength(1);
      expect(result[0].values?.name).toContain('Customer');
    });

    it('should search across custom list fields', async () => {
        {
          id: { list_id: '1' },
          name: 'Test List',
          title: 'Test List',
          description: 'Important test data here',
          api_slug: 'test',
        },
      ];

      vi.mocked(searchLists).mockResolvedValue(
        mockLists as unknown as AttioList[]
      );

        resource_type: UniversalResourceType.LISTS,
        query: 'important',
        search_type: SearchType.CONTENT,
        fields: ['description'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].values?.description).toContain('Important test data');
    });

    it('should handle exact match for lists', async () => {
        {
          id: { list_id: '1' },
          name: 'test',
          title: 'test',
          description: 'A test list',
          api_slug: 'test',
        },
        {
          id: { list_id: '2' },
          name: 'testing',
          title: 'testing',
          description: 'A testing list',
          api_slug: 'testing',
        },
      ];

      vi.mocked(searchLists).mockResolvedValue(
        mockLists as unknown as AttioList[]
      );

        resource_type: UniversalResourceType.LISTS,
        query: 'test',
        search_type: SearchType.CONTENT,
        match_type: MatchType.EXACT,
      });

      expect(result).toHaveLength(1);
      expect(result[0].values?.name).toBe('test');
    });

    it('should apply relevance ranking for lists', async () => {
        {
          id: { list_id: '1' },
          name: 'Customer List',
          title: 'Customer List',
          description: 'Some customer data',
          api_slug: 'customers',
        },
        {
          id: { list_id: '2' },
          name: 'Customer Prospects',
          title: 'Customer Prospects',
          description: 'Customer prospect tracking',
          api_slug: 'customer-prospects',
        },
      ];

      vi.mocked(searchLists).mockResolvedValue(
        mockLists as unknown as AttioList[]
      );

        resource_type: UniversalResourceType.LISTS,
        query: 'customer',
        search_type: SearchType.CONTENT,
        sort: SortType.RELEVANCE,
      });

      expect(result).toHaveLength(2);
      // List with more customer mentions should rank higher
      expect(result[0].id?.list_id).toBe('2');
    });

    it('should handle pagination for filtered lists', async () => {
        id: { list_id: `${i + 1}` },
        name: `Customer List ${i + 1}`,
        title: `Customer List ${i + 1}`,
        description: `Customer data ${i + 1}`,
        api_slug: `customers-${i + 1}`,
      }));

      vi.mocked(searchLists).mockResolvedValue(
        mockLists as unknown as AttioList[]
      );

        resource_type: UniversalResourceType.LISTS,
        query: 'customer',
        search_type: SearchType.CONTENT,
        limit: 5,
        offset: 0,
      });

      expect(result).toHaveLength(5);
      expect(result[0].values?.name).toBe('Customer List 1');
    });
  });
});
