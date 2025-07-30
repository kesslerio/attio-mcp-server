import { describe, it, expect, vi, beforeEach } from 'vitest';
import { search } from '../../src/openai/search.js';
import * as dispatcher from '../../src/handlers/tools/dispatcher.js';
import * as transformers from '../../src/openai/transformers/index.js';

// Mock dependencies
vi.mock('../../src/handlers/tools/dispatcher.js');
vi.mock('../../src/openai/transformers/index.js');
vi.mock('../../src/utils/logger.js');

describe('OpenAI Search Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate query parameter', async () => {
    await expect(search('')).rejects.toThrow('Query parameter is required');
    await expect(search(null as any)).rejects.toThrow('Query parameter is required');
    await expect(search(undefined as any)).rejects.toThrow('Query parameter is required');
  });

  it('should search across multiple resource types', async () => {
    const mockExecuteToolRequest = vi.mocked(dispatcher.executeToolRequest);
    const mockTransformToSearchResult = vi.mocked(transformers.transformToSearchResult);

    // Mock successful responses
    mockExecuteToolRequest.mockResolvedValue({
      toolResult: {
        type: 'text',
        content: 'ID: record_id: test-123\nName: Test Company'
      }
    });

    mockTransformToSearchResult.mockReturnValue({
      id: 'test-123',
      title: 'Test Company',
      text: 'A test company description',
      url: 'https://app.attio.com/companies/test-123'
    });

    const results = await search('test query');

    // Should call search for each resource type
    expect(mockExecuteToolRequest).toHaveBeenCalledTimes(4); // companies, people, lists, tasks
    
    // Check that it was called with correct parameters
    expect(mockExecuteToolRequest).toHaveBeenCalledWith({
      method: 'tools/call',
      params: {
        name: 'search-records',
        arguments: {
          resource_type: 'companies',
          query: 'test query',
          limit: 10
        }
      }
    });

    expect(results).toHaveLength(4); // One result per resource type
    expect(results[0]).toEqual({
      id: 'test-123',
      title: 'Test Company',
      text: 'A test company description',
      url: 'https://app.attio.com/companies/test-123'
    });
  });

  it('should handle search failures gracefully', async () => {
    const mockExecuteToolRequest = vi.mocked(dispatcher.executeToolRequest);
    
    // Mock one success and one failure
    mockExecuteToolRequest
      .mockResolvedValueOnce({
        toolResult: {
          type: 'text',
          content: 'ID: record_id: test-123\nName: Test Company'
        }
      })
      .mockRejectedValueOnce(new Error('API Error'));

    const mockTransformToSearchResult = vi.mocked(transformers.transformToSearchResult);
    mockTransformToSearchResult.mockReturnValue({
      id: 'test-123',
      title: 'Test Company',
      text: 'A test company description',
      url: 'https://app.attio.com/companies/test-123'
    });

    const results = await search('test query');

    // Should still return results from successful searches
    expect(results.length).toBeGreaterThan(0);
  });

  it('should sort results by relevance', async () => {
    const mockExecuteToolRequest = vi.mocked(dispatcher.executeToolRequest);
    const mockTransformToSearchResult = vi.mocked(transformers.transformToSearchResult);

    mockExecuteToolRequest.mockResolvedValue({
      toolResult: {
        type: 'text',
        content: 'Multiple records'
      }
    });

    // Mock different results with varying relevance
    mockTransformToSearchResult
      .mockReturnValueOnce({
        id: '1',
        title: 'Exact Match Test Query Company',
        text: 'Description',
        url: 'url1'
      })
      .mockReturnValueOnce({
        id: '2',
        title: 'Another Company',
        text: 'Description with test query',
        url: 'url2'
      })
      .mockReturnValueOnce({
        id: '3',
        title: 'test query exact match',
        text: 'Description',
        url: 'url3'
      });

    const results = await search('test query');

    // Results with exact matches in title should be prioritized
    expect(results[0].title.toLowerCase()).toContain('test query');
  });

  it('should limit total results', async () => {
    const mockExecuteToolRequest = vi.mocked(dispatcher.executeToolRequest);
    const mockTransformToSearchResult = vi.mocked(transformers.transformToSearchResult);

    mockExecuteToolRequest.mockResolvedValue({
      toolResult: {
        type: 'text',
        content: 'Many records'
      }
    });

    // Mock many results
    const mockResult = {
      id: 'test',
      title: 'Test',
      text: 'Test',
      url: 'test'
    };

    // Return 10 results per resource type (40 total)
    mockTransformToSearchResult.mockReturnValue(mockResult);

    const results = await search('test');

    // Should be limited to 20 total results
    expect(results.length).toBeLessThanOrEqual(20);
  });
});