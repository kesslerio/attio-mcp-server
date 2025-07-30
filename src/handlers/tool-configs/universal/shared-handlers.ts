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

// Import existing handlers by resource type
import {
  searchCompanies,
  searchCompaniesByDomain,
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
  createPerson
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
  listTasks
} from '../../../objects/tasks.js';

import { AttioRecord, AttioTask } from '../../../types/attio.js';
import { getAttioClient } from '../../../api/attio-client.js';
import { UniversalValidationError, ErrorType } from './schemas.js';

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
    return response.data.data?.values || {};
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
      return await searchPeople(query || '');
      
    case UniversalResourceType.RECORDS:
      return listObjectRecords('records', { pageSize: limit, page: Math.floor((offset || 0) / (limit || 10)) + 1 });
      
    case UniversalResourceType.TASKS:
      const tasks = await listTasks();
      // Convert AttioTask[] to AttioRecord[] using proper type conversion
      return tasks.map(convertTaskToRecord);
      
    default:
      throw new Error(`Unsupported resource type for search: ${resource_type}`);
  }
}

/**
 * Universal get record details handler
 */
export async function handleUniversalGetDetails(params: UniversalRecordDetailsParams): Promise<AttioRecord> {
  const { resource_type, record_id, fields } = params;
  
  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      return getCompanyDetails(record_id);
      
    case UniversalResourceType.PEOPLE:
      return getPersonDetails(record_id);
      
    case UniversalResourceType.RECORDS:
      return getObjectRecord('records', record_id);
      
    case UniversalResourceType.TASKS:
      // Tasks don't have a direct get details function, so we'll use list with filter
      const tasks = await listTasks();
      const task = tasks.find((t: any) => t.id?.record_id === record_id);
      if (!task) {
        throw new Error(`Task not found with ID: ${record_id}`);
      }
      // Convert AttioTask to AttioRecord using proper type conversion
      return convertTaskToRecord(task);
      
    default:
      throw new Error(`Unsupported resource type for get details: ${resource_type}`);
  }
}

/**
 * Universal create record handler
 */
export async function handleUniversalCreate(params: UniversalCreateParams): Promise<AttioRecord> {
  const { resource_type, record_data, return_details } = params;
  
  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      return createCompany(record_data);
      
    case UniversalResourceType.PEOPLE:
      return createPerson(record_data);
      
    case UniversalResourceType.RECORDS:
      return createObjectRecord('records', record_data);
      
    case UniversalResourceType.TASKS:
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
      
    default:
      throw new Error(`Unsupported resource type for create: ${resource_type}`);
  }
}

/**
 * Universal update record handler
 */
export async function handleUniversalUpdate(params: UniversalUpdateParams): Promise<AttioRecord> {
  const { resource_type, record_id, record_data, return_details } = params;
  
  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      return updateCompany(record_id, record_data);
      
    case UniversalResourceType.PEOPLE:
      return updatePerson(record_id, record_data);
      
    case UniversalResourceType.RECORDS:
      return updateObjectRecord('records', record_id, record_data);
      
    case UniversalResourceType.TASKS:
      const updatedTask = await updateTask(record_id, record_data);
      // Convert AttioTask to AttioRecord using proper type conversion
      return convertTaskToRecord(updatedTask);
      
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
  const { resource_type, record_id, categories, fields } = params;
  
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
  
  if (resource_type !== UniversalResourceType.COMPANIES) {
    throw new Error(`Detailed info only supported for companies currently, got: ${resource_type}`);
  }
  
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
  
  return undefined;
}