import { describe, expect, it, vi } from 'vitest';

import { PeopleSearchStrategy } from '@/services/search-strategies/PeopleSearchStrategy.js';
import {
  MatchType,
  SearchType,
} from '@/handlers/tool-configs/universal/types.js';

describe('PeopleSearchStrategy', () => {
  it('builds content filters for people queries', async () => {
    const paginatedSearchFunction = vi.fn().mockResolvedValue({ results: [] });

    const strategy = new PeopleSearchStrategy({
      paginatedSearchFunction,
    });

    await strategy.search({
      query: 'Alex Rivera alex.rivera@example.com',
      match_type: MatchType.PARTIAL,
      search_type: SearchType.CONTENT, // Use CONTENT to test filter building path
    });

    expect(paginatedSearchFunction).toHaveBeenCalledTimes(1);
    const [filtersArg] = paginatedSearchFunction.mock.calls[0];

    // CONTENT search creates filters across multiple fields with the full query
    expect(filtersArg.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attribute: { slug: 'name' },
          condition: 'contains',
          value: 'Alex Rivera alex.rivera@example.com',
        }),
        expect.objectContaining({
          attribute: { slug: 'job_title' },
          condition: 'contains',
          value: 'Alex Rivera alex.rivera@example.com',
        }),
        expect.objectContaining({
          attribute: { slug: 'notes' },
          condition: 'contains',
          value: 'Alex Rivera alex.rivera@example.com',
        }),
        expect.objectContaining({
          attribute: { slug: 'email_addresses' },
          condition: 'contains',
          value: 'Alex Rivera alex.rivera@example.com',
        }),
      ])
    );
    expect(filtersArg.matchAny).toBe(true); // CONTENT search uses OR logic
  });
});
