import { describe, expect, it } from 'vitest';

import {
  buildCompanyQueryFilters,
  buildPeopleQueryFilters,
} from '@/services/search-strategies/query-filter-builder.js';
import { MatchType } from '@/handlers/tool-configs/universal/types.js';

const findFilter = (
  filters: unknown[] | undefined,
  slug: string,
  value: string
) =>
  filters?.some(
    (filter) =>
      typeof filter === 'object' &&
      filter !== null &&
      'attribute' in filter &&
      (filter as { attribute: { slug: string } }).attribute.slug === slug &&
      'value' in filter &&
      (filter as { value: unknown }).value === value
  );

describe('buildPeopleQueryFilters', () => {
  it('creates email and token filters for multi-field queries', () => {
    const filters = buildPeopleQueryFilters(
      'Bhavesh Patel drbpatel24@gmail.com',
      MatchType.PARTIAL
    );

    expect(filters?.matchAny).toBe(true);
    expect(filters?.filters?.length).toBeGreaterThan(0);
    expect(
      findFilter(filters?.filters, 'email_addresses', 'drbpatel24@gmail.com')
    ).toBe(true);
    expect(findFilter(filters?.filters, 'name', 'Bhavesh')).toBe(true);
    expect(findFilter(filters?.filters, 'name', 'Patel')).toBe(true);
  });

  it('normalizes phone numbers into multiple variants', () => {
    const filters = buildPeopleQueryFilters('541-760-5368', MatchType.PARTIAL);

    expect(filters?.filters?.length).toBeGreaterThan(0);
    expect(findFilter(filters?.filters, 'phone_numbers', '5417605368')).toBe(
      true
    );
    expect(findFilter(filters?.filters, 'phone_numbers', '+15417605368')).toBe(
      true
    );
  });

  it('returns null for empty queries', () => {
    expect(buildPeopleQueryFilters('   ', MatchType.PARTIAL)).toBeNull();
  });
});

describe('buildCompanyQueryFilters', () => {
  it('creates filters for name tokens and domains', () => {
    const filters = buildCompanyQueryFilters(
      'Tite Medical Aesthetics Oregon',
      MatchType.PARTIAL
    );

    expect(filters?.matchAny).toBe(true);
    expect(filters?.filters?.length).toBeGreaterThan(0);
    expect(findFilter(filters?.filters, 'name', 'Tite')).toBe(true);
    expect(findFilter(filters?.filters, 'name', 'Oregon')).toBe(true);
    expect(findFilter(filters?.filters, 'domains', 'Tite')).toBe(true);
  });

  it('handles domain-like queries', () => {
    const filters = buildCompanyQueryFilters(
      'titemedicalaesthetics.com',
      MatchType.PARTIAL
    );

    expect(filters?.filters?.length).toBeGreaterThan(0);
    expect(
      findFilter(filters?.filters, 'domains', 'titemedicalaesthetics.com')
    ).toBe(true);
  });

  it('returns null for empty input', () => {
    expect(buildCompanyQueryFilters('', MatchType.PARTIAL)).toBeNull();
  });
});
