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
    // Default: return non-empty results to avoid triggering fallback in filter structure tests
    postMock.mockResolvedValue({
      data: {
        data: [{ id: { record_id: 'mock' }, values: { name: 'Mock' } }],
      },
    });
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

    // Email is extracted separately as exact match
    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { email_addresses: { $contains: 'alex.rivera@example.com' } },
      ])
    );

    // AND-of-OR: Multi-token "Alex Rivera" creates AND of (token matches any field)
    // Structure: $and: [{$or: [name:"Alex", email:"Alex", phone:"Alex"]}, {$or: [name:"Rivera", ...]}]
    expect(filter.$or).toEqual(
      expect.arrayContaining([
        {
          $and: expect.arrayContaining([
            {
              $or: expect.arrayContaining([{ name: { $contains: 'Alex' } }]),
            },
            {
              $or: expect.arrayContaining([{ name: { $contains: 'Rivera' } }]),
            },
          ]),
        },
      ])
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

    // AND-of-OR: Each token must match (name OR domains)
    // Structure: $and: [{$or: [name:"Example", domains:"Example"]}, {$or: [name:"Medical", domains:"Medical"]}, ...]
    // This allows cross-field matching while requiring all tokens
    expect(filter).toEqual({
      $and: expect.arrayContaining([
        {
          $or: expect.arrayContaining([
            { name: { $contains: 'Example' } },
            { domains: { $contains: 'Example' } },
          ]),
        },
        {
          $or: expect.arrayContaining([
            { name: { $contains: 'Medical' } },
            { domains: { $contains: 'Medical' } },
          ]),
        },
        {
          $or: expect.arrayContaining([
            { name: { $contains: 'Group' } },
            { domains: { $contains: 'Group' } },
          ]),
        },
        {
          $or: expect.arrayContaining([
            { name: { $contains: 'Oregon' } },
            { domains: { $contains: 'Oregon' } },
          ]),
        },
      ]),
    });
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

    describe('AND-of-OR cross-field matching (prevent regression)', () => {
      it('enforces AND-of-OR structure for multi-token queries', async () => {
        await searchObject(ResourceType.COMPANIES, 'Tech Solutions Innovation');

        const [, body] = postMock.mock.calls[postMock.mock.calls.length - 1];
        const filter = body.filter;

        // CRITICAL: Must be AND of (token matches ANY field), NOT AND per field
        // This ensures cross-field matching works (e.g., name + domain tokens)
        expect(filter).toHaveProperty('$and');
        expect(Array.isArray(filter.$and)).toBe(true);

        // Each AND element must be an OR of fields
        filter.$and.forEach((condition: any) => {
          expect(condition).toHaveProperty('$or');
          expect(Array.isArray(condition.$or)).toBe(true);
          // Each token can match name OR domains
          expect(condition.$or.length).toBeGreaterThan(1);
        });
      });

      it('allows single-token queries to match multiple fields', async () => {
        await searchObject(ResourceType.COMPANIES, 'Healthcare');

        const [, body] = postMock.mock.calls[postMock.mock.calls.length - 1];
        const filter = body.filter;

        // Single token should create OR across fields
        expect(filter.$or).toBeDefined();
        expect(filter.$or).toEqual(
          expect.arrayContaining([
            { name: { $contains: 'Healthcare' } },
            { domains: { $contains: 'Healthcare' } },
          ])
        );
      });

      it('handles email extraction with remaining tokens', async () => {
        await searchObject(
          ResourceType.PEOPLE,
          'john.doe@company.com Technical Lead'
        );

        const [, body] = postMock.mock.calls[postMock.mock.calls.length - 1];
        const filter = body.filter;

        // Email extracted separately
        expect(filter.$or).toEqual(
          expect.arrayContaining([
            { email_addresses: { $contains: 'john.doe@company.com' } },
          ])
        );

        // Remaining tokens use AND-of-OR
        expect(filter.$or).toEqual(
          expect.arrayContaining([
            {
              $and: expect.arrayContaining([
                {
                  $or: expect.arrayContaining([
                    { name: { $contains: 'Technical' } },
                  ]),
                },
                {
                  $or: expect.arrayContaining([
                    { name: { $contains: 'Lead' } },
                  ]),
                },
              ]),
            },
          ])
        );
      });
    });

    describe('OR fallback for zero results (recall fix)', () => {
      it('triggers OR fallback when AND-of-OR returns zero results', async () => {
        // Enable scoring to test fallback logic
        process.env.ENABLE_SEARCH_SCORING = 'true';
        postMock.mockClear();

        // Fast-path candidate 1 (name eq): no match
        postMock.mockResolvedValueOnce({ data: { data: [] } });
        // Fast-path candidate 2 (name contains): no match
        postMock.mockResolvedValueOnce({ data: { data: [] } });
        // Main query (AND-of-OR): returns 0 results
        postMock.mockResolvedValueOnce({ data: { data: [] } });
        // Fallback query (OR-only): returns results
        postMock.mockResolvedValueOnce({
          data: {
            data: [
              {
                id: { record_id: '1' },
                values: {
                  name: 'Beauty Glow Aesthetics',
                  domains: [],
                },
              },
            ],
          },
        });

        const results = (await searchObject(
          ResourceType.COMPANIES,
          'Beauty Glow Aesthetics Frisco'
        )) as Array<{ values: { name: string } }>;

        // Should have made 4 calls (2 fast-path + AND-of-OR + OR fallback)
        expect(postMock).toHaveBeenCalledTimes(4);

        // Should return fallback results
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].values.name).toBe('Beauty Glow Aesthetics');
      });

      it('does not trigger fallback when AND-of-OR succeeds', async () => {
        process.env.ENABLE_SEARCH_SCORING = 'true';
        postMock.mockClear();

        // Fast-path candidate 1 (name eq): no match
        postMock.mockResolvedValueOnce({ data: { data: [] } });
        // Fast-path candidate 2 (name contains): no match
        postMock.mockResolvedValueOnce({ data: { data: [] } });
        // Main query returns results (no fallback needed)
        postMock.mockResolvedValueOnce({
          data: {
            data: [
              {
                id: { record_id: '1' },
                values: { name: 'Elite Styles And Beauty' },
              },
            ],
          },
        });

        await searchObject(ResourceType.COMPANIES, 'Elite Styles Beauty');

        // Should make 3 calls (2 fast-path + main, no fallback)
        expect(postMock).toHaveBeenCalledTimes(3);
      });
    });
  });
});
