/**
 * Search functionality for companies
 *
 * Simplified implementation following CLAUDE.md documentation-first rule.
 * Uses standard Attio API patterns instead of custom workarounds.
 */
import { getAttioClient } from '../../api/attio-client.js';
import { searchObject, advancedSearchObject, } from '../../api/operations/index.js';
import { ResourceType, FilterConditionType, } from '../../types/attio.js';
import { normalizeDomain } from '../../utils/domain-utils.js';
/**
 * Searches for companies by name using standard Attio API
 *
 * @param query - Search query string to match against company names
 * @param options - Optional search configuration
 * @returns Array of matching company objects
 */
export async function searchCompanies(query, options = {}) {
    if (!query || typeof query !== 'string' || !query.trim()) {
        return [];
    }
    if (options.maxResults !== undefined &&
        (typeof options.maxResults !== 'number' ||
            options.maxResults < 0 ||
            !Number.isInteger(options.maxResults))) {
        throw new Error('maxResults must be a non-negative integer');
    }
    const results = await searchObject(ResourceType.COMPANIES, query);
    // Apply maxResults limit if specified
    return options.maxResults ? results.slice(0, options.maxResults) : results;
}
/**
 * Searches for companies by domain using correct 'domains' field
 *
 * @param domain - Domain to search for
 * @returns Array of matching company objects
 */
export async function searchCompaniesByDomain(domain) {
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
    }
    catch (error) {
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
export async function advancedSearchCompanies(filters, limit, offset) {
    if (!filters) {
        throw new Error('Filters parameter is required');
    }
    if (limit !== undefined &&
        (typeof limit !== 'number' || limit < 0 || !Number.isInteger(limit))) {
        throw new Error('Limit must be a non-negative integer');
    }
    if (offset !== undefined &&
        (typeof offset !== 'number' || offset < 0 || !Number.isInteger(offset))) {
        throw new Error('Offset must be a non-negative integer');
    }
    return await advancedSearchObject(ResourceType.COMPANIES, filters, limit, offset);
}
/**
 * Helper function to create filters for searching companies by name
 */
export function createNameFilter(name, condition = FilterConditionType.CONTAINS) {
    if (!name || typeof name !== 'string') {
        throw new Error('Name parameter must be a non-empty string');
    }
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
export function createDomainFilter(domain, condition = FilterConditionType.CONTAINS) {
    if (!domain || typeof domain !== 'string') {
        throw new Error('Domain parameter must be a non-empty string');
    }
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
export function createIndustryFilter(industry, condition = FilterConditionType.CONTAINS) {
    if (!industry || typeof industry !== 'string') {
        throw new Error('Industry parameter must be a non-empty string');
    }
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
