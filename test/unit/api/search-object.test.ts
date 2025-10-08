import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  let originalScoringEnv: string | undefined;

  beforeEach(() => {
    originalScoringEnv = process.env.ENABLE_SEARCH_SCORING;
    process.env.ENABLE_SEARCH_SCORING = 'false';
    postMock.mockClear();
    postMock.mockResolvedValue({ data: { data: [] } });
  });

  afterEach(() => {
    if (originalScoringEnv === undefined) {
      delete process.env.ENABLE_SEARCH_SCORING;
    } else {
      process.env.ENABLE_SEARCH_SCORING = originalScoringEnv;
    }
  });

  it('builds multi-field filters for people queries', async () => {
    await searchObject(
      ResourceType.PEOPLE,
      'Alex Rivera alex.rivera@example.com'
    );

    expect(postMock).toHaveBeenCalled();
    const [, body] = postMock.mock.calls[postMock.mock.calls.length - 1];
    const filter = body.filter;

    // Email is extracted separately
    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { email_addresses: { $contains: 'alex.rivera@example.com' } },
      ])
    );

    // Hybrid logic: When AND returns 0 results (mocked), falls back to OR
    // Fallback OR includes individual token conditions
    expect(filter.$or).toEqual(
      expect.arrayContaining([{ name: { $contains: 'Alex' } }])
    );
    expect(filter.$or).toEqual(
      expect.arrayContaining([{ name: { $contains: 'Rivera' } }])
    );
  });

  it('includes normalized phone variants for people queries', async () => {
    await searchObject(ResourceType.PEOPLE, '555-010-4477');

    const [, body] = postMock.mock.calls[postMock.mock.calls.length - 1];
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

    const [, body] = postMock.mock.calls[postMock.mock.calls.length - 1];
    const filter = body.filter;

    // Hybrid logic: When AND returns 0 results (mocked), falls back to OR
    // Fallback OR includes individual token conditions for name and domains
    expect(filter.$or).toEqual(
      expect.arrayContaining([{ name: { $contains: 'Example' } }])
    );

    expect(filter.$or).toEqual(
      expect.arrayContaining([{ name: { $contains: 'Medical' } }])
    );

    expect(filter.$or).toEqual(
      expect.arrayContaining([{ domains: { $contains: 'Example' } }])
    );
  });

  it('falls back to legacy filter when parsing yields nothing', async () => {
    await searchObject(ResourceType.COMPANIES, '   ');

    const [, body] = postMock.mock.calls[postMock.mock.calls.length - 1];

    expect(body.filter).toEqual({ name: { $contains: '   ' } });
  });

  describe('Issue #885 regression coverage', () => {
    it('prioritizes exact domain matches', async () => {
      process.env.ENABLE_SEARCH_SCORING = 'true';
      postMock.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: { record_id: '1' },
              values: {
                name: 'Springfield Clinic',
                domains: ['springfieldclinic.com'],
              },
            },
            {
              id: { record_id: '2' },
              values: {
                name: 'Olive Branch Clinic',
                domains: ['olivebranchclinic.org'],
              },
            },
          ],
        },
      });

      const results = (await searchObject(
        ResourceType.COMPANIES,
        'olivebranchclinic.org'
      )) as Array<{ values: { name: string; domains: string[] } }>;

      expect(results[0].values.domains).toEqual(['olivebranchclinic.org']);
    });

    it('prioritizes exact name matches over partial token matches', async () => {
      process.env.ENABLE_SEARCH_SCORING = 'true';
      postMock.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: { record_id: '1' },
              values: { name: 'Connor Young' },
            },
            {
              id: { record_id: '2' },
              values: { name: 'Francine Young' },
            },
            {
              id: { record_id: '3' },
              values: { name: 'Teara Young' },
            },
          ],
        },
      });

      const results = (await searchObject(
        ResourceType.PEOPLE,
        'Teara Young'
      )) as Array<{ values: { name: string } }>;

      expect(results[0].values.name).toBe('Teara Young');
    });
  });
});
