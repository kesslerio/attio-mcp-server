import { registerToolHandlers } from '../../src/handlers/tools/index';
import * as companiesModule from '../../src/objects/companies/index';
import * as peopleModule from '../../src/objects/people/index';
import * as attributeMappingModule from '../../src/utils/attribute-mapping';

// Mock dependencies
jest.mock('../../src/objects/companies/index');
jest.mock('../../src/objects/people/index');
jest.mock('../../src/utils/attribute-mapping');
jest.mock('../../src/utils/error-handler');

describe('tools attribute mapping integration', () => {
  describe('Advanced search with attribute mapping', () => {
    let mockServer: any;
    let callToolHandler: Function;
    const mockedCompanies = companiesModule as jest.Mocked<typeof companiesModule>;
    const mockedPeople = peopleModule as jest.Mocked<typeof peopleModule>;
    const mockedAttributeMapping = attributeMappingModule as jest.Mocked<typeof attributeMappingModule>;

    // Mock data
    const mockCompanySearchResults = [
      {
        id: { record_id: 'company1' },
        values: { name: [{ value: 'Acme Corp' }] }
      },
      {
        id: { record_id: 'company2' },
        values: { name: [{ value: 'Globex Inc' }] }
      }
    ];

    const mockPeopleSearchResults = [
      {
        id: { record_id: 'person1' },
        values: { name: [{ value: 'John Doe' }] }
      },
      {
        id: { record_id: 'person2' },
        values: { name: [{ value: 'Jane Smith' }] }
      }
    ];

    beforeEach(() => {
      // Reset all mocks before each test
      jest.resetAllMocks();
      
      // Setup mock server
      mockServer = {
        setRequestHandler: jest.fn(),
      };
      
      // Register handlers
      registerToolHandlers(mockServer);
      
      // Get the call tool handler (second handler registered)
      callToolHandler = mockServer.setRequestHandler.mock.calls[1][1];
      
      // Setup translateAttributeNamesInFilters mock
      mockedAttributeMapping.translateAttributeNamesInFilters.mockImplementation(
        (filters, objectType) => {
          // For testing purposes, return a transformed filter
          // to verify it's being called with the right parameters
          return {
            ...filters,
            _translated: true,
            _objectType: objectType
          };
        }
      );
    });

    it('should translate attribute names in company advanced search filters', async () => {
      // Setup mock for advanced search
      mockedCompanies.advancedSearchCompanies.mockResolvedValueOnce(mockCompanySearchResults);
      
      // Original filters with human-readable attribute names
      const originalFilters = {
        operator: 'and',
        filters: [
          {
            attribute: {
              slug: 'B2B Segment'  // This should be translated to "type_persona"
            },
            condition: 'equals',
            value: 'Enterprise'
          }
        ]
      };
      
      // Create a mock request for advanced search
      const request = {
        params: {
          name: 'advanced-search-companies',
          arguments: {
            filters: originalFilters,
            limit: 10,
            offset: 0
          }
        }
      };
      
      // Call the handler
      await callToolHandler(request);
      
      // Verify translation was called with correct parameters
      expect(mockedAttributeMapping.translateAttributeNamesInFilters).toHaveBeenCalledWith(
        originalFilters, 
        'companies'
      );
      
      // Verify the translated filters were passed to the advancedSearchCompanies function
      expect(mockedCompanies.advancedSearchCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          _translated: true,
          _objectType: 'companies'
        }),
        10,
        0
      );
    });

    it('should translate attribute names in people advanced search filters', async () => {
      // Setup mock for advanced search
      mockedPeople.advancedSearchPeople.mockResolvedValueOnce(mockPeopleSearchResults);
      
      // Original filters with human-readable attribute names
      const originalFilters = {
        operator: 'and',
        filters: [
          {
            attribute: {
              slug: 'Full Name'  // This should be translated to "name"
            },
            condition: 'contains',
            value: 'John'
          }
        ]
      };
      
      // Create a mock request for advanced search
      const request = {
        params: {
          name: 'advanced-search-people',
          arguments: {
            filters: originalFilters
          }
        }
      };
      
      // Call the handler
      await callToolHandler(request);
      
      // Verify translation was called with correct parameters
      expect(mockedAttributeMapping.translateAttributeNamesInFilters).toHaveBeenCalledWith(
        originalFilters, 
        'people'
      );
      
      // Verify the translated filters were passed to the advancedSearchPeople function
      expect(mockedPeople.advancedSearchPeople).toHaveBeenCalledWith(
        expect.objectContaining({
          _translated: true,
          _objectType: 'people'
        }),
        undefined,
        undefined
      );
    });

    it('should handle complex nested filters with mixed attribute names', async () => {
      // Setup mock for advanced search
      mockedCompanies.advancedSearchCompanies.mockResolvedValueOnce(mockCompanySearchResults);
      
      // Complex filters with nested structure and different object types
      const complexFilters = {
        operator: 'and',
        filters: [
          {
            attribute: {
              slug: 'B2B Segment'  // Companies attribute
            },
            condition: 'equals',
            value: 'Enterprise'
          },
          {
            operator: 'or',
            filters: [
              {
                attribute: {
                  slug: 'Industry'  // Companies attribute
                },
                condition: 'equals',
                value: 'Technology'
              },
              {
                attribute: {
                  slug: 'Annual Revenue'  // Should translate to annual_revenue
                },
                condition: 'greater_than',
                value: 1000000
              }
            ]
          },
          {
            people: {  // Nested people-specific section
              attribute: {
                slug: 'Full Name'  // People attribute
              },
              condition: 'contains',
              value: 'CEO'
            }
          }
        ]
      };
      
      // Create a mock request for advanced search
      const request = {
        params: {
          name: 'advanced-search-companies',
          arguments: {
            filters: complexFilters
          }
        }
      };
      
      // Call the handler
      await callToolHandler(request);
      
      // Verify translation was called with correct parameters
      expect(mockedAttributeMapping.translateAttributeNamesInFilters).toHaveBeenCalledWith(
        complexFilters, 
        'companies'
      );
      
      // Verify the translated filters were passed to the advancedSearchCompanies function
      expect(mockedCompanies.advancedSearchCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          _translated: true,
          _objectType: 'companies'
        }),
        undefined,
        undefined
      );
    });
  });
});