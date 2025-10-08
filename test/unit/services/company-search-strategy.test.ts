import { describe, expect, it, vi } from 'vitest';

import { CompanySearchStrategy } from '@/services/search-strategies/CompanySearchStrategy.js';
import {
  MatchType,
  SearchType,
} from '@/handlers/tool-configs/universal/types.js';

describe('CompanySearchStrategy', () => {
  it('builds content filters for company queries', async () => {
    const advancedSearchFunction = vi.fn().mockResolvedValue([]);

    const strategy = new CompanySearchStrategy({
      advancedSearchFunction,
    });

    await strategy.search({
      query: 'Example Medical Group Oregon',
      match_type: MatchType.PARTIAL,
      search_type: SearchType.CONTENT, // Use CONTENT to test filter building path
    });

    expect(advancedSearchFunction).toHaveBeenCalledTimes(1);
    const [filtersArg] = advancedSearchFunction.mock.calls[0];

    // CONTENT search creates filters across multiple fields with the full query
    expect(filtersArg.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attribute: { slug: 'name' },
          condition: 'contains',
          value: 'Example Medical Group Oregon',
        }),
        expect.objectContaining({
          attribute: { slug: 'description' },
          condition: 'contains',
          value: 'Example Medical Group Oregon',
        }),
        expect.objectContaining({
          attribute: { slug: 'notes' },
          condition: 'contains',
          value: 'Example Medical Group Oregon',
        }),
        expect.objectContaining({
          attribute: { slug: 'domains' },
          condition: 'contains',
          value: 'Example Medical Group Oregon',
        }),
      ])
    );
    expect(filtersArg.matchAny).toBe(true); // CONTENT search uses OR logic
  });
});
