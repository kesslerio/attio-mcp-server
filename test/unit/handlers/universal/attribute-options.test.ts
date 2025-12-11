import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../../src/services/metadata/index.js', () => ({
  AttributeOptionsService: {
    getOptions: vi.fn(),
  },
}));

vi.mock('../../../../src/services/UniversalMetadataService.js', () => ({
  UniversalMetadataService: {
    discoverAttributes: vi.fn(),
  },
}));

import * as sharedHandlers from '../../../../src/handlers/tool-configs/universal/shared-handlers.js';
import { getAttributeOptionsConfig } from '../../../../src/handlers/tool-configs/universal/core/metadata-operations.js';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';
import { AttributeOptionsService } from '../../../../src/services/metadata/index.js';
import { UniversalMetadataService } from '../../../../src/services/UniversalMetadataService.js';

describe('Attribute options handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves display names to API slugs when fetching options', async () => {
    const getOptionsMock = vi
      .mocked(AttributeOptionsService.getOptions)
      .mockRejectedValueOnce(
        new Error('No Attribute was found for path param slug "Deal stage"')
      )
      .mockResolvedValueOnce({
        options: [{ title: 'Qualified', is_archived: false }],
        attributeType: 'status',
      });

    vi.mocked(UniversalMetadataService.discoverAttributes).mockResolvedValue({
      all: [{ api_slug: 'stage', title: 'Deal stage' }],
    } as unknown as Record<string, unknown>);

    const result = await sharedHandlers.handleUniversalGetAttributeOptions({
      resource_type: UniversalResourceType.DEALS,
      attribute: 'Deal stage',
    });

    expect(getOptionsMock).toHaveBeenNthCalledWith(
      1,
      'deals',
      'Deal stage',
      undefined
    );
    expect(getOptionsMock).toHaveBeenNthCalledWith(
      2,
      'deals',
      'stage',
      undefined
    );
    expect(result.options[0]?.title).toBe('Qualified');
  });

  it('returns clearer not-found errors with suggestions', async () => {
    vi.mocked(AttributeOptionsService.getOptions).mockRejectedValue(
      new Error('Attribute "Deal stagee" on "deals" does not support options.')
    );
    vi.mocked(UniversalMetadataService.discoverAttributes).mockResolvedValue({
      all: [
        { api_slug: 'stage', title: 'Deal stage' },
        { api_slug: 'owner', title: 'Deal owner' },
      ],
    } as unknown as Record<string, unknown>);

    await expect(
      sharedHandlers.handleUniversalGetAttributeOptions({
        resource_type: UniversalResourceType.DEALS,
        attribute: 'Deal stagee',
      })
    ).rejects.toThrow(/Attribute "Deal stagee" not found on deals/);
  });

  it('formats results using the last known params when args are missing', async () => {
    vi.mocked(UniversalMetadataService.discoverAttributes).mockResolvedValue({
      all: [{ api_slug: 'stage', title: 'Deal stage' }],
    } as unknown as Record<string, unknown>);

    vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
      options: [{ title: 'Qualified', is_archived: false }],
      attributeType: 'status',
    });

    const handlerResult = await getAttributeOptionsConfig.handler({
      resource_type: UniversalResourceType.DEALS,
      attribute: 'Deal stage',
    });

    const formatted = getAttributeOptionsConfig.formatResult(handlerResult);
    expect(formatted).toContain('Deal stage');
    expect(formatted).toContain('Options for');
  });
});
