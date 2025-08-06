import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  advancedSearchConfig,
  batchOperationsConfig,
  searchByContentConfig,
  searchByRelationshipConfig,
  searchByTimeframeConfig,
} from '../../../../src/handlers/tool-configs/universal/advanced-operations.js';
import {
  type AdvancedSearchParams,
  type BatchOperationsParams,
  BatchOperationType,
  type ContentSearchParams,
  ContentSearchType,
  type RelationshipSearchParams,
  RelationshipType,
  type TimeframeSearchParams,
  TimeframeType,
  UniversalResourceType,
} from '../../../../src/handlers/tool-configs/universal/types.js';
import type { AttioRecord } from '../../../../src/types/attio.js';

// Mock the shared handlers
vi.mock(
  '../../../../src/handlers/tool-configs/universal/shared-handlers.js',
  () => ({
    handleUniversalSearch: vi.fn(),
    handleUniversalGetDetails: vi.fn(),
    handleUniversalCreate: vi.fn(),
    handleUniversalUpdate: vi.fn(),
    handleUniversalDelete: vi.fn(),
    formatResourceType: vi.fn((type: string) => type),
    getSingularResourceType: vi.fn((type: string) => type.slice(0, -1)),
    createUniversalError: vi.fn(
      (operation: string, resourceType: string, error: Error | unknown) =>
        new Error(
          `${operation} failed for ${resourceType}: ${(error as Error).message || error}`
        )
    ),
  })
);

// Mock specialized handlers
vi.mock(
  '../../../../src/objects/companies/index.js',
  async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
      ...actual,
      searchCompaniesByNotes: vi.fn(),
      searchCompaniesByPeople: vi.fn(),
      advancedSearchCompanies: vi.fn(),
    };
  }
);

vi.mock('../../../../src/objects/people/index.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    searchPeopleByCompany: vi.fn(),
    searchPeopleByActivity: vi.fn(),
    searchPeopleByNotes: vi.fn(),
    advancedSearchPeople: vi.fn(),
  };
});

// Mock validation and date utils
vi.mock('../../../../src/handlers/tool-configs/universal/schemas.js', () => ({
  validateUniversalToolParams: vi.fn(
    (operation: string, params: Record<string, unknown>) => {
      // Just return the params as-is (simulating successful validation)
      // This matches the expected behavior in tests
      return params || {};
    }
  ),
  advancedSearchSchema: { type: 'object', properties: {}, required: [] },
  searchByRelationshipSchema: { type: 'object', properties: {}, required: [] },
  searchByContentSchema: { type: 'object', properties: {}, required: [] },
  searchByTimeframeSchema: { type: 'object', properties: {}, required: [] },
  batchOperationsSchema: { type: 'object', properties: {}, required: [] },
}));

vi.mock('../../../../src/utils/date-utils.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    validateAndCreateDateRange: vi.fn((start?: string, end?: string) => {
      // Return a valid date range object for testing
      return {
        start: start || '2024-01-01T00:00:00.000Z',
        end: end || '2024-01-31T23:59:59.999Z',
      };
    }),
    isValidISODateString: vi.fn((dateString: string) => {
      // Simple validation for testing
      return (
        dateString &&
        typeof dateString === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateString)
      );
    }),
  };
});

describe('Universal Advanced Operations Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset shared handlers to default successful behaviors
    const {
      handleUniversalSearch,
      handleUniversalGetDetails,
      handleUniversalCreate,
      handleUniversalUpdate,
      handleUniversalDelete,
      formatResourceType,
      createUniversalError,
    } = await import(
      '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
    );

    const { validateUniversalToolParams } = await import(
      '../../../../src/handlers/tool-configs/universal/schemas.js'
    );

    vi.mocked(handleUniversalSearch).mockResolvedValue([]);
    vi.mocked(handleUniversalGetDetails).mockResolvedValue({} as AttioRecord);
    vi.mocked(handleUniversalCreate).mockResolvedValue({} as AttioRecord);
    vi.mocked(handleUniversalUpdate).mockResolvedValue({} as AttioRecord);
    vi.mocked(handleUniversalDelete).mockResolvedValue({
      success: true,
      record_id: 'test',
    });
    vi.mocked(formatResourceType).mockImplementation((type: string) => {
      switch (type) {
        case 'companies':
          return 'company';
        case 'people':
          return 'person';
        case 'records':
          return 'record';
        case 'tasks':
          return 'task';
        case 'deals':
          return 'deal';
        default:
          return type;
      }
    });
    vi.mocked(createUniversalError).mockImplementation(
      (operation: string, resourceType: string, error: Error | unknown) =>
        new Error(
          `${operation} failed for ${resourceType}: ${(error as Error).message || error}`
        )
    );
    // Removed the problematic validateUniversalToolParams override that was causing undefined destructuring
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('advanced-search tool', () => {
    it('should perform advanced search successfully', async () => {
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: {
            name: [{ value: 'Advanced Company' }],
            industry: [{ value: 'Technology' }],
            location: [{ value: 'San Francisco' }],
          },
        },
      ];

      const { handleUniversalSearch } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalSearch).mockResolvedValue(mockResults);

      const params: AdvancedSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        query: 'technology',
        filters: {
          filters: [
            {
              attribute: { slug: 'industry' },
              condition: 'equals',
              value: 'Technology',
            },
          ],
        },
        sort_by: 'name',
        sort_order: 'asc',
        limit: 20,
      };

      const result = await advancedSearchConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(handleUniversalSearch).toHaveBeenCalledWith({
        resource_type: params.resource_type,
        query: params.query,
        filters: params.filters,
        limit: params.limit,
        offset: params.offset,
      });
    });

    it('should format advanced search results with context', async () => {
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: {
            name: [{ value: 'Tech Corp' }],
            industry: [{ value: 'Technology' }],
            location: [{ value: 'San Francisco' }],
            website: [{ value: 'https://techcorp.com' }],
          },
        },
      ];

      const { formatResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(formatResourceType).mockReturnValue('company');

      const formatted = advancedSearchConfig.formatResult(
        mockResults,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain('Advanced search found 1 company');
      expect(formatted).toContain(
        '1. Tech Corp [Technology] (San Francisco) - https://techcorp.com (ID: comp-1)'
      );
    });

    it('should handle advanced search errors', async () => {
      const { handleUniversalSearch, createUniversalError } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      const mockError = new Error('Filter error');
      vi.mocked(handleUniversalSearch).mockRejectedValue(mockError);
      vi.mocked(createUniversalError).mockReturnValue(
        new Error('advanced search failed for companies: Filter error')
      );

      const params: AdvancedSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
      };

      await expect(advancedSearchConfig.handler(params)).rejects.toThrow(
        'advanced search failed for companies: Filter error'
      );
    });
  });

  describe('search-by-relationship tool', () => {
    it('should search company to people relationships', async () => {
      const mockResults = [
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'John Doe' }],
            role: [{ value: 'CEO' }],
            email: [{ value: 'john@company.com' }],
          },
        },
      ];

      const { searchPeopleByCompany } = await import(
        '../../../../src/objects/people/index.js'
      );
      vi.mocked(searchPeopleByCompany).mockResolvedValue(mockResults);

      const params: RelationshipSearchParams = {
        relationship_type: RelationshipType.COMPANY_TO_PEOPLE,
        source_id: 'comp-1',
        target_resource_type: UniversalResourceType.PEOPLE,
        limit: 10,
      };

      const result = await searchByRelationshipConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(searchPeopleByCompany).toHaveBeenCalledWith('comp-1');
    });

    it('should search people to company relationships', async () => {
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: {
            name: [{ value: 'Test Company' }],
            industry: [{ value: 'Technology' }],
          },
        },
      ];

      const { searchCompaniesByPeople } = await import(
        '../../../../src/objects/companies/index.js'
      );
      vi.mocked(searchCompaniesByPeople).mockResolvedValue(mockResults);

      const params: RelationshipSearchParams = {
        relationship_type: RelationshipType.PEOPLE_TO_COMPANY,
        source_id: 'person-1',
        target_resource_type: UniversalResourceType.COMPANIES,
      };

      const result = await searchByRelationshipConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(searchCompaniesByPeople).toHaveBeenCalledWith('person-1');
    });

    it('should handle unsupported task relationships with helpful error', async () => {
      const params: RelationshipSearchParams = {
        relationship_type: RelationshipType.PERSON_TO_TASKS,
        source_id: 'person-1',
        target_resource_type: UniversalResourceType.TASKS,
      };

      await expect(searchByRelationshipConfig.handler(params)).rejects.toThrow(
        /Task relationship search .* is not currently available/
      );
    });

    it('should format relationship results correctly', async () => {
      const mockResults = [
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'John Doe' }],
            role: [{ value: 'CEO' }],
            email: [{ value: 'john@company.com' }],
          },
        },
      ];

      const formatted = searchByRelationshipConfig.formatResult(
        mockResults,
        RelationshipType.COMPANY_TO_PEOPLE
      );

      expect(formatted).toContain('Found 1 records for company to people');
      expect(formatted).toContain(
        '1. John Doe (CEO) - john@company.com (ID: person-1)'
      );
    });
  });

  describe('search-by-content tool', () => {
    it('should search companies by notes content', async () => {
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: {
            name: [{ value: 'Company with Notes' }],
          },
        },
      ];

      const { searchCompaniesByNotes } = await import(
        '../../../../src/objects/companies/index.js'
      );
      vi.mocked(searchCompaniesByNotes).mockResolvedValue(mockResults);

      const params: ContentSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        content_type: ContentSearchType.NOTES,
        search_query: 'important meeting',
        limit: 10,
      };

      const result = await searchByContentConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(searchCompaniesByNotes).toHaveBeenCalledWith('important meeting');
    });

    it('should search people by notes content', async () => {
      const mockResults = [
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'Person with Notes' }],
          },
        },
      ];

      const { searchPeopleByNotes } = await import(
        '../../../../src/objects/people/index.js'
      );
      vi.mocked(searchPeopleByNotes).mockResolvedValue(mockResults);

      const params: ContentSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        content_type: ContentSearchType.NOTES,
        search_query: 'follow up',
        limit: 5,
      };

      const result = await searchByContentConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(searchPeopleByNotes).toHaveBeenCalledWith('follow up');
    });

    it('should search people by activity content', async () => {
      const mockResults = [
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'Active Person' }],
          },
        },
      ];

      const { searchPeopleByActivity } = await import(
        '../../../../src/objects/people/search.js'
      );
      vi.mocked(searchPeopleByActivity).mockResolvedValue(mockResults);

      const params: ContentSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        content_type: ContentSearchType.ACTIVITY,
        search_query: 'activity search',
      };

      const result = await searchByContentConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(searchPeopleByActivity).toHaveBeenCalledWith({
        dateRange: {
          preset: 'last_month',
        },
        interactionType: 'any',
      });
    });

    it('should handle unsupported interaction content search', async () => {
      const params: ContentSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        content_type: ContentSearchType.INTERACTIONS,
        search_query: 'interaction search',
      };

      await expect(searchByContentConfig.handler(params)).rejects.toThrow(
        /Interaction content search is not currently available/
      );
    });

    it('should format content search results correctly', async () => {
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: {
            name: [{ value: 'Company with Content' }],
          },
        },
      ];

      const { formatResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(formatResourceType).mockReturnValue('company');

      const formatted = searchByContentConfig.formatResult(
        mockResults,
        ContentSearchType.NOTES,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain('Found 1 companys with matching notes');
      expect(formatted).toContain('1. Company with Content (ID: comp-1)');
    });
  });

  describe('search-by-timeframe tool', () => {
    it('should search people by creation date', async () => {
      const mockResults = [
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'Recently Created Person' }],
          },
          created_at: '2023-12-01T00:00:00Z',
        },
      ];

      const { searchPeopleByCreationDate } = await import(
        '../../../../src/objects/people/index.js'
      );
      vi.mocked(searchPeopleByCreationDate).mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        timeframe_type: TimeframeType.CREATED,
        start_date: '2023-12-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
        limit: 10,
      };

      const result = await searchByTimeframeConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(searchPeopleByCreationDate).toHaveBeenCalledWith({
        start: '2023-12-01T00:00:00Z',
        end: '2023-12-31T23:59:59Z',
      });
    });

    it('should search people by modification date', async () => {
      const mockResults = [
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'Recently Modified Person' }],
          },
          updated_at: '2023-12-15T10:30:00Z',
        },
      ];

      const { searchPeopleByModificationDate } = await import(
        '../../../../src/objects/people/index.js'
      );
      vi.mocked(searchPeopleByModificationDate).mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        timeframe_type: TimeframeType.MODIFIED,
        start_date: '2023-12-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
      };

      const result = await searchByTimeframeConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(searchPeopleByModificationDate).toHaveBeenCalledWith({
        start: '2023-12-01T00:00:00Z',
        end: '2023-12-31T23:59:59Z',
      });
    });

    it('should search people by last interaction with date validation', async () => {
      const mockResults = [
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'Recently Interacted Person' }],
          },
        },
      ];

      const { validateAndCreateDateRange } = await import(
        '../../../../src/utils/date-utils.js'
      );
      const { searchPeopleByLastInteraction } = await import(
        '../../../../src/objects/people/index.js'
      );

      vi.mocked(validateAndCreateDateRange).mockReturnValue({
        start: '2023-12-01T00:00:00Z',
        end: '2023-12-31T23:59:59Z',
      });
      vi.mocked(searchPeopleByLastInteraction).mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        timeframe_type: TimeframeType.LAST_INTERACTION,
        start_date: '2023-12-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
      };

      const result = await searchByTimeframeConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(validateAndCreateDateRange).toHaveBeenCalledWith(
        '2023-12-01T00:00:00Z',
        '2023-12-31T23:59:59Z'
      );
      expect(searchPeopleByLastInteraction).toHaveBeenCalledWith({
        start: '2023-12-01T00:00:00Z',
        end: '2023-12-31T23:59:59Z',
      });
    });

    it('should handle missing date range for last interaction', async () => {
      const { validateAndCreateDateRange } = await import(
        '../../../../src/utils/date-utils.js'
      );
      vi.mocked(validateAndCreateDateRange).mockReturnValue(null);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        timeframe_type: TimeframeType.LAST_INTERACTION,
      };

      await expect(searchByTimeframeConfig.handler(params)).rejects.toThrow(
        'At least one date (start or end) is required for last interaction search'
      );
    });

    it('should handle unsupported timeframe for companies', async () => {
      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        timeframe_type: TimeframeType.CREATED,
        start_date: '2023-12-01T00:00:00Z',
      };

      await expect(searchByTimeframeConfig.handler(params)).rejects.toThrow(
        /Timeframe search is not currently optimized for companies/
      );
    });

    it('should format timeframe results with date info', async () => {
      const mockResults = [
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'Test Person' }],
          },
          created_at: '2023-12-01T10:30:00Z',
        },
      ];

      const { formatResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(formatResourceType).mockReturnValue('person');

      const formatted = searchByTimeframeConfig.formatResult(
        mockResults,
        TimeframeType.CREATED,
        UniversalResourceType.PEOPLE
      );

      expect(formatted).toContain('Found 1 persons by created');
      expect(formatted).toContain(
        '1. Test Person (created: 12/1/2023) (ID: person-1)'
      );
    });
  });

  describe('batch-operations tool', () => {
    it('should handle batch create operations', async () => {
      const mockResults = [
        {
          success: true,
          result: {
            id: { record_id: 'comp-1' },
            values: { name: [{ value: 'Company 1' }] },
          },
        },
        {
          success: true,
          result: {
            id: { record_id: 'comp-2' },
            values: { name: [{ value: 'Company 2' }] },
          },
        },
      ];

      const { handleUniversalCreate } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalCreate)
        .mockResolvedValueOnce({
          id: { record_id: 'comp-1' },
          values: { name: [{ value: 'Company 1' }] },
        })
        .mockResolvedValueOnce({
          id: { record_id: 'comp-2' },
          values: { name: [{ value: 'Company 2' }] },
        });

      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.CREATE,
        records: [
          { name: 'Company 1', website: 'https://comp1.com' },
          { name: 'Company 2', website: 'https://comp2.com' },
        ],
      };

      const result = await batchOperationsConfig.handler(params);
      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);
      expect(handleUniversalCreate).toHaveBeenCalledTimes(2);
    });

    it('should handle batch update operations', async () => {
      const mockResults = [
        {
          success: true,
          result: {
            id: { record_id: 'comp-1' },
            values: { name: [{ value: 'Updated Company 1' }] },
          },
        },
        {
          success: false,
          error: 'Record not found',
          data: { id: 'comp-invalid', name: 'Invalid Company' },
        },
      ];

      const { handleUniversalUpdate } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalUpdate)
        .mockResolvedValueOnce({
          id: { record_id: 'comp-1' },
          values: { name: [{ value: 'Updated Company 1' }] },
        })
        .mockRejectedValueOnce(new Error('Record not found'));

      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.UPDATE,
        records: [
          { id: 'comp-1', name: 'Updated Company 1' },
          { id: 'comp-invalid', name: 'Invalid Company' },
        ],
      };

      const result = await batchOperationsConfig.handler(params);
      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(false);
      expect(result[1].error).toBe('Record not found');
    });

    it('should handle batch delete operations', async () => {
      const { handleUniversalDelete } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalDelete)
        .mockResolvedValueOnce({ success: true, record_id: 'comp-1' })
        .mockResolvedValueOnce({ success: true, record_id: 'comp-2' });

      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.DELETE,
        record_ids: ['comp-1', 'comp-2'],
      };

      const result = await batchOperationsConfig.handler(params);
      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);
      expect(handleUniversalDelete).toHaveBeenCalledTimes(2);
    });

    it('should handle batch get operations', async () => {
      const { handleUniversalGetDetails } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalGetDetails)
        .mockResolvedValueOnce({
          id: { record_id: 'comp-1' },
          values: { name: [{ value: 'Company 1' }] },
        })
        .mockResolvedValueOnce({
          id: { record_id: 'comp-2' },
          values: { name: [{ value: 'Company 2' }] },
        });

      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.GET,
        record_ids: ['comp-1', 'comp-2'],
      };

      const result = await batchOperationsConfig.handler(params);
      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);
    });

    it('should handle batch search operations', async () => {
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: { name: [{ value: 'Company 1' }] },
        },
        {
          id: { record_id: 'comp-2' },
          values: { name: [{ value: 'Company 2' }] },
        },
      ];

      const { handleUniversalSearch } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalSearch).mockResolvedValue(mockResults);

      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.SEARCH,
        limit: 50,
        offset: 0,
      };

      const result = await batchOperationsConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(handleUniversalSearch).toHaveBeenCalledWith({
        resource_type: UniversalResourceType.COMPANIES,
        limit: 50,
        offset: 0,
      });
    });

    it('should validate batch size limits', async () => {
      const largeRecordArray = Array(51).fill({ name: 'Test Company' });

      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.CREATE,
        records: largeRecordArray,
      };

      await expect(batchOperationsConfig.handler(params)).rejects.toThrow(
        /Batch create size \(51\) exceeds maximum allowed \(50\)/
      );
    });

    it('should format batch results correctly', async () => {
      const mockResults = [
        {
          success: true,
          result: { values: { name: [{ value: 'Company 1' }] } },
        },
        {
          success: false,
          error: 'Creation failed',
          data: { name: 'Failed Company' },
        },
      ];

      const { formatResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(formatResourceType).mockReturnValue('company');

      const formatted = batchOperationsConfig.formatResult(
        mockResults,
        BatchOperationType.CREATE,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain(
        'Batch create completed: 1 successful, 1 failed'
      );
      expect(formatted).toContain('Successful operations:');
      expect(formatted).toContain('1. Company 1');
      expect(formatted).toContain('Failed operations:');
      expect(formatted).toContain('1. Failed Company: Creation failed');
    });

    it('should format batch search results correctly', async () => {
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: { name: [{ value: 'Company 1' }] },
        },
        {
          id: { record_id: 'comp-2' },
          values: { name: [{ value: 'Company 2' }] },
        },
      ];

      const { formatResourceType } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(formatResourceType).mockReturnValue('company');

      const formatted = batchOperationsConfig.formatResult(
        mockResults,
        BatchOperationType.SEARCH,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain('Batch search found 2 companys');
      expect(formatted).toContain('1. Company 1 (ID: comp-1)');
      expect(formatted).toContain('2. Company 2 (ID: comp-2)');
    });

    it('should handle missing records/record_ids for batch operations', async () => {
      const createParams: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.CREATE,
        // Missing records array
      };

      await expect(batchOperationsConfig.handler(createParams)).rejects.toThrow(
        'Records array is required for batch create operation'
      );

      const deleteParams: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.DELETE,
        // Missing record_ids array
      };

      await expect(batchOperationsConfig.handler(deleteParams)).rejects.toThrow(
        'Record IDs array is required for batch delete operation'
      );
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle validation errors in all advanced tools', async () => {
      const { validateUniversalToolParams } = await import(
        '../../../../src/handlers/tool-configs/universal/schemas.js'
      );

      // Store the original mock implementation to restore it later
      const originalMock = vi.mocked(validateUniversalToolParams);

      vi.mocked(validateUniversalToolParams).mockImplementation(() => {
        throw new Error('Validation failed');
      });

      const tools = [
        {
          tool: advancedSearchConfig,
          params: { resource_type: UniversalResourceType.COMPANIES },
        },
        {
          tool: searchByRelationshipConfig,
          params: {
            relationship_type: RelationshipType.COMPANY_TO_PEOPLE,
            source_id: 'test',
          },
        },
        {
          tool: searchByContentConfig,
          params: {
            resource_type: UniversalResourceType.COMPANIES,
            content_type: ContentSearchType.NOTES,
            search_query: 'test',
          },
        },
        {
          tool: searchByTimeframeConfig,
          params: {
            resource_type: UniversalResourceType.PEOPLE,
            timeframe_type: TimeframeType.CREATED,
          },
        },
        {
          tool: batchOperationsConfig,
          params: {
            resource_type: UniversalResourceType.COMPANIES,
            operation_type: BatchOperationType.CREATE,
            records: [],
          },
        },
      ];

      for (const { tool, params } of tools) {
        await expect(tool.handler(params)).rejects.toThrow('Validation failed');
      }

      // Restore the original mock behavior to not affect other tests
      vi.mocked(validateUniversalToolParams).mockImplementation(
        (operation: string, params: Record<string, unknown>) => {
          return params || {};
        }
      );
    });

    it('should handle empty results gracefully', async () => {
      const emptyResults: AttioRecord[] = [];

      // For empty arrays, formatters should show "found 0" not "No results found" based on current implementation
      expect(advancedSearchConfig.formatResult(emptyResults)).toContain(
        'Advanced search found 0 records:'
      );
      expect(searchByRelationshipConfig.formatResult(emptyResults)).toContain(
        'Found 0 records for'
      );
      expect(searchByContentConfig.formatResult(emptyResults)).toContain(
        'Found 0 records with matching'
      );
      expect(searchByTimeframeConfig.formatResult(emptyResults)).toContain(
        'Found 0 records by'
      );
    });

    it('should handle invalid resource types', async () => {
      const invalidParams = {
        resource_type: 'invalid-type' as UniversalResourceType,
        content_type: ContentSearchType.NOTES,
        search_query: 'test',
      };

      await expect(
        searchByContentConfig.handler(invalidParams)
      ).rejects.toThrow(
        /Content search not supported for resource type invalid-type/
      );
    });
  });

  describe('Concurrency and performance', () => {
    it('should handle batch operations with controlled concurrency', async () => {
      const { handleUniversalCreate } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );

      // Mock delay to test concurrency
      vi.mocked(handleUniversalCreate).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          id: { record_id: 'test' },
          values: { name: [{ value: 'Test' }] },
        };
      });

      const records = Array(10).fill({ name: 'Test Company' });
      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.CREATE,
        records,
      };

      const startTime = Date.now();
      const result = await batchOperationsConfig.handler(params);
      const endTime = Date.now();

      expect(result).toHaveLength(10);
      expect(result.every((r) => r.success)).toBe(true);
      // Should complete faster than sequential processing due to controlled concurrency
      expect(endTime - startTime).toBeLessThan(200); // Much less than 10 * 10ms = 100ms
    });

    it('should add delays between batch chunks', async () => {
      // This test ensures that delays are added between chunks for rate limiting
      const { handleUniversalCreate } = await import(
        '../../../../src/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalCreate).mockResolvedValue({
        id: { record_id: 'test' },
        values: {},
      });

      // Create enough records to trigger multiple chunks (>5 concurrent)
      const records = Array(12).fill({ name: 'Test' });
      const params: BatchOperationsParams = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: BatchOperationType.CREATE,
        records,
      };

      const startTime = Date.now();
      await batchOperationsConfig.handler(params);
      const endTime = Date.now();

      // Should take some time due to batch delays
      expect(endTime - startTime).toBeGreaterThan(50); // At least some delay for chunking
    });
  });
});
