/**
 * Search functionality for companies
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
import { FilterValidationError } from '../../errors/api-errors.js';
import {
  extractDomain,
  hasDomainIndicators,
  normalizeDomain,
  extractAllDomains,
} from '../../utils/domain-utils.js';

/**
 * Simple LRU cache for company search results
 * Reduces API calls for frequently looked-up companies
 */
class CompanySearchCache {
  private cache = new Map<string, { data: Company[]; timestamp: number }>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
    // Default: 100 entries, 5 minutes TTL
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.ttlMs;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry.timestamp)) {
        this.cache.delete(key);
      }
    }
  }

  get(key: string): Company[] | null {
    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry.timestamp)) {
      if (entry) {
        this.cache.delete(key);
      }
      return null;
    }

    // Move to end (LRU behavior)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: Company[]): void {
    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { data, timestamp: Date.now() });

    // Periodic cleanup
    if (Math.random() < 0.1) {
      // 10% chance to trigger cleanup
      this.cleanup();
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const companySearchCache = new CompanySearchCache();

/**
 * Cache management functions for testing and administration
 */
export const companyCache = {
  clear: () => companySearchCache.clear(),
  size: () => companySearchCache.size(),
};

/**
 * Configuration options for company search
 */
export interface CompanySearchOptions {
  /** Whether to prioritize domain matches over name matches (default: true) */
  prioritizeDomains?: boolean;
  /** Maximum number of results to return */
  maxResults?: number;
  /** Whether to include debug logging */
  debug?: boolean;
}

/**
 * Searches for companies with domain prioritization when available
 *
 * @param query - Search query string to match against company names or domains
 * @param options - Optional search configuration
 * @returns Array of matching company objects, prioritized by domain matches
 * @example
 * ```typescript
 * const companies = await searchCompanies("acme.com");
 * // Returns companies with domain "acme.com" first, then name matches
 *
 * const companies = await searchCompanies("acme");
 * // Returns companies with names containing "acme"
 *
 * const companies = await searchCompanies("acme.com", { prioritizeDomains: false });
 * // Disables domain prioritization, uses name-based search only
 * ```
 */
export async function searchCompanies(
  query: string,
  options: CompanySearchOptions = {}
): Promise<Company[]> {
  // Early return for empty or whitespace-only queries
  if (!query || !query.trim()) {
    return [];
  }

  // Extract default options
  const {
    prioritizeDomains = true,
    maxResults,
    debug = process.env.NODE_ENV === 'development' || process.env.DEBUG,
  } = options;

  // Check if query contains domain indicators (only if prioritization is enabled)
  const extractedDomain = prioritizeDomains ? extractDomain(query) : null;

  // Debug logging for domain extraction
  if (debug) {
    if (extractedDomain) {
      console.debug(
        `[searchCompanies] Extracted domain: "${extractedDomain}" from query: "${query}"`
      );
    } else if (prioritizeDomains) {
      console.debug(
        `[searchCompanies] No domain detected in query: "${query}", using name-based search`
      );
    } else {
      console.debug(
        `[searchCompanies] Domain prioritization disabled, using name-based search for: "${query}"`
      );
    }
  }

  if (extractedDomain && prioritizeDomains) {
    // Priority search by domain first
    try {
      const domainResults = await searchCompaniesByDomain(extractedDomain);

      // If we found exact domain matches, return them first
      if (domainResults.length > 0) {
        // Also search by name to include potential additional matches
        const nameResults = await searchCompaniesByName(query);

        // Combine results, prioritizing domain matches
        const combinedResults = [...domainResults];

        // Add name-based results that aren't already included
        for (const nameResult of nameResults) {
          const isDuplicate = domainResults.some(
            (domainResult) =>
              domainResult.id?.record_id === nameResult.id?.record_id
          );
          if (!isDuplicate) {
            combinedResults.push(nameResult);
          }
        }

        // Apply maxResults limit if specified
        const finalResults = maxResults
          ? combinedResults.slice(0, maxResults)
          : combinedResults;
        return finalResults;
      }
    } catch (error) {
      // If domain search fails, fall back to name search
      console.warn(
        `Domain search failed for "${extractedDomain}", falling back to name search:`,
        error
      );
    }
  }

  // Fallback to name-based search
  const nameResults = await searchCompaniesByName(query);

  // Apply maxResults limit if specified
  return maxResults ? nameResults.slice(0, maxResults) : nameResults;
}

/**
 * Searches for companies by domain/website
 *
 * @param domain - Domain to search for
 * @returns Array of matching company objects
 */
export async function searchCompaniesByDomain(
  domain: string
): Promise<Company[]> {
  // Early return for empty domain
  if (!domain || !domain.trim()) {
    return [];
  }

  const normalizedDomain = normalizeDomain(domain);

  // Debug logging for domain search
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.debug(
      `[searchCompaniesByDomain] Searching for domain: "${normalizedDomain}" (original: "${domain}")`
    );
  }

  // Create filters for domain search - FIXED: Use 'domains' field instead of 'website'
  const filters: ListEntryFilters = {
    filters: [
      {
        attribute: { slug: 'domains' },
        condition: FilterConditionType.CONTAINS,
        value: normalizedDomain,
      },
    ],
  };

  try {
    return await advancedSearchCompanies(filters);
  } catch (error) {
    // Fallback to direct API call - FIXED: Use 'domains' field instead of 'website'
    const api = getAttioClient();
    const path = '/objects/companies/records/query';

    const response = await api.post(path, {
      filter: {
        domains: { $contains: normalizedDomain },
      },
    });
    return response.data.data || [];
  }
}

/**
 * Searches for companies by name only
 *
 * @param query - Search query string to match against company names
 * @returns Array of matching company objects
 */
export async function searchCompaniesByName(query: string): Promise<Company[]> {
  // Early return for empty query
  if (!query || !query.trim()) {
    return [];
  }

  // Create cache key (normalize query for better cache hits)
  const cacheKey = `name:${query.trim().toLowerCase()}`;

  // Check cache first
  const cachedResult = companySearchCache.get(cacheKey);
  if (cachedResult) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.debug(
        `[searchCompaniesByName] Cache hit for: "${query}" (${cachedResult.length} results)`
      );
    }
    return cachedResult;
  }

  // Debug logging for name search
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.debug(`[searchCompaniesByName] Searching by name: "${query}"`);
  }

  // Use the unified operation if available, with fallback to direct implementation
  let results: Company[];
  try {
    results = await searchObject<Company>(ResourceType.COMPANIES, query);
  } catch (error) {
    // Fallback implementation
    const api = getAttioClient();
    const path = '/objects/companies/records/query';

    const response = await api.post(path, {
      filter: {
        name: { $contains: query },
      },
    });
    results = response.data.data || [];
  }

  // Cache the results
  companySearchCache.set(cacheKey, results);

  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.debug(
      `[searchCompaniesByName] Cached ${results.length} results for: "${query}"`
    );
  }

  return results;
}

/**
 * Performs advanced search with custom filters
 *
 * @param filters - List of filters to apply
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of company results
 * @throws Error if the search encounters any issues
 * @example
 * ```typescript
 * // Search for companies with names containing "Tech"
 * const filters = {
 *   filters: [
 *     {
 *       attribute: { slug: 'name' },
 *       condition: 'contains',
 *       value: 'Tech'
 *     }
 *   ]
 * };
 * const companies = await advancedSearchCompanies(filters);
 *
 * // Search with multiple conditions using OR logic
 * const orFilters = {
 *   filters: [
 *     {
 *       attribute: { slug: 'name' },
 *       condition: 'contains',
 *       value: 'Tech'
 *     },
 *     {
 *       attribute: { slug: 'industry' },
 *       condition: 'equals',
 *       value: 'Software'
 *     }
 *   ],
 *   matchAny: true // Use OR logic between conditions
 * };
 *
 * // Complex search with nested conditions
 * const complexFilters = {
 *   filters: [
 *     // Company name condition
 *     {
 *       attribute: { slug: 'name' },
 *       condition: 'contains',
 *       value: 'Tech'
 *     },
 *     // Revenue condition - find companies with annual revenue > $10M
 *     {
 *       attribute: { slug: 'annual_revenue' },
 *       condition: 'greater_than',
 *       value: 10000000
 *     },
 *     // Industry condition
 *     {
 *       attribute: { slug: 'industry' },
 *       condition: 'equals',
 *       value: 'Software'
 *     }
 *   ]
 * };
 * ```
 */
export async function advancedSearchCompanies(
  filters: ListEntryFilters,
  limit?: number,
  offset?: number
): Promise<Company[]> {
  try {
    // Import validation utilities only when needed to avoid circular dependencies
    // This is a dynamic import that won't affect the module dependency graph
    const { validateFilters, ERROR_MESSAGES } = await import(
      '../../utils/filters/validation-utils.js'
    );

    // Use standardized validation with consistent error messages
    validateFilters(filters);

    // Proceed with the search operation
    return await advancedSearchObject<Company>(
      ResourceType.COMPANIES,
      filters,
      limit,
      offset
    );
  } catch (error) {
    // For FilterValidationError, add more context specific to companies
    if (error instanceof FilterValidationError) {
      // Enhance with company-specific context but keep the original message and category
      throw new FilterValidationError(
        `Advanced company search filter invalid: ${error.message}`,
        error.category
      );
    }

    // For other errors, provide clear context
    if (error instanceof Error) {
      // Log the error in development mode
      if (process.env.NODE_ENV === 'development') {
        console.error('[advancedSearchCompanies] Error details:', {
          message: error.message,
          stack: error.stack,
        });
      }

      // Throw with enhanced context
      throw new Error(`Error in advanced company search: ${error.message}`);
    }

    // If we reach here, it's an unexpected error
    throw new Error(
      `Failed to search companies with advanced filters: ${String(error)}`
    );
  }
}

/**
 * Helper function to create filters for searching companies by name
 *
 * @param name - Name to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for name search
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
 * Helper function to create filters for searching companies by industry
 *
 * @param industry - Industry to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for industry search
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

/**
 * Helper function to create filters for searching companies by domain
 *
 * @param domain - Domain to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for domain search
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
 * Smart search that automatically determines search strategy based on query content
 *
 * @param query - Search query that may contain domain, email, URL, or company name
 * @returns Array of matching company objects with domain matches prioritized
 */
export async function smartSearchCompanies(query: string): Promise<Company[]> {
  // Early return for empty query
  if (!query || !query.trim()) {
    return [];
  }

  const domains = extractAllDomains(query);

  // Debug logging for smart search
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.debug(
      `[smartSearchCompanies] Smart search for: "${query}", extracted domains: [${domains.join(
        ', '
      )}]`
    );
  }

  if (domains.length > 0) {
    // Multi-domain search with prioritization
    const allResults: Company[] = [];
    const seenIds = new Set<string>();

    // Search by each domain first
    for (const domain of domains) {
      try {
        const domainResults = await searchCompaniesByDomain(domain);
        for (const result of domainResults) {
          const id = result.id?.record_id;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            allResults.push(result);
          }
        }
      } catch (error) {
        console.warn(`Domain search failed for "${domain}":`, error);
      }
    }

    // Add name-based results if we have room
    try {
      const nameResults = await searchCompaniesByName(query);
      for (const result of nameResults) {
        const id = result.id?.record_id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          allResults.push(result);
        }
      }
    } catch (error) {
      console.warn(`Name search failed for "${query}":`, error);
    }

    return allResults;
  }

  // No domains found, use regular name search
  return await searchCompaniesByName(query);
}
