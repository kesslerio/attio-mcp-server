/**
 * Search functionality for companies
 */
import { getAttioClient } from "../../api/attio-client.js";
import { searchObject, advancedSearchObject } from "../../api/operations/index.js";
import { ResourceType, FilterConditionType } from "../../types/attio.js";
/**
 * Searches for companies by name
 *
 * @param query - Search query string
 * @returns Array of company results
 */
export async function searchCompanies(query) {
    // Use the unified operation if available, with fallback to direct implementation
    try {
        return await searchObject(ResourceType.COMPANIES, query);
    }
    catch (error) {
        // Fallback implementation
        const api = getAttioClient();
        const path = "/objects/companies/records/query";
        const response = await api.post(path, {
            filter: {
                name: { "$contains": query },
            }
        });
        return response.data.data || [];
    }
}
/**
 * Performs advanced search with custom filters
 *
 * @param filters - List of filters to apply
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of company results
 * @throws Error if the search encounters any issues
 */
export async function advancedSearchCompanies(filters, limit, offset) {
    try {
        return await advancedSearchObject(ResourceType.COMPANIES, filters, limit, offset);
    }
    catch (error) {
        // Handle specific API limitations for website/industry filtering if needed
        if (error instanceof Error) {
            throw error;
        }
        // If we reach here, it's an unexpected error
        throw new Error(`Failed to search companies with advanced filters: ${String(error)}`);
    }
}
/**
 * Helper function to create filters for searching companies by name
 *
 * @param name - Name to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for name search
 */
export function createNameFilter(name, condition = FilterConditionType.CONTAINS) {
    return {
        filters: [
            {
                attribute: { slug: 'name' },
                condition: condition,
                value: name
            }
        ]
    };
}
/**
 * Helper function to create filters for searching companies by website
 *
 * @param website - Website to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for website search
 */
export function createWebsiteFilter(website, condition = FilterConditionType.CONTAINS) {
    return {
        filters: [
            {
                attribute: { slug: 'website' },
                condition: condition,
                value: website
            }
        ]
    };
}
/**
 * Helper function to create filters for searching companies by industry
 *
 * @param industry - Industry to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for industry search
 */
export function createIndustryFilter(industry, condition = FilterConditionType.CONTAINS) {
    return {
        filters: [
            {
                attribute: { slug: 'industry' },
                condition: condition,
                value: industry
            }
        ]
    };
}
//# sourceMappingURL=search.js.map