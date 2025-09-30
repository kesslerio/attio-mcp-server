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

  it('uses equals condition for exact match type', () => {
    const filters = buildPeopleQueryFilters(
      'john.doe@example.com',
      MatchType.EXACT
    );

    expect(filters?.filters?.length).toBeGreaterThan(0);
    const emailFilter = filters?.filters?.find(
      (f) =>
        f.attribute.slug === 'email_addresses' &&
        f.value === 'john.doe@example.com'
    );
    expect(emailFilter?.condition).toBe('equals');
  });

  it('uses contains condition for partial match type (default)', () => {
    const filters = buildPeopleQueryFilters('John Smith', MatchType.PARTIAL);

    expect(filters?.filters?.length).toBeGreaterThan(0);
    const nameFilter = filters?.filters?.find(
      (f) => f.attribute.slug === 'name' && f.value === 'John'
    );
    expect(nameFilter?.condition).toBe('contains');
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

  it('uses equals condition for exact match type', () => {
    const filters = buildCompanyQueryFilters(
      'Acme Corporation',
      MatchType.EXACT
    );

    expect(filters?.filters?.length).toBeGreaterThan(0);
    const nameFilter = filters?.filters?.find(
      (f) => f.attribute.slug === 'name' && f.value === 'Acme'
    );
    expect(nameFilter?.condition).toBe('equals');
  });

  it('uses contains condition for partial match type (default)', () => {
    const filters = buildCompanyQueryFilters('example.com', MatchType.PARTIAL);

    expect(filters?.filters?.length).toBeGreaterThan(0);
    const domainFilter = filters?.filters?.find(
      (f) => f.attribute.slug === 'domains' && f.value === 'example.com'
    );
    expect(domainFilter?.condition).toBe('contains');
  });

  it('returns null for empty input', () => {
    expect(buildCompanyQueryFilters('', MatchType.PARTIAL)).toBeNull();
  });
});
