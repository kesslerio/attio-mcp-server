/**
 * Integration tests for get-record-list-memberships tool
 */
import { describe, test, expect, beforeAll, vi } from 'vitest';
import axios from 'axios';
import { initializeAttioClient } from '../../../src/api/attio-client';
import { executeToolRequest } from '../../../src/handlers/tools/dispatcher';

// Mock axios to simulate API responses
vi.mock('axios');
const mockedAxios = axios as vi.Mocked<typeof axios>;

describe('get-record-list-memberships integration test', () => {
  beforeAll(() => {
    // Mock axios.create to return an object with get, post, etc. methods
    mockedAxios.create.mockReturnValue({
      get: mockedAxios.get,
      post: mockedAxios.post,
      put: mockedAxios.put,
      delete: mockedAxios.delete,
      patch: mockedAxios.patch,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    } as any);

    // Initialize the API client with a dummy key
    initializeAttioClient('test-api-key');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and format record list memberships successfully', async () => {
    // Setup mock response for the first API call (getLists)
    const mockListsResponse = {
      data: {
        data: [
          {
            id: 'list-1',
            name: 'Sales Pipeline',
            object_slug: 'companies',
          },
          {
            id: 'list-2',
            name: 'Marketing Contacts',
            object_slug: 'companies',
          },
        ],
      },
    };

    // Setup mock responses for the getListEntries calls
    const mockEntriesResponse1 = {
      data: {
        data: [
          {
            id: { entry_id: 'entry-1' },
            record_id: 'company-123',
            values: {
              stage: 'Qualified',
              priority: 'High',
            },
          },
          {
            id: { entry_id: 'entry-2' },
            record_id: 'company-456',
            values: {},
          },
        ],
      },
    };

    const mockEntriesResponse2 = {
      data: {
        data: [
          {
            id: { entry_id: 'entry-3' },
            record_id: 'company-789',
            values: {},
          },
        ],
      },
    };

    // Mock the axios calls in sequence
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/lists?limit=20') {
        return Promise.resolve(mockListsResponse);
      } else if (url.includes('/lists-entries?list_id=list-1')) {
        return Promise.resolve(mockEntriesResponse1);
      } else if (url.includes('/lists-entries?list_id=list-2')) {
        return Promise.resolve(mockEntriesResponse2);
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    mockedAxios.post.mockImplementation((url) => {
      if (url.includes('/lists/list-1/entries/query')) {
        return Promise.resolve(mockEntriesResponse1);
      } else if (url.includes('/lists/list-2/entries/query')) {
        return Promise.resolve(mockEntriesResponse2);
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    // Create a mock request
    const mockRequest = {
      method: 'tools/call' as const,
      params: {
        name: 'get-record-list-memberships',
        arguments: {
          recordId: 'company-123',
          objectType: 'companies',
          includeEntryValues: true,
        },
      },
    };

    // Execute the request
    const response = await executeToolRequest(mockRequest);

    // Check that axios calls were made correctly
    expect(mockedAxios.get).toHaveBeenCalledWith(
      '/lists?limit=20&objectSlug=companies'
    );

    // Check the response
    expect(response).toBeDefined();
    expect(response.isError).toBeFalsy();
    expect(response.content).toBeDefined();
    expect(response.content[0].type).toBe('text');

    // Verify the content contains the expected information
    const textContent = response.content[0].text;
    expect(textContent).toContain('Found 1 list membership(s):');
    expect(textContent).toContain('List: Sales Pipeline (ID: list-1)');
    expect(textContent).toContain('Entry ID: entry-1');
    expect(textContent).toContain('stage: Qualified');
    expect(textContent).toContain('priority: High');

    // Verify the metadata
    expect(response.metadata).toBeDefined();
    expect(response.metadata.memberships).toHaveLength(1);
    expect(response.metadata.memberships[0].listId).toBe('list-1');
    expect(response.metadata.memberships[0].listName).toBe('Sales Pipeline');
    expect(response.metadata.memberships[0].entryId).toBe('entry-1');
    expect(response.metadata.memberships[0].entryValues).toEqual({
      stage: 'Qualified',
      priority: 'High',
    });
  });

  it('should handle record not being in any lists', async () => {
    // Setup mock response for the API call
    const mockListsResponse = {
      data: {
        data: [
          {
            id: 'list-1',
            name: 'Sales Pipeline',
            object_slug: 'companies',
          },
          {
            id: 'list-2',
            name: 'Marketing Contacts',
            object_slug: 'companies',
          },
        ],
      },
    };

    // Mock entries responses with no matches
    const mockEmptyEntriesResponse = {
      data: {
        data: [],
      },
    };

    // Mock the axios calls
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/lists?limit=20') {
        return Promise.resolve(mockListsResponse);
      } else if (url.includes('/lists-entries')) {
        return Promise.resolve(mockEmptyEntriesResponse);
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    mockedAxios.post.mockImplementation((url) => {
      if (url.includes('/entries/query')) {
        return Promise.resolve(mockEmptyEntriesResponse);
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    // Create a mock request for a record that isn't in any lists
    const mockRequest = {
      method: 'tools/call' as const,
      params: {
        name: 'get-record-list-memberships',
        arguments: {
          recordId: 'not-in-any-list-123',
        },
      },
    };

    // Execute the request
    const response = await executeToolRequest(mockRequest);

    // Check the response
    expect(response).toBeDefined();
    expect(response.isError).toBeFalsy();
    expect(response.content).toBeDefined();
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toBe(
      'Record is not a member of any lists.'
    );

    // Verify empty metadata
    expect(response.metadata).toBeDefined();
    expect(response.metadata.memberships).toHaveLength(0);
  });

  it('should handle API errors gracefully', async () => {
    // Setup mock error response for getLists
    const apiError = new Error('API Error');
    (apiError as any).response = {
      status: 500,
      data: {
        message: 'Internal Server Error',
      },
    };
    (apiError as any).isAxiosError = true;

    mockedAxios.get.mockRejectedValue(apiError);

    // Create a mock request
    const mockRequest = {
      method: 'tools/call' as const,
      params: {
        name: 'get-record-list-memberships',
        arguments: {
          recordId: 'company-123',
        },
      },
    };

    // Execute the request
    const response = await executeToolRequest(mockRequest);

    // Check the response
    expect(response).toBeDefined();
    expect(response.isError).toBeTruthy();
    expect(response.error).toBeDefined();
    expect(response.error.message).toBeDefined();
  });

  it('should handle partial API failures', async () => {
    // Setup mock response for the getLists API call
    const mockListsResponse = {
      data: {
        data: [
          {
            id: 'list-1',
            name: 'Sales Pipeline',
            object_slug: 'companies',
          },
          {
            id: 'list-2',
            name: 'Marketing Contacts (Fails)',
            object_slug: 'companies',
          },
          {
            id: 'list-3',
            name: 'Customers',
            object_slug: 'companies',
          },
        ],
      },
    };

    // Setup mock responses for successful list entries
    const mockEntriesResponse1 = {
      data: {
        data: [
          {
            id: { entry_id: 'entry-1' },
            record_id: 'company-123',
            values: { stage: 'Lead' },
          },
        ],
      },
    };

    const mockEntriesResponse3 = {
      data: {
        data: [
          {
            id: { entry_id: 'entry-5' },
            record_id: 'company-123',
            values: { type: 'Enterprise' },
          },
        ],
      },
    };

    // Error for the second list
    const listError = new Error('List API Error');
    (listError as any).response = {
      status: 404,
      data: {
        message: 'List not found',
      },
    };
    (listError as any).isAxiosError = true;

    // Mock the axios calls with a failure for list-2
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/lists?limit=20') {
        return Promise.resolve(mockListsResponse);
      } else if (url.includes('list-1')) {
        return Promise.resolve(mockEntriesResponse1);
      } else if (url.includes('list-2')) {
        return Promise.reject(listError);
      } else if (url.includes('list-3')) {
        return Promise.resolve(mockEntriesResponse3);
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    mockedAxios.post.mockImplementation((url) => {
      if (url.includes('list-1')) {
        return Promise.resolve(mockEntriesResponse1);
      } else if (url.includes('list-2')) {
        return Promise.reject(listError);
      } else if (url.includes('list-3')) {
        return Promise.resolve(mockEntriesResponse3);
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    // Create a mock request
    const mockRequest = {
      method: 'tools/call' as const,
      params: {
        name: 'get-record-list-memberships',
        arguments: {
          recordId: 'company-123',
          includeEntryValues: true,
        },
      },
    };

    // Execute the request
    const response = await executeToolRequest(mockRequest);

    // Check the response - should still have the successful list results
    expect(response).toBeDefined();
    expect(response.isError).toBeFalsy();
    expect(response.content).toBeDefined();
    expect(response.content[0].type).toBe('text');

    // Should have found memberships in list-1 and list-3, but not list-2
    const textContent = response.content[0].text;
    expect(textContent).toContain('Found 2 list membership(s):');
    expect(textContent).toContain('List: Sales Pipeline (ID: list-1)');
    expect(textContent).toContain('Entry ID: entry-1');
    expect(textContent).toContain('stage: Lead');
    expect(textContent).toContain('List: Customers (ID: list-3)');
    expect(textContent).toContain('Entry ID: entry-5');
    expect(textContent).toContain('type: Enterprise');

    // Should not contain the failed list
    expect(textContent).not.toContain('Marketing Contacts (Fails)');

    // Check metadata
    expect(response.metadata.memberships).toHaveLength(2);
  });
});
