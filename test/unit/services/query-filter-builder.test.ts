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
      'Alex Rivera alex.rivera@example.com',
      MatchType.PARTIAL
    );

    expect(filters?.matchAny).toBe(true);
    expect(filters?.filters?.length).toBeGreaterThan(0);
    expect(
      findFilter(filters?.filters, 'email_addresses', 'alex.rivera@example.com')
    ).toBe(true);
    expect(findFilter(filters?.filters, 'name', 'Alex')).toBe(true);
    expect(findFilter(filters?.filters, 'name', 'Rivera')).toBe(true);
  });

  it('normalizes phone numbers into multiple variants', () => {
    const filters = buildPeopleQueryFilters('555-010-4477', MatchType.PARTIAL);

    expect(filters?.filters?.length).toBeGreaterThan(0);
    expect(findFilter(filters?.filters, 'phone_numbers', '5550104477')).toBe(
      true
    );
    expect(findFilter(filters?.filters, 'phone_numbers', '+15550104477')).toBe(
      true
    );
  });

  it('avoids redundant email token filters when emails are present', () => {
    const filters = buildPeopleQueryFilters(
      'Alex Rivera alex.rivera@example.com',
      MatchType.PARTIAL
    );

    const emailTokens = filters?.filters?.filter(
      (filter) =>
        filter.attribute.slug === 'email_addresses' && filter.value === 'Alex'
    );

    expect(emailTokens).toEqual([]);
  });

  it('adds email token filters when no explicit email is provided', () => {
    const filters = buildPeopleQueryFilters('examplecorp', MatchType.PARTIAL);

    expect(findFilter(filters?.filters, 'email_addresses', 'examplecorp')).toBe(
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
      'Example Medical Group Oregon',
      MatchType.PARTIAL
    );

    expect(filters?.matchAny).toBe(true);
    expect(filters?.filters?.length).toBeGreaterThan(0);
    expect(findFilter(filters?.filters, 'name', 'Example')).toBe(true);
    expect(findFilter(filters?.filters, 'name', 'Oregon')).toBe(true);
    expect(findFilter(filters?.filters, 'domains', 'Example')).toBe(true);
  });

  it('handles domain-like queries', () => {
    const filters = buildCompanyQueryFilters(
      'examplecorp.com',
      MatchType.PARTIAL
    );

    expect(filters?.filters?.length).toBeGreaterThan(0);
    expect(findFilter(filters?.filters, 'domains', 'examplecorp.com')).toBe(
      true
    );
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
