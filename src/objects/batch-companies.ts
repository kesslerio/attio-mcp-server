/**
 * Batch operations for company records
 */
import { 
  ResourceType, 
  Company, 
  BatchResponse, 
  BatchConfig,
  RecordAttributes
} from '../types/attio.js';
import { 
  executeBatchOperations,
  batchCreateRecords,
  batchUpdateRecords
} from '../api/operations/index.js';
import {
  createCompany,
  updateCompany,
  deleteCompany,
  searchCompanies,
  getCompanyDetails
} from './companies/index.js';
import { CompanyValidator } from '../validators/company-validator.js';

/**
 * Helper function to execute a batch operation with improved error handling
 * 
 * This function centralizes batch operations for companies, providing consistent
 * error handling, proper object type setting, and fallback to individual operations
 * when the batch API is unavailable.
 * 
 * @template T - The type of input records (e.g., RecordAttributes for create, {id, attributes} for update)
 * @template R - The type of output records (typically Company)
 * @param operationType - The type of operation (create, update, delete, etc.)
 * @param records - The records to process
 * @param batchFunction - The batch API function to call
 * @param singleFunction - The single-record fallback function
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with results for each record and summary statistics
 * @throws Error if records is not an array or validation fails
 */
async function executeBatchCompanyOperation<T, R>(
  operationType: 'create' | 'update' | 'delete' | 'search' | 'get',
  records: T[],
  batchFunction: (params: any) => Promise<R[]>,
  singleFunction: (params: T) => Promise<R>,
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<R>> {
  // Validation check
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`Invalid ${operationType} parameters: records must be a non-empty array`);
  }
  
  try {
    // Attempt to use the batch API
    const results = await batchFunction({
      objectSlug: ResourceType.COMPANIES, // Always explicitly set the resource type
      records: operationType === 'create' 
        ? records.map((r: any) => ({ attributes: r }))
        : records
    });
    
    // Format the response
    return {
      results: results.map((result, index) => ({
        id: `${operationType}_company_${index}`,
        success: true,
        data: result
      })),
      summary: {
        total: records.length,
        succeeded: results.length,
        failed: records.length - results.length
      }
    };
  } catch (error) {
    // Log the error for debugging
    console.error(`[batchCompany${operationType.charAt(0).toUpperCase() + operationType.slice(1)}] ` +
      `Batch API failed with error: ${error instanceof Error ? error.message : String(error)}`);
    
    // Fall back to individual operations
    return executeBatchOperations<T, R>(
      records.map((record, index) => ({
        id: `${operationType}_company_${index}`,
        params: record
      })),
      singleFunction,
      batchConfig
    );
  }
}

/**
 * Creates multiple company records in batch
 * 
 * This function creates multiple company records in a single API call, with automatic
 * fallback to individual operations if the batch API is unavailable. All input data
 * is validated before processing.
 * 
 * @example
 * ```typescript
 * // Create multiple companies
 * const companies = [
 *   { name: "Acme Corp", website: "https://acme.com", industry: "Technology" },
 *   { name: "Umbrella Inc", website: "https://umbrella.com", industry: "Manufacturing" }
 * ];
 * 
 * const result = await batchCreateCompanies(companies);
 * console.log(`Created ${result.summary.succeeded} of ${result.summary.total} companies`);
 * ```
 * 
 * @param companies - Array of company attributes to create, each must include at least a name
 * @param batchConfig - Optional batch configuration (maxBatchSize, continueOnError, etc.)
 * @returns Batch response containing created companies and operation summary
 * @throws Error if companies is not an array or validation fails
 */
export async function batchCreateCompanies(
  companies: RecordAttributes[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<Company>> {
  // Validate and clean the input data
  if (!Array.isArray(companies)) {
    throw new Error('Companies parameter must be an array of company attributes');
  }
  
  try {
    // Validate company data before processing
    const validatedCompanies = await Promise.all(
      companies.map(company => CompanyValidator.validateCreate(company))
    );
    
    // Use the shared helper function for consistent handling
    return executeBatchCompanyOperation<RecordAttributes, Company>(
      'create',
      validatedCompanies,
      batchCreateRecords,
      createCompany,
      batchConfig
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('validation')) {
      // Re-throw validation errors with more context
      throw new Error(`Company validation failed: ${error.message}`);
    }
    
    // For other errors, log and then rethrow
    console.error('[batchCreateCompanies] Error creating companies:', error);
    throw error;
  }
}

/**
 * Updates multiple company records in batch
 * 
 * This function updates multiple company records in a single API call, with automatic
 * fallback to individual operations if the batch API is unavailable. It performs extensive
 * validation to ensure all required fields are present and properly formatted.
 * 
 * @example
 * ```typescript
 * // Update multiple companies
 * const updates = [
 *   { id: "3bdf5c9d-aa78-492a-a4c1-5a143e94ef0e", attributes: { industry: "New Industry" } },
 *   { id: "e252e8df-d6b6-4909-a03c-6c9f144c4580", attributes: { website: "https://new-site.com" } }
 * ];
 * 
 * const result = await batchUpdateCompanies(updates);
 * console.log(`Updated ${result.summary.succeeded} of ${result.summary.total} companies`);
 * ```
 * 
 * @param updates - Array of company updates, each containing an id and attributes to update
 * @param batchConfig - Optional batch configuration (maxBatchSize, continueOnError, etc.)
 * @returns Batch response containing updated companies and operation summary
 * @throws Error if updates is not an array, has missing ids or attributes, or if API calls fail
 */
export async function batchUpdateCompanies(
  updates: Array<{ id: string; attributes: RecordAttributes }>,
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<Company>> {
  // Input validation
  if (!Array.isArray(updates)) {
    throw new Error('Updates parameter must be an array of objects with id and attributes');
  }
  
  // Validate each update has required fields
  for (const update of updates) {
    if (!update.id) {
      throw new Error('Each update must have an id property');
    }
    if (!update.attributes || typeof update.attributes !== 'object') {
      throw new Error('Each update must have an attributes object');
    }
  }
  
  try {
    // Use the shared helper function for consistent handling
    return executeBatchCompanyOperation<
      { id: string; attributes: RecordAttributes }, 
      Company
    >(
      'update',
      updates,
      batchUpdateRecords,
      (params) => updateCompany(params.id, params.attributes),
      batchConfig
    );
  } catch (error) {
    // Enhanced error handling with more context
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        throw new Error(`Company update failed: One or more company IDs do not exist`);
      } else {
        // Provide more detailed error
        throw new Error(`Company batch update failed: ${error.message}`);
      }
    }
    
    // For other errors, log and then rethrow
    console.error('[batchUpdateCompanies] Error updating companies:', error);
    throw error;
  }
}

/**
 * Deletes multiple company records in batch
 * 
 * @param companyIds - Array of company IDs to delete
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with deletion results
 */
export async function batchDeleteCompanies(
  companyIds: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<boolean>> {
  // The Attio API doesn't have a batch delete endpoint, so use individual operations
  return executeBatchOperations<string, boolean>(
    companyIds.map((id, index) => ({
      id: `delete_company_${index}`,
      params: id
    })),
    (params) => deleteCompany(params),
    batchConfig
  );
}

/**
 * Performs batch searches for companies by name
 * 
 * @param queries - Array of search query strings
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with search results for each query
 */
export async function batchSearchCompanies(
  queries: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<Company[]>> {
  return executeBatchOperations<string, Company[]>(
    queries.map((query, index) => ({
      id: `search_companies_${index}`,
      params: query
    })),
    (params) => searchCompanies(params),
    batchConfig
  );
}

/**
 * Gets details for multiple companies in batch
 * 
 * @param companyIds - Array of company IDs or URIs to fetch
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with company details for each ID
 */
export async function batchGetCompanyDetails(
  companyIds: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<Company>> {
  return executeBatchOperations<string, Company>(
    companyIds.map((id, index) => ({
      id: `get_company_details_${index}`,
      params: id
    })),
    (params) => getCompanyDetails(params),
    batchConfig
  );
}

/**
 * Performs mixed batch operations on companies
 * 
 * @param operations - Array of mixed operations (create, update, delete)
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with results for each operation
 */
export async function batchCompanyOperations(
  operations: Array<{
    type: 'create' | 'update' | 'delete';
    data: any;
  }>,
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<Company | boolean>> {
  const results: Array<{
    id: string;
    success: boolean;
    data?: Company | boolean;
    error?: any;
  }> = [];
  
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
    const chunkResults = await Promise.allSettled(
      chunk.map(async (operation, index) => {
        const opId = `${operation.type}_company_${index}`;
        
        try {
          let result: Company | boolean;
          
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
        } catch (error) {
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
      })
    );
    
    // Collect results
    chunkResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
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
export function createBatchItems<T>(
  items: T[],
  prefix: string = 'item'
): Array<{ id: string; data: T }> {
  return items.map((item, index) => ({
    id: `${prefix}_${index}`,
    data: item
  }));
}