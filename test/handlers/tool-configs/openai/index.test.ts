import { describe, it, expect, vi, afterEach } from 'vitest';
import { openAiToolConfigs } from '@/handlers/tool-configs/openai/index.js';
import { OpenAiCompatibilityService } from '@/services/OpenAiCompatibilityService.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OpenAI tool handlers', () => {
  it('search handler returns MCP compliant payload', async () => {
    vi.spyOn(OpenAiCompatibilityService, 'search').mockResolvedValue([
      {
        id: 'companies:123',
        title: 'Acme Inc.',
        url: 'https://api.attio.com/v2/objects/companies/records/123',
      },
    ]);

    const handler = openAiToolConfigs['openai-search'].handler;
    const response = await handler({ query: 'acme' });

    expect(response.isError).toBe(false);
    const payload = JSON.parse(response.content?.[0]?.text ?? '{}');
    expect(payload.results).toHaveLength(1);
  });

  it('fetch handler returns the connector JSON projection', async () => {
    const result = {
      id: 'companies:123',
      title: 'Acme Inc.',
      url: 'https://api.attio.com/v2/objects/companies/records/123',
      text: 'Acme',
    };
    vi.spyOn(OpenAiCompatibilityService, 'fetch').mockResolvedValue(result);

    const handler = openAiToolConfigs['openai-fetch'].handler;
    const response = await handler({ id: result.id });

    expect(response.isError).toBe(false);
    expect(JSON.parse(response.content[0].text)).toEqual(result);
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
