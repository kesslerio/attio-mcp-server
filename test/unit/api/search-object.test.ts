import { beforeEach, describe, expect, it, vi } from 'vitest';

import { searchObject } from '@api/operations/search.js';
import { ResourceType } from '@shared-types/attio.js';

type PostMock = ReturnType<typeof vi.fn>;

const postMock: PostMock = vi.fn();

vi.mock('@api/lazy-client.js', () => ({
  getLazyAttioClient: () => ({
    post: postMock,
  }),
}));

vi.mock('@api/operations/retry.js', () => ({
  callWithRetry: async (fn: () => Promise<unknown>) => fn(),
  RetryConfig: class {},
}));

describe('searchObject', () => {
  beforeEach(() => {
    postMock.mockClear();
    postMock.mockResolvedValue({ data: { data: [] } });
  });

  it('builds multi-field filters for people queries', async () => {
    await searchObject(
      ResourceType.PEOPLE,
      'Alex Rivera alex.rivera@example.com'
    );

    expect(postMock).toHaveBeenCalledTimes(1);
    const [, body] = postMock.mock.calls[0];
    const filter = body.filter;

    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { email_addresses: { $contains: 'alex.rivera@example.com' } },
        { name: { $contains: 'Alex' } },
        { name: { $contains: 'Rivera' } },
      ])
    );
  });

  it('includes normalized phone variants for people queries', async () => {
    await searchObject(ResourceType.PEOPLE, '555-010-4477');

    const [, body] = postMock.mock.calls[0];
    const filter = body.filter;

    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { phone_numbers: { $contains: '+15550104477' } },
        { phone_numbers: { $contains: '5550104477' } },
      ])
    );
  });

  it('searches company domains and tokens for company queries', async () => {
    await searchObject(ResourceType.COMPANIES, 'Example Medical Group Oregon');

    const [, body] = postMock.mock.calls[0];
    const filter = body.filter;

    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { name: { $contains: 'Example' } },
        { name: { $contains: 'Oregon' } },
        { domains: { $contains: 'Example' } },
      ])
    );
  });

  it('falls back to legacy filter when parsing yields nothing', async () => {
    await searchObject(ResourceType.COMPANIES, '   ');

    const [, body] = postMock.mock.calls[0];

    expect(body.filter).toEqual({ name: { $contains: '   ' } });
  });
});
