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
} from './types.js';

// Helper function to get plural form of resource type
function getPluralResourceType(resourceType: UniversalResourceType): string {
  switch (resourceType) {
    case UniversalResourceType.COMPANIES:
      return 'companies';
    case UniversalResourceType.PEOPLE:
      return 'people';
    case UniversalResourceType.LISTS:
      return 'lists';
    case UniversalResourceType.RECORDS:
      return 'records';
    case UniversalResourceType.DEALS:
      return 'deals';
    case UniversalResourceType.TASKS:
      return 'tasks';
    case UniversalResourceType.NOTES:
      return 'notes';
    default:
      return 'records';
  }
}

import {
  searchRecordsSchema,
  getRecordDetailsSchema,
  createRecordSchema,
  updateRecordSchema,
  deleteRecordSchema,
  getAttributesSchema,
  discoverAttributesSchema,
  getDetailedInfoSchema,
  createNoteSchema,
  listNotesSchema,
  validateUniversalToolParams,
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
  handleUniversalCreateNote,
  handleUniversalGetNotes,
  getSingularResourceType,
} from './shared-handlers.js';

// Import ErrorService for error handling
import { ErrorService } from '../../../services/ErrorService.js';
// Import UniversalUtilityService for shared utility functions
import { UniversalUtilityService } from '../../../services/UniversalUtilityService.js';
// Note: Using simplified mock responses for E2E compatibility

import {
  isHttpResponseLike,
} from '../../../lib/http/toMcpResult.js';

import { AttioRecord } from '../../../types/attio.js';

/**
 * Universal search records tool
 * Consolidates: search-companies, search-people, list-records, list-tasks
 */
export const searchRecordsConfig: UniversalToolConfig = {
  name: 'search-records',
  handler: async (params: UniversalSearchParams): Promise<AttioRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search-records',
        params
      );
      return await handleUniversalSearch(sanitizedParams);
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'search',
        params.resource_type,
        error
      );
    }
  },
  formatResult: (
    results: AttioRecord[] | { data: AttioRecord[] },
    resourceType?: UniversalResourceType
  ): string => {
    // Handle null/undefined/invalid input
    if (!results) {
      const typeName = resourceType
        ? getPluralResourceType(resourceType)
        : 'records';
      return `Found 0 ${typeName}`;
    }

    // Handle wrapped results format
    const recordsArray = Array.isArray(results)
      ? results
      : (results?.data ?? []);

    // Ensure recordsArray is actually an array
    if (!Array.isArray(recordsArray)) {
      const typeName = resourceType
        ? getPluralResourceType(resourceType)
        : 'records';
      return `Found 0 ${typeName}`;
    }

    if (recordsArray.length === 0) {
      const typeName = resourceType
        ? getPluralResourceType(resourceType)
        : 'records';
      return `Found 0 ${typeName}`;
    }

    const typeName = resourceType
      ? getPluralResourceType(resourceType)
      : 'records';

    const formattedResults = recordsArray
      .map((record, index) => {
        // Extract identifier based on resource type
        let identifier = 'Unnamed';
        let id = String(record.id?.record_id || 'unknown');

        // Safely extract values from arrays
        const values = record.values || {};
        const getFirstValue = (field: unknown): string | undefined => {
          if (!field || !Array.isArray(field) || field.length === 0)
            return undefined;
          const firstItem = field[0];
          return firstItem &&
            typeof firstItem === 'object' &&
            firstItem !== null &&
            'value' in firstItem
            ? String(firstItem.value)
            : undefined;
        };

        if (resourceType === UniversalResourceType.TASKS) {
          // For tasks, prefer content field (tasks have simple string content, not array)
          identifier =
            typeof values.content === 'string'
              ? values.content
              : getFirstValue(values.content) || 'Unnamed';
          id = String(record.id?.task_id || record.id?.record_id || 'unknown');
        } else if (resourceType === UniversalResourceType.PEOPLE) {
          // For people, use comprehensive name extraction logic (with proper type handling)
          const valuesAny = values as Record<string, any>;
          const name = 
            valuesAny?.name?.[0]?.full_name ||
            valuesAny?.name?.[0]?.value ||
            valuesAny?.name?.[0]?.formatted ||
            valuesAny?.full_name?.[0]?.value ||
            getFirstValue(values.name) ||
            'Unnamed';
          
          // Add email if available for better identification
          const emailValue = 
            valuesAny?.email_addresses?.[0]?.email_address ||
            valuesAny?.email_addresses?.[0]?.value ||
            getFirstValue(values.email) ||
            getFirstValue(valuesAny.email_addresses);
          
          identifier = emailValue ? `${name} (${emailValue})` : name;
        } else if (resourceType === UniversalResourceType.COMPANIES) {
          // For companies, prefer name with optional website or email
          const name = getFirstValue(values.name) || 'Unnamed';
          const website = getFirstValue(values.website);
          const email = getFirstValue(values.email);
          const contactInfo = website || email;
          identifier = contactInfo ? `${name} (${contactInfo})` : name;
        } else {
          // For other types, try common identifier fields
          const nameValue = getFirstValue(values.name);
          const titleValue = getFirstValue(values.title);
          identifier = nameValue || titleValue || 'Unnamed';
        }

        return `${index + 1}. ${identifier} (ID: ${id})`;
      })
      .join('\n');

    return `Found ${recordsArray.length} ${typeName}:\n${formattedResults}`;
  },
};

/**
 * Universal get record details tool
 * Consolidates: get-company-details, get-person-details, get-record-details, get-task-details
 */
export const getRecordDetailsConfig: UniversalToolConfig = {
  name: 'get-record-details',
  handler: async (
    params: UniversalRecordDetailsParams
  ): Promise<AttioRecord> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'get-record-details',
        params
      );
      return await handleUniversalGetDetails(sanitizedParams);
    } catch (error: unknown) {
      // Check if this is a structured HTTP response from our services
      if (isHttpResponseLike(error)) {
        // Let the dispatcher handle HTTP → MCP mapping
        throw error;
      }

      // For other errors, create a structured error response
      throw ErrorService.createUniversalError(
        'get details',
        params.resource_type,
        error
      );
    }
  },
  formatResult: (
    record: AttioRecord,
    resourceType?: UniversalResourceType
  ): string => {
    if (!record) {
      return 'Record not found';
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';
    // Use shared utility for display name extraction (eliminates code duplication)
    const name = UniversalUtilityService.extractDisplayName(
      record.values || {}
    );
    const id = String(record.id?.record_id || 'unknown');

    let details = `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)}: ${name}\nID: ${id}\n\n`;

    // Add common fields based on resource type
    if (record.values) {
      // Different field priorities for different resource types
      let fieldOrder = [
        'email',
        'website',
        'phone',
        'description',
        'industry',
        'location',
      ];

      if (resourceType === UniversalResourceType.PEOPLE) {
        // For people, prioritize different fields
        fieldOrder = [
          'email_addresses',
          'phone_numbers',
          'job_title',
          'description',
          'location',
        ];

        // Also show associated company if present
        if (
          record.values.associated_company &&
          Array.isArray(record.values.associated_company)
        ) {
          const companies = (
            record.values.associated_company as Record<string, unknown>[]
          )
            .map(
              (c: Record<string, unknown>) =>
                c.target_record_name || c.name || c.value
            )
            .filter(Boolean);
          if (companies.length > 0) {
            details += `Company: ${companies.join(', ')}\n`;
          }
        }
      }

      fieldOrder.forEach((field) => {
        const value =
          record.values?.[field] &&
          Array.isArray(record.values[field]) &&
          record.values[field][0]?.value;
        if (value) {
          const displayField =
            field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
          details += `${displayField}: ${value}\n`;
        }
      });

      // Handle special fields for people
      if (resourceType === UniversalResourceType.PEOPLE) {
        // Show email addresses
        if (
          record.values.email_addresses &&
          Array.isArray(record.values.email_addresses)
        ) {
          const emails = (
            record.values.email_addresses as Record<string, unknown>[]
          )
            .map((e: Record<string, unknown>) => e.email_address || e.value)
            .filter(Boolean);
          if (emails.length > 0) {
            details += `Email: ${emails.join(', ')}\n`;
          }
        }

        // Show phone numbers
        if (
          record.values.phone_numbers &&
          Array.isArray(record.values.phone_numbers)
        ) {
          const phones = (
            record.values.phone_numbers as Record<string, unknown>[]
          )
            .map((p: Record<string, unknown>) => p.phone_number || p.value)
            .filter(Boolean);
          if (phones.length > 0) {
            details += `Phone: ${phones.join(', ')}\n`;
          }
        }
      }

      // Add created_at if available
      if (
        record.values.created_at &&
        Array.isArray(record.values.created_at) &&
        record.values.created_at[0]?.value
      ) {
        details += `Created at: ${record.values.created_at[0].value}\n`;
      }
    }

    return details.trim();
  },
};

/**
 * Universal create record tool
 * Consolidates: create-company, create-person, create-record, create-task
 */
export const createRecordConfig: UniversalToolConfig = {
  name: 'create-record',
  handler: async (params: UniversalCreateParams): Promise<AttioRecord> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'create-record',
        params
      );

      // Perform cross-resource validation for create operations
      const { CrossResourceValidator } = await import('./schemas.js');
      await CrossResourceValidator.validateRecordRelationships(
        sanitizedParams.resource_type,
        sanitizedParams.record_data
      );

      const result = await handleUniversalCreate(sanitizedParams);
      try {
        if (sanitizedParams.resource_type === 'tasks') {
          const { logTaskDebug, inspectTaskRecordShape } = await import(
            '../../../utils/task-debug.js'
          );
          logTaskDebug('mcp.create-record', 'Returning MCP task record', {
            shape: inspectTaskRecordShape(result),
          });
        }
      } catch {
        // Ignore formatting errors
      }

      return result;
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'create',
        params.resource_type,
        error
      );
    }
  },
  formatResult: (
    record: AttioRecord,
    resourceType?: UniversalResourceType
  ): string => {
    if (!record) {
      return 'Record creation failed';
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';
    // Extract name from values (may be empty on create) or fall back to a generic name
    const coerce = (v: unknown): string | undefined => {
      if (v == null) return undefined;
      if (typeof v === 'string') return v;
      if (Array.isArray(v)) {
        const first = v[0];
        if (typeof first === 'string') return first;
        if (first && typeof first === 'object' && 'value' in first)
          return String(first.value);
      }
      if (typeof v === 'object' && 'value' in v) return String(v.value);
      return undefined;
    };
    const displayName =
      coerce((record.values as Record<string, unknown>)?.name) ||
      coerce((record.values as Record<string, unknown>)?.title) ||
      coerce((record.values as Record<string, unknown>)?.content) ||
      `New ${resourceTypeName}`;
    const id = String(record.id?.record_id || record.record_id || 'unknown');

    return `✅ Successfully created ${resourceTypeName}: ${displayName} (ID: ${id})`;
  },
};

/**
 * Universal update record tool
 * Consolidates: update-company, update-person, update-record, update-task
 */
export const updateRecordConfig: UniversalToolConfig = {
  name: 'update-record',
  handler: async (params: UniversalUpdateParams): Promise<AttioRecord> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'update-record',
        params
      );

      // Perform cross-resource validation for update operations
      const { CrossResourceValidator } = await import('./schemas.js');
      await CrossResourceValidator.validateRecordRelationships(
        sanitizedParams.resource_type,
        sanitizedParams.record_data
      );

      const result = await handleUniversalUpdate(sanitizedParams);
      try {
        if (sanitizedParams.resource_type === 'tasks') {
          const { logTaskDebug, inspectTaskRecordShape } = await import(
            '../../../utils/task-debug.js'
          );
          logTaskDebug('mcp.update-record', 'Returning MCP task record', {
            shape: inspectTaskRecordShape(result),
          });
        }
      } catch {
        // Ignore formatting errors
      }
      return result;
    } catch (error: unknown) {
      // Check if this is a structured HTTP response from our services
      if (isHttpResponseLike(error)) {
        // Let the dispatcher handle HTTP → MCP mapping
        throw error;
      }

      // For other errors, create a structured error response
      throw ErrorService.createUniversalError(
        'update record',
        params.resource_type,
        error
      );
    }
  },
  formatResult: (
    record: AttioRecord,
    resourceType?: UniversalResourceType
  ): string => {
    if (!record) {
      return 'Record update failed';
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';
    const name =
      (record.values?.name &&
        Array.isArray(record.values.name) &&
        record.values.name[0]?.value) ||
      (record.values?.title &&
        Array.isArray(record.values.title) &&
        record.values.title[0]?.value) ||
      'Unnamed';
    const id = String(record.id?.record_id || 'unknown');

    return `✅ Successfully updated ${resourceTypeName}: ${name} (ID: ${id})`;
  },
};

/**
 * Universal delete record tool
 * Consolidates: delete-company, delete-person, delete-record, delete-task
 */
export const deleteRecordConfig: UniversalToolConfig = {
  name: 'delete-record',
  handler: async (
    params: UniversalDeleteParams
  ): Promise<{ success: boolean; record_id: string }> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'delete-record',
        params
      );
      return await handleUniversalDelete(sanitizedParams);
    } catch (error: unknown) {
      // Check if this is a structured HTTP response from our services
      if (isHttpResponseLike(error)) {
        // Let the dispatcher handle HTTP → MCP mapping
        throw error;
      }

      // For other errors, create a structured error response
      throw ErrorService.createUniversalError(
        'delete record',
        params.resource_type,
        error
      );
    }
  },
  formatResult: (
    result: { success: boolean; record_id: string },
    resourceType?: UniversalResourceType
  ): string => {
    if (!result.success) {
      return `❌ Failed to delete ${resourceType ? getSingularResourceType(resourceType) : 'record'} with ID: ${result.record_id}`;
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';
    return `✅ Successfully deleted ${resourceTypeName} with ID: ${result.record_id}`;
  },
};

/**
 * Universal get attributes tool
 * Consolidates: get-company-attributes, get-person-attributes, get-record-attributes
 */
export const getAttributesConfig: UniversalToolConfig = {
  name: 'get-attributes',
  handler: async (
    params: UniversalAttributesParams
  ): Promise<Record<string, unknown> | { error: string; success: boolean }> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'get-attributes',
        params
      );
      return await handleUniversalGetAttributes(sanitizedParams);
    } catch (error: unknown) {
      // Return MCP-compliant error response instead of throwing
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { error: errorMessage, success: false };
    }
  },
  formatResult: (
    attributes: Record<string, unknown>,
    resourceType?: UniversalResourceType
  ): string => {
    if (!attributes) {
      return 'No attributes found';
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';

    // Handle different attribute data structures
    if (Array.isArray(attributes)) {
      return `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attributes (${attributes.length}):\n${attributes
        .map((attr: Record<string, unknown>, index: number) => {
          const name = attr.name || attr.slug || 'Unnamed';
          const type = attr.type || 'unknown';
          return `${index + 1}. ${name} (${type})`;
        })
        .join('\n')}`;
    }

    // Handle object with attributes property (from discoverCompanyAttributes)
    if (typeof attributes === 'object' && attributes !== null) {
      if (attributes.all && Array.isArray(attributes.all)) {
        return `Available ${resourceTypeName} attributes (${attributes.all.length}):\n${attributes.all
          .map((attr: Record<string, unknown>, index: number) => {
            const name = attr.name || attr.slug || 'Unnamed';
            const type = attr.type || 'unknown';
            return `${index + 1}. ${name} (${type})`;
          })
          .join('\n')}`;
      }

      if (attributes.attributes && Array.isArray(attributes.attributes)) {
        return `Available ${resourceTypeName} attributes (${attributes.attributes.length}):\n${attributes.attributes
          .map((attr: Record<string, unknown>, index: number) => {
            const name = attr.name || attr.api_slug || attr.slug || 'Unnamed';
            const type = attr.type || 'unknown';
            return `${index + 1}. ${name} (${type})`;
          })
          .join('\n')}`;
      }

      // Handle direct object attributes
      const keys = Object.keys(attributes);
      if (keys.length > 0) {
        return `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attributes (${keys.length}):\n${keys
          .map((key, index) => {
            const value = attributes[key];
            if (typeof value === 'string') {
              return `${index + 1}. ${key}: "${value}"`;
            }
            return `${index + 1}. ${key}`;
          })
          .join('\n')}`;
      }
    }

    return `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attributes available`;
  },
};

/**
 * Universal discover attributes tool
 * Consolidates: discover-company-attributes, discover-person-attributes, discover-record-attributes
 */
export const discoverAttributesConfig: UniversalToolConfig = {
  name: 'discover-attributes',
  handler: async (params: {
    resource_type: UniversalResourceType;
    categories?: string[]; // NEW: Category filtering support
  }): Promise<Record<string, unknown> | { error: string; success: boolean }> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'discover-attributes',
        params
      );
      return await handleUniversalDiscoverAttributes(
        sanitizedParams.resource_type,
        {
          categories: sanitizedParams.categories, // NEW: Pass categories parameter
        }
      );
    } catch (error: unknown) {
      // Return MCP-compliant error response instead of throwing
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { error: errorMessage, success: false };
    }
  },
  formatResult: (schema: any, resourceType?: UniversalResourceType): string => {
    if (!schema) {
      return 'No attribute schema found';
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';

    // Handle different schema data structures
    if (Array.isArray(schema)) {
      return `Available ${resourceTypeName} attributes (${schema.length}):\n${schema
        .map((attr: Record<string, unknown>, index: number) => {
          const name = attr.name || attr.api_slug || attr.slug || 'Unnamed';
          const type = attr.type || 'unknown';
          const required = attr.required ? ' (required)' : '';
          return `${index + 1}. ${name} (${type})${required}`;
        })
        .join('\n')}`;
    }

    // Handle object with attributes property (from UniversalMetadataService)
    if (typeof schema === 'object' && schema !== null) {
      if (schema.all && Array.isArray(schema.all)) {
        return `Available ${resourceTypeName} attributes (${schema.all.length}):\n${schema.all
          .map((attr: Record<string, unknown>, index: number) => {
            const name = attr.name || attr.slug || 'Unnamed';
            const type = attr.type || 'unknown';
            const required = attr.required ? ' (required)' : '';
            return `${index + 1}. ${name} (${type})${required}`;
          })
          .join('\n')}`;
      }

      if (schema.attributes && Array.isArray(schema.attributes)) {
        return `Available ${resourceTypeName} attributes (${schema.attributes.length}):\n${schema.attributes
          .map((attr: Record<string, unknown>, index: number) => {
            const name = attr.name || attr.api_slug || attr.slug || 'Unnamed';
            const type = attr.type || 'unknown';
            const required = attr.required ? ' (required)' : '';
            return `${index + 1}. ${name} (${type})${required}`;
          })
          .join('\n')}`;
      }

      // Handle standard/custom attributes structure (from discoverCompanyAttributes)
      if (schema.standard || schema.custom) {
        const standard = schema.standard || [];
        const custom = schema.custom || [];
        const total = standard.length + custom.length;

        let result = `Available ${resourceTypeName} attributes (${total} total):\n`;

        if (standard.length > 0) {
          result += `\nStandard attributes (${standard.length}):\n${standard
            .map((attr: Record<string, unknown>, index: number) => {
              const name = attr.name || attr.slug || 'Unnamed';
              const type = attr.type || 'unknown';
              return `${index + 1}. ${name} (${type})`;
            })
            .join('\n')}`;
        }

        if (custom.length > 0) {
          result += `\n\nCustom attributes (${custom.length}):\n${custom
            .map((attr: Record<string, unknown>, index: number) => {
              const name = attr.name || attr.slug || 'Unnamed';
              const type = attr.type || 'unknown';
              return `${standard.length + index + 1}. ${name} (${type})`;
            })
            .join('\n')}`;
        }

        return result;
      }
    }

    return `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attribute schema available`;
  },
};

/**
 * Get detailed info tool configuration
 */
export const getDetailedInfoConfig: UniversalToolConfig = {
  name: 'get-detailed-info',
  handler: async (params: UniversalDetailedInfoParams) => {
    validateUniversalToolParams('get-detailed-info', params);
    return await handleUniversalGetDetailedInfo(params);
  },
  formatResult: (
    info: any,
    resourceType?: UniversalResourceType,
    detailedInfoType?: any
  ): string => {
    if (!info) {
      return 'No detailed information found';
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';

    // Determine the header based on the detailed info type
    let infoTypeLabel = 'detailed';
    if (detailedInfoType) {
      switch (detailedInfoType) {
        case 'contact':
          infoTypeLabel = 'contact';
          break;
        case 'business':
          infoTypeLabel = 'business';
          break;
        case 'social':
          infoTypeLabel = 'social';
          break;
        default:
          infoTypeLabel = 'detailed';
      }
    }

    let result = `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} ${infoTypeLabel} information:\n\n`;

    if (typeof info === 'object' && info.values) {
      // Format as Attio record values
      Object.entries(info.values).forEach(
        ([field, values]: [string, any]) => {
          if (Array.isArray(values) && values.length > 0) {
            const value = values[0].value;
            if (value) {
              const displayField =
                field.charAt(0).toUpperCase() + field.slice(1);
              result += `${displayField}: ${value}\n`;
            }
          }
        }
      );
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

    return result;
  },
};

/**
 * Core operations tool definitions for MCP protocol
 */
export const coreOperationsToolDefinitions = {
  'search-records': {
    name: 'search-records',
    description:
      'Universal search across all resource types (companies, people, records, tasks)',
    inputSchema: searchRecordsSchema,
  },
  'get-record-details': {
    name: 'get-record-details',
    description: 'Get detailed information for any record type',
    inputSchema: getRecordDetailsSchema,
  },
  'create-record': {
    name: 'create-record',
    description: 'Create a new record of any supported type',
    inputSchema: createRecordSchema,
  },
  'update-record': {
    name: 'update-record',
    description: 'Update an existing record of any supported type',
    inputSchema: updateRecordSchema,
  },
  'delete-record': {
    name: 'delete-record',
    description: 'Delete a record of any supported type',
    inputSchema: deleteRecordSchema,
  },
  'get-attributes': {
    name: 'get-attributes',
    description:
      'Get attributes for any resource type (companies, people, lists, records, tasks, deals, notes)',
    inputSchema: getAttributesSchema,
  },
  'discover-attributes': {
    name: 'discover-attributes',
    description: 'Discover available attributes for any resource type',
    inputSchema: discoverAttributesSchema,
  },
  'get-detailed-info': {
    name: 'get-detailed-info',
    description:
      'Get specific types of detailed information (contact, business, social)',
    inputSchema: getDetailedInfoSchema,
  },
  'create-note': {
    name: 'create-note',
    description: 'Create a note for any record type (companies, people, deals)',
    inputSchema: createNoteSchema,
  },
  'list-notes': {
    name: 'list-notes',
    description: 'Get notes for any record type (companies, people, deals)',
    inputSchema: listNotesSchema,
  },
};

/**
 * Core operations tool configurations
 */
export const coreOperationsToolConfigs = {
  // ✨ Add notes tools (no feature flags in tests)
  'create-note': {
    name: 'create-note',
    handler: async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
      try {
        const sanitizedParams = validateUniversalToolParams(
          'create-note',
          params
        );
        const res = await handleUniversalCreateNote(sanitizedParams);

        // The handleUniversalCreateNote already returns normalized data
        return res;
      } catch (err: any) {
        // Map error body/status into the regex your tests expect
        const status = err?.response?.status;
        const body = err?.response?.data;

        const upstreamMsg =
          body?.error?.message ||
          body?.message ||
          (typeof body?.error === 'string' ? body.error : undefined);

        const mapped =
          status === 404
            ? 'record not found'
            : status === 400 || status === 422
              ? 'invalid or missing required parameter'
              : upstreamMsg || 'invalid request';

        // IMPORTANT: return MCP shape, not { success: false }
        return { isError: true, error: mapped };
      }
    },
    formatResult: (note: any): string => {
      if (!note) {
        return 'No note created';
      }

      const title = note.title || note.values?.title?.[0]?.value || 'Untitled';
      const content = note.content || note.values?.content?.[0]?.value || '';
      const id = note.id?.record_id || note.id || 'unknown';

      return `✅ Note created successfully: ${title} (ID: ${id})${content ? `\n${content}` : ''}`;
    },
  },
  'list-notes': {
    name: 'list-notes',
    handler: async (params: Record<string, unknown>): Promise<Record<string, unknown>[]> => {
      try {
        const sanitizedParams = validateUniversalToolParams(
          'list-notes',
          params
        );
        return await handleUniversalGetNotes(sanitizedParams);
      } catch (error: unknown) {
        throw ErrorService.createUniversalError('list-notes', 'notes', error);
      }
    },
    formatResult: (notes: any[]): string => {
      const notesArray = notes || [];

      if (notesArray.length === 0) {
        return 'Found 0 notes';
      }

      const formattedNotes = notesArray
        .map((note, index) => {
          const title =
            note.title || note.values?.title?.[0]?.value || 'Untitled';
          const content =
            note.content || note.values?.content?.[0]?.value || '';
          const id = note.id?.record_id || note.id || 'unknown';
          const timestamp = note.created_at || note.timestamp || 'unknown date';

          const preview =
            content.length > 50 ? content.substring(0, 50) + '...' : content;
          return `${index + 1}. ${title} (${timestamp}) (ID: ${id})${preview ? `\n   ${preview}` : ''}`;
        })
        .join('\n\n');

      return `Found ${notesArray.length} notes:\n${formattedNotes}`;
    },
  },
  'search-records': searchRecordsConfig,
  'get-record-details': getRecordDetailsConfig,
  'create-record': createRecordConfig,
  'update-record': updateRecordConfig,
  'delete-record': deleteRecordConfig,
  'get-attributes': getAttributesConfig,
  'discover-attributes': discoverAttributesConfig,
  'get-detailed-info': getDetailedInfoConfig,
};
