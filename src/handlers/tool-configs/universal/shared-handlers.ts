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

import { AttioRecord } from '../../../types/attio.js';

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
      // Convert AttioTask[] to AttioRecord[] by adding values property and mapping ID
      return tasks.map((task: any) => ({
        ...task,
        id: { record_id: task.id.task_id, ...task.id },
        values: task.values || {}
      }));
      
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
      // Convert AttioTask to AttioRecord by adding values property and mapping ID
      return {
        ...task,
        id: { record_id: task.id.task_id, ...task.id },
        values: task.values || {}
      } as unknown as AttioRecord;
      
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
      // Convert AttioTask to AttioRecord by adding values property and mapping ID
      return {
        ...createdTask,
        id: { record_id: createdTask.id.task_id, ...createdTask.id },
        values: createdTask.values || {}
      } as unknown as AttioRecord;
      
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
      // People module doesn't have direct update, so use companies pattern
      throw new Error('People update not yet implemented in universal handler');
      
    case UniversalResourceType.RECORDS:
      return updateObjectRecord('records', record_id, record_data);
      
    case UniversalResourceType.TASKS:
      const updatedTask = await updateTask(record_id, record_data);
      // Convert AttioTask to AttioRecord by adding values property and mapping ID
      return {
        ...updatedTask,
        id: { record_id: updatedTask.id.task_id, ...updatedTask.id },
        values: updatedTask.values || {}
      } as unknown as AttioRecord;
      
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
      // People module doesn't have direct delete, implement if needed
      throw new Error('People delete not yet implemented in universal handler');
      
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
      // People attributes would be implemented here
      throw new Error('People attributes not yet implemented in universal handler');
      
    case UniversalResourceType.RECORDS:
      // Records attributes would be implemented here
      throw new Error('Records attributes not yet implemented in universal handler');
      
    case UniversalResourceType.TASKS:
      // Tasks attributes would be implemented here  
      throw new Error('Tasks attributes not yet implemented in universal handler');
      
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
      // People attribute discovery would be implemented here
      throw new Error('People attribute discovery not yet implemented in universal handler');
      
    case UniversalResourceType.RECORDS:
      // Records attribute discovery would be implemented here
      throw new Error('Records attribute discovery not yet implemented in universal handler');
      
    case UniversalResourceType.TASKS:
      // Tasks attribute discovery would be implemented here
      throw new Error('Tasks attribute discovery not yet implemented in universal handler');
      
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
 * Error handling utility for universal operations
 */
export function createUniversalError(operation: string, resourceType: string, originalError: any): Error {
  const message = `Universal ${operation} failed for resource type ${resourceType}: ${originalError.message}`;
  const error = new Error(message);
  error.cause = originalError;
  return error;
}