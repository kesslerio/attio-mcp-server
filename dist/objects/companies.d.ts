import { ListEntryFilters } from "../api/attio-operations.js";
import { Company, AttioNote, FilterConditionType } from "../types/attio.js";
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
 * Gets full details for a specific company (all fields)
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
 * Gets specific fields for a company (field selection)
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @param fields - Array of field names to retrieve
 * @returns Company with only specified fields
 */
export declare function getCompanyFields(companyIdOrUri: string, fields: string[]): Promise<Partial<Company>>;
/**
 * Gets basic company information (limited fields for performance)
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Basic company information
 */
export declare function getCompanyBasicInfo(companyIdOrUri: string): Promise<Partial<Company>>;
/**
 * Gets company contact information
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Company contact information
 */
export declare function getCompanyContactInfo(companyIdOrUri: string): Promise<Partial<Company>>;
/**
 * Gets company business information
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Company business information
 */
export declare function getCompanyBusinessInfo(companyIdOrUri: string): Promise<Partial<Company>>;
/**
 * Gets company social media and online presence
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @returns Company social media information
 */
export declare function getCompanySocialInfo(companyIdOrUri: string): Promise<Partial<Company>>;
/**
 * Gets custom fields for a company
 *
 * @param companyIdOrUri - The ID of the company or its URI
 * @param customFieldNames - Optional array of specific custom field names to retrieve
 * @returns Company with custom fields
 */
export declare function getCompanyCustomFields(companyIdOrUri: string, customFieldNames?: string[]): Promise<Partial<Company>>;
/**
 * Discovers all available attributes for companies in the workspace
 *
 * @returns List of all company attributes with metadata
 */
export declare function discoverCompanyAttributes(): Promise<{
    standard: string[];
    custom: string[];
    all: Array<{
        name: string;
        type: string;
        isCustom: boolean;
    }>;
}>;
/**
 * Gets specific attributes for a company or lists available attributes
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @param attributeName - Optional name of specific attribute to retrieve
 * @returns If attributeName provided: specific attribute value, otherwise list of available attributes
 */
export declare function getCompanyAttributes(companyIdOrUri: string, attributeName?: string): Promise<{
    attributes?: string[];
    value?: any;
    company: string;
}>;
/**
 * Helper function to extract company ID from a URI or direct ID
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @returns Extracted company ID
 */
export declare function extractCompanyId(companyIdOrUri: string): string;
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
 * @throws InvalidCompanyDataError if validation fails
 * @throws CompanyOperationError if creation fails
 */
export declare function createCompany(attributes: any): Promise<Company>;
/**
 * Updates an existing company
 *
 * @param companyId - ID of the company to update
 * @param attributes - Company attributes to update
 * @returns Updated company record
 * @throws InvalidCompanyDataError if validation fails
 * @throws CompanyOperationError if update fails
 */
export declare function updateCompany(companyId: string, attributes: any): Promise<Company>;
/**
 * Updates a specific attribute of a company
 *
 * @param companyId - ID of the company to update
 * @param attributeName - Name of the attribute to update
 * @param attributeValue - New value for the attribute
 * @returns Updated company record
 * @throws InvalidCompanyDataError if validation fails
 * @throws CompanyOperationError if update fails
 */
export declare function updateCompanyAttribute(companyId: string, attributeName: string, attributeValue: any): Promise<Company>;
/**
 * Deletes a company
 *
 * @param companyId - ID of the company to delete
 * @returns True if deletion was successful
 * @throws InvalidCompanyDataError if validation fails
 * @throws CompanyOperationError if deletion fails
 */
export declare function deleteCompany(companyId: string): Promise<boolean>;
export { batchCreateCompanies, batchUpdateCompanies, batchDeleteCompanies, batchSearchCompanies, batchGetCompanyDetails } from './batch-companies.js';
//# sourceMappingURL=companies.d.ts.map