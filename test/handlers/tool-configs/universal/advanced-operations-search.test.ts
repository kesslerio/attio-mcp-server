import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('Universal Advanced Operations - Search Tests', () => {
  let advancedSearchConfig: unknown;
  let searchByRelationshipConfig: unknown;

  beforeEach(async () => {
    await setupUnitTestMocks();

    // Import after mocks are set up
      '../../../../src/handlers/tool-configs/universal/advanced-operations.js'
    );
    advancedSearchConfig = advancedOps.advancedSearchConfig;
    searchByRelationshipConfig = advancedOps.searchByRelationshipConfig;
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('advanced-search tool', () => {
    it('should perform advanced search successfully', async () => {
        {
          id: { record_id: 'comp-1' },
          values: {
            name: 'Advanced Company',
            industry: 'Technology',
            location: 'San Francisco',
          },
        },
      ];

      const { mockHandlers } = getMockInstances();
      mockHandlers.handleUniversalSearch.mockResolvedValue(mockResults);

      const params: unknown = {
        resource_type: UniversalResourceType.COMPANIES,
        query: 'technology',
        filters: [
          {
            attribute: { slug: 'industry' },
            condition: 'equals',
            value: 'Technology',
          },
        ],
        sort_by: 'name',
        sort_order: 'asc',
        limit: 20,
      };

      expect(result).toEqual(mockResults);
      expect(mockHandlers.handleUniversalSearch).toHaveBeenCalledWith({
        resource_type: params.resource_type,
        query: params.query,
        filters: params.filters,
        limit: params.limit,
        offset: params.offset,
      });
    });

    it('should format advanced search results with context', async () => {
        {
          id: { record_id: 'comp-1' },
          values: {
            name: 'Tech Corp',
            industry: 'Technology',
            location: 'San Francisco',
            website: 'https://techcorp.com',
          },
        },
      ];

      const { mockHandlers } = getMockInstances();
      mockHandlers.formatResourceType.mockReturnValue('company');

        mockResults,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain('Advanced search found 1 company');
      expect(formatted).toContain(
        '1. Tech Corp [Technology] (San Francisco) - https://techcorp.com (ID: comp-1)'
      );
    });

    it('should handle advanced search errors', async () => {
      const { mockHandlers } = getMockInstances();
      mockHandlers.handleUniversalSearch.mockRejectedValue(mockError);
      mockHandlers.createUniversalError.mockReturnValue(
        new Error('advanced search failed for companies: Filter error')
      );

      const params: AdvancedSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
      };

      await expect(advancedSearchConfig.handler(params)).rejects.toThrow(
        'Universal advanced search failed for resource type companies: Filter error'
      );
    });
  });

  describe('search-by-relationship tool', () => {
    it('should search company to people relationships', async () => {
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'John Doe' }],
            role: [{ value: 'CEO' }],
            email: [{ value: 'john@company.com' }],
          },
        },
      ];

      const { mockSpecialized } = getMockInstances();
      mockSpecialized.searchPeopleByCompany.mockResolvedValue(mockResults);

      const params: RelationshipSearchParams = {
        relationship_type: RelationshipType.COMPANY_TO_PEOPLE,
        source_id: 'comp-1',
        target_resource_type: UniversalResourceType.PEOPLE,
        limit: 10,
      };

      expect(result).toEqual(mockResults);
      expect(mockSpecialized.searchPeopleByCompany).toHaveBeenCalledWith(
        'comp-1'
      );
    });

    it('should search people to company relationships', async () => {
        {
          id: { record_id: 'comp-1' },
          values: {
            name: [{ value: 'Test Company' }],
            industry: [{ value: 'Technology' }],
          },
        },
      ];

      const { mockSpecialized } = getMockInstances();
      mockSpecialized.searchCompaniesByPeople.mockResolvedValue(mockResults);

      const params: RelationshipSearchParams = {
        relationship_type: RelationshipType.PEOPLE_TO_COMPANY,
        source_id: 'person-1',
        target_resource_type: UniversalResourceType.COMPANIES,
      };

      expect(result).toEqual(mockResults);
      expect(mockSpecialized.searchCompaniesByPeople).toHaveBeenCalledWith(
        'person-1'
      );
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
        {
          id: { record_id: 'person-1' },
          values: {
            name: [{ value: 'John Doe' }],
            role: [{ value: 'CEO' }],
            email: [{ value: 'john@company.com' }],
          },
        },
      ];

        mockResults,
        RelationshipType.COMPANY_TO_PEOPLE
      );

      expect(formatted).toContain('Found 1 records for company to people');
      expect(formatted).toContain(
        '1. John Doe (CEO) - john@company.com (ID: person-1)'
      );
    });
  });

  describe('Search tool validation and edge cases', () => {
    it('should handle validation errors in search tools', async () => {
      const { mockSchemas } = getMockInstances();

      // Store the original mock implementation to restore it later

      mockSchemas.validateUniversalToolParams.mockImplementation(() => {
        throw new Error('Validation failed');
      });

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

    it('should handle empty search results gracefully', async () => {
      const emptyResults: unknown[] = [];

      // For empty arrays, formatters should show "found 0" not "No results found" based on current implementation
      expect(advancedSearchConfig.formatResult(emptyResults)).toContain(
        'Advanced search found 0 records:'
      );
      expect(searchByRelationshipConfig.formatResult(emptyResults)).toContain(
        'Found 0 records for'
      );
    });
  });
});
