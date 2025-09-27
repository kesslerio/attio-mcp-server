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

  it('fetch handler surfaces errors with MCP structure', async () => {
    vi.spyOn(OpenAiCompatibilityService, 'fetch').mockRejectedValue(
      new Error('Unsupported resource type')
    );

    const handler = openAiToolConfigs['openai-fetch'].handler;
    const response = await handler({ id: 'bad:id' });

    expect(response.isError).toBe(true);
    expect(response.error?.type).toBe('openai_fetch_error');
  });
});
