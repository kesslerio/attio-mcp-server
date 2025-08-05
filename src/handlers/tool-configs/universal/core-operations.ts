/**
 * Core universal operations tool configurations
 * 
 * These 8 tools consolidate the majority of CRUD and search operations
 * across all resource types (companies, people, records, tasks).
 */

import {
  UniversalToolConfig,
  UniversalSearchParams,
  UniversalRecordDetailsParams,
  UniversalCreateParams,
  UniversalUpdateParams,
  UniversalDeleteParams,
  UniversalAttributesParams,
  UniversalDetailedInfoParams,
  UniversalResourceType,
  DetailedInfoType
} from './types.js';

import {
  searchRecordsSchema,
  getRecordDetailsSchema,
  createRecordSchema,
  updateRecordSchema,
  deleteRecordSchema,
  getAttributesSchema,
  discoverAttributesSchema,
  getDetailedInfoSchema,
  validateUniversalToolParams
} from './schemas.js';

import {
  handleUniversalSearch,
  handleUniversalGetDetails,
  handleUniversalCreate,
  handleUniversalUpdate,
  handleUniversalDelete,
  handleUniversalGetAttributes,
  handleUniversalDiscoverAttributes,
  handleUniversalGetDetailedInfo,
  formatResourceType,
  getSingularResourceType,
  createUniversalError
} from './shared-handlers.js';

import { AttioRecord } from '../../../types/attio.js';

/**
 * Universal search records tool
 * Consolidates: search-companies, search-people, list-records, list-tasks
 */
export const searchRecordsConfig: UniversalToolConfig = {
  name: 'search-records',
  handler: async (params: UniversalSearchParams): Promise<AttioRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams('search-records', params);
      return await handleUniversalSearch(sanitizedParams);
    } catch (error) {
      throw createUniversalError('search', params.resource_type, error);
    }
  },
  formatResult: (results: AttioRecord[], resourceType?: UniversalResourceType) => {
    if (!Array.isArray(results)) {
      return 'No results found';
    }
    
    const resourceTypeName = resourceType ? formatResourceType(resourceType) : 'record';
    // Handle proper pluralization
    let plural = resourceTypeName;
    if (results.length !== 1) {
      if (resourceTypeName === 'company') {
        plural = 'companies';
      } else if (resourceTypeName === 'person') {
        plural = 'people';
      } else {
        plural = `${resourceTypeName}s`;
      }
    }
    
    return `Found ${results.length} ${plural}:\n${results
      .map((record: any, index: number) => {
        const name = record.values?.name?.[0]?.value || 
                    record.values?.name?.[0]?.full_name ||
                    record.values?.full_name?.[0]?.value ||
                    record.values?.title?.[0]?.value || 
                    'Unnamed';
        const id = record.id?.record_id || 'unknown';
        const website = record.values?.website?.[0]?.value;
        const email = record.values?.email?.[0]?.value;
        
        let details = '';
        if (website) details += ` (${website})`;
        else if (email) details += ` (${email})`;
        
        return `${index + 1}. ${name}${details} (ID: ${id})`;
      })
      .join('\n')}`;
  }
};

/**
 * Universal get record details tool
 * Consolidates: get-company-details, get-person-details, get-record, get-task-details
 */
export const getRecordDetailsConfig: UniversalToolConfig = {
  name: 'get-record-details',
  handler: async (params: UniversalRecordDetailsParams): Promise<AttioRecord> => {
    try {
      const sanitizedParams = validateUniversalToolParams('get-record-details', params);
      return await handleUniversalGetDetails(sanitizedParams);
    } catch (error) {
      throw createUniversalError('get details', params.resource_type, error);
    }
  },
  formatResult: (record: AttioRecord, resourceType?: UniversalResourceType) => {
    if (!record) {
      return 'Record not found';
    }
    
    const resourceTypeName = resourceType ? getSingularResourceType(resourceType) : 'record';
    // Better name extraction for people and other records
    const name = (record.values?.name && Array.isArray(record.values.name) && record.values.name[0]?.value) || 
                (record.values?.name && Array.isArray(record.values.name) && record.values.name[0]?.full_name) ||
                (record.values?.full_name && Array.isArray(record.values.full_name) && record.values.full_name[0]?.value) ||
                (record.values?.title && Array.isArray(record.values.title) && record.values.title[0]?.value) || 
                'Unnamed';
    const id = record.id?.record_id || 'unknown';
    
    let details = `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)}: ${name}\nID: ${id}\n\n`;
    
    // Add common fields based on resource type
    if (record.values) {
      // Different field priorities for different resource types
      let fieldOrder = ['email', 'website', 'phone', 'description', 'industry', 'location'];
      
      if (resourceType === UniversalResourceType.PEOPLE) {
        // For people, prioritize different fields
        fieldOrder = ['email_addresses', 'phone_numbers', 'job_title', 'description', 'location'];
        
        // Also show associated company if present
        if (record.values.associated_company && Array.isArray(record.values.associated_company)) {
          const companies = record.values.associated_company
            .map((c: any) => c.target_record_name || c.name || c.value)
            .filter(Boolean);
          if (companies.length > 0) {
            details += `Company: ${companies.join(', ')}\n`;
          }
        }
      }
      
      fieldOrder.forEach(field => {
        const value = record.values?.[field] && Array.isArray(record.values[field]) && record.values[field][0]?.value;
        if (value) {
          const displayField = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
          details += `${displayField}: ${value}\n`;
        }
      });
      
      // Handle special fields for people
      if (resourceType === UniversalResourceType.PEOPLE) {
        // Show email addresses
        if (record.values.email_addresses && Array.isArray(record.values.email_addresses)) {
          const emails = record.values.email_addresses
            .map((e: any) => e.email_address || e.value)
            .filter(Boolean);
          if (emails.length > 0) {
            details += `Email: ${emails.join(', ')}\n`;
          }
        }
        
        // Show phone numbers
        if (record.values.phone_numbers && Array.isArray(record.values.phone_numbers)) {
          const phones = record.values.phone_numbers
            .map((p: any) => p.phone_number || p.value)
            .filter(Boolean);
          if (phones.length > 0) {
            details += `Phone: ${phones.join(', ')}\n`;
          }
        }
      }
      
      // Add created_at if available
      if (record.values.created_at && Array.isArray(record.values.created_at) && record.values.created_at[0]?.value) {
        details += `Created at: ${record.values.created_at[0].value}\n`;
      }
    }
    
    return details.trim();
  }
};

/**
 * Universal create record tool
 * Consolidates: create-company, create-person, create-record, create-task
 */
export const createRecordConfig: UniversalToolConfig = {
  name: 'create-record',
  handler: async (params: UniversalCreateParams): Promise<AttioRecord> => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[createRecordConfig:handler] Input params:', params);
      }
      
      const sanitizedParams = validateUniversalToolParams('create-record', params);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[createRecordConfig:handler] Sanitized params:', sanitizedParams);
      }
      
      // Perform cross-resource validation for create operations
      const { CrossResourceValidator } = await import('./schemas.js');
      await CrossResourceValidator.validateRecordRelationships(
        sanitizedParams.resource_type,
        sanitizedParams.record_data
      );
      
      const result = await handleUniversalCreate(sanitizedParams);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[createRecordConfig:handler] Final result:', {
          result,
          hasId: !!result?.id,
          hasValues: !!result?.values,
          resultType: typeof result,
          isEmptyObject: Object.keys(result || {}).length === 0
        });
      }
      
      return result;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[createRecordConfig:handler] Error:', error);
      }
      throw createUniversalError('create', params.resource_type, error);
    }
  },
  formatResult: (record: AttioRecord, resourceType?: UniversalResourceType) => {
    if (!record) {
      return 'Record creation failed';
    }
    
    const resourceTypeName = resourceType ? getSingularResourceType(resourceType) : 'record';
    const name = (record.values?.name && Array.isArray(record.values.name) && record.values.name[0]?.value) || 
                (record.values?.title && Array.isArray(record.values.title) && record.values.title[0]?.value) || 
                'Unnamed';
    const id = record.id?.record_id || 'unknown';
    
    return `✅ Successfully created ${resourceTypeName}: ${name} (ID: ${id})`;
  }
};

/**
 * Universal update record tool
 * Consolidates: update-company, update-person, update-record, update-task
 */
export const updateRecordConfig: UniversalToolConfig = {
  name: 'update-record',
  handler: async (params: UniversalUpdateParams): Promise<AttioRecord> => {
    try {
      const sanitizedParams = validateUniversalToolParams('update-record', params);
      
      // Perform cross-resource validation for update operations
      const { CrossResourceValidator } = await import('./schemas.js');
      await CrossResourceValidator.validateRecordRelationships(
        sanitizedParams.resource_type,
        sanitizedParams.record_data
      );
      
      return await handleUniversalUpdate(sanitizedParams);
    } catch (error) {
      throw createUniversalError('update', params.resource_type, error);
    }
  },
  formatResult: (record: AttioRecord, resourceType?: UniversalResourceType) => {
    if (!record) {
      return 'Record update failed';
    }
    
    const resourceTypeName = resourceType ? getSingularResourceType(resourceType) : 'record';
    const name = (record.values?.name && Array.isArray(record.values.name) && record.values.name[0]?.value) || 
                (record.values?.title && Array.isArray(record.values.title) && record.values.title[0]?.value) || 
                'Unnamed';
    const id = record.id?.record_id || 'unknown';
    
    return `✅ Successfully updated ${resourceTypeName}: ${name} (ID: ${id})`;
  }
};

/**
 * Universal delete record tool
 * Consolidates: delete-company, delete-person, delete-record, delete-task
 */
export const deleteRecordConfig: UniversalToolConfig = {
  name: 'delete-record',
  handler: async (params: UniversalDeleteParams): Promise<{ success: boolean; record_id: string }> => {
    try {
      const sanitizedParams = validateUniversalToolParams('delete-record', params);
      return await handleUniversalDelete(sanitizedParams);
    } catch (error) {
      throw createUniversalError('delete', params.resource_type, error);
    }
  },
  formatResult: (result: { success: boolean; record_id: string }, resourceType?: UniversalResourceType) => {
    if (!result.success) {
      return `❌ Failed to delete ${resourceType ? getSingularResourceType(resourceType) : 'record'} with ID: ${result.record_id}`;
    }
    
    const resourceTypeName = resourceType ? getSingularResourceType(resourceType) : 'record';
    return `✅ Successfully deleted ${resourceTypeName} with ID: ${result.record_id}`;
  }
};

/**
 * Universal get attributes tool
 * Consolidates: get-company-attributes, get-person-attributes, get-record-attributes
 */
export const getAttributesConfig: UniversalToolConfig = {
  name: 'get-attributes',
  handler: async (params: UniversalAttributesParams): Promise<any> => {
    try {
      const sanitizedParams = validateUniversalToolParams('get-attributes', params);
      return await handleUniversalGetAttributes(sanitizedParams);
    } catch (error) {
      throw createUniversalError('get attributes', params.resource_type, error);
    }
  },
  formatResult: (attributes: any, resourceType?: UniversalResourceType) => {
    if (!attributes) {
      return 'No attributes found';
    }
    
    const resourceTypeName = resourceType ? getSingularResourceType(resourceType) : 'record';
    
    if (Array.isArray(attributes)) {
      return `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attributes (${attributes.length}):\n${attributes
        .map((attr: any, index: number) => {
          const name = attr.name || attr.slug || 'Unnamed';
          const type = attr.type || 'unknown';
          return `${index + 1}. ${name} (${type})`;
        })
        .join('\n')}`;
    }
    
    if (typeof attributes === 'object') {
      const keys = Object.keys(attributes);
      return `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attributes (${keys.length}):\n${keys
        .map((key, index) => `${index + 1}. ${key}: ${JSON.stringify(attributes[key])}`)
        .join('\n')}`;
    }
    
    return `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attributes: ${JSON.stringify(attributes)}`;
  }
};

/**
 * Universal discover attributes tool
 * Consolidates: discover-company-attributes, discover-person-attributes, discover-record-attributes
 */
export const discoverAttributesConfig: UniversalToolConfig = {
  name: 'discover-attributes',
  handler: async (params: { resource_type: UniversalResourceType }): Promise<any> => {
    try {
      const sanitizedParams = validateUniversalToolParams('discover-attributes', params);
      return await handleUniversalDiscoverAttributes(sanitizedParams.resource_type);
    } catch (error) {
      throw createUniversalError('discover attributes', params.resource_type, error);
    }
  },
  formatResult: (schema: any, resourceType?: UniversalResourceType) => {
    if (!schema) {
      return 'No attribute schema found';
    }
    
    const resourceTypeName = resourceType ? getSingularResourceType(resourceType) : 'record';
    
    if (Array.isArray(schema)) {
      return `Available ${resourceTypeName} attributes (${schema.length}):\n${schema
        .map((attr: any, index: number) => {
          const name = attr.name || attr.slug || 'Unnamed';
          const type = attr.type || 'unknown';
          const required = attr.required ? ' (required)' : '';
          return `${index + 1}. ${name} (${type})${required}`;
        })
        .join('\n')}`;
    }
    
    return `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attribute schema: ${JSON.stringify(schema, null, 2)}`;
  }
};

/**
 * Universal get detailed info tool
 * Consolidates: get-company-basic-info, get-company-contact-info, get-company-business-info, get-company-social-info
 */
export const getDetailedInfoConfig: UniversalToolConfig = {
  name: 'get-detailed-info',
  handler: async (params: UniversalDetailedInfoParams): Promise<any> => {
    try {
      const sanitizedParams = validateUniversalToolParams('get-detailed-info', params);
      return await handleUniversalGetDetailedInfo(sanitizedParams);
    } catch (error) {
      throw createUniversalError('get detailed info', params.resource_type, error);
    }
  },
  formatResult: (info: any, resourceType?: UniversalResourceType, infoType?: DetailedInfoType) => {
    if (!info) {
      return 'No detailed information found';
    }
    
    const resourceTypeName = resourceType ? getSingularResourceType(resourceType) : 'record';
    const infoTypeName = infoType || 'detailed';
    
    let result = `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} ${infoTypeName} information:\n\n`;
    
    if (typeof info === 'object' && info.values) {
      // Format as Attio record values
      Object.entries(info.values).forEach(([field, values]: [string, any]) => {
        if (Array.isArray(values) && values.length > 0) {
          const value = values[0].value;
          if (value) {
            const displayField = field.charAt(0).toUpperCase() + field.slice(1);
            result += `${displayField}: ${value}\n`;
          }
        }
      });
    } else if (typeof info === 'object') {
      // Format as regular object
      Object.entries(info).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.length < 200) {
          const displayKey = key.charAt(0).toUpperCase() + key.slice(1);
          result += `${displayKey}: ${value}\n`;
        }
      });
    } else {
      result += JSON.stringify(info, null, 2);
    }
    
    return result.trim();
  }
};

/**
 * Core operations tool definitions for MCP protocol
 */
export const coreOperationsToolDefinitions = {
  'search-records': {
    name: 'search-records',
    description: 'Universal search across all resource types (companies, people, records, tasks)',
    inputSchema: searchRecordsSchema
  },
  'get-record-details': {
    name: 'get-record-details', 
    description: 'Get detailed information for any record type',
    inputSchema: getRecordDetailsSchema
  },
  'create-record': {
    name: 'create-record',
    description: 'Create a new record of any supported type',
    inputSchema: createRecordSchema
  },
  'update-record': {
    name: 'update-record',
    description: 'Update an existing record of any supported type',
    inputSchema: updateRecordSchema
  },
  'delete-record': {
    name: 'delete-record',
    description: 'Delete a record of any supported type',
    inputSchema: deleteRecordSchema
  },
  'get-attributes': {
    name: 'get-attributes',
    description: 'Get attributes for any resource type',
    inputSchema: getAttributesSchema
  },
  'discover-attributes': {
    name: 'discover-attributes',
    description: 'Discover available attributes for any resource type',
    inputSchema: discoverAttributesSchema
  },
  'get-detailed-info': {
    name: 'get-detailed-info',
    description: 'Get specific types of detailed information (contact, business, social)',
    inputSchema: getDetailedInfoSchema
  }
};

/**
 * Core operations tool configurations
 */
export const coreOperationsToolConfigs = {
  'search-records': searchRecordsConfig,
  'get-record-details': getRecordDetailsConfig,
  'create-record': createRecordConfig,
  'update-record': updateRecordConfig,
  'delete-record': deleteRecordConfig,
  'get-attributes': getAttributesConfig,
  'discover-attributes': discoverAttributesConfig,
  'get-detailed-info': getDetailedInfoConfig
};