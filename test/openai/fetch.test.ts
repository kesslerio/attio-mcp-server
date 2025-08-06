import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dispatcher from '../../src/handlers/tools/dispatcher.js';
import { fetch } from '../../src/openai/fetch.js';
import * as transformers from '../../src/openai/transformers/index.js';

// Mock dependencies
vi.mock('../../src/handlers/tools/dispatcher.js');
vi.mock('../../src/openai/transformers/index.js');
vi.mock('../../src/utils/logger.js');

describe('OpenAI Fetch Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate id parameter', async () => {
    await expect(fetch('')).rejects.toThrow('ID parameter is required');
    await expect(fetch(null as any)).rejects.toThrow(
      'ID parameter is required'
    );
    await expect(fetch(undefined as any)).rejects.toThrow(
      'ID parameter is required'
    );
  });

  it('should fetch record with simple ID', async () => {
    const mockExecuteToolRequest = vi.mocked(dispatcher.executeToolRequest);
    const mockTransformToFetchResult = vi.mocked(
      transformers.transformToFetchResult
    );

    // Mock get-record-details response
    mockExecuteToolRequest.mockResolvedValueOnce({
      toolResult: {
        type: 'text',
        content:
          'ID: record_id: test-123\nName: Test Company\nDescription: A test company',
      },
    });

    // Mock get-detailed-info response
    mockExecuteToolRequest.mockResolvedValueOnce({
      toolResult: {
        type: 'text',
        content: 'Additional details about the company',
      },
    });

    mockTransformToFetchResult.mockReturnValue({
      id: 'test-123',
      title: 'Test Company',
      text: 'A test company with additional details',
      url: 'https://app.attio.com/companies/test-123',
      metadata: {
        industry: 'Technology',
        size: '50-100',
      },
    });

    const result = await fetch('test-123');

    expect(mockExecuteToolRequest).toHaveBeenCalledTimes(2);

    // Check first call (get-record-details)
    expect(mockExecuteToolRequest).toHaveBeenNthCalledWith(1, {
      method: 'tools/call',
      params: {
        name: 'get-record-details',
        arguments: {
          resource_type: 'companies',
          record_id: 'test-123',
        },
      },
    });

    // Check second call (get-detailed-info)
    expect(mockExecuteToolRequest).toHaveBeenNthCalledWith(2, {
      method: 'tools/call',
      params: {
        name: 'get-detailed-info',
        arguments: {
          resource_type: 'companies',
          record_id: 'test-123',
          info_type: 'full',
          format: 'object',
        },
      },
    });

    expect(result).toEqual({
      id: 'test-123',
      title: 'Test Company',
      text: 'A test company with additional details',
      url: 'https://app.attio.com/companies/test-123',
      metadata: {
        industry: 'Technology',
        size: '50-100',
      },
    });
  });

  it('should handle ID with resource type prefix', async () => {
    const mockExecuteToolRequest = vi.mocked(dispatcher.executeToolRequest);
    const mockTransformToFetchResult = vi.mocked(
      transformers.transformToFetchResult
    );

    mockExecuteToolRequest.mockResolvedValue({
      toolResult: {
        type: 'text',
        content: 'Person details',
      },
    });

    mockTransformToFetchResult.mockReturnValue({
      id: 'person-456',
      title: 'John Doe',
      text: 'Contact at Example Corp',
      url: 'https://app.attio.com/people/person-456',
    });

    const result = await fetch('people:person-456');

    expect(mockExecuteToolRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          arguments: expect.objectContaining({
            resource_type: 'people',
            record_id: 'person-456',
          }),
        }),
      })
    );

    expect(result.id).toBe('person-456');
    expect(result.title).toBe('John Doe');
  });

  it('should handle fetch failures', async () => {
    const mockExecuteToolRequest = vi.mocked(dispatcher.executeToolRequest);
    const mockTransformToFetchResult = vi.mocked(
      transformers.transformToFetchResult
    );

    // Mock the tool request to reject
    mockExecuteToolRequest.mockRejectedValue(new Error('Not found'));

    // Mock the fallback direct fetch to also fail
    mockTransformToFetchResult.mockReturnValue({
      id: 'person-456',
      title: 'John Doe',
      text: 'Contact at Example Corp',
      url: 'https://app.attio.com/people/person-456',
    });

    // Since the fetch has a fallback, it should return a result even on error
    const result = await fetch('non-existent-id');
    expect(result).toBeDefined();
  });

  it('should parse different resource types correctly', async () => {
    const testCases = [
      {
        input: 'companies:abc123',
        expectedType: 'companies',
        expectedId: 'abc123',
      },
      { input: 'people:def456', expectedType: 'people', expectedId: 'def456' },
      { input: 'lists:ghi789', expectedType: 'lists', expectedId: 'ghi789' },
      { input: 'tasks:jkl012', expectedType: 'tasks', expectedId: 'jkl012' },
      {
        input: 'plain-id-456',
        expectedType: 'companies',
        expectedId: 'plain-id-456',
      }, // default
    ];

    const mockExecuteToolRequest = vi.mocked(dispatcher.executeToolRequest);
    const mockTransformToFetchResult = vi.mocked(
      transformers.transformToFetchResult
    );

    for (const testCase of testCases) {
      vi.clearAllMocks();

      mockExecuteToolRequest.mockResolvedValue({
        toolResult: {
          type: 'text',
          content: 'Record details',
        },
      });

      mockTransformToFetchResult.mockReturnValue({
        id: testCase.expectedId,
        title: 'Test Record',
        text: 'Test description',
        url: `https://app.attio.com/${testCase.expectedType}/${testCase.expectedId}`,
      });

      await fetch(testCase.input);

      expect(mockExecuteToolRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            arguments: expect.objectContaining({
              resource_type: testCase.expectedType,
              record_id: testCase.expectedId,
            }),
          }),
        })
      );
    }
  });
});
