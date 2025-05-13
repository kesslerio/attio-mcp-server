/**
 * Tests for advanced filtering capabilities
 * 
 * These tests verify the new advanced filtering functionality for People and Companies,
 * ensuring that the implementation meets the requirements specified in Issue #57.
 */
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { FilterConditionType, ResourceType } from '../../src/types/attio.js';
import { advancedSearchObject } from '../../src/api/attio-operations.js';
import { 
  advancedSearchPeople, 
  createNameFilter,
  createEmailFilter,
  createPhoneFilter
} from '../../src/objects/people.js';
import { 
  advancedSearchCompanies,
  createWebsiteFilter,
  createIndustryFilter
} from '../../src/objects/companies.js';
import * as attioClient from '../../src/api/attio-client.js';

// Mock the Axios client
jest.mock('../../src/api/attio-client.js', () => {
  return {
    getAttioClient: jest.fn(() => ({
      post: jest.fn()
    }))
  };
});

describe('advancedSearchObject', () => {
  let mockAxiosPost: jest.Mock;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup mock API response
    mockAxiosPost = jest.fn().mockResolvedValue({
      data: {
        data: [
          { 
            id: { record_id: '123' },
            values: { 
              name: [{ value: 'Test Name' }]
            }
          }
        ]
      }
    });
    
    // Apply mock
    (attioClient.getAttioClient as jest.Mock).mockReturnValue({
      post: mockAxiosPost
    });
  });
  
  test('calls API with correct filter format for single condition', async () => {
    const filters = {
      filters: [
        {
          attribute: { slug: 'name' },
          condition: FilterConditionType.EQUALS,
          value: 'Test Name'
        }
      ]
    };
    
    await advancedSearchObject(ResourceType.PEOPLE, filters);
    
    // Verify API was called with correct parameters
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost.mock.calls[0][0]).toBe('/objects/people/records/query');
    expect(mockAxiosPost.mock.calls[0][1]).toEqual({
      limit: 20,
      offset: 0,
      filter: {
        name: {
          '$equals': 'Test Name'
        }
      }
    });
  });
  
  test('applies limit and offset correctly', async () => {
    const filters = createNameFilter('Test');
    const limit = 50;
    const offset = 10;
    
    await advancedSearchObject(ResourceType.PEOPLE, filters, limit, offset);
    
    // Verify API was called with correct parameters
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost.mock.calls[0][1]).toMatchObject({
      limit: 50,
      offset: 10
    });
  });
  
  test('handles complex filters with AND logic', async () => {
    const filters = {
      filters: [
        {
          attribute: { slug: 'name' },
          condition: FilterConditionType.CONTAINS,
          value: 'Test'
        },
        {
          attribute: { slug: 'stage' },
          condition: FilterConditionType.EQUALS,
          value: 'Lead'
        }
      ]
    };
    
    await advancedSearchObject(ResourceType.PEOPLE, filters);
    
    // Verify API was called with correct parameters
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost.mock.calls[0][1].filter).toEqual({
      name: {
        '$contains': 'Test'
      },
      stage: {
        '$equals': 'Lead'
      }
    });
  });
  
  test('handles complex filters with OR logic', async () => {
    const filters = {
      filters: [
        {
          attribute: { slug: 'name' },
          condition: FilterConditionType.CONTAINS,
          value: 'Test'
        },
        {
          attribute: { slug: 'name' },
          condition: FilterConditionType.CONTAINS,
          value: 'Company'
        }
      ],
      matchAny: true
    };
    
    await advancedSearchObject(ResourceType.PEOPLE, filters);
    
    // Verify API was called with correct parameters
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost.mock.calls[0][1].filter).toEqual({
      '$or': [
        { name: { '$contains': 'Test' } },
        { name: { '$contains': 'Company' } }
      ]
    });
  });
});

describe('People advanced filtering', () => {
  let mockAxiosPost: jest.Mock;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup mock API response
    mockAxiosPost = jest.fn().mockResolvedValue({
      data: {
        data: [
          { 
            id: { record_id: '123' },
            values: { 
              name: [{ value: 'John Smith' }],
              email: [{ value: 'john@example.com' }],
              phone: [{ value: '+1234567890' }]
            }
          },
          { 
            id: { record_id: '456' },
            values: { 
              name: [{ value: 'Jane Smith' }],
              email: [{ value: 'jane@example.com' }],
              phone: [{ value: '+0987654321' }]
            }
          }
        ]
      }
    });
    
    // Apply mock
    (attioClient.getAttioClient as jest.Mock).mockReturnValue({
      post: mockAxiosPost
    });
  });
  
  test('filter helper functions create correct filter structures', () => {
    const nameFilter = createNameFilter('John Smith', FilterConditionType.EQUALS);
    expect(nameFilter).toEqual({
      filters: [
        {
          attribute: { slug: 'name' },
          condition: FilterConditionType.EQUALS,
          value: 'John Smith'
        }
      ]
    });
    
    const emailFilter = createEmailFilter('example.com', FilterConditionType.CONTAINS);
    expect(emailFilter).toEqual({
      filters: [
        {
          attribute: { slug: 'email' },
          condition: FilterConditionType.CONTAINS,
          value: 'example.com'
        }
      ]
    });
    
    const phoneFilter = createPhoneFilter('+1234', FilterConditionType.STARTS_WITH);
    expect(phoneFilter).toEqual({
      filters: [
        {
          attribute: { slug: 'phone' },
          condition: FilterConditionType.STARTS_WITH,
          value: '+1234'
        }
      ]
    });
  });
  
  test('correctly handles client-side email filtering', async () => {
    // Setup a mock that will throw "unknown attribute slug: email" error first time
    const mockError = new Error('unknown attribute slug: email');
    mockAxiosPost
      .mockRejectedValueOnce({ message: mockError.message })
      .mockResolvedValueOnce({
        data: {
          data: [
            { 
              id: { record_id: '123' },
              values: { 
                name: [{ value: 'John Smith' }],
                email: [{ value: 'john@example.com' }]
              }
            },
            { 
              id: { record_id: '456' },
              values: { 
                name: [{ value: 'Jane Smith' }],
                email: [{ value: 'jane@gmail.com' }]
              }
            }
          ]
        }
      });
      
    // Create a filter with email
    const emailFilter = createEmailFilter('example.com', FilterConditionType.CONTAINS);
    
    // This should handle the error by falling back to client-side filtering
    const results = await advancedSearchPeople(emailFilter);
    
    // Should only return the first person with example.com email
    expect(results.length).toBe(1);
    expect(results[0].id.record_id).toBe('123');
  });
});

describe('Companies advanced filtering', () => {
  let mockAxiosPost: jest.Mock;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup mock API response
    mockAxiosPost = jest.fn().mockResolvedValue({
      data: {
        data: [
          { 
            id: { record_id: '123' },
            values: { 
              name: [{ value: 'Tech Corp' }],
              website: [{ value: 'techcorp.com' }],
              industry: [{ value: 'Technology' }]
            }
          },
          { 
            id: { record_id: '456' },
            values: { 
              name: [{ value: 'Green Energy Inc' }],
              website: [{ value: 'greenenergy.com' }],
              industry: [{ value: 'Energy' }]
            }
          }
        ]
      }
    });
    
    // Apply mock
    (attioClient.getAttioClient as jest.Mock).mockReturnValue({
      post: mockAxiosPost
    });
  });
  
  test('filter helper functions create correct filter structures', () => {
    const nameFilter = createNameFilter('Tech Corp', FilterConditionType.EQUALS);
    expect(nameFilter).toEqual({
      filters: [
        {
          attribute: { slug: 'name' },
          condition: FilterConditionType.EQUALS,
          value: 'Tech Corp'
        }
      ]
    });
    
    const websiteFilter = createWebsiteFilter('tech', FilterConditionType.CONTAINS);
    expect(websiteFilter).toEqual({
      filters: [
        {
          attribute: { slug: 'website' },
          condition: FilterConditionType.CONTAINS,
          value: 'tech'
        }
      ]
    });
    
    const industryFilter = createIndustryFilter('Technology', FilterConditionType.EQUALS);
    expect(industryFilter).toEqual({
      filters: [
        {
          attribute: { slug: 'industry' },
          condition: FilterConditionType.EQUALS,
          value: 'Technology'
        }
      ]
    });
  });
  
  test('correctly handles advanced company filtering', async () => {
    // Combined filter for technology companies
    const filter = {
      filters: [
        {
          attribute: { slug: 'industry' },
          condition: FilterConditionType.EQUALS,
          value: 'Technology'
        },
        {
          attribute: { slug: 'website' },
          condition: FilterConditionType.CONTAINS,
          value: 'tech'
        }
      ]
    };
    
    const results = await advancedSearchCompanies(filter);
    
    // Verify it called the API with the right parameters
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost.mock.calls[0][1].filter).toEqual({
      industry: {
        '$equals': 'Technology'
      },
      website: {
        '$contains': 'tech'
      }
    });
  });
});