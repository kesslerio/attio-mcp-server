import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  UniversalResourceType,
  ContentSearchType,
  TimeframeType,
  ContentSearchParams,
  TimeframeSearchParams,
} from '@handlers/tool-configs/universal/types.js';
import {
  setupUnitTestMocks,
  cleanupMocks,
  getMockInstances,
} from '@test/handlers/tool-configs/universal/helpers/index.js';

describe('Universal Advanced Operations - Content & Timeframe Tests', () => {
  let searchByContentConfig: any;
  let searchByTimeframeConfig: any;

  beforeEach(async () => {
    await setupUnitTestMocks();

    // Import after mocks are set up
    const advancedOps =
      await import('@handlers/tool-configs/universal/advanced-operations.js');
    searchByContentConfig = advancedOps.searchByContentConfig;
    searchByTimeframeConfig = advancedOps.searchByTimeframeConfig;
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('records_search_by_content tool', () => {
    it('should search companies by notes content', async () => {
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: {
            name: [{ value: 'Company with Notes' }],
          },
        },
      ];

      const { mockHandlers, mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);

      const params: ContentSearchParams = {
        resource_type: UniversalResourceType.NOTES,
        content_type: ContentSearchType.NOTES,
        search_query: 'important meeting',
        limit: 10,
      };

      const result = await searchByContentConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(mockSearchService.searchRecords).toHaveBeenCalled();
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

      const { mockHandlers, mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);

      const params: ContentSearchParams = {
        resource_type: UniversalResourceType.NOTES,
        content_type: ContentSearchType.NOTES,
        search_query: 'follow up',
        limit: 5,
      };

      const result = await searchByContentConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(mockSearchService.searchRecords).toHaveBeenCalled();
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

      const { mockSpecialized } = getMockInstances();
      mockSpecialized.searchPeopleByActivity.mockResolvedValue(mockResults);

      const params: ContentSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        content_type: ContentSearchType.ACTIVITY,
        search_query: 'activity search',
      };

      const result = await searchByContentConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(mockSpecialized.searchPeopleByActivity).toHaveBeenCalledWith({
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
        /Interaction content search is not available via search_records_by_content/
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

      const { mockHandlers } = getMockInstances();
      mockHandlers.formatResourceType.mockReturnValue('company');

      const formatted = (searchByContentConfig.formatResult as any)(
        mockResults,
        ContentSearchType.NOTES,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain('Found 1 company with matching notes');
      expect(formatted).toContain('1. Company with Content (ID: comp-1)');
    });

    it('should handle invalid resource types in content search', async () => {
      const invalidParams = {
        resource_type: 'invalid-type' as any,
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

  describe('records_search_by_timeframe tool', () => {
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

      const { mockSpecialized } = getMockInstances();
      mockSpecialized.searchPeopleByCreationDate.mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        timeframe_type: TimeframeType.CREATED,
        start_date: '2023-12-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
        limit: 10,
      };

      const result = await searchByTimeframeConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(mockSpecialized.searchPeopleByCreationDate).toHaveBeenCalledWith({
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

      const { mockHandlers, mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        timeframe_type: TimeframeType.MODIFIED,
        start_date: '2023-12-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
      };

      const result = await searchByTimeframeConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(mockHandlers.handleUniversalSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          resource_type: UniversalResourceType.PEOPLE,
          timeframe_attribute: 'updated_at',
          start_date: '2023-12-01T00:00:00Z',
          end_date: '2023-12-31T23:59:59Z',
          date_operator: 'between',
        })
      );
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

      const { mockHandlers, mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        timeframe_type: TimeframeType.LAST_INTERACTION,
        start_date: '2023-12-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
      };

      const result = await searchByTimeframeConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(mockHandlers.handleUniversalSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          resource_type: UniversalResourceType.PEOPLE,
          timeframe_attribute: 'last_interaction',
          start_date: '2023-12-01T00:00:00Z',
          end_date: '2023-12-31T23:59:59Z',
          date_operator: 'between',
        })
      );
    });

    it('should accept last_interaction as an explicit date_field', async () => {
      const mockResults = [
        {
          id: { record_id: 'person-2' },
          values: {
            name: [{ value: 'Interaction Date Field Person' }],
          },
        },
      ];

      const { mockHandlers, mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        date_field: 'last_interaction',
        start_date: '2023-12-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
      };

      const result = await searchByTimeframeConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(mockHandlers.handleUniversalSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframe_attribute: 'last_interaction',
          start_date: '2023-12-01T00:00:00Z',
          end_date: '2023-12-31T23:59:59Z',
        })
      );
    });

    it('should map updated_at date_field overrides to updated_at', async () => {
      const mockResults = [
        {
          id: { record_id: 'person-3' },
          values: {
            name: [{ value: 'Updated Date Field Person' }],
          },
        },
      ];

      const { mockHandlers, mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        date_field: 'updated_at',
        start_date: '2023-12-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
      };

      const result = await searchByTimeframeConfig.handler(params);
      expect(result).toEqual(mockResults);
      expect(mockHandlers.handleUniversalSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframe_attribute: 'updated_at',
          start_date: '2023-12-01T00:00:00Z',
          end_date: '2023-12-31T23:59:59Z',
        })
      );
    });

    it('should default missing timeframe_type to created_at', async () => {
      const mockResults = [
        {
          id: { record_id: 'person-4' },
          values: {
            name: [{ value: 'Implicit Created Person' }],
          },
        },
      ];

      const { mockHandlers, mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);
      mockHandlers.handleUniversalSearch.mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        start_date: '2023-12-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
      };

      const result = await searchByTimeframeConfig.handler(params);

      expect(result).toEqual(mockResults);
      expect(mockHandlers.handleUniversalSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          resource_type: UniversalResourceType.PEOPLE,
          timeframe_attribute: 'created_at',
          start_date: '2023-12-01T00:00:00Z',
          end_date: '2023-12-31T23:59:59Z',
          date_operator: 'between',
        })
      );
    });

    it('should use a lower-bound operator for start-only timeframe queries', async () => {
      const mockResults = [
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'Recently Interacted Person' }],
          },
        },
      ];

      const { mockHandlers, mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        timeframe_type: TimeframeType.LAST_INTERACTION,
        start_date: '2023-12-01',
      };

      const result = await searchByTimeframeConfig.handler(params);

      expect(result).toEqual(mockResults);
      expect(mockHandlers.handleUniversalSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframe_attribute: 'last_interaction',
          start_date: '2023-12-01T00:00:00Z',
          end_date: undefined,
          date_operator: 'greater_than',
        })
      );
    });

    it('should accept last_interaction as an explicit date_field override', async () => {
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: { name: [{ value: 'Test Company' }] },
        },
      ];

      const { mockHandlers, mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        date_field: 'last_interaction',
        end_date: '2023-12-31',
      };

      const result = await searchByTimeframeConfig.handler(params);

      expect(result).toEqual(mockResults);
      expect(mockHandlers.handleUniversalSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframe_attribute: 'last_interaction',
          end_date: '2023-12-31T23:59:59.999Z',
          date_operator: 'less_than',
        })
      );
    });

    it('should handle missing date range for last interaction', async () => {
      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        timeframe_type: TimeframeType.LAST_INTERACTION,
      };

      await expect(searchByTimeframeConfig.handler(params)).rejects.toThrow(
        'At least one date (start_date or end_date) is required for timeframe search'
      );
    });

    it('should support timeframe search for companies', async () => {
      // Companies timeframe search is now enabled
      // This test validates that the old restriction is removed
      const mockResults = [
        {
          id: { record_id: 'comp-1' },
          values: { name: [{ value: 'Test Company' }] },
        },
      ];

      const { mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        timeframe_type: TimeframeType.CREATED,
        start_date: '2023-12-01T00:00:00Z',
      };

      // Should successfully execute without throwing errors
      const result = await searchByTimeframeConfig.handler(params);
      expect(result).toEqual(mockResults);
      const { mockHandlers } = getMockInstances();
      expect(mockHandlers.handleUniversalSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          resource_type: UniversalResourceType.COMPANIES,
          timeframe_attribute: 'created_at',
          start_date: '2023-12-01T00:00:00Z',
          end_date: undefined,
          date_operator: 'greater_than',
        })
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

      const { mockHandlers } = getMockInstances();
      mockHandlers.formatResourceType.mockReturnValue('person');

      const formatted = (searchByTimeframeConfig.formatResult as any)(
        mockResults,
        TimeframeType.CREATED,
        UniversalResourceType.PEOPLE
      );

      expect(formatted).toContain('Found 1 person by created');
      expect(formatted).toContain(
        '1. Test Person (created: 12/1/2023) (ID: person-1)'
      );
    });
  });

  describe('Content and Timeframe validation and edge cases', () => {
    it('should handle validation errors in content and timeframe tools', async () => {
      const { mockSchemas } = getMockInstances();

      // Store the original mock implementation to restore it later
      const originalMock = mockSchemas.validateUniversalToolParams;

      mockSchemas.validateUniversalToolParams.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      const tools = [
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
      ];

      for (const { tool, params } of tools) {
        await expect(tool.handler(params)).rejects.toThrow('Validation failed');
      }

      // Restore the original mock behavior to not affect other tests
      mockSchemas.validateUniversalToolParams.mockImplementation(
        (operation: string, params: any) => {
          return params || {};
        }
      );
    });

    it('should handle empty results gracefully', async () => {
      const emptyResults: any[] = [];

      // For empty arrays, formatters should show "found 0" not "No results found" based on current implementation
      expect(
        (searchByContentConfig.formatResult as any)(emptyResults)
      ).toContain('Found 0 records with matching');
      expect(
        (searchByTimeframeConfig.formatResult as any)(emptyResults)
      ).toContain('Found 0 records by');
    });
  });
});
