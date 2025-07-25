/**
 * Search functionality for companies
 * 
 * Simplified implementation following CLAUDE.md documentation-first rule.
 * Uses standard Attio API patterns instead of custom workarounds.
 */
import { getAttioClient } from '../../api/attio-client.js';
import {
  searchObject,
  advancedSearchObject,
  ListEntryFilters,
} from '../../api/operations/index.js';
import {
  ResourceType,
  Company,
  FilterConditionType,
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
  if (!query || !query.trim()) {
    return [];
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
export async function searchCompaniesByDomain(domain: string): Promise<Company[]> {
  if (!domain || !domain.trim()) {
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
    return response.data.data || [];
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
  return {
    filters: [
      {
        attribute: { slug: 'name' },
        condition: condition,
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
  const normalizedDomain = normalizeDomain(domain);
  return {
    filters: [
      {
        attribute: { slug: 'domains' },
        condition: condition,
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
  return {
    filters: [
      {
        attribute: { slug: 'industry' },
        condition: condition,
        value: industry,
      },
    ],
  };
}