import { ListEntryFilters } from "../../api/operations/index.js";
import { Company, FilterConditionType } from "../../types/attio.js";
/**
 * Searches for companies by name
 *
 * @param query - Search query string
 * @returns Array of company results
 */
export declare function searchCompanies(query: string): Promise<Company[]>;
/**
 * Performs advanced search with custom filters
 *
 * @param filters - List of filters to apply
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of company results
 * @throws Error if the search encounters any issues
 */
export declare function advancedSearchCompanies(filters: ListEntryFilters, limit?: number, offset?: number): Promise<Company[]>;
/**
 * Helper function to create filters for searching companies by name
 *
 * @param name - Name to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for name search
 */
export declare function createNameFilter(name: string, condition?: FilterConditionType): ListEntryFilters;
/**
 * Helper function to create filters for searching companies by website
 *
 * @param website - Website to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for website search
 */
export declare function createWebsiteFilter(website: string, condition?: FilterConditionType): ListEntryFilters;
/**
 * Helper function to create filters for searching companies by industry
 *
 * @param industry - Industry to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for industry search
 */
export declare function createIndustryFilter(industry: string, condition?: FilterConditionType): ListEntryFilters;
//# sourceMappingURL=search.d.ts.map