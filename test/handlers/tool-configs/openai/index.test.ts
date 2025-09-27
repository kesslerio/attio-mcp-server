import { describe, it, expect, vi, afterEach } from 'vitest';
import { openAiToolConfigs } from '@/handlers/tool-configs/openai/index.js';
import { OpenAiCompatibilityService } from '@/services/OpenAiCompatibilityService.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('openAiToolConfigs.search handler', () => {
  it('returns MCP compliant content with JSON payload', async () => {
    vi.spyOn(OpenAiCompatibilityService, 'search').mockResolvedValue([
      {
        id: 'companies:company-123',
        title: 'Acme Inc.',
        url: 'https://api.attio.com/v2/objects/companies/records/company-123',
      },
    ]);

    const handler = openAiToolConfigs['openai-search'].handler;
    const response = await handler({ query: 'acme' });

    expect(response.isError).toBe(false);
    expect(response.content).toHaveLength(1);
    expect(response.content?.[0]?.type).toBe('text');
    const payload = JSON.parse(response.content?.[0]?.text ?? '{}');
    expect(payload.results).toHaveLength(1);
    expect(payload.results[0].id).toBe('companies:company-123');
  });

  it('returns error response on validation failure', async () => {
    vi.spyOn(OpenAiCompatibilityService, 'search').mockRejectedValue(
      new Error('Query must be provided')
    );

    const handler = openAiToolConfigs['openai-search'].handler;
    const response = await handler({});

    expect(response.isError).toBe(true);
    expect(response.error?.type).toBe('openai_search_error');
  });
});

describe('openAiToolConfigs.fetch handler', () => {
  it('returns JSON encoded record payload', async () => {
    vi.spyOn(OpenAiCompatibilityService, 'fetch').mockResolvedValue({
      id: 'people:person-1',
      title: 'Jane Doe',
      url: 'https://api.attio.com/v2/objects/people/records/person-1',
      text: 'some record',
    });

    const handler = openAiToolConfigs['openai-fetch'].handler;
    const response = await handler({ id: 'people:person-1' });

    expect(response.isError).toBe(false);
    expect(JSON.parse(response.content?.[0]?.text ?? '{}').id).toBe(
      'people:person-1'
    );
  });

  it('returns error payload on failure', async () => {
    vi.spyOn(OpenAiCompatibilityService, 'fetch').mockRejectedValue(
      new Error('Unsupported resource type')
    );

    const handler = openAiToolConfigs['openai-fetch'].handler;
    const response = await handler({ id: 'foo:bar' });

    expect(response.isError).toBe(true);
    expect(response.error?.type).toBe('openai_fetch_error');
  });
});
