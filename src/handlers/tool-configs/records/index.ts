/**
 * Records-related tool configurations
 */

import {
  batchCreateObjectRecords,
  batchUpdateObjectRecords,
  createObjectRecord,
  deleteObjectRecord,
  getObjectRecord,
  listObjectRecords,
  updateObjectRecord,
} from '../../../objects/records/index.js';
import { AttioRecord } from '../../../types/attio.js';
import { ToolConfig } from '../../tool-types.js';

// Define new tool type interfaces specific to records
export interface RecordCreateToolConfig extends ToolConfig {
  handler: (
    objectSlug: string,
    attributes: any,
    objectId?: string
  ) => Promise<AttioRecord>;
}

export interface RecordGetToolConfig extends ToolConfig {
  handler: (
    objectSlug: string,
    recordId: string,
    attributes?: string[],
    objectId?: string
  ) => Promise<AttioRecord>;
}

export interface RecordUpdateToolConfig extends ToolConfig {
  handler: (
    objectSlug: string,
    recordId: string,
    attributes: any,
    objectId?: string
  ) => Promise<AttioRecord>;
}

export interface RecordDeleteToolConfig extends ToolConfig {
  handler: (
    objectSlug: string,
    recordId: string,
    objectId?: string
  ) => Promise<boolean>;
}

export interface RecordListToolConfig extends ToolConfig {
  handler: (
    objectSlug: string,
    options?: any,
    objectId?: string
  ) => Promise<AttioRecord[]>;
}

export interface RecordBatchCreateToolConfig extends ToolConfig {
  handler: (
    objectSlug: string,
    records: any[],
    objectId?: string
  ) => Promise<any>;
}

export interface RecordBatchUpdateToolConfig extends ToolConfig {
  handler: (
    objectSlug: string,
    records: any[],
    objectId?: string
  ) => Promise<any>;
}

// Record tool configurations
export const recordToolConfigs = {
  create: {
    name: 'create-record',
    handler: createObjectRecord,
    formatResult: (result: AttioRecord) => {
      return `Record created successfully:\n${JSON.stringify(result, null, 2)}`;
    },
  } as RecordCreateToolConfig,

  get: {
    name: 'get-record',
    handler: getObjectRecord,
    formatResult: (result: AttioRecord) => {
      return `Record details:\n${JSON.stringify(result, null, 2)}`;
    },
  } as RecordGetToolConfig,

  update: {
    name: 'update-record',
    handler: updateObjectRecord,
    formatResult: (result: AttioRecord) => {
      return `Record updated successfully:\n${JSON.stringify(result, null, 2)}`;
    },
  } as RecordUpdateToolConfig,

  delete: {
    name: 'delete-record',
    handler: deleteObjectRecord,
    formatResult: (result: boolean) => {
      return result ? 'Record deleted successfully' : 'Failed to delete record';
    },
  } as RecordDeleteToolConfig,

  list: {
    name: 'list-records',
    handler: listObjectRecords,
    formatResult: (results: AttioRecord[]) => {
      return `Found ${results.length} records:\n${results
        .map(
          (record: any) =>
            `- ${record.values?.name?.[0]?.value || '[Unnamed]'} (ID: ${
              record.id?.record_id || 'unknown'
            })`
        )
        .join('\n')}`;
    },
  } as RecordListToolConfig,

  batchCreate: {
    name: 'batch-create-records',
    handler: batchCreateObjectRecords,
    formatResult: (result: any) => {
      return (
        `Batch create operation completed:\n` +
        `Total: ${result.summary.total}, Succeeded: ${result.summary.succeeded}, Failed: ${result.summary.failed}\n` +
        `${result.results
          .map((r: any, i: number) =>
            r.success
              ? `✅ Record ${i + 1}: Created successfully (ID: ${
                  r.data?.id?.record_id || 'unknown'
                })`
              : `❌ Record ${i + 1}: Failed - ${
                  r.error?.message || 'Unknown error'
                }`
          )
          .join('\n')}`
      );
    },
  } as RecordBatchCreateToolConfig,

  batchUpdate: {
    name: 'batch-update-records',
    handler: batchUpdateObjectRecords,
    formatResult: (result: any) => {
      return (
        `Batch update operation completed:\n` +
        `Total: ${result.summary.total}, Succeeded: ${result.summary.succeeded}, Failed: ${result.summary.failed}\n` +
        `${result.results
          .map((r: any) =>
            r.success
              ? `✅ Record ${r.id}: Updated successfully`
              : `❌ Record ${r.id}: Failed - ${
                  r.error?.message || 'Unknown error'
                }`
          )
          .join('\n')}`
      );
    },
  } as RecordBatchUpdateToolConfig,
};

// Record tool definitions
export const recordToolDefinitions = [
  {
    name: 'create-record',
    description: 'Create a new CRM record in Attio (company, person, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        objectSlug: {
          type: 'string',
          description: "The object type slug (e.g., 'companies', 'people')",
        },
        objectId: {
          type: 'string',
          description: 'Alternative to objectSlug - direct object ID',
        },
        attributes: {
          type: 'object',
          description: 'Record attributes as key-value pairs',
        },
      },
      required: ['objectSlug', 'attributes'],
    },
  },
  {
    name: 'get-record',
    description: 'Get details of a specific CRM record (company, person, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        objectSlug: {
          type: 'string',
          description: "The object type slug (e.g., 'companies', 'people')",
        },
        objectId: {
          type: 'string',
          description: 'Alternative to objectSlug - direct object ID',
        },
        recordId: {
          type: 'string',
          description: 'ID of the record to retrieve',
        },
        attributes: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Optional list of attribute slugs to include',
        },
      },
      required: ['objectSlug', 'recordId'],
    },
  },
  {
    name: 'update-record',
    description: 'Update a specific CRM record (company, person, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        objectSlug: {
          type: 'string',
          description: "The object type slug (e.g., 'companies', 'people')",
        },
        objectId: {
          type: 'string',
          description: 'Alternative to objectSlug - direct object ID',
        },
        recordId: {
          type: 'string',
          description: 'ID of the record to update',
        },
        attributes: {
          type: 'object',
          description: 'Record attributes to update as key-value pairs',
        },
      },
      required: ['objectSlug', 'recordId', 'attributes'],
    },
  },
  {
    name: 'delete-record',
    description: 'Delete a specific record',
    inputSchema: {
      type: 'object',
      properties: {
        objectSlug: {
          type: 'string',
          description: "The object type slug (e.g., 'companies', 'people')",
        },
        objectId: {
          type: 'string',
          description: 'Alternative to objectSlug - direct object ID',
        },
        recordId: {
          type: 'string',
          description: 'ID of the record to delete',
        },
      },
      required: ['objectSlug', 'recordId'],
    },
  },
  {
    name: 'list-records',
    description:
      'List CRM records with filtering options (companies, people, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        objectSlug: {
          type: 'string',
          description: "The object type slug (e.g., 'companies', 'people')",
        },
        objectId: {
          type: 'string',
          description: 'Alternative to objectSlug - direct object ID',
        },
        page: {
          type: 'number',
          description: 'Page number to retrieve (starting at 1)',
        },
        pageSize: {
          type: 'number',
          description: 'Number of items per page',
        },
        query: {
          type: 'string',
          description: 'Search query to filter records',
        },
        attributes: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'List of attribute slugs to include',
        },
        sort: {
          type: 'string',
          description: 'Attribute slug to sort by',
        },
        direction: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort direction (asc or desc)',
        },
      },
      required: ['objectSlug'],
    },
  },
  {
    name: 'batch-create-records',
    description:
      'Create multiple CRM records in a single batch operation (bulk import companies, people, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        objectSlug: {
          type: 'string',
          description: "The object type slug (e.g., 'companies', 'people')",
        },
        objectId: {
          type: 'string',
          description: 'Alternative to objectSlug - direct object ID',
        },
        records: {
          type: 'array',
          items: {
            type: 'object',
          },
          description: 'Array of record attributes to create',
        },
      },
      required: ['objectSlug', 'records'],
    },
  },
  {
    name: 'batch-update-records',
    description:
      'Update multiple CRM records in a single batch operation (bulk update companies, people, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        objectSlug: {
          type: 'string',
          description: "The object type slug (e.g., 'companies', 'people')",
        },
        objectId: {
          type: 'string',
          description: 'Alternative to objectSlug - direct object ID',
        },
        records: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the record to update',
              },
              attributes: {
                type: 'object',
                description: 'Record attributes to update',
              },
            },
            required: ['id', 'attributes'],
          },
          description: 'Array of records with IDs and attributes to update',
        },
      },
      required: ['objectSlug', 'records'],
    },
  },
];
