import { parseQuery } from '@api/operations/query-parser.js';
import { ListEntryFilter, ListEntryFilters } from '@api/operations/types.js';
import { MatchType } from '../../handlers/tool-configs/universal/types.js';

/**
 * Maps attribute slugs to their filterable property names for explicit operator filtering.
 * Multivalue attributes require filtering by their property names, not the attribute slug.
 *
 * Examples:
 * - email_addresses attribute → filter by "email_address" property
 * - phone_numbers attribute → filter by "number" property
 * - name attribute → filter by "full_name", "first_name", or "last_name" properties
 */
const ATTRIBUTE_TO_PROPERTY_MAP: Record<string, string> = {
  email_addresses: 'email_address',
  phone_numbers: 'number', // or 'normalized' for normalized phone format
  name: 'full_name',
  domains: 'domain',
};

function getCondition(
  matchType?: MatchType,
  fallback: 'contains' | 'equals' = 'contains'
) {
  if (matchType === MatchType.EXACT) {
    return 'equals';
  }

  return fallback;
}

function addFilter(
  filters: ListEntryFilter[],
  seen: Set<string>,
  slug: string,
  value: string,
  condition: string
) {
  if (!value) {
    return;
  }

  const key = `${slug}:${condition}:${value.toLowerCase()}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  filters.push({
    attribute: { slug },
    condition,
    value,
  });
}

export function buildPeopleQueryFilters(
  query: string,
  matchType?: MatchType
): ListEntryFilters | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseQuery(trimmed);
  const filters: ListEntryFilter[] = [];
  const seen = new Set<string>();

  // Prioritize direct email and phone matches - these are most specific
  parsed.emails.forEach((email) => {
    addFilter(filters, seen, 'email_addresses', email, 'contains');
  });

  parsed.phones.forEach((phone) => {
    // Add both normalized and formatted variants for better matching
    const normalizedPhone = phone.replace(/\D+/g, '');
    addFilter(filters, seen, 'phone_numbers', normalizedPhone, 'contains');

    // Also add +1 prefix for US numbers if not already present
    if (!phone.startsWith('+') && normalizedPhone.length === 10) {
      addFilter(
        filters,
        seen,
        'phone_numbers',
        `+1${normalizedPhone}`,
        'contains'
      );
    }
  });

  // Token-based name matching for multi-field queries
  // For people searches, also add tokens to email filter since they might be
  // partial email addresses (e.g., "armaanaesthetics" in "armaanaesthetics@gmail.com")
  parsed.tokens.forEach((token) => {
    addFilter(filters, seen, 'name', token, 'contains');
    // If token is long enough, also search emails (likely email local part)
    if (token.length >= 5) {
      addFilter(filters, seen, 'email_addresses', token, 'contains');
    }
  });

  // If no structured data was found, search the raw query
  if (filters.length === 0) {
    addFilter(filters, seen, 'name', trimmed, 'contains');
  }

  if (filters.length === 0) {
    return null;
  }

  // Use OR logic to match any of the filters
  return {
    filters,
    matchAny: true,
  };
}

export function buildCompanyQueryFilters(
  query: string,
  matchType?: MatchType
): ListEntryFilters | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseQuery(trimmed);
  const filters: ListEntryFilter[] = [];
  const seen = new Set<string>();

  // Domains extracted from emails - most specific
  parsed.domains.forEach((domain) => {
    addFilter(filters, seen, 'domains', domain, 'contains');
  });

  // Token-based matching - add to both name and domains for broader search
  parsed.tokens.forEach((token) => {
    addFilter(filters, seen, 'name', token, 'contains');
    addFilter(filters, seen, 'domains', token, 'contains');
  });

  // If no structured data found, search raw query
  if (filters.length === 0) {
    addFilter(filters, seen, 'name', trimmed, 'contains');
  }

  if (filters.length === 0) {
    return null;
  }

  // Use OR logic to match any of the filters
  return {
    filters,
    matchAny: true,
  };
}
