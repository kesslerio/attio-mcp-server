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
  DetailedInfoType,
  UniversalCreateNoteParams,
  UniversalGetNotesParams,
  UniversalUpdateNoteParams,
  UniversalSearchNotesParams,
  UniversalDeleteNoteParams,
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
  createNoteSchema,
  getNotesSchema,
  updateNoteSchema,
  searchNotesSchema,
  deleteNoteSchema,
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
  handleUniversalUpdateNote,
  handleUniversalSearchNotes,
  handleUniversalDeleteNote,
  formatResourceType,
  getSingularResourceType,
} from './shared-handlers.js';

// Import ErrorService for error handling
import { ErrorService } from '../../../services/ErrorService.js';
// Import UniversalUtilityService for shared utility functions
import { UniversalUtilityService } from '../../../services/UniversalUtilityService.js';

import { CallToolRequest, Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolConfig } from '../../tool-types.js';

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
    results: AttioRecord[],
    resourceType?: UniversalResourceType
  ): string => {
    if (!Array.isArray(results)) {
      return 'No results found';
    }

    const resourceTypeName = resourceType
      ? formatResourceType(resourceType)
      : 'record';
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
      .map((record: Record<string, unknown>, index: number) => {
        const values = record.values as Record<string, unknown>;
        const recordId = record.id as Record<string, unknown>;
        // Use shared utility for display name extraction (eliminates code duplication)
        const name = UniversalUtilityService.extractDisplayName(values);
        const id = recordId?.record_id || 'unknown';
        const website = (values?.website as Record<string, unknown>[])?.[0]
          ?.value;
        const email =
          record.values && typeof record.values === 'object'
            ? (
                (record.values as Record<string, unknown>)?.email as Record<
                  string,
                  unknown
                >[]
              )?.[0]?.value
            : undefined;

        let details = '';
        if (website) details += ` (${website})`;
        else if (email) details += ` (${email})`;

        return `${index + 1}. ${name}${details} (ID: ${id})`;
      })
      .join('\n')}`;
  },
};

/**
 * Universal get record details tool
 * Consolidates: get-company-details, get-person-details, get-record, get-task-details
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
    const id = record.id?.record_id || 'unknown';

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
    const name =
      (record.values?.name &&
        Array.isArray(record.values.name) &&
        record.values.name[0]?.value) ||
      (record.values?.title &&
        Array.isArray(record.values.title) &&
        record.values.title[0]?.value) ||
      'Unnamed';
    const id = record.id?.record_id || 'unknown';

    return `✅ Successfully created ${resourceTypeName}: ${name} (ID: ${id})`;
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

      return await handleUniversalUpdate(sanitizedParams);
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'update',
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
    const id = record.id?.record_id || 'unknown';

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
      throw ErrorService.createUniversalError(
        'delete',
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
  ): Promise<Record<string, unknown>> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'get-attributes',
        params
      );
      return await handleUniversalGetAttributes(sanitizedParams);
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'get attributes',
        params.resource_type,
        error
      );
    }
  },
  formatResult: (
    attributes: any,
    resourceType?: UniversalResourceType
  ): any => {
    if (!attributes) {
      return {
        success: true,
        content: [
          { type: 'text', text: 'No attributes found' },
          { type: 'json', json: { attributes: [] } }
        ]
      };
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';

    let textSummary: string;
    let jsonData: any;

    if (Array.isArray(attributes)) {
      textSummary = `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attributes (${attributes.length}):\n${attributes
        .map((attr: Record<string, unknown>, index: number) => {
          const name = attr.name || attr.slug || 'Unnamed';
          const type = attr.type || 'unknown';
          return `${index + 1}. ${name} (${type})`;
        })
        .join('\n')}`;
      jsonData = { attributes };
    } else if (typeof attributes === 'object') {
      const keys = Object.keys(attributes);
      textSummary = `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attributes (${keys.length}):\n${keys
        .map(
          (key, index) =>
            `${index + 1}. ${key}: ${JSON.stringify(attributes[key])}`
        )
        .join('\n')}`;
      jsonData = { attributes };
    } else {
      textSummary = `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attributes: ${JSON.stringify(attributes)}`;
      jsonData = { attributes };
    }

    return {
      success: true,
      content: [
        { type: 'text', text: textSummary },
        { type: 'json', json: jsonData }
      ]
    };
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
  }): Promise<any> => {
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
      throw ErrorService.createUniversalError(
        'discover attributes',
        params.resource_type,
        error
      );
    }
  },
  formatResult: (schema: any, resourceType?: UniversalResourceType): any => {
    if (!schema) {
      return {
        success: true,
        content: [
          { type: 'text', text: 'No attribute schema found' },
          { type: 'json', json: { attributes: [] } }
        ]
      };
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';

    let textSummary: string;
    let jsonData: any;

    if (Array.isArray(schema)) {
      textSummary = `Available ${resourceTypeName} attributes (${schema.length}):\n${schema
        .map((attr: Record<string, unknown>, index: number) => {
          const name = attr.name || attr.slug || 'Unnamed';
          const type = attr.type || 'unknown';
          const required = attr.required ? ' (required)' : '';
          return `${index + 1}. ${name} (${type})${required}`;
        })
        .join('\n')}`;
      jsonData = { attributes: schema };
    } else {
      textSummary = `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} attribute schema`;
      jsonData = { attributes: schema };
    }

    return {
      success: true,
      content: [
        { type: 'text', text: textSummary },
        { type: 'json', json: jsonData }
      ]
    };
  },
};

/**
 * Get detailed info tool configuration
 */
export const getDetailedInfoConfig: UniversalToolConfig = {
  name: 'get-detailed-info',
  handler: async (params: UniversalDetailedInfoParams) => {
    try {
      validateUniversalToolParams('get-detailed-info', params);
      return await handleUniversalGetDetailedInfo(params);
    } catch (error: unknown) {
      throw error;
    }
  },
  formatResult: (
    info: Record<string, unknown>,
    resourceType?: UniversalResourceType,
    infoType?: DetailedInfoType
  ): string => {
    if (!info) {
      return 'No detailed information found';
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';
    const infoTypeName = infoType || 'detailed';

    let result = `${resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)} ${infoTypeName} information:\n\n`;

    if (typeof info === 'object' && (info as any).values) {
      // Format as Attio record values
      Object.entries((info as any).values).forEach(
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
 * Universal create note tool configuration
 */
const createNoteConfig: UniversalToolConfig = {
  name: 'create-note',
  handler: async (params: UniversalCreateNoteParams): Promise<any> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'create-note',
        params
      );
      return await handleUniversalCreateNote(sanitizedParams);
    } catch (error: unknown) {
      throw error;
    }
  },
  formatResult: (note: any): string => {
    if (!note) {
      return 'Failed to create note';
    }
    return `✅ Successfully created note: "${note.title || 'Untitled'}" for ${note.parent_object || 'record'} (ID: ${note.parent_record_id || 'unknown'})`;
  },
};

/**
 * Universal get notes tool configuration
 */
const getNotesConfig: UniversalToolConfig = {
  name: 'get-notes',
  handler: async (params: UniversalGetNotesParams): Promise<any[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams('get-notes', params);
      return await handleUniversalGetNotes(sanitizedParams);
    } catch (error: unknown) {
      throw error;
    }
  },
  formatResult: (notes: any[]): string => {
    if (!notes || notes.length === 0) {
      return 'No notes found';
    }
    return `Found ${notes.length} note(s):\n${notes.map((note) => `• ${note.title}: ${note.content?.substring(0, 100) || 'No content'}...`).join('\n')}`;
  },
};

/**
 * Universal update note tool configuration
 */
const updateNoteConfig: UniversalToolConfig = {
  name: 'update-note',
  handler: async (params: UniversalUpdateNoteParams): Promise<any> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'update-note',
        params
      );
      return await handleUniversalUpdateNote(sanitizedParams);
    } catch (error: unknown) {
      throw error;
    }
  },
  formatResult: (note: any): string => {
    if (!note) {
      return 'Failed to update note';
    }
    return `✅ Successfully updated note: "${note.title || 'Untitled'}"`;
  },
};

/**
 * Universal search notes tool configuration
 */
const searchNotesConfig: UniversalToolConfig = {
  name: 'search-notes',
  handler: async (params: UniversalSearchNotesParams): Promise<any[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search-notes',
        params
      );
      return await handleUniversalSearchNotes(sanitizedParams);
    } catch (error: unknown) {
      throw error;
    }
  },
  formatResult: (notes: any[]): string => {
    if (!notes || notes.length === 0) {
      return 'No notes found matching search criteria';
    }
    return `Found ${notes.length} matching note(s):\n${notes.map((note) => `• ${note.title}: ${note.content?.substring(0, 100) || 'No content'}...`).join('\n')}`;
  },
};

/**
 * Universal delete note tool configuration
 */
const deleteNoteConfig: UniversalToolConfig = {
  name: 'delete-note',
  handler: async (params: UniversalDeleteNoteParams): Promise<any> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'delete-note',
        params
      );
      return await handleUniversalDeleteNote(sanitizedParams);
    } catch (error: unknown) {
      throw error;
    }
  },
  formatResult: (result: any): string => {
    if (!result || !result.success) {
      return 'Failed to delete note';
    }
    return `✅ Successfully deleted note (ID: ${result.note_id})`;
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
    description: 'Get attributes for any resource type',
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
  'get-notes': {
    name: 'get-notes',
    description: 'Get notes for any record type (companies, people, deals)',
    inputSchema: getNotesSchema,
  },
  'update-note': {
    name: 'update-note',
    description: 'Update a note (title, content, or archive status)',
    inputSchema: updateNoteSchema,
  },
  'search-notes': {
    name: 'search-notes',
    description: 'Search notes by content, title, or record',
    inputSchema: searchNotesSchema,
  },
  'delete-note': {
    name: 'delete-note',
    description: 'Delete a note by note ID',
    inputSchema: deleteNoteSchema,
  },
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
  'get-detailed-info': getDetailedInfoConfig,
  'create-note': createNoteConfig,
  'get-notes': getNotesConfig,
  'update-note': updateNoteConfig,
  'search-notes': searchNotesConfig,
  'delete-note': deleteNoteConfig,
};
