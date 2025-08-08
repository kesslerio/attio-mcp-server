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

// Import email validation utilities for consistent validation
import { isValidEmail } from '../../../utils/validation/email-validation.js';

// Import enhanced validation utilities for Issue #413
import { 
  validateRecordFields, 
  createEnhancedErrorResponse
} from '../../../utils/enhanced-validation.js';

// Import deal defaults configuration
import { applyDealDefaultsWithValidation, getDealDefaults, validateDealInput } from '../../../config/deal-defaults.js';


// Import people normalization utilities
import { PeopleDataNormalizer } from '../../../utils/normalization/people-normalization.js';

// Import performance tracking and ID validation
import { enhancedPerformanceTracker } from '../../../middleware/performance-enhanced.js';
import { validateRecordId, generateIdCacheKey } from '../../../utils/validation/id-validation.js';
import { performance } from 'perf_hooks';

// Import existing handlers by resource type
import {
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
  getTask,
  listTasks
} from '../../../objects/tasks.js';

import { AttioRecord, AttioTask } from '../../../types/attio.js';
import { getAttioClient } from '../../../api/attio-client.js';
import { UniversalValidationError, ErrorType } from './schemas.js';
import {
  mapRecordFields,
  validateResourceType,
  getFieldSuggestions,
  validateFields,
  enhanceUniquenessError,
  getValidResourceTypes,
  FIELD_MAPPINGS
} from './field-mapper.js';

/**
 * Query deal records using the proper Attio API endpoint
 */
async function queryDealRecords({ limit = 10, offset = 0 }): Promise<AttioRecord[]> {
  const client = getAttioClient();
  
  try {
    // Defensive: Ensure parameters are valid before sending to API
    const safeLimit = Math.max(1, Math.min(limit || 10, 100));
    const safeOffset = Math.max(0, offset || 0);
    
    // Use POST to /objects/deals/records/query (the correct Attio endpoint)
    const response = await client.post('/objects/deals/records/query', {
      limit: safeLimit,
      offset: safeOffset,
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
    // For other errors, return empty array rather than propagating the error
    console.warn('Deal query failed with unexpected error, returning empty results');
    return [];
  }
}

/**
 * Converts an AttioTask to an AttioRecord for universal tool compatibility.
 * 
 * This function provides proper type conversion from the task-specific format
 * to the generic record format used by universal tools, ensuring data integrity
 * without unsafe type casting.
 * 
 * @param task - The AttioTask object to convert
 * @returns An AttioRecord representation of the task with properly mapped fields
 * 
 * @example
 * const task = await getTask('task-123');
 * const record = convertTaskToRecord(task);
 * // record.values now contains: content, status, assignee, due_date, linked_records
 */
function convertTaskToRecord(task: AttioTask): AttioRecord {
  return {
    id: {
      record_id: task.id.task_id,
      object_id: 'tasks',
      workspace_id: task.id.workspace_id || ''
    },
    values: {
      // Map task properties to values object
      content: task.content,
      status: task.status,
      assignee: task.assignee,
      due_date: task.due_date,
      linked_records: task.linked_records
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
 * Universal search handler with performance tracking
 */
export async function handleUniversalSearch(params: UniversalSearchParams): Promise<AttioRecord[]> {
  const { resource_type, query, filters, limit, offset } = params;
  
  // Start performance tracking
  const perfId = enhancedPerformanceTracker.startOperation(
    'search-records',
    'search',
    { 
      resourceType: resource_type, 
      hasQuery: !!query,
      hasFilters: !!(filters && Object.keys(filters).length > 0),
      limit,
      offset 
    }
  );
  
  try {
    // Track validation timing
    const validationStart = performance.now();
    
    // Validate limit parameter to prevent abuse
    if (limit !== undefined) {
      if (!Number.isInteger(limit) || limit <= 0) {
        enhancedPerformanceTracker.endOperation(perfId, false, 'Invalid limit parameter', 400);
        throw new Error('limit must be a positive integer greater than 0');
      }
      
      if (limit > 100) {
        enhancedPerformanceTracker.endOperation(perfId, false, 'Limit exceeds maximum', 400);
        throw new Error('limit must not exceed 100');
      }
    }
    
    // Validate offset parameter
    if (offset !== undefined) {
      if (!Number.isInteger(offset) || offset < 0) {
        enhancedPerformanceTracker.endOperation(perfId, false, 'Invalid offset parameter', 400);
        throw new Error('offset must be a non-negative integer');
      }
      
      // Add reasonable maximum for offset to prevent performance issues
      if (offset > 10000) {
        enhancedPerformanceTracker.endOperation(perfId, false, 'Offset exceeds maximum', 400);
        throw new Error('offset must not exceed 10000');
      }
    }
    
    enhancedPerformanceTracker.markTiming(perfId, 'validation', performance.now() - validationStart);
    
    // Track API call timing
    const apiStart = enhancedPerformanceTracker.markApiStart(perfId);
    let results: AttioRecord[];
    
    try {
      switch (resource_type) {
        case UniversalResourceType.COMPANIES:
          if (filters && Object.keys(filters).length > 0) {
            results = await advancedSearchCompanies(filters, limit, offset);
          } else if (query && query.trim().length > 0) {
            // Convert simple query search to advanced search with pagination
            const nameFilters = {
              filters: [{ 
                attribute: { slug: 'name' }, 
                condition: 'contains', 
                value: query 
              }]
            };
            results = await advancedSearchCompanies(nameFilters, limit, offset);
          } else {
            // No query and no filters - use advanced search with empty filters for pagination
            // Defensive: Some APIs may not support empty filters, handle gracefully
            try {
              results = await advancedSearchCompanies({ filters: [] }, limit, offset);
            } catch (error: any) {
              // If empty filters aren't supported, return empty array rather than failing
              console.warn('Companies search with empty filters failed, returning empty results:', error?.message);
              results = [];
            }
          }
          break;
          
        case UniversalResourceType.PEOPLE:
          if (filters && Object.keys(filters).length > 0) {
            const paginatedResult = await advancedSearchPeople(filters, { limit, offset });
            results = paginatedResult.results;
          } else if (query && query.trim().length > 0) {
            // Convert simple query search to advanced search with pagination
            const nameEmailFilters = {
              filters: [
                {
                  attribute: { slug: 'name' },
                  condition: 'contains',
                  value: query
                },
                {
                  attribute: { slug: 'email_addresses' },
                  condition: 'contains', 
                  value: query
                }
              ],
              matchAny: true // Use OR logic to match either name or email
            };
            const paginatedResult = await advancedSearchPeople(nameEmailFilters, { limit, offset });
            results = paginatedResult.results;
          } else {
            // No query and no filters - use advanced search with empty filters for pagination
            // Defensive: Some APIs may not support empty filters, handle gracefully
            try {
              const paginatedResult = await advancedSearchPeople({ filters: [] }, { limit, offset });
              results = paginatedResult.results;
            } catch (error: any) {
              // If empty filters aren't supported, return empty array rather than failing
              console.warn('People search with empty filters failed, returning empty results:', error?.message);
              results = [];
            }
          }
          break;
          
        case UniversalResourceType.RECORDS:
          results = await listObjectRecords('records', { 
            pageSize: limit, 
            page: Math.floor((offset || 0) / (limit || 10)) + 1 
          });
          break;
          
        case UniversalResourceType.DEALS:
          // Use POST query endpoint for deals since GET /objects/deals/records doesn't exist
          results = await queryDealRecords({ limit, offset });
          break;
          
        case UniversalResourceType.TASKS: {
          /**
           * PERFORMANCE LIMITATION: Tasks API Pagination
           * 
           * The Attio Tasks API currently does not support native pagination parameters
           * (limit/offset). This implementation loads ALL tasks from the API and then
           * applies pagination in-memory using JavaScript array slicing.
           * 
           * Performance Impact:
           * - Memory: Entire task list is loaded into memory
           * - Network: Full dataset transferred on every request
           * - Latency: Response time increases with total number of tasks
           * 
           * This is a known limitation of the current Attio API and should be marked
           * as a potential future API enhancement request to Attio. When/if native
           * pagination becomes available, this code should be refactored to use it.
           * 
           * For now, this approach ensures consistent pagination behavior across all
           * resource types in the universal search handler.
           */
          const tasks = await listTasks();
          // Apply pagination manually since Tasks API doesn't support native pagination
          const start = offset || 0;
          const end = start + (limit || 10);
          const paginatedTasks = tasks.slice(start, end);
          // Convert AttioTask[] to AttioRecord[] using proper type conversion
          results = paginatedTasks.map(convertTaskToRecord);
          break;
        }
          
        default:
          throw new Error(`Unsupported resource type for search: ${resource_type}`);
      }
      
      enhancedPerformanceTracker.markApiEnd(perfId, apiStart);
      enhancedPerformanceTracker.endOperation(
        perfId, 
        true, 
        undefined, 
        200, 
        { recordCount: results.length }
      );
      
      return results;
      
    } catch (apiError: any) {
      enhancedPerformanceTracker.markApiEnd(perfId, apiStart);
      
      const statusCode = apiError?.response?.status || apiError?.statusCode || 500;
      enhancedPerformanceTracker.endOperation(
        perfId,
        false,
        apiError.message || 'Search failed',
        statusCode
      );
      throw apiError;
    }
    
  } catch (error) {
    // Error already handled and tracked
    throw error;
  }
}

/**
 * Filter attributes by category
 */
function filterAttributesByCategory(attributes: any, requestedCategories?: string[]): any {
  if (!requestedCategories || requestedCategories.length === 0) {
    return attributes; // Return all attributes if no categories specified
  }
  
  // Handle array of attributes
  if (Array.isArray(attributes)) {
    return attributes.filter((attr: any) => {
      // Check various possible category field names
      const category = attr.category || attr.type || attr.attribute_type || attr.group;
      return category && requestedCategories.includes(category);
    });
  }
  
  // Handle attributes response with data array
  if (attributes && typeof attributes === 'object' && attributes.data && Array.isArray(attributes.data)) {
    const filteredData = attributes.data.filter((attr: any) => {
      const category = attr.category || attr.type || attr.attribute_type || attr.group;
      return category && requestedCategories.includes(category);
    });
    
    return {
      ...attributes,
      data: filteredData,
      count: filteredData.length
    };
  }
  
  // Handle attributes response with attributes array
  if (attributes && typeof attributes === 'object' && attributes.attributes && Array.isArray(attributes.attributes)) {
    const filteredAttributes = attributes.attributes.filter((attr: any) => {
      const category = attr.category || attr.type || attr.attribute_type || attr.group;
      return category && requestedCategories.includes(category);
    });
    
    return {
      ...attributes,
      attributes: filteredAttributes,
      count: filteredAttributes.length
    };
  }
  
  return attributes;
}

/**
 * Filter response fields to only include requested fields
 */
function filterResponseFields(data: any, requestedFields?: string[]): any {
  if (!requestedFields || requestedFields.length === 0) {
    return data; // Return full data if no fields specified
  }
  
  // Handle AttioRecord structure with id, values, created_at, updated_at
  if (data && typeof data === 'object' && data.id && data.values) {
    // Always preserve core AttioRecord structure
    const filtered: any = {
      id: data.id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      values: {}
    };
    
    // Filter values object to only requested fields
    for (const field of requestedFields) {
      if (field in data.values) {
        filtered.values[field] = data.values[field];
      }
    }
    
    return filtered;
  }
  
  // Handle simple object structure
  if (data && typeof data === 'object') {
    const filtered: any = {};
    for (const field of requestedFields) {
      if (field in data) {
        filtered[field] = data[field];
      }
    }
    return filtered;
  }
  
  return data;
}

/**
 * Universal get record details handler with performance optimization
 */
export async function handleUniversalGetDetails(params: UniversalRecordDetailsParams): Promise<AttioRecord> {
  const { resource_type, record_id, fields } = params;
  
  // Start performance tracking
  const perfId = enhancedPerformanceTracker.startOperation(
    'get-record-details',
    'get',
    { resourceType: resource_type, recordId: record_id }
  );
  
  try {
    // Early ID validation to prevent unnecessary API calls
    const validationStart = performance.now();
    const idValidation = validateRecordId(record_id, resource_type);
    enhancedPerformanceTracker.markTiming(perfId, 'validation', performance.now() - validationStart);
    
    if (!idValidation.isValid) {
      // Check cache for known 404s
      const cacheKey = generateIdCacheKey(resource_type, record_id);
      const cached404 = enhancedPerformanceTracker.getCached404(cacheKey);
      
      if (cached404) {
        enhancedPerformanceTracker.endOperation(perfId, false, 'Cached 404 response', 404, { cached: true });
        throw new Error('The requested record could not be found.');
      }
      
      // Cache this invalid ID for future requests
      enhancedPerformanceTracker.cache404Response(cacheKey, { error: idValidation.message }, 60000);
      enhancedPerformanceTracker.endOperation(perfId, false, idValidation.message, 400);
      throw new Error('Invalid record identifier format. Please check the ID and try again.');
    }
    
    // Check 404 cache for valid IDs too
    const cacheKey = generateIdCacheKey(resource_type, record_id);
    const cached404 = enhancedPerformanceTracker.getCached404(cacheKey);
    
    if (cached404) {
      enhancedPerformanceTracker.endOperation(perfId, false, 'Cached 404 response', 404, { cached: true });
      throw new Error('The requested record could not be found.');
    }
    
    // Track API call timing
    const apiStart = enhancedPerformanceTracker.markApiStart(perfId);
    let result: AttioRecord;
    
    try {
      switch (resource_type) {
        case UniversalResourceType.COMPANIES:
          result = await getCompanyDetails(record_id);
          break;
          
        case UniversalResourceType.PEOPLE:
          result = await getPersonDetails(record_id);
          break;
          
        case UniversalResourceType.RECORDS:
          result = await getObjectRecord('records', record_id);
          break;
          
        case UniversalResourceType.DEALS:
          result = await getObjectRecord('deals', record_id);
          break;
          
        case UniversalResourceType.TASKS: {
          // Use the getTask function directly with the task ID
          try {
            const task = await getTask(record_id);
            // Convert AttioTask to AttioRecord using proper type conversion
            result = convertTaskToRecord(task);
          } catch (error: any) {
            // Cache 404 for tasks
            enhancedPerformanceTracker.cache404Response(cacheKey, { error: 'Task not found' }, 60000);
            throw new Error('The requested task could not be found.');
          }
          break;
        }
          
        default:
          throw new Error(`Unsupported resource type for get details: ${resource_type}`);
      }
      
      enhancedPerformanceTracker.markApiEnd(perfId, apiStart);
      enhancedPerformanceTracker.endOperation(perfId, true, undefined, 200);
      
      // Apply field filtering if fields parameter was provided
      const filteredResult = filterResponseFields(result, fields);
      return filteredResult;
      
    } catch (apiError: any) {
      enhancedPerformanceTracker.markApiEnd(perfId, apiStart);
      
      // Check if this is a 404 error
      const statusCode = apiError?.response?.status || apiError?.statusCode || 500;
      if (statusCode === 404 || apiError.message?.includes('not found')) {
        // Cache 404 responses for 60 seconds
        enhancedPerformanceTracker.cache404Response(cacheKey, { error: 'Not found' }, 60000);
      }
      
      enhancedPerformanceTracker.endOperation(
        perfId,
        false,
        apiError.message || 'Unknown error',
        statusCode
      );
      throw apiError;
    }
    
  } catch (error) {
    // Error already handled and tracked
    throw error;
  }
}

/**
 * Universal create record handler with enhanced field validation
 */
export async function handleUniversalCreate(params: UniversalCreateParams): Promise<AttioRecord> {
  const { resource_type, record_data } = params;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[handleUniversalCreate] Input params:', { resource_type, record_data });
  }
  
  // Enhanced validation for Issue #413 - provide actionable error messages
  const validation = await validateRecordFields(resource_type, record_data.values || record_data, false);
  if (!validation.isValid) {
    const errorResponse = createEnhancedErrorResponse(validation, 'create-record');
    throw new UniversalValidationError(
      validation.error || 'Validation failed',
      ErrorType.USER_ERROR,
      errorResponse
    );
  }
  
  // Pre-validate fields and provide helpful suggestions
  const fieldValidation = validateFields(resource_type, record_data);
  if (fieldValidation.warnings.length > 0) {
    console.log('Field validation warnings:', fieldValidation.warnings.join('\n'));
  }
  if (fieldValidation.suggestions.length > 0) {
    console.log('Field suggestions:', fieldValidation.suggestions.join('\n'));
  }
  if (!fieldValidation.valid) {
    // Build a clear, helpful error message
    let errorMessage = `Field validation failed for ${resource_type}:\n`;
    
    // Add each error on its own line for clarity
    if (fieldValidation.errors.length > 0) {
      errorMessage += fieldValidation.errors.map(err => `  ❌ ${err}`).join('\n');
    }
    
    // Add suggestions if available
    if (fieldValidation.suggestions.length > 0) {
      errorMessage += '\n\n💡 Suggestions:\n';
      errorMessage += fieldValidation.suggestions.map(sug => `  • ${sug}`).join('\n');
    }
    
    // List available fields for this resource type
    const mapping = FIELD_MAPPINGS[resource_type];
    if (mapping && mapping.validFields.length > 0) {
      errorMessage += `\n\n📋 Available fields for ${resource_type}:\n  ${mapping.validFields.join(', ')}`;
    }
    
    throw new UniversalValidationError(
      errorMessage,
      ErrorType.USER_ERROR,
      {
        suggestion: fieldValidation.suggestions.join('. '),
        field: 'record_data'
      }
    );
  }
  
  // Map field names to correct ones
  const { mapped: mappedData, warnings } = mapRecordFields(resource_type, record_data);
  if (warnings.length > 0) {
    console.log('Field mapping applied:', warnings.join('\n'));
  }
  
  switch (resource_type) {
    case UniversalResourceType.COMPANIES: {
      try {
        // Apply format conversions for common mistakes
        const correctedData = convertAttributeFormats('companies', mappedData);
        
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
            const suggestion = getFieldSuggestions(resource_type, match[1]);
            const enhancedError = getFormatErrorHelp('companies', match[1], error.message);
            throw new UniversalValidationError(
              enhancedError,
              ErrorType.USER_ERROR,
              { suggestion, field: match[1] }
            );
          }
        }
        // Check for uniqueness constraint violations
        if (error?.message?.includes('uniqueness constraint')) {
          const enhancedMessage = await enhanceUniquenessError(resource_type, error.message, mappedData);
          throw new UniversalValidationError(
            enhancedMessage,
            ErrorType.USER_ERROR,
            { suggestion: 'Try searching for existing records first or use different unique values' }
          );
        }
        throw error;
      }
    }
      
    case UniversalResourceType.PEOPLE: {
      try {
        // Validate email addresses first for consistent validation with updates
        validateEmailAddresses(mappedData, resource_type);
        
        // Normalize people data first (handle name string/object, email singular/array)
        const normalizedData = PeopleDataNormalizer.normalizePeopleData(mappedData);
        
        // Apply format conversions for common mistakes
        const correctedData = convertAttributeFormats('people', normalizedData);
        return await createPerson(correctedData);
      } catch (error: any) {
        // Enhance error messages with format help
        if (error?.message?.includes('invalid value') || error?.message?.includes('Format Error')) {
          const match = error.message.match(/slug "([^"]+)"/);
          if (match && match[1]) {
            const suggestion = getFieldSuggestions(resource_type, match[1]);
            const enhancedError = getFormatErrorHelp('people', match[1], error.message);
            throw new UniversalValidationError(
              enhancedError,
              ErrorType.USER_ERROR,
              { suggestion, field: match[1] }
            );
          }
        }
        // Check for uniqueness constraint violations
        if (error?.message?.includes('uniqueness constraint')) {
          const enhancedMessage = await enhanceUniquenessError(resource_type, error.message, mappedData);
          throw new UniversalValidationError(
            enhancedMessage,
            ErrorType.USER_ERROR,
            { suggestion: 'Try searching for existing records first or use different unique values' }
          );
        }
        throw error;
      }
    }
      
    case UniversalResourceType.RECORDS:
      try {
        return await createObjectRecord('records', mappedData);
      } catch (error: any) {
        // Check for uniqueness constraint violations
        if (error?.message?.includes('uniqueness constraint')) {
          const enhancedMessage = await enhanceUniquenessError(resource_type, error.message, mappedData);
          throw new UniversalValidationError(
            enhancedMessage,
            ErrorType.USER_ERROR,
            { suggestion: 'Try searching for existing records first or use different unique values' }
          );
        }
        throw error;
      }
      
    case UniversalResourceType.DEALS: {
      // Handle deal-specific requirements with configured defaults and validation
      let dealData = { ...mappedData };
      
      // Validate input and log suggestions (but don't block execution)
      const validation = validateDealInput(dealData);
      if (process.env.NODE_ENV === 'development') {
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
      }
      
      // Apply configured defaults with proactive stage validation
      // Note: This may make an API call for stage validation
      dealData = await applyDealDefaultsWithValidation(dealData, false);
      
      try {
        return await createObjectRecord('deals', dealData);
      } catch (error: any) {
        // If stage still fails after validation, try with default stage
        // IMPORTANT: Skip validation in error path to prevent API calls during failures
        if (error?.message?.includes('Cannot find Status') && dealData.stage) {
          const defaults = getDealDefaults();
          if (process.env.NODE_ENV === 'development') {
            const invalidStage = dealData.stage[0]?.status;
            console.error(`Deal stage "${invalidStage}" still failed after validation, using fallback to default stage "${defaults.stage}"...`);
          }
          
          // Use default stage if available, otherwise remove stage (will fail since it's required)
          if (defaults.stage) {
            // Apply defaults WITHOUT validation to avoid API calls in error path
            dealData = await applyDealDefaultsWithValidation(
              { ...record_data, stage: defaults.stage },
              true // Skip validation in error path
            );
          } else {
            delete dealData.stage;
          }
          
          return await createObjectRecord('deals', dealData);
        }
        throw error;
      }
    }
      
    case UniversalResourceType.TASKS: {
      // Extract content from mapped data for task creation
      const content = mappedData.content || mappedData.title || mappedData.name || 'New task';
      const options = {
        assigneeId: mappedData.assignee_id || mappedData.assigneeId,
        dueDate: mappedData.due_date || mappedData.dueDate,
        recordId: mappedData.record_id || mappedData.recordId
      };
      const createdTask = await createTask(content, options);
      // Convert AttioTask to AttioRecord using proper type conversion
      return convertTaskToRecord(createdTask);
    }
      
    default:
      // Check if resource type can be corrected
      const resourceValidation = validateResourceType(resource_type);
      if (resourceValidation.corrected) {
        // Retry with corrected resource type
        console.log(`Resource type corrected from "${resource_type}" to "${resourceValidation.corrected}"`);
        return handleUniversalCreate({ ...params, resource_type: resourceValidation.corrected });
      }
      throw new UniversalValidationError(
        `Unsupported resource type: ${resource_type}`,
        ErrorType.USER_ERROR,
        { 
          suggestion: resourceValidation.suggestion || `Valid resource types are: ${getValidResourceTypes()}`
        }
      );
  }
}

/**
 * Universal update record handler with enhanced field validation
 */
export async function handleUniversalUpdate(params: UniversalUpdateParams): Promise<AttioRecord> {
  const { resource_type, record_id, record_data } = params;
  
  // Enhanced validation for Issue #413 - provide actionable error messages
  const validation = await validateRecordFields(resource_type, record_data.values || record_data, true);
  if (!validation.isValid) {
    const errorResponse = createEnhancedErrorResponse(validation, 'update-record');
    throw new UniversalValidationError(
      validation.error || 'Validation failed',
      ErrorType.USER_ERROR,
      errorResponse
    );
  }
  
  // Pre-validate fields and provide helpful suggestions (less strict for updates)
  const fieldValidation = validateFields(resource_type, record_data);
  if (fieldValidation.warnings.length > 0) {
    console.log('Field validation warnings:', fieldValidation.warnings.join('\n'));
  }
  if (fieldValidation.suggestions.length > 0) {
    console.log('Field suggestions:', fieldValidation.suggestions.join('\n'));
  }
  
  // Map field names to correct ones
  const { mapped: mappedData, warnings } = mapRecordFields(resource_type, record_data);
  if (warnings.length > 0) {
    console.log('Field mapping applied:', warnings.join('\n'));
  }
  
  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      try {
        return await updateCompany(record_id, mappedData);
      } catch (error: any) {
        if (error?.message?.includes('Cannot find attribute')) {
          const match = error.message.match(/slug\/ID "([^"]+)"/);
          if (match && match[1]) {
            const suggestion = getFieldSuggestions(resource_type, match[1]);
            throw new UniversalValidationError(
              error.message,
              ErrorType.USER_ERROR,
              { suggestion, field: match[1] }
            );
          }
        }
        throw error;
      }
      
    case UniversalResourceType.PEOPLE:
      try {
        // Validate email addresses for consistency with create operations
        validateEmailAddresses(mappedData, resource_type);
        
        return await updatePerson(record_id, mappedData);
      } catch (error: any) {
        if (error?.message?.includes('Cannot find attribute')) {
          const match = error.message.match(/slug\/ID "([^"]+)"/);
          if (match && match[1]) {
            const suggestion = getFieldSuggestions(resource_type, match[1]);
            throw new UniversalValidationError(
              error.message,
              ErrorType.USER_ERROR,
              { suggestion, field: match[1] }
            );
          }
        }
        throw error;
      }
      
    case UniversalResourceType.RECORDS:
      return updateObjectRecord('records', record_id, mappedData);
      
    case UniversalResourceType.DEALS: {
      // Note: Updates are less likely to fail, but we still validate stages proactively
      const updatedDealData = await applyDealDefaultsWithValidation(mappedData, false);
      return updateObjectRecord('deals', record_id, updatedDealData);
    }
      
    case UniversalResourceType.TASKS: {
      const updatedTask = await updateTask(record_id, mappedData);
      // Convert AttioTask to AttioRecord using proper type conversion
      return convertTaskToRecord(updatedTask);    
    }
      
    default:
      // Check if resource type can be corrected
      const resourceValidation = validateResourceType(resource_type);
      if (resourceValidation.corrected) {
        // Retry with corrected resource type
        console.log(`Resource type corrected from "${resource_type}" to "${resourceValidation.corrected}"`);
        return handleUniversalUpdate({ ...params, resource_type: resourceValidation.corrected });
      }
      throw new UniversalValidationError(
        `Unsupported resource type: ${resource_type}`,
        ErrorType.USER_ERROR,
        { 
          suggestion: resourceValidation.suggestion || `Valid resource types are: ${getValidResourceTypes()}`
        }
      );
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
  const { resource_type, record_id, categories } = params;
  
  let result: any;
  
  switch (resource_type) {
    case UniversalResourceType.COMPANIES:
      if (record_id) {
        result = await getCompanyAttributes(record_id);
      } else {
        // Return schema-level attributes if no record_id provided
        result = await discoverCompanyAttributes();
      }
      break;
      
    case UniversalResourceType.PEOPLE:
      if (record_id) {
        result = await getAttributesForRecord(resource_type, record_id);
      } else {
        // Return schema-level attributes if no record_id provided
        result = await discoverAttributesForResourceType(resource_type);
      }
      break;
      
    case UniversalResourceType.RECORDS:
      if (record_id) {
        result = await getAttributesForRecord(resource_type, record_id);
      } else {
        result = await discoverAttributesForResourceType(resource_type);
      }
      break;
      
    case UniversalResourceType.DEALS:
      if (record_id) {
        result = await getAttributesForRecord(resource_type, record_id);
      } else {
        result = await discoverAttributesForResourceType(resource_type);
      }
      break;
      
    case UniversalResourceType.TASKS:
      if (record_id) {
        result = await getAttributesForRecord(resource_type, record_id);
      } else {
        result = await discoverAttributesForResourceType(resource_type);
      }
      break;
      
    default:
      throw new Error(`Unsupported resource type for get attributes: ${resource_type}`);
  }
  
  // Apply category filtering if categories parameter was provided
  return filterAttributesByCategory(result, categories);
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
 * Validate email addresses in record data for consistent validation across create/update
 */
function validateEmailAddresses(recordData: any, resourceType: string): void {
  if (!recordData || typeof recordData !== 'object') return;
  
  // Handle various email field formats
  const emailFields = ['email_addresses', 'email', 'emails', 'emailAddress'];
  
  for (const field of emailFields) {
    if (field in recordData && recordData[field]) {
      const emails = Array.isArray(recordData[field]) 
        ? recordData[field] 
        : [recordData[field]];
      
      for (const emailItem of emails) {
        let emailAddress: string;
        
        // Handle different email formats
        if (typeof emailItem === 'string') {
          emailAddress = emailItem;
        } else if (typeof emailItem === 'object' && emailItem.email_address) {
          emailAddress = emailItem.email_address;
        } else if (typeof emailItem === 'object' && emailItem.email) {
          emailAddress = emailItem.email;
        } else {
          continue; // Skip invalid email formats
        }
        
        // Validate email format using the same function as PersonValidator
        if (!isValidEmail(emailAddress)) {
          throw new UniversalValidationError(
            `Invalid email format: "${emailAddress}". Please provide a valid email address (e.g., user@example.com)`,
            ErrorType.USER_ERROR,
            {
              field: field,
              suggestion: 'Ensure email addresses are in the format: user@domain.com'
            }
          );
        }
      }
    }
  }
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
  
  // First check if this is an invalid resource type
  const resourceValidation = validateResourceType(resourceType);
  if (!resourceValidation.valid && resourceValidation.suggestion) {
    return resourceValidation.suggestion;
  }
  
  // Date-related error suggestions
  if (errorMessage.includes('unable to parse date') || errorMessage.includes('invalid date')) {
    return 'Try using relative dates like "last 7 days", "this month", "yesterday" or ISO format (YYYY-MM-DD)';
  }
  
  if (errorMessage.includes('date range') || errorMessage.includes('daterange')) {
    return 'Date ranges support formats like: "last 30 days", "this week", "last month", or ISO dates (2024-01-01)';
  }
  
  // API limitation suggestions
  if (errorMessage.includes('filter') && errorMessage.includes('not supported')) {
    return 'This filter combination is not supported by the Attio API. Try using a simpler filter or fetching all records and filtering locally.';
  }
  
  if (errorMessage.includes('batch') && errorMessage.includes('limit')) {
    return 'Batch operations are limited to 100 items at a time. Please split your request into smaller batches.';
  }
  
  if (errorMessage.includes('rate limit')) {
    return 'API rate limit reached. Please wait a moment before retrying or reduce the frequency of requests.';
  }
  
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
  
  // Handle "Cannot find attribute" errors with field suggestions
  if (errorMessage.includes('cannot find attribute')) {
    const match = error?.message?.match(/cannot find attribute with slug\/id["\s]*([^"]*)/i);
    if (match && match[1]) {
      const fieldName = match[1].replace(/["]/g, '').trim();
      // Try to get field suggestions for the resource type
      if (Object.values(UniversalResourceType).includes(resourceType as UniversalResourceType)) {
        return getFieldSuggestions(resourceType as UniversalResourceType, fieldName);
      }
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
  
  if (errorMessage.includes('uniqueness constraint')) {
    return 'A record with these unique values already exists. Try searching for the existing record or use different values.';
  }
  
  // Check for remaining "cannot find attribute" errors not caught above
  if (errorMessage.includes('cannot find attribute')) {
    const attrMatch = errorMessage.match(/cannot find attribute with slug\/id["\s]*([^"]*)/);
    if (attrMatch && attrMatch[1]) {
      // Provide resource-specific field suggestions
      if (resourceType === 'deals') {
        return `Unknown field "${attrMatch[1]}". Available deal fields: name, stage, value, owner, associated_company, associated_people. Use discover-attributes for full list`;
      }
      return `Unknown field "${attrMatch[1]}". Use discover-attributes tool to see available fields for ${resourceType}`;
    }
  }
  
  return undefined;
}