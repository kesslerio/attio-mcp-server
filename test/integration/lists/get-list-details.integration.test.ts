/**
 * Integration tests for get-list-details tool
 */
import axios from 'axios';
import { initializeAttioClient } from '../../../src/api/attio-client';
import { executeToolRequest } from '../../../src/handlers/tools/dispatcher';

// Mock axios to simulate API responses
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('get-list-details integration test', () => {
  beforeAll(() => {
    // Mock axios.create to return an object with get, post, etc. methods
    mockedAxios.create.mockReturnValue({
      get: mockedAxios.get,
      post: mockedAxios.post,
      put: mockedAxios.put,
      delete: mockedAxios.delete,
      patch: mockedAxios.patch,
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    } as any);
    
    // Initialize the API client with a dummy key
    initializeAttioClient('test-api-key');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and format list details successfully', async () => {
    // Setup mock response for the API call
    const mockApiResponse = {
      data: {
        data: {
          id: { list_id: 'list456' },
          title: 'Integration Test List',
          name: 'Integration Test List',
          description: 'A list for integration testing',
          object_slug: 'companies',
          workspace_id: 'workspace789',
          created_at: '2023-02-01T00:00:00Z',
          updated_at: '2023-02-02T00:00:00Z',
          entry_count: 25
        }
      }
    };
    
    mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

    // Create a mock request
    const mockRequest = {
      params: {
        name: 'get-list-details',
        arguments: {
          listId: 'list456'
        }
      }
    };

    // Execute the request
    const response = await executeToolRequest(mockRequest);

    // Check that axios was called correctly
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith('/lists/list456');

    // Check the response
    expect(response).toBeDefined();
    expect(response.isError).toBeFalsy();
    expect(response.content).toBeDefined();
    expect(response.content[0].type).toBe('text');
    
    // Verify the content contains the expected information
    const textContent = response.content[0].text;
    expect(textContent).toContain('List Details:');
    expect(textContent).toContain('ID: list456');
    expect(textContent).toContain('Name: Integration Test List');
    expect(textContent).toContain('Object Type: companies');
    expect(textContent).toContain('25 entries');
    expect(textContent).toContain('Description: A list for integration testing');
  });

  it('should handle API error responses', async () => {
    // Setup mock error response
    const errorResponse = {
      response: {
        status: 404,
        data: {
          message: 'List not found',
          error: 'Not Found',
          path: ['/lists/nonexistent456']
        }
      }
    };
    
    mockedAxios.get.mockRejectedValueOnce(errorResponse);

    // Create a mock request with non-existent list ID
    const mockRequest = {
      params: {
        name: 'get-list-details',
        arguments: {
          listId: 'nonexistent456'
        }
      }
    };

    // Execute the request
    const response = await executeToolRequest(mockRequest);

    // Check that axios was called correctly
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith('/lists/nonexistent456');

    // Check the response
    expect(response).toBeDefined();
    expect(response.isError).toBeTruthy();
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe(404);
    expect(response.error.message).toContain('List not found');
  });

  it('should handle API rate limit responses', async () => {
    // Setup mock rate limit error response
    const rateLimitResponse = {
      response: {
        status: 429,
        data: {
          message: 'Too many requests',
          error: 'Rate Limited',
        }
      }
    };
    
    mockedAxios.get.mockRejectedValueOnce(rateLimitResponse);

    // Create a mock request
    const mockRequest = {
      params: {
        name: 'get-list-details',
        arguments: {
          listId: 'list789'
        }
      }
    };

    // Execute the request
    const response = await executeToolRequest(mockRequest);

    // Check that axios was called correctly
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith('/lists/list789');

    // Check the response
    expect(response).toBeDefined();
    expect(response.isError).toBeTruthy();
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe(429);
    expect(response.error.type).toBe('rate_limit_error');
    expect(response.error.message).toContain('Rate limit exceeded');
  });

  it('should handle missing data in API response', async () => {
    // Setup mock response with missing data
    const mockApiResponseMissingData = {
      data: {
        // Missing the 'data' field that should contain the list details
        id: 'list999'
      }
    };
    
    mockedAxios.get.mockResolvedValueOnce(mockApiResponseMissingData);

    // Create a mock request
    const mockRequest = {
      params: {
        name: 'get-list-details',
        arguments: {
          listId: 'list999'
        }
      }
    };

    // Execute the request
    const response = await executeToolRequest(mockRequest);

    // Check that axios was called correctly
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith('/lists/list999');

    // Check the response - it should still work but with limited data
    expect(response).toBeDefined();
    expect(response.isError).toBeFalsy();
    expect(response.content).toBeDefined();
    expect(response.content[0].type).toBe('text');
    
    // Verify the content adapts to missing fields
    const textContent = response.content[0].text;
    expect(textContent).toContain('List Details:');
    expect(textContent).toContain('ID: unknown');
    expect(textContent).toContain('Name: Unnamed List');
    expect(textContent).toContain('Object Type: unknown');
    expect(textContent).toContain('Unknown entry count');
  });
});