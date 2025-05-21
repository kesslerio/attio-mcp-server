/**
 * Integration tests for advanced-search-companies
 * Specifically testing the fix for issue #182
 * 
 * This uses mocked API responses to test the full integration path
 * without requiring actual API credentials.
 */
import axios from 'axios';
import { advancedSearchCompanies } from '../../src/objects/companies/search';
import { initializeAttioClient } from '../../src/api/attio-client';
import { FilterConditionType } from '../../src/types/attio';
import { FilterValidationError } from '../../src/errors/api-errors';

// Mock axios for API calls
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('Advanced Search Companies Integration', () => {
  // Set up mock API client
  beforeAll(() => {
    mockAxios.create.mockReturnValue(mockAxios as any);
    initializeAttioClient('mock_api_key');
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Mock response data
  const mockCompanies = [
    {
      id: { record_id: 'company_1' },
      values: {
        name: [{ value: 'Test Company Inc' }],
        website: [{ value: 'testcompany.com' }]
      }
    },
    {
      id: { record_id: 'company_2' },
      values: {
        name: [{ value: 'Another Tech Ltd' }],
        website: [{ value: 'anothertech.com' }]
      }
    }
  ];
  
  describe('Valid search scenarios', () => {
    it('should correctly query with a simple filter', async () => {
      // Set up mock response
      mockAxios.post.mockResolvedValueOnce({
        data: {
          data: mockCompanies
        }
      });
      
      // Test filter
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: FilterConditionType.CONTAINS,
            value: 'test'
          }
        ]
      };
      
      // Execute search
      const results = await advancedSearchCompanies(filters, 10);
      
      // Verify API was called with correct parameters
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
      expect(mockAxios.post).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            name: {
              '$contains': 'test'
            }
          },
          limit: 10,
          offset: 0
        })
      );
      
      // Verify results
      expect(results).toEqual(mockCompanies);
    });
    
    it('should correctly query with OR logic', async () => {
      // Set up mock response
      mockAxios.post.mockResolvedValueOnce({
        data: {
          data: mockCompanies
        }
      });
      
      // Test filter with OR logic
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: FilterConditionType.CONTAINS,
            value: 'test'
          },
          {
            attribute: { slug: 'name' },
            condition: FilterConditionType.CONTAINS,
            value: 'tech'
          }
        ],
        matchAny: true
      };
      
      // Execute search
      const results = await advancedSearchCompanies(filters);
      
      // Verify API was called with correct parameters using OR logic
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
      expect(mockAxios.post).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            '$or': [
              {
                name: {
                  '$contains': 'test'
                }
              },
              {
                name: {
                  '$contains': 'tech'
                }
              }
            ]
          }
        })
      );
      
      // Verify results
      expect(results).toEqual(mockCompanies);
    });
    
    it('should use default limit and offset when not provided', async () => {
      // Set up mock response
      mockAxios.post.mockResolvedValueOnce({
        data: {
          data: mockCompanies
        }
      });
      
      // Test filter
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: FilterConditionType.CONTAINS,
            value: 'test'
          }
        ]
      };
      
      // Execute search with no limit/offset
      await advancedSearchCompanies(filters);
      
      // Verify API was called with default parameters
      expect(mockAxios.post).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          limit: 20,  // Default value
          offset: 0   // Default value
        })
      );
    });
  });
  
  describe('Error handling scenarios', () => {
    it('should throw descriptive error for undefined filters', async () => {
      await expect(advancedSearchCompanies(undefined as any))
        .rejects
        .toThrow(/required/i);
    });
    
    it('should throw descriptive error for missing filters array', async () => {
      const filters = {} as any;
      
      await expect(advancedSearchCompanies(filters))
        .rejects
        .toThrow(/must include a "filters" array/i);
    });
    
    it('should throw descriptive error for non-array filters', async () => {
      const filters = {
        filters: { not: 'an array' }
      } as any;
      
      await expect(advancedSearchCompanies(filters))
        .rejects
        .toThrow(/must be an array/i);
    });
    
    it('should throw error with context for filter validation failures', async () => {
      // Test filter with invalid condition
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'not_a_valid_condition' as any,
            value: 'test'
          }
        ]
      };
      
      await expect(advancedSearchCompanies(filters))
        .rejects
        .toThrow(FilterValidationError);
      
      await expect(advancedSearchCompanies(filters))
        .rejects
        .toThrow(/invalid condition/i);
    });
    
    it('should handle API errors with detailed messages', async () => {
      // Set up mock API error response
      mockAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            message: 'Invalid filter format',
            details: { error: 'Specific API error details' }
          }
        }
      });
      
      // Valid filter structure but will trigger API error
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: FilterConditionType.CONTAINS,
            value: 'test'
          }
        ]
      };
      
      await expect(advancedSearchCompanies(filters))
        .rejects
        .toThrow(/error in advanced company search/i);
    });
    
    it('should handle unexpected errors', async () => {
      // Set up mock for unexpected error
      mockAxios.post.mockRejectedValueOnce(new Error('Network error'));
      
      // Valid filter
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: FilterConditionType.CONTAINS,
            value: 'test'
          }
        ]
      };
      
      await expect(advancedSearchCompanies(filters))
        .rejects
        .toThrow(/error in advanced company search/i);
    });
  });
});