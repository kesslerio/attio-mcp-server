import { describe, expect, it } from 'vitest';

import { parseQuery } from '@api/operations/query-parser.js';

describe('parseQuery', () => {
  it('extracts emails, domains, and tokens from complex queries', () => {
    const result = parseQuery('Alex Rivera alex.rivera@example.com');

    expect(result.emails).toEqual(['alex.rivera@example.com']);
    expect(result.domains).toEqual(['example.com']);
    expect(result.tokens).toEqual(['Alex', 'Rivera']);
  });

  it('normalizes multiple phone number formats', () => {
    const result = parseQuery('Call me at 555-010-4477 or +1 (555) 010-4477');

    expect(result.phones).toEqual(
      expect.arrayContaining(['+15550104477', '5550104477'])
    );
    expect(new Set(result.phones).size).toBe(result.phones.length);
  });

  it('handles international numbers without forcing US prefixes', () => {
    const result = parseQuery('Dial +44 20 7946 0018 or 020 7946 0018');

    expect(result.phones).toEqual(
      expect.arrayContaining(['+442079460018', '02079460018'])
    );
    expect(result.phones).not.toContain('+102079460018');
  });

  it('omits empty tokens for whitespace-only queries', () => {
    const result = parseQuery('   ');

    expect(result.tokens).toEqual([]);
    expect(result.emails).toEqual([]);
    expect(result.phones).toEqual([]);
  });
});
