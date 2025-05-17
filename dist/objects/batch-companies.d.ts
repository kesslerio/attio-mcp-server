/**
 * Batch operations for company records
 */
import { Company, BatchResponse, BatchConfig, RecordAttributes } from '../types/attio.js';
/**
 * Creates multiple company records in batch
 *
 * @param companies - Array of company attributes to create
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with created companies
 */
export declare function batchCreateCompanies(companies: RecordAttributes[], batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<Company>>;
/**
 * Updates multiple company records in batch
 *
 * @param updates - Array of company updates (id + attributes)
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with updated companies
 */
export declare function batchUpdateCompanies(updates: Array<{
    id: string;
    attributes: RecordAttributes;
}>, batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<Company>>;
/**
 * Deletes multiple company records in batch
 *
 * @param companyIds - Array of company IDs to delete
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with deletion results
 */
export declare function batchDeleteCompanies(companyIds: string[], batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<boolean>>;
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
 * @param companyIds - Array of company IDs or URIs to fetch
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with company details for each ID
 */
export declare function batchGetCompanyDetails(companyIds: string[], batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<Company>>;
/**
 * Performs mixed batch operations on companies
 *
 * @param operations - Array of mixed operations (create, update, delete)
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with results for each operation
 */
export declare function batchCompanyOperations(operations: Array<{
    type: 'create' | 'update' | 'delete';
    data: any;
}>, batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<Company | boolean>>;
/**
 * Helper to create batch operation items for companies
 */
export declare function createBatchItems<T>(items: T[], prefix?: string): Array<{
    id: string;
    data: T;
}>;
//# sourceMappingURL=batch-companies.d.ts.map