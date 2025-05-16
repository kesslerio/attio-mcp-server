import { BatchConfig, BatchResponse, ListEntryFilters } from "../api/attio-operations.js";
import { Company, AttioNote, FilterConditionType, RecordAttributes } from "../types/attio.js";
/**
 * Searches for companies by name
 *
 * @param query - Search query string
 * @returns Array of company results
 */
export declare function searchCompanies(query: string): Promise<Company[]>;
/**
 * Lists companies sorted by most recent interaction
 *
 * @param limit - Maximum number of companies to return (default: 20)
 * @returns Array of company results
 */
export declare function listCompanies(limit?: number): Promise<Company[]>;
/**
 * Gets details for a specific company
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @returns Company details
 */
export declare function getCompanyDetails(companyIdOrUri: string): Promise<Company>;
/**
 * Gets notes for a specific company
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @param limit - Maximum number of notes to fetch (default: 10)
 * @param offset - Number of notes to skip (default: 0)
 * @returns Array of notes
 */
export declare function getCompanyNotes(companyIdOrUri: string, limit?: number, offset?: number): Promise<AttioNote[]>;
/**
 * Creates a note for a specific company
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @param title - The title of the note
 * @param content - The content of the note
 * @returns The created note
 */
export declare function createCompanyNote(companyIdOrUri: string, title: string, content: string): Promise<AttioNote>;
/**
 * Helper function to extract company ID from a URI or direct ID
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @returns Extracted company ID
 */
export declare function extractCompanyId(companyIdOrUri: string): string;
/**
 * Performs batch searches for companies by name
 *
 * @param queries - Array of search query strings
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with search results for each query
 */
export declare function batchSearchCompanies(queries: string[], batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<Company[]>>;
/**
 * Gets details for multiple companies in batch
 *
 * @param companyIdsOrUris - Array of company IDs or URIs to fetch
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with company details for each ID
 */
export declare function batchGetCompanyDetails(companyIdsOrUris: string[], batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<Company>>;
/**
 * Search for companies using advanced filtering capabilities
 *
 * @param filters - Filter conditions to apply
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching company records
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
/**
 * Search for companies based on attributes of their associated people
 *
 * @param peopleFilter - Filter to apply to people
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching companies
 */
export declare function searchCompaniesByPeople(peopleFilter: ListEntryFilters | string | any, limit?: number | string, offset?: number | string): Promise<Company[]>;
/**
 * Search for companies that have employees in a specific list
 *
 * @param listId - ID of the list containing people
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching companies
 */
export declare function searchCompaniesByPeopleList(listId: string, limit?: number | string, offset?: number | string): Promise<Company[]>;
/**
 * Search for companies that have notes containing specific text
 *
 * @param searchText - Text to search for in notes
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching companies
 */
export declare function searchCompaniesByNotes(searchText: string, limit?: number | string, offset?: number | string): Promise<Company[]>;
/**
 * Creates a new company
 *
 * @param attributes - Company attributes as key-value pairs
 * @returns Created company record
 */
export declare function createCompany(attributes: RecordAttributes): Promise<Company>;
/**
 * Updates an existing company
 *
 * @param companyId - ID of the company to update
 * @param attributes - Company attributes to update
 * @returns Updated company record
 */
export declare function updateCompany(companyId: string, attributes: RecordAttributes): Promise<Company>;
/**
 * Updates a specific attribute of a company
 *
 * @param companyId - ID of the company to update
 * @param attributeName - Name of the attribute to update
 * @param attributeValue - New value for the attribute
 * @returns Updated company record
 */
export declare function updateCompanyAttribute(companyId: string, attributeName: string, attributeValue: any): Promise<Company>;
/**
 * Deletes a company
 *
 * @param companyId - ID of the company to delete
 * @returns True if deletion was successful
 */
export declare function deleteCompany(companyId: string): Promise<boolean>;
//# sourceMappingURL=companies.d.ts.map