/**
 * Shared handler utilities for universal tool consolidation
 * 
 * These utilities provide parameter-based routing to delegate universal
 * tool operations to existing resource-specific handlers.
 */

import {
  UniversalResourceType,
  UniversalSearchParams,
  UniversalRecordDetailsParams,
  UniversalCreateParams,
  UniversalUpdateParams,
  UniversalDeleteParams,
  UniversalAttributesParams,
  UniversalDetailedInfoParams,
  DetailedInfoType
} from './types.js';

// Import format helpers
import { convertAttributeFormats, getFormatErrorHelp } from '../../../utils/attribute-format-helpers.js';

// Import deal defaults configuration
import { applyDealDefaultsWithValidation, getDealDefaults, validateDealInput } from '../../../config/deal-defaults.js';

// Import existing handlers by resource type
import {
  searchCompanies,
  advancedSearchCompanies,
  getCompanyDetails,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyAttributes,
  discoverCompanyAttributes,
  getCompanyBasicInfo,
  getCompanyContactInfo,
  getCompanyBusinessInfo,
  getCompanySocialInfo
} from '../../../objects/companies/index.js';

import {
  searchPeople,
  advancedSearchPeople,
  getPersonDetails,
  createPerson,
  listPeople
} from '../../../objects/people/index.js';

import {
  updatePerson,
  deletePerson
} from '../../../objects/people-write.js';

import {
  createObjectRecord,
  getObjectRecord,
  updateObjectRecord,
  deleteObjectRecord,
  listObjectRecords
} from '../../../objects/records/index.js';

import {
  createTask,
  updateTask,
  deleteTask,
  getTask,
  listTasks
} from '../../../objects/tasks.js';

import { AttioRecord, AttioTask } from '../../../types/attio.js';
import { getAttioClient } from '../../../api/attio-client.js';
import { UniversalValidationError, ErrorType } from './schemas.js';

/**
 * Query deal records using the proper Attio API endpoint
 */
async function queryDealRecords({ limit = 10, offset = 0 }): Promise<AttioRecord[]> {
  const client = getAttioClient();
  
  try {
    // Use POST to /objects/deals/records/query (the correct Attio endpoint)
    const response = await client.post('/objects/deals/records/query', {
      limit,
      offset,
      // Add any additional query parameters as needed
    });
    
    return response?.data?.data || [];
  } catch (error: any) {
    console.error('Failed to query deal records:', error);
    // If the query endpoint also fails, try the simpler approach
    if (error?.response?.status === 404) {
      console.error('Deal query endpoint not found, falling back to empty results');
      return [];
    }
    throw error;
  }
}

/**
 * Converts an AttioTask to an AttioRecord for universal tool compatibility
 * This provides proper type conversion without unsafe casting
 */
function convertTaskToRecord(task: AttioTask): AttioRecord {
  return {
    id: {
      record_id: task.id.task_id,
      object_id: task.id.object_id || 'tasks',
      workspace_id: task.id.workspace_id
    },
    values: {
      // Ensure the values object satisfies the AttioRecord.values interface
      ...(task.values || {}),
    } as AttioRecord['values'],
    created_at: task.created_at,
    updated_at: task.updated_at
  };
}

/**
 * Generic attribute discovery for any resource type
 */
async function discoverAttributesForResourceType(resourceType: UniversalResourceType): Promise<any> {
  const client = getAttioClient();
  
  try {
    const response = await client.get(`/objects/${resourceType}/attributes`);
    const attributes = response.data.data || [];
    
    // Create mapping from title to api_slug for compatibility
    const mappings: Record<string, string> = {};
    attributes.forEach((attr: any) => {
      if (attr.title && attr.api_slug) {
        mappings[attr.title] = attr.api_slug;
      }
    });
    
    return {
      attributes: attributes,
      mappings: mappings,
      count: attributes.length
    };
  } catch (error) {
    console.error(`Failed to discover attributes for ${resourceType}:`, error);
    throw new Error(`Attribute discovery failed for ${resourceType}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get attributes for a specific record of any resource type
 */
async function getAttributesForRecord(resourceType: UniversalResourceType, recordId: string): Promise<any> {
  const client = getAttioClient();
  
  try {
    const response = await client.get(`/objects/${resourceType}/records/${recordId}`);
    return response?.data?.data?.values || {};
  } catch (error) {
    console.error(`Failed to get attributes for ${resourceType} record ${recordId}:`, error);
    throw new Error(`Failed to get record attributes: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Universal search handler - routes to appropriate resource-specific search
 */
export async function handleUniversalSearch(params: UniversalSearchParams): Promise<AttioRecord[]> {
  const { resource_type, query, filters, limit, offset } = params;
  
  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      if (filters && Object.keys(filters).length > 0) {
        return advancedSearchCompanies(filters, limit, offset);
      }
      return searchCompanies(query || '');
      
    case UniversalResourceType.PEOPLE:
      if (filters && Object.keys(filters).length > 0) {
        const paginatedResult = await advancedSearchPeople(filters, { limit, offset });
        return paginatedResult.results;
      }
      // If no query provided, use listPeople instead of searchPeople
      if (!query || query.trim().length === 0) {
        return await listPeople(limit || 20);
      }
      return await searchPeople(query);
      
    case UniversalResourceType.RECORDS:
      return listObjectRecords('records', { pageSize: limit, page: Math.floor((offset || 0) / (limit || 10)) + 1 });
      
    case UniversalResourceType.DEALS:
      // Use POST query endpoint for deals since GET /objects/deals/records doesn't exist
      return await queryDealRecords({ limit, offset });
      
    case UniversalResourceType.TASKS: {
      const tasks = await listTasks();
      // Convert AttioTask[] to AttioRecord[] using proper type conversion
      return tasks.map(convertTaskToRecord);
    }
      
    default:
      throw new Error(`Unsupported resource type for search: ${resource_type}`);
  }
}

/**
 * Universal get record details handler
 */
export async function handleUniversalGetDetails(params: UniversalRecordDetailsParams): Promise<AttioRecord> {
  const { resource_type, record_id } = params;
  
  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      return getCompanyDetails(record_id);
      
    case UniversalResourceType.PEOPLE:
      return getPersonDetails(record_id);
      
    case UniversalResourceType.RECORDS:
      return getObjectRecord('records', record_id);
      
    case UniversalResourceType.DEALS:
      return getObjectRecord('deals', record_id);
      
    case UniversalResourceType.TASKS: {
      // Tasks don't have a direct get details function, so we'll use list with filter
      const tasks = await listTasks();
      const task = tasks.find((t: any) => t.id?.record_id === record_id);
      if (!task) {
        throw new Error(`Task not found with ID: ${record_id}`);
      }
      // Convert AttioTask to AttioRecord using proper type conversion
      return convertTaskToRecord(task);
    }
      
    default:
      throw new Error(`Unsupported resource type for get details: ${resource_type}`);
  }
}

/**
 * Universal create record handler
 */
export async function handleUniversalCreate(params: UniversalCreateParams): Promise<AttioRecord> {
  const { resource_type, record_data } = params;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[handleUniversalCreate] Input params:', { resource_type, record_data });
  }
  
  switch (resource_type) {
    case UniversalResourceType.COMPANIES: {
      try {
        // Apply format conversions for common mistakes
        const correctedData = convertAttributeFormats('companies', record_data);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[handleUniversalCreate] Corrected data for companies:', correctedData);
        }
        
        const result = await createCompany(correctedData);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[handleUniversalCreate] createCompany result:', {
            result,
            hasId: !!result?.id,
            hasValues: !!result?.values,
            resultType: typeof result
          });
        }
        
        return result;
      } catch (error: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[handleUniversalCreate] Error in companies case:', error);
        }
        // Enhance error messages with format help
        if (error?.message?.includes('Cannot find attribute')) {
          const match = error.message.match(/slug\/ID "([^"]+)"/);
          if (match && match[1]) {
            const enhancedError = getFormatErrorHelp('companies', match[1], error.message);
            throw new Error(enhancedError);
          }
        }
        throw error;
      }
    }
      
    case UniversalResourceType.PEOPLE: {
      try {
        // Apply format conversions for common mistakes
        const correctedData = convertAttributeFormats('people', record_data);
        return await createPerson(correctedData);
      } catch (error: any) {
        // Enhance error messages with format help
        if (error?.message?.includes('invalid value') || error?.message?.includes('Format Error')) {
          const match = error.message.match(/slug "([^"]+)"/);
          if (match && match[1]) {
            const enhancedError = getFormatErrorHelp('people', match[1], error.message);
            throw new Error(enhancedError);
          }
        }
        throw error;
      }
    }
      
    case UniversalResourceType.RECORDS:
      return createObjectRecord('records', record_data);
      
    case UniversalResourceType.DEALS: {
      // Handle deal-specific requirements with configured defaults and validation
      let dealData = { ...record_data };
      
      // Validate input and log suggestions (but don't block execution)
      const validation = validateDealInput(dealData);
      if (validation.suggestions.length > 0) {
        console.error('Deal input suggestions:', validation.suggestions.join('; '));
      }
      if (validation.warnings.length > 0) {
        console.error('Deal input warnings:', validation.warnings.join('; '));
      }
      if (!validation.isValid) {
        console.error('Deal input errors:', validation.errors.join('; '));
        // Continue anyway - the conversions might fix the issues
      }
      
      // Apply configured defaults with proactive stage validation
      dealData = await applyDealDefaultsWithValidation(dealData);
      
      try {
        return await createObjectRecord('deals', dealData);
      } catch (error: any) {
        // If stage still fails after validation, try with default stage
        if (error?.message?.includes('Cannot find Status') && dealData.stage) {
          const defaults = getDealDefaults();
          const invalidStage = dealData.stage[0]?.status;
          console.error(`Deal stage "${invalidStage}" still failed after validation, using fallback to default stage "${defaults.stage}"...`);
          
          // Use default stage if available, otherwise remove stage (will fail since it's required)
          if (defaults.stage) {
            dealData.stage = [{ status: defaults.stage }];
          } else {
            delete dealData.stage;
          }
          
          return await createObjectRecord('deals', dealData);
        }
        throw error;
      }
    }
      
    case UniversalResourceType.TASKS: {
      // Extract content from record_data for task creation
      const content = record_data.content || record_data.title || record_data.name || 'New task';
      const options = {
        assigneeId: record_data.assigneeId,
        dueDate: record_data.dueDate,
        recordId: record_data.recordId
      };
      const createdTask = await createTask(content, options);
      // Convert AttioTask to AttioRecord using proper type conversion
      return convertTaskToRecord(createdTask);
    }
      
    default:
      throw new Error(`Unsupported resource type for create: ${resource_type}`);
  }
}

/**
 * Universal update record handler
 */
export async function handleUniversalUpdate(params: UniversalUpdateParams): Promise<AttioRecord> {
  const { resource_type, record_id, record_data } = params;
  
  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      return updateCompany(record_id, record_data);
      
    case UniversalResourceType.PEOPLE:
      return updatePerson(record_id, record_data);
      
    case UniversalResourceType.RECORDS:
      return updateObjectRecord('records', record_id, record_data);
      
    case UniversalResourceType.DEALS: {
      // Apply deal defaults and validation for updates too
      const updatedDealData = await applyDealDefaultsWithValidation(record_data);
      return updateObjectRecord('deals', record_id, updatedDealData);
    }
      
    case UniversalResourceType.TASKS: {
      const updatedTask = await updateTask(record_id, record_data);
      // Convert AttioTask to AttioRecord using proper type conversion
      return convertTaskToRecord(updatedTask);    
    }
      
    default:
      throw new Error(`Unsupported resource type for update: ${resource_type}`);
  }
}

/**
 * Universal delete record handler
 */
export async function handleUniversalDelete(params: UniversalDeleteParams): Promise<{ success: boolean; record_id: string }> {
  const { resource_type, record_id } = params;
  
  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      await deleteCompany(record_id);
      return { success: true, record_id };
      
    case UniversalResourceType.PEOPLE:
      await deletePerson(record_id);
      return { success: true, record_id };
      
    case UniversalResourceType.RECORDS:
      await deleteObjectRecord('records', record_id);
      return { success: true, record_id };
      
    case UniversalResourceType.DEALS:
      await deleteObjectRecord('deals', record_id);
      return { success: true, record_id };
      
    case UniversalResourceType.TASKS:
      await deleteTask(record_id);
      return { success: true, record_id };
      
    default:
      throw new Error(`Unsupported resource type for delete: ${resource_type}`);
  }
}

/**
 * Universal get attributes handler
 */
export async function handleUniversalGetAttributes(params: UniversalAttributesParams): Promise<any> {
  const { resource_type, record_id } = params;
  
  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      if (record_id) {
        return getCompanyAttributes(record_id);
      }
      // Return schema-level attributes if no record_id provided
      return discoverCompanyAttributes();
      
    case UniversalResourceType.PEOPLE:
      if (record_id) {
        return getAttributesForRecord(resource_type, record_id);
      }
      // Return schema-level attributes if no record_id provided
      return discoverAttributesForResourceType(resource_type);
      
    case UniversalResourceType.RECORDS:
      if (record_id) {
        return getAttributesForRecord(resource_type, record_id);
      }
      return discoverAttributesForResourceType(resource_type);
      
    case UniversalResourceType.DEALS:
      if (record_id) {
        return getAttributesForRecord(resource_type, record_id);
      }
      return discoverAttributesForResourceType(resource_type);
      
    case UniversalResourceType.TASKS:
      if (record_id) {
        return getAttributesForRecord(resource_type, record_id);
      }
      return discoverAttributesForResourceType(resource_type);
      
    default:
      throw new Error(`Unsupported resource type for get attributes: ${resource_type}`);
  }
}

/**
 * Universal discover attributes handler
 */
export async function handleUniversalDiscoverAttributes(resource_type: UniversalResourceType): Promise<any> {
  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      return discoverCompanyAttributes();
      
    case UniversalResourceType.PEOPLE:
      return discoverAttributesForResourceType(resource_type);
      
    case UniversalResourceType.RECORDS:
      return discoverAttributesForResourceType(resource_type);
      
    case UniversalResourceType.DEALS:
      return discoverAttributesForResourceType(resource_type);
      
    case UniversalResourceType.TASKS:
      return discoverAttributesForResourceType(resource_type);
      
    default:
      throw new Error(`Unsupported resource type for discover attributes: ${resource_type}`);
  }
}

/**
 * Universal get detailed info handler
 */
export async function handleUniversalGetDetailedInfo(params: UniversalDetailedInfoParams): Promise<any> {
  const { resource_type, record_id, info_type } = params;
  
  // For now, we'll return the full record for non-company resource types
  // TODO: Implement specialized detailed info methods for other resource types
  if (resource_type !== UniversalResourceType.COMPANIES) {
    // Return the full record as a fallback for other resource types
    switch (resource_type) {
      case UniversalResourceType.PEOPLE:
        return getPersonDetails(record_id);
      case UniversalResourceType.DEALS:
        return getObjectRecord('deals', record_id);
      case UniversalResourceType.TASKS:
        return getTask(record_id);
      case UniversalResourceType.RECORDS:
        return getObjectRecord('records', record_id);
      default:
        throw new Error(`Unsupported resource type for detailed info: ${resource_type}`);
    }
  }
  
  // Company-specific detailed info
  switch (info_type) {
    case DetailedInfoType.BASIC:
      return getCompanyBasicInfo(record_id);
      
    case DetailedInfoType.CONTACT:
      return getCompanyContactInfo(record_id);
      
    case DetailedInfoType.BUSINESS:
      return getCompanyBusinessInfo(record_id);
      
    case DetailedInfoType.SOCIAL:
      return getCompanySocialInfo(record_id);
      
    case DetailedInfoType.CUSTOM:
      // Custom fields would be implemented here
      throw new Error('Custom detailed info not yet implemented');
      
    default:
      throw new Error(`Unsupported info type: ${info_type}`);
  }
}

/**
 * Utility function to format resource type for display
 */
export function formatResourceType(resourceType: UniversalResourceType): string {
  switch (resourceType) {
    case UniversalResourceType.COMPANIES:
      return 'company';
    case UniversalResourceType.PEOPLE:
      return 'person';
    case UniversalResourceType.RECORDS:
      return 'record';
    case UniversalResourceType.DEALS:
      return 'deal';
    case UniversalResourceType.TASKS:
      return 'task';
    default:
      return resourceType;
  }
}

/**
 * Utility function to get singular form of resource type
 */
export function getSingularResourceType(resourceType: UniversalResourceType): string {
  return formatResourceType(resourceType);
}

/**
 * Utility function to validate resource type
 */
export function isValidResourceType(resourceType: string): resourceType is UniversalResourceType {
  return Object.values(UniversalResourceType).includes(resourceType as UniversalResourceType);
}

/**
 * Enhanced error handling utility for universal operations
 */
export function createUniversalError(operation: string, resourceType: string, originalError: any): Error {
  // If it's already a UniversalValidationError, pass it through
  if (originalError instanceof UniversalValidationError) {
    return originalError;
  }
  
  // Classify the error type based on the original error
  let errorType = ErrorType.SYSTEM_ERROR;
  
  if (originalError?.message?.includes('not found') || 
      originalError?.message?.includes('invalid') ||
      originalError?.message?.includes('required') ||
      originalError?.status === 400) {
    errorType = ErrorType.USER_ERROR;
  } else if (originalError?.status >= 500 || 
             originalError?.message?.includes('network') ||
             originalError?.message?.includes('timeout')) {
    errorType = ErrorType.API_ERROR;
  }
  
  const message = `Universal ${operation} failed for resource type ${resourceType}: ${originalError.message}`;
  
  return new UniversalValidationError(
    message,
    errorType,
    {
      suggestion: getOperationSuggestion(operation, resourceType, originalError),
      cause: originalError
    }
  );
}

/**
 * Get helpful suggestions based on the operation and error
 */
function getOperationSuggestion(operation: string, resourceType: string, error: any): string | undefined {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  // Deal-specific suggestions
  if (resourceType === 'deals') {
    if (errorMessage.includes('cannot find attribute with slug/id "company_id"')) {
      return 'Use "associated_company" instead of "company_id" for linking deals to companies';
    }
    
    if (errorMessage.includes('cannot find attribute with slug/id "company"')) {
      return 'Use "associated_company" instead of "company" for linking deals to companies';
    }
    
    if (errorMessage.includes('cannot find status')) {
      return 'Invalid deal stage. Check available stages with discover-attributes tool or use the default stage';
    }
    
    if (errorMessage.includes('invalid value was passed to attribute with slug "value"')) {
      return 'Deal value should be a simple number (e.g., 9780). Attio automatically handles currency formatting.';
    }
    
    if (errorMessage.includes('deal_stage')) {
      return 'Use "stage" instead of "deal_stage" for deal status';
    }
    
    if (errorMessage.includes('deal_value')) {
      return 'Use "value" instead of "deal_value" for deal amount';
    }
    
    if (errorMessage.includes('deal_name')) {
      return 'Use "name" instead of "deal_name" for deal title';
    }
    
    if (errorMessage.includes('description')) {
      return 'Deals do not have a "description" field. Available fields: name, stage, value, owner, associated_company, associated_people';
    }
    
    if (errorMessage.includes('expected_close_date') || errorMessage.includes('close_date')) {
      return 'Deals do not have a built-in close date field. Consider using a custom field or tracking this separately';
    }
    
    if (errorMessage.includes('probability') || errorMessage.includes('likelihood')) {
      return 'Deals do not have a built-in probability field. Consider using custom fields or tracking probability in stage names';
    }
    
    if (errorMessage.includes('source') || errorMessage.includes('lead_source')) {
      return 'Deals do not have a built-in source field. Consider using custom fields to track deal sources';
    }
    
    if (errorMessage.includes('currency') && !errorMessage.includes('currency_code')) {
      return 'Currency is set automatically based on workspace settings. Just provide a numeric value for the deal amount';
    }
    
    if (errorMessage.includes('contact') || errorMessage.includes('primary_contact')) {
      return 'Use "associated_people" to link contacts/people to deals';
    }
    
    if (errorMessage.includes('notes') || errorMessage.includes('comments')) {
      return 'Deal notes should be created separately using the notes API after the deal is created';
    }
    
    if (errorMessage.includes('tags') || errorMessage.includes('labels')) {
      return 'Deals do not have a built-in tags field. Consider using custom fields or categories';
    }
    
    if (errorMessage.includes('type') || errorMessage.includes('deal_type')) {
      return 'Deal types are not built-in. Use stages or custom fields to categorize deals';
    }
    
    // Generic unknown field error
    if (errorMessage.includes('cannot find attribute')) {
      return 'Unknown deal field. Core fields: name, stage, value, owner, associated_company, associated_people. Use discover-attributes tool to see all available fields including custom ones';
    }
  }
  
  // General suggestions
  if (errorMessage.includes('not found')) {
    return `Verify that the ${resourceType} record exists and you have access to it`;
  }
  
  if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
    return 'Check your API permissions and authentication credentials';
  }
  
  if (errorMessage.includes('rate limit')) {
    return 'Wait a moment before retrying - you may be making requests too quickly';
  }
  
  if (operation === 'create' && errorMessage.includes('duplicate')) {
    return `A ${resourceType} record with these details may already exist. Try searching first`;
  }
  
  if (errorMessage.includes('cannot find attribute')) {
    const match = errorMessage.match(/cannot find attribute with slug\/id["\s]*([^"]*)/);
    if (match && match[1]) {
      // Provide resource-specific field suggestions
      if (resourceType === 'deals') {
        return `Unknown field "${match[1]}". Available deal fields: name, stage, value, owner, associated_company, associated_people. Use discover-attributes for full list`;
      }
      return `Unknown field "${match[1]}". Use discover-attributes tool to see available fields for ${resourceType}`;
    }
  }
  
  return undefined;
}