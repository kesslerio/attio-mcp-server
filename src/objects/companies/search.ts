/**
 * Search functionality for companies
 *
 * Simplified implementation following CLAUDE.md documentation-first rule.
 * Uses standard Attio API patterns instead of custom workarounds.
 */
import { getAttioClient } from '../../api/attio-client.js';
import {
  advancedSearchObject,
  type ListEntryFilters,
  searchObject,
} from '../../api/operations/index.js';
import {
  type Company,
  FilterConditionType,
  ResourceType,
} from '../../types/attio.js';
import { normalizeDomain } from '../../utils/domain-utils.js';

/**
 * Configuration options for company search
 */
export interface CompanySearchOptions {
  /** Maximum number of results to return */
  maxResults?: number;
}

/**
 * Searches for companies by name using standard Attio API
 *
 * @param query - Search query string to match against company names
 * @param options - Optional search configuration
 * @returns Array of matching company objects
 */
export async function searchCompanies(
  query: string,
  options: CompanySearchOptions = {}
): Promise<Company[]> {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return [];
  }

  if (
    options.maxResults !== undefined &&
    (typeof options.maxResults !== 'number' ||
      options.maxResults < 0 ||
      !Number.isInteger(options.maxResults))
  ) {
    throw new Error('maxResults must be a non-negative integer');
  }

  const results = await searchObject<Company>(ResourceType.COMPANIES, query);

  // Apply maxResults limit if specified
  return options.maxResults ? results.slice(0, options.maxResults) : results;
}

/**
 * Searches for companies by domain using correct 'domains' field
 *
 * @param domain - Domain to search for
 * @returns Array of matching company objects
 */
export async function searchCompaniesByDomain(
  domain: string
): Promise<Company[]> {
  if (!domain || typeof domain !== 'string' || !domain.trim()) {
    return [];
  }

  const normalizedDomain = normalizeDomain(domain);
  const api = getAttioClient();

  try {
    const response = await api.post('/objects/companies/records/query', {
      filter: {
        domains: { $contains: normalizedDomain },
      },
    });
    return response?.data?.data || [];
  } catch (error) {
    console.error(`Domain search failed for "${normalizedDomain}":`, error);
    return [];
  }
}

/**
 * Performs advanced search with custom filters using standard API
 *
 * @param filters - List of filters to apply
 * @param limit - Maximum number of results to return
 * @param offset - Number of results to skip
 * @returns Array of company results
 */
export async function advancedSearchCompanies(
  filters: ListEntryFilters,
  limit?: number,
  offset?: number
): Promise<Company[]> {
  if (!filters) {
    throw new Error('Filters parameter is required');
  }

  if (
    limit !== undefined &&
    (typeof limit !== 'number' || limit < 0 || !Number.isInteger(limit))
  ) {
    throw new Error('Limit must be a non-negative integer');
  }

  if (
    offset !== undefined &&
    (typeof offset !== 'number' || offset < 0 || !Number.isInteger(offset))
  ) {
    throw new Error('Offset must be a non-negative integer');
  }

  return await advancedSearchObject<Company>(
    ResourceType.COMPANIES,
    filters,
    limit,
    offset
  );
}

/**
 * Helper function to create filters for searching companies by name
 */
export function createNameFilter(
  name: string,
  condition: FilterConditionType = FilterConditionType.CONTAINS
): ListEntryFilters {
  if (!name || typeof name !== 'string') {
    throw new Error('Name parameter must be a non-empty string');
  }

  return {
    filters: [
      {
        attribute: { slug: 'name' },
        condition,
        value: name,
      },
    ],
  };
}

/**
 * Helper function to create filters for searching companies by domain
 */
export function createDomainFilter(
  domain: string,
  condition: FilterConditionType = FilterConditionType.CONTAINS
): ListEntryFilters {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Domain parameter must be a non-empty string');
  }

  const normalizedDomain = normalizeDomain(domain);
  return {
    filters: [
      {
        attribute: { slug: 'domains' },
        condition,
        value: normalizedDomain,
      },
    ],
  };
}

/**
 * Helper function to create filters for searching companies by industry
 */
export function createIndustryFilter(
  industry: string,
  condition: FilterConditionType = FilterConditionType.CONTAINS
): ListEntryFilters {
  if (!industry || typeof industry !== 'string') {
    throw new Error('Industry parameter must be a non-empty string');
  }

  return {
    filters: [
      {
        attribute: { slug: 'industry' },
        condition,
        value: industry,
      },
    ],
  };
}
