/**
 * Batch operations for company records
 */
import { ResourceType } from '../types/attio.js';
import { executeBatchOperations, batchCreateRecords, batchUpdateRecords } from '../api/operations/index.js';
import { createCompany, updateCompany, deleteCompany, searchCompanies, getCompanyDetails } from './companies/index.js';
import { CompanyValidator } from '../validators/company-validator.js';
/**
 * Creates multiple company records in batch
 *
 * @param companies - Array of company attributes to create
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with created companies
 */
export async function batchCreateCompanies(companies, batchConfig) {
    try {
        // Option 1: Use the generic batch create with validation
        const validatedCompanies = await Promise.all(companies.map(company => CompanyValidator.validateCreate(company)));
        const results = await batchCreateRecords({
            objectSlug: ResourceType.COMPANIES,
            records: validatedCompanies.map((attributes) => ({ attributes }))
        });
        // Convert to BatchResponse format
        const response = {
            results: results.map((company, index) => ({
                id: `create_company_${index}`,
                success: true,
                data: company
            })),
            summary: {
                total: companies.length,
                succeeded: results.length,
                failed: companies.length - results.length
            }
        };
        return response;
    }
    catch (error) {
        // Fallback to individual operations if batch API fails
        return executeBatchOperations(companies.map((attrs, index) => ({
            id: `create_company_${index}`,
            params: attrs
        })), (params) => createCompany(params), batchConfig);
    }
}
/**
 * Updates multiple company records in batch
 *
 * @param updates - Array of company updates (id + attributes)
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with updated companies
 */
export async function batchUpdateCompanies(updates, batchConfig) {
    try {
        // Use the generic batch update API
        const results = await batchUpdateRecords({
            objectSlug: ResourceType.COMPANIES,
            records: updates
        });
        // Convert to BatchResponse format
        const response = {
            results: results.map((company, index) => ({
                id: `update_company_${index}`,
                success: true,
                data: company
            })),
            summary: {
                total: updates.length,
                succeeded: results.length,
                failed: updates.length - results.length
            }
        };
        return response;
    }
    catch (error) {
        // Fallback to individual operations if batch API fails
        return executeBatchOperations(updates.map((update, index) => ({
            id: `update_company_${index}`,
            params: update
        })), (params) => updateCompany(params.id, params.attributes), batchConfig);
    }
}
/**
 * Deletes multiple company records in batch
 *
 * @param companyIds - Array of company IDs to delete
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with deletion results
 */
export async function batchDeleteCompanies(companyIds, batchConfig) {
    // The Attio API doesn't have a batch delete endpoint, so use individual operations
    return executeBatchOperations(companyIds.map((id, index) => ({
        id: `delete_company_${index}`,
        params: id
    })), (params) => deleteCompany(params), batchConfig);
}
/**
 * Performs batch searches for companies by name
 *
 * @param queries - Array of search query strings
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with search results for each query
 */
export async function batchSearchCompanies(queries, batchConfig) {
    return executeBatchOperations(queries.map((query, index) => ({
        id: `search_companies_${index}`,
        params: query
    })), (params) => searchCompanies(params), batchConfig);
}
/**
 * Gets details for multiple companies in batch
 *
 * @param companyIds - Array of company IDs or URIs to fetch
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with company details for each ID
 */
export async function batchGetCompanyDetails(companyIds, batchConfig) {
    return executeBatchOperations(companyIds.map((id, index) => ({
        id: `get_company_details_${index}`,
        params: id
    })), (params) => getCompanyDetails(params), batchConfig);
}
/**
 * Performs mixed batch operations on companies
 *
 * @param operations - Array of mixed operations (create, update, delete)
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with results for each operation
 */
export async function batchCompanyOperations(operations, batchConfig) {
    const results = [];
    let succeeded = 0;
    let failed = 0;
    // Process operations with chunking
    const config = {
        maxBatchSize: 10,
        continueOnError: true,
        ...batchConfig
    };
    const chunks = [];
    for (let i = 0; i < operations.length; i += config.maxBatchSize) {
        chunks.push(operations.slice(i, i + config.maxBatchSize));
    }
    for (const chunk of chunks) {
        const chunkResults = await Promise.allSettled(chunk.map(async (operation, index) => {
            const opId = `${operation.type}_company_${index}`;
            try {
                let result;
                switch (operation.type) {
                    case 'create':
                        result = await createCompany(operation.data);
                        break;
                    case 'update':
                        result = await updateCompany(operation.data.id, operation.data.attributes);
                        break;
                    case 'delete':
                        result = await deleteCompany(operation.data);
                        break;
                    default:
                        throw new Error(`Unknown operation type: ${operation.type}`);
                }
                succeeded++;
                return {
                    id: opId,
                    success: true,
                    data: result
                };
            }
            catch (error) {
                failed++;
                if (!config.continueOnError) {
                    throw error;
                }
                return {
                    id: opId,
                    success: false,
                    error
                };
            }
        }));
        // Collect results
        chunkResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            }
            else {
                results.push({
                    id: `operation_${index}`,
                    success: false,
                    error: result.reason
                });
            }
        });
    }
    return {
        results,
        summary: {
            total: operations.length,
            succeeded,
            failed
        }
    };
}
/**
 * Helper to create batch operation items for companies
 */
export function createBatchItems(items, prefix = 'item') {
    return items.map((item, index) => ({
        id: `${prefix}_${index}`,
        data: item
    }));
}
//# sourceMappingURL=batch-companies.js.map