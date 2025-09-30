import { describe, expect, it } from 'vitest';

import { parseQuery } from '@api/operations/query-parser.js';

describe('parseQuery', () => {
  it('extracts emails, domains, and tokens from complex queries', () => {
    const result = parseQuery('Bhavesh Patel drbpatel24@gmail.com');

    expect(result.emails).toEqual(['drbpatel24@gmail.com']);
    expect(result.domains).toEqual(['gmail.com']);
    expect(result.tokens).toEqual(['bhavesh', 'patel']);
  });

  it('normalizes multiple phone number formats', () => {
    const result = parseQuery('Call me at 541-760-5368 or +1 (541) 760-5368');

    expect(result.phones).toEqual(
      expect.arrayContaining(['+15417605368', '5417605368', '15417605368'])
    );
    expect(new Set(result.phones).size).toBe(result.phones.length);
  });

  it('omits empty tokens for whitespace-only queries', () => {
    const result = parseQuery('   ');

    expect(result.tokens).toEqual([]);
    expect(result.emails).toEqual([]);
    expect(result.phones).toEqual([]);
  });
});
