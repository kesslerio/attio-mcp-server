import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/config-loader.js', () => ({
  loadMappingConfig: vi.fn(),
}));

const mockHandleUniversalSearch = vi.fn();

vi.mock('@/handlers/tool-configs/universal/shared-handlers.js', () => ({
  handleUniversalSearch: mockHandleUniversalSearch,
}));

import { loadMappingConfig } from '@/utils/config-loader.js';

const { searchRecordsConfig } =
  await import('@/handlers/tool-configs/universal/core/search-operations.js');

describe('searchRecordsConfig custom object support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadMappingConfig).mockReturnValue({
      version: '1.0',
      mappings: {
        attributes: {
          common: {},
          objects: {
            funds: { name: 'Name' },
            channels: { name: 'Name' },
          },
          custom: {},
        },
        objects: {},
        lists: {},
        relationships: {},
      },
    });
  });

  it('passes canonicalized custom object slugs to the shared search handler', async () => {
    mockHandleUniversalSearch.mockResolvedValueOnce([]);

    await searchRecordsConfig.handler({
      resource_type: 'FUNDS',
      query: 'growth',
    } as never);

    expect(mockHandleUniversalSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_type: 'funds',
        query: 'growth',
      })
    );
  });

  it('formats custom object headers from the dispatcher args shape', () => {
    const formatted = (
      searchRecordsConfig.formatResult as (
        results: unknown,
        ...args: unknown[]
      ) => string
    )(
      [
        {
          id: { record_id: 'channel-1' },
          values: {
            name: [{ value: 'Partner Channel' }],
          },
        },
      ],
      { resource_type: 'channels' }
    );

    expect(formatted).toContain('Found 1 channels');
    expect(formatted).toContain('1. Partner Channel (ID: channel-1)');
  });
});
