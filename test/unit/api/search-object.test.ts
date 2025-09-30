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
      'Bhavesh Patel drbpatel24@gmail.com'
    );

    expect(postMock).toHaveBeenCalledTimes(1);
    const [, body] = postMock.mock.calls[0];
    const filter = body.filter;

    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { email_addresses: { $contains: 'drbpatel24@gmail.com' } },
        { name: { $contains: 'Bhavesh' } },
        { name: { $contains: 'Patel' } },
      ])
    );
  });

  it('includes normalized phone variants for people queries', async () => {
    await searchObject(ResourceType.PEOPLE, '541-760-5368');

    const [, body] = postMock.mock.calls[0];
    const filter = body.filter;

    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { phone_numbers: { $contains: '+15417605368' } },
        { phone_numbers: { $contains: '5417605368' } },
      ])
    );
  });

  it('searches company domains and tokens for company queries', async () => {
    await searchObject(
      ResourceType.COMPANIES,
      'Tite Medical Aesthetics Oregon'
    );

    const [, body] = postMock.mock.calls[0];
    const filter = body.filter;

    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { name: { $contains: 'Tite' } },
        { name: { $contains: 'Oregon' } },
        { domains: { $contains: 'Tite' } },
      ])
    );
  });

  it('falls back to legacy filter when parsing yields nothing', async () => {
    await searchObject(ResourceType.COMPANIES, '   ');

    const [, body] = postMock.mock.calls[0];

    expect(body.filter).toEqual({ name: { $contains: '   ' } });
  });
});
