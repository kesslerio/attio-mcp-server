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

const TOKEN_STOPWORDS = new Set([
  'and',
  'the',
  'with',
  'for',
  'from',
  'company',
  'inc',
  'llc',
  'co',
]);
const MAX_TOKENS = 25;

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
  const condition = getCondition(matchType);

  // Prioritize direct email and phone matches - these are most specific
  parsed.emails.forEach((email) => {
    addFilter(filters, seen, 'email_addresses', email, condition);
  });

  parsed.phones.forEach((phone) => {
    addFilter(filters, seen, 'phone_numbers', phone, condition);
  });

  // Token-based name matching for multi-field queries
  // For people searches, also add tokens to email filter since they might be
  // partial email addresses (e.g., "examplename" in "examplename@example.com")
  const hasStructuredEmail = parsed.emails.length > 0;

  parsed.tokens.slice(0, MAX_TOKENS).forEach((token) => {
    if (TOKEN_STOPWORDS.has(token.toLowerCase())) {
      return;
    }
    addFilter(filters, seen, 'name', token, condition);
    // If token is long enough, and we didn't extract explicit emails,
    // also search email addresses (likely email local part)
    if (!hasStructuredEmail && token.length >= 5) {
      addFilter(filters, seen, 'email_addresses', token, condition);
    }
  });

  // If no structured data was found, search the raw query
  if (filters.length === 0) {
    addFilter(filters, seen, 'name', trimmed, condition);
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
  const condition = getCondition(matchType);

  // Domains extracted from emails - most specific
  parsed.domains.forEach((domain) => {
    addFilter(filters, seen, 'domains', domain, condition);
  });

  // Token-based matching - add to both name and domains for broader search
  parsed.tokens.slice(0, MAX_TOKENS).forEach((token) => {
    if (TOKEN_STOPWORDS.has(token.toLowerCase())) {
      return;
    }
    addFilter(filters, seen, 'name', token, condition);
    addFilter(filters, seen, 'domains', token, condition);
  });

  // If no structured data found, search raw query
  if (filters.length === 0) {
    addFilter(filters, seen, 'name', trimmed, condition);
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
