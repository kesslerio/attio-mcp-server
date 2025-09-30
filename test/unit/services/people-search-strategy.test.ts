import { describe, expect, it, vi } from 'vitest';

import { PeopleSearchStrategy } from '@/services/search-strategies/PeopleSearchStrategy.js';
import { MatchType } from '@/handlers/tool-configs/universal/types.js';

describe('PeopleSearchStrategy', () => {
  it('leverages parsed filters for multi-field queries', async () => {
    const paginatedSearchFunction = vi.fn().mockResolvedValue({ results: [] });

    const strategy = new PeopleSearchStrategy({
      paginatedSearchFunction,
    });

    await strategy.search({
      query: 'Bhavesh Patel drbpatel24@gmail.com',
      match_type: MatchType.PARTIAL,
    });

    expect(paginatedSearchFunction).toHaveBeenCalledTimes(1);
    const [filtersArg] = paginatedSearchFunction.mock.calls[0];

    expect(filtersArg.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attribute: { slug: 'email_addresses' },
          value: 'drbpatel24@gmail.com',
        }),
        expect.objectContaining({
          attribute: { slug: 'name' },
          value: 'Bhavesh',
        }),
      ])
    );
  });
});
