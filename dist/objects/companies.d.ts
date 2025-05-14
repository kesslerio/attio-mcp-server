import { BatchConfig, BatchResponse } from "../api/attio-operations.js";
import { Company, AttioNote } from "../types/attio.js";
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
//# sourceMappingURL=companies.d.ts.map