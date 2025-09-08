import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('Universal Advanced Operations - Content & Timeframe Tests', () => {
  let searchByContentConfig: unknown;
  let searchByTimeframeConfig: unknown;

  beforeEach(async () => {
    await setupUnitTestMocks();

    // Import after mocks are set up
      '../../../../src/handlers/tool-configs/universal/advanced-operations.js'
    );
    searchByContentConfig = advancedOps.searchByContentConfig;
    searchByTimeframeConfig = advancedOps.searchByTimeframeConfig;
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('search-by-content tool', () => {
    it('should search companies by notes content', async () => {
        {
          id: { record_id: 'comp-1' },
          values: {
            name: [{ value: 'Company with Notes' }],
          },
        },
      ];

      const { mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);

      const params: ContentSearchParams = {
        resource_type: UniversalResourceType.NOTES,
        content_type: ContentSearchType.NOTES,
        search_query: 'important meeting',
        limit: 10,
      };

      expect(result).toEqual(mockResults);
      expect(mockSearchService.searchRecords).toHaveBeenCalled();
    });

    it('should search people by notes content', async () => {
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'Person with Notes' }],
          },
        },
      ];

      const { mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);

      const params: ContentSearchParams = {
        resource_type: UniversalResourceType.NOTES,
        content_type: ContentSearchType.NOTES,
        search_query: 'follow up',
        limit: 5,
      };

      expect(result).toEqual(mockResults);
      expect(mockSearchService.searchRecords).toHaveBeenCalled();
    });

    it('should search people by activity content', async () => {
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
        /Interaction content search is not currently available/
      );
    });

    it('should format content search results correctly', async () => {
        {
          id: { record_id: 'comp-1' },
          values: {
            name: [{ value: 'Company with Content' }],
          },
        },
      ];

      const { mockHandlers } = getMockInstances();
      mockHandlers.formatResourceType.mockReturnValue('company');

        mockResults,
        ContentSearchType.NOTES,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain('Found 1 companys with matching notes');
      expect(formatted).toContain('1. Company with Content (ID: comp-1)');
    });

    it('should handle invalid resource types in content search', async () => {
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

  describe('search-by-timeframe tool', () => {
    it('should search people by creation date', async () => {
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

      expect(result).toEqual(mockResults);
      expect(mockSpecialized.searchPeopleByCreationDate).toHaveBeenCalledWith({
        start: '2023-12-01T00:00:00Z',
        end: '2023-12-31T23:59:59Z',
      });
    });

    it('should search people by modification date', async () => {
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'Recently Modified Person' }],
          },
          updated_at: '2023-12-15T10:30:00Z',
        },
      ];

      const { mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        timeframe_type: TimeframeType.MODIFIED,
        start_date: '2023-12-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
      };

      expect(result).toEqual(mockResults);
      expect(mockSearchService.searchRecords).toHaveBeenCalled();
    });

    it('should search people by last interaction with date validation', async () => {
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'Recently Interacted Person' }],
          },
        },
      ];

      const { mockSearchService } = getMockInstances();
      mockSearchService.searchRecords.mockResolvedValue(mockResults);

      const params: TimeframeSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        timeframe_type: TimeframeType.LAST_INTERACTION,
        start_date: '2023-12-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
      };

      expect(result).toEqual(mockResults);
      expect(mockSearchService.searchRecords).toHaveBeenCalled();
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
      expect(result).toEqual(mockResults);
      expect(mockSearchService.searchRecords).toHaveBeenCalled();
    });

    it('should format timeframe results with date info', async () => {
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

  describe('Content and Timeframe validation and edge cases', () => {
    it('should handle validation errors in content and timeframe tools', async () => {
      const { mockSchemas } = getMockInstances();

      // Store the original mock implementation to restore it later

      mockSchemas.validateUniversalToolParams.mockImplementation(() => {
        throw new Error('Validation failed');
      });

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
        (operation: string, params: unknown) => {
          return params || {};
        }
      );
    });

    it('should handle empty results gracefully', async () => {
      const emptyResults: unknown[] = [];

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
