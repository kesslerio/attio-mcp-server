import { describe, expect, it, vi } from 'vitest';

import { CompanySearchStrategy } from '@/services/search-strategies/CompanySearchStrategy.js';
import { MatchType } from '@/handlers/tool-configs/universal/types.js';

describe('CompanySearchStrategy', () => {
  it('builds parsed filters for mixed company queries', async () => {
    const advancedSearchFunction = vi.fn().mockResolvedValue([]);

    const strategy = new CompanySearchStrategy({
      advancedSearchFunction,
    });

    await strategy.search({
      query: 'Example Medical Group Oregon',
      match_type: MatchType.PARTIAL,
    });

    expect(advancedSearchFunction).toHaveBeenCalledTimes(1);
    const [filtersArg] = advancedSearchFunction.mock.calls[0];

    expect(filtersArg.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attribute: { slug: 'name' },
          value: 'Example',
        }),
        expect.objectContaining({
          attribute: { slug: 'name' },
          value: 'Oregon',
        }),
      ])
    );
  });
});
