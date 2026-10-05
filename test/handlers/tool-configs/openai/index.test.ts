import { describe, it, expect, vi, afterEach } from 'vitest';
import { openAiToolConfigs } from '@/handlers/tool-configs/openai/index.js';
import { buildStructuredToolResult } from '@/handlers/tools/result-contract.js';
import { OpenAiCompatibilityService } from '@/services/OpenAiCompatibilityService.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

afterEach(() => {
  vi.restoreAllMocks();
});

const searchItem = {
  id: 'companies:123',
  title: 'Acme Inc.',
  url: 'https://api.attio.com/v2/objects/companies/records/123',
};

const fetchResult = {
  id: 'companies:123',
  title: 'Acme Inc.',
  url: 'https://api.attio.com/v2/objects/companies/records/123',
  text: 'Acme',
};

/** Runs a connector config through the shared result boundary. */
function callConnector(
  key: 'openai-search' | 'openai-fetch',
  raw: unknown,
  args: Record<string, unknown> = {}
): CallToolResult & { structuredContent: Record<string, unknown> } {
  return buildStructuredToolResult(
    openAiToolConfigs[key],
    raw,
    args
  ) as CallToolResult & { structuredContent: Record<string, unknown> };
}

describe('OpenAI tool handlers', () => {
  it('search handler publishes an envelope with the connector text projection', async () => {
    vi.spyOn(OpenAiCompatibilityService, 'search').mockResolvedValue([
      searchItem,
    ]);

    const handler = openAiToolConfigs['openai-search'].handler;
    const raw = await handler({ query: 'acme' });
    const response = callConnector('openai-search', raw);

    expect(response.isError).toBe(false);
    expect(response.structuredContent).toEqual({
      data: [searchItem],
      count: 1,
      next_cursor: null,
      pagination: { supported: false, truncated: false },
    });
    // ChatGPT parses content[0] as its documented { results: [...] } document.
    expect(JSON.parse(response.content[0].text as string)).toEqual({
      results: [searchItem],
    });
    // The connector carries its payload in the text channel, so no prose block.
    expect(response.content).toHaveLength(1);
  });

  it('fetch handler publishes the record document as its projection', async () => {
    vi.spyOn(OpenAiCompatibilityService, 'fetch').mockResolvedValue(
      fetchResult
    );

    const handler = openAiToolConfigs['openai-fetch'].handler;
    const raw = await handler({ id: fetchResult.id });
    const response = callConnector('openai-fetch', raw);

    expect(response.isError).toBe(false);
    expect(response.structuredContent).toEqual({ data: fetchResult });
    expect(JSON.parse(response.content[0].text as string)).toEqual(fetchResult);
    expect(response.content).toHaveLength(1);
  });

  it.each([
    ['search', 'openai-search', { query: 'acme' }],
    ['fetch', 'openai-fetch', { id: 'companies:123' }],
  ] as const)(
    '%s handler propagates the original error to the shared MCP boundary',
    async (method, configKey, params) => {
      const error = new Error('Upstream request failed');
      vi.spyOn(OpenAiCompatibilityService, method).mockRejectedValue(error);

      await expect(openAiToolConfigs[configKey].handler(params)).rejects.toBe(
        error
      );
    }
  );
});
