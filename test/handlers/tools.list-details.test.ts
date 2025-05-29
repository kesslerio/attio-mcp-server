/**
 * Unit tests for get-list-details tool handler
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { findToolConfig } from '../../src/handlers/tools/registry';
import { executeToolRequest } from '../../src/handlers/tools/dispatcher';
import { getListDetails } from '../../src/objects/lists';
import { ResourceType } from '../../src/types/attio';

// Mock the lists module
vi.mock('../../src/objects/lists', () => ({
  getListDetails: vi.fn(),
}));

describe('get-list-details tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find the tool config correctly', () => {
    const toolInfo = findToolConfig('get-list-details');

    expect(toolInfo).toBeDefined();
    expect(toolInfo?.resourceType).toBe(ResourceType.LISTS);
    expect(toolInfo?.toolType).toBe('getListDetails');
    expect(toolInfo?.toolConfig).toBeDefined();
    expect(toolInfo?.toolConfig.handler).toBeDefined();
    expect(toolInfo?.toolConfig.formatResult).toBeDefined();
  });

  it('should handle successful list details retrieval', async () => {
    // Mock the getListDetails function to return a successful response
    const mockList = {
      id: { list_id: 'list123' },
      title: 'Test List',
      name: 'Test List',
      description: 'A test list',
      object_slug: 'people',
      workspace_id: 'workspace123',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
      entry_count: 10,
    };

    (getListDetails as vi.Mock).mockResolvedValue(mockList);

    // Create a mock request
    const mockRequest = {
      method: 'tools/call' as const,
      params: {
        name: 'get-list-details',
        arguments: {
          listId: 'list123',
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

    // Verify the content contains the expected information
    const textContent = response.content[0].text;
    expect(textContent).toContain('List Details:');
    expect(textContent).toContain('ID: list123');
    expect(textContent).toContain('Name: Test List');
    expect(textContent).toContain('Object Type: people');
    expect(textContent).toContain('10 entries');
    expect(textContent).toContain('Description: A test list');

    // Verify the handler was called with the correct parameters
    expect(getListDetails).toHaveBeenCalledTimes(1);
    expect(getListDetails).toHaveBeenCalledWith('list123');
  });

  it('should handle missing listId parameter', async () => {
    // Create a mock request without listId
    const mockRequest = {
      method: 'tools/call' as const,
      params: {
        name: 'get-list-details',
        arguments: {},
      },
    };

    // Execute the request
    const response = await executeToolRequest(mockRequest);

    // Check the response
    expect(response).toBeDefined();
    expect(response.isError).toBeTruthy();
    expect(response.error).toBeDefined();
    expect(response.error.message).toContain(
      'Missing required parameter: listId'
    );

    // Verify the handler was not called
    expect(getListDetails).not.toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    // Mock the getListDetails function to throw an error
    const mockError = new Error('API Error') as any;
    mockError.response = {
      status: 404,
      data: { message: 'List not found' },
    };

    (getListDetails as vi.Mock).mockRejectedValue(mockError);

    // Create a mock request
    const mockRequest = {
      method: 'tools/call' as const,
      params: {
        name: 'get-list-details',
        arguments: {
          listId: 'nonexistent123',
        },
      },
    };

    // Execute the request
    const response = await executeToolRequest(mockRequest);

    // Check the response
    expect(response).toBeDefined();
    expect(response.isError).toBeTruthy();
    expect(response.error).toBeDefined();
    expect(response.error.code).toBe(404);
    expect(response.error.message).toContain('not found');

    // Verify the handler was called with the correct parameters
    expect(getListDetails).toHaveBeenCalledTimes(1);
    expect(getListDetails).toHaveBeenCalledWith('nonexistent123');
  });
});
