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
 * Creates multiple company records in batch
 * 
 * @param params - Object containing array of companies and optional config
 * @returns Batch response with created companies
 */
export async function batchCreateCompanies(
  params: { companies: RecordAttributes[], config?: Partial<BatchConfig> }
): Promise<BatchResponse<Company>> {
  try {
    // Extract companies array and config from params
    const { companies, config: batchConfig } = params;
    
    // Validate that companies is an array
    if (!companies || !Array.isArray(companies)) {
      throw new Error("Invalid request: 'companies' parameter must be an array");
    }
    
    // Option 1: Use the generic batch create with validation
    const validatedCompanies = await Promise.all(
      companies.map(company => CompanyValidator.validateCreate(company))
    );
    
    const results = await batchCreateRecords<Company>({
      objectSlug: ResourceType.COMPANIES,
      records: validatedCompanies.map((attributes: any) => ({ attributes }))
    });
    
    // Convert to BatchResponse format
    const response: BatchResponse<Company> = {
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
  } catch (error) {
    // Extract companies array and config from params, with safe fallbacks
    const companies = params?.companies || [];
    const batchConfig = params?.config;
    
    // Fallback to individual operations if batch API fails
    return executeBatchOperations<RecordAttributes, Company>(
      companies.map((attrs, index) => ({
        id: `create_company_${index}`,
        params: attrs
      })),
      (params) => createCompany(params),
      batchConfig
    );
  }
}

/**
 * Updates multiple company records in batch
 * 
 * @param params - Object containing array of updates and optional config
 * @returns Batch response with updated companies
 */
export async function batchUpdateCompanies(
  params: { updates: Array<{ id: string; attributes: RecordAttributes }>, config?: Partial<BatchConfig> }
): Promise<BatchResponse<Company>> {
  try {
    // Extract updates array and config from params
    const { updates, config: batchConfig } = params;
    
    // Validate that updates is an array
    if (!updates || !Array.isArray(updates)) {
      throw new Error("Invalid request: 'updates' parameter must be an array");
    }
    
    // Use the generic batch update API
    const results = await batchUpdateRecords<Company>({
      objectSlug: ResourceType.COMPANIES,
      records: updates
    });
    
    // Convert to BatchResponse format
    const response: BatchResponse<Company> = {
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
  } catch (error) {
    // Extract updates array and config from params, with safe fallbacks
    const updates = params?.updates || [];
    const batchConfig = params?.config;
    
    // Fallback to individual operations if batch API fails
    return executeBatchOperations<{ id: string; attributes: RecordAttributes }, Company>(
      updates.map((update, index) => ({
        id: `update_company_${index}`,
        params: update
      })),
      (params) => updateCompany(params.id, params.attributes),
      batchConfig
    );
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