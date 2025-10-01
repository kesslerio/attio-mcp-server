/**
 * Lists-related tool configurations
 */
import { AttioList, AttioListEntry } from '../../types/attio.js';
import { isValidUUID } from '../../utils/validation/uuid-validation.js';
import {
  getLists,
  getListDetails,
  getListEntries,
  filterListEntries,
  advancedFilterListEntries,
  addRecordToList,
  removeRecordFromList,
  updateListEntry,
  getRecordListMemberships,
  filterListEntriesByParent,
  filterListEntriesByParentId,
  ListMembership,
} from '../../objects/lists.js';
import {
  GetListsToolConfig,
  ToolConfig,
  GetListEntriesToolConfig,
  ListActionToolConfig,
} from '../tool-types.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';

// Lists tool configurations
export const listsToolConfigs = {
  getLists: {
    name: 'get-lists',
    handler: getLists,
    formatResult: (results: AttioList[]) => {
      // Return JSON string - dispatcher will convert to JSON content
      return JSON.stringify(Array.isArray(results) ? results : []);
    },
  } as GetListsToolConfig,
  getRecordListMemberships: {
    name: 'get-record-list-memberships',
    handler: getRecordListMemberships,
    formatResult: (results: ListMembership[] | null | undefined) => {
      // Return JSON string - dispatcher will convert to JSON content
      return JSON.stringify(Array.isArray(results) ? results : []);
    },
  } as ToolConfig,
  getListDetails: {
    name: 'get-list-details',
    handler: async (listId: string) => {
      // Let Attio API decide if list ID is valid (supports UUIDs and slugs)
      return await getListDetails(listId);
    },
    formatResult: (result: AttioList) => {
      // Return JSON string
      return JSON.stringify(result);
    },
  } as ToolConfig,
  getListEntries: {
    name: 'get-list-entries',
    handler: async (listId: string, limit?: number, offset?: number) => {
      // UUID validation - hard fail for invalid list IDs
      if (!isValidUUID(listId)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Invalid list_id: must be a UUID. Got: ${listId}`,
            },
          ],
        };
      }
      return await getListEntries(listId, limit, offset);
    },
    formatResult: (
      results:
        | AttioListEntry[]
        | { isError: boolean; content: Array<Record<string, unknown>> }
    ) => {
      // Handle validation error response
      if (results && typeof results === 'object' && 'isError' in results) {
        return 'Error: Invalid list ID';
      }

      // Return JSON string
      return JSON.stringify(Array.isArray(results) ? results : []);
    },
  } as GetListEntriesToolConfig,
  filterListEntries: {
    name: 'filter-list-entries',
    handler: filterListEntries,
    formatResult: (results: AttioListEntry[]) => {
      // Return JSON string
      return JSON.stringify(Array.isArray(results) ? results : []);
    },
  } as ToolConfig,

  advancedFilterListEntries: {
    name: 'advanced-filter-list-entries',
    handler: advancedFilterListEntries,
    formatResult: (results: AttioListEntry[]) => {
      // Return JSON string
      return JSON.stringify(Array.isArray(results) ? results : []);
    },
  } as ToolConfig,
  addRecordToList: {
    name: 'add-record-to-list',
    handler: async (
      listId: string,
      recordId: string,
      objectType: string,
      values?: Record<string, unknown>
    ) => {
      // UUID validation - hard fail for invalid list IDs
      if (!isValidUUID(listId)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Invalid list_id: must be a UUID. Got: ${listId}`,
            },
          ],
        };
      }
      return await addRecordToList(listId, recordId, objectType, values);
    },
    idParams: ['listId', 'recordId'],
    formatResult: (
      result:
        | AttioListEntry
        | { isError: boolean; content: Array<Record<string, unknown>> }
    ) => {
      // Handle validation error response
      if (result && typeof result === 'object' && 'isError' in result) {
        return 'Error: Invalid list ID';
      }
      // Return JSON string
      return JSON.stringify(result);
    },
  } as ToolConfig,
  removeRecordFromList: {
    name: 'remove-record-from-list',
    handler: async (listId: string, entryId: string) => {
      // UUID validation - hard fail for invalid list IDs
      if (!isValidUUID(listId)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Invalid list_id: must be a UUID. Got: ${listId}`,
            },
          ],
        };
      }
      return await removeRecordFromList(listId, entryId);
    },
    idParams: ['listId', 'entryId'],
  } as ListActionToolConfig,
  updateListEntry: {
    name: 'update-list-entry',
    handler: updateListEntry,
    formatResult: (result: AttioListEntry) => {
      // Return JSON string
      return JSON.stringify(result);
    },
  } as ToolConfig,

  filterListEntriesByParent: {
    name: 'filter-list-entries-by-parent',
    handler: filterListEntriesByParent,
    formatResult: (results: AttioListEntry[]) => {
      // Return JSON string
      return JSON.stringify(Array.isArray(results) ? results : []);
    },
  } as ToolConfig,

  filterListEntriesByParentId: {
    name: 'filter-list-entries-by-parent-id',
    handler: filterListEntriesByParentId,
    formatResult: (results: AttioListEntry[]) => {
      // Return JSON string
      return JSON.stringify(Array.isArray(results) ? results : []);
    },
  } as ToolConfig,
};

// Lists tool definitions
export const listsToolDefinitions = [
  {
    name: 'get-lists',
    description: formatToolDescription({
      capability:
        'Retrieve all CRM lists (sales pipelines, lead stages, customer segments).',
      boundaries: 'create or modify lists, only reads existing lists.',
      constraints: 'Returns all lists visible to the authenticated workspace.',
      recoveryHint: 'Use get-list-details to inspect individual list schemas.',
    }),
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get-record-list-memberships',
    description: formatToolDescription({
      capability:
        'Find all lists containing a specific company or person record.',
      boundaries: 'modify list memberships or retrieve list entries.',
      constraints:
        'Requires recordId; processes 5 lists in parallel by default (max 20).',
      recoveryHint:
        'If record not found, verify recordId with records_search first.',
    }),
    inputSchema: {
      type: 'object',
      properties: {
        recordId: {
          type: 'string',
          description: 'ID of the record to find in lists',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        objectType: {
          type: 'string',
          description: 'Type of record (e.g., "companies", "people")',
          enum: ['companies', 'people'],
        },
        includeEntryValues: {
          type: 'boolean',
          description:
            'Whether to include entry values in the response (e.g., stage, status)',
          default: false,
        },
        batchSize: {
          type: 'number',
          description:
            'Number of lists to process in parallel (1-20, default: 5)',
          minimum: 1,
          maximum: 20,
          default: 5,
        },
      },
      required: ['recordId'],
      additionalProperties: false,
    },
  },
  {
    name: 'get-list-details',
    description: formatToolDescription({
      capability:
        'Retrieve schema and configuration for a specific list (stages, fields, attributes).',
      boundaries: 'modify list structure or retrieve list entries.',
      constraints: 'Requires valid list UUID or slug; accepts both formats.',
      recoveryHint:
        'Use get-lists to discover available list IDs and slugs first.',
    }),
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID or slug of the list to get details for',
          example: 'sales-pipeline',
        },
      },
      required: ['listId'],
      additionalProperties: false,
    },
  },
  {
    name: 'get-list-entries',
    description: formatToolDescription({
      capability:
        'Retrieve all records in a list with pagination (companies, people in pipelines).',
      boundaries: 'filter entries or modify list memberships.',
      constraints:
        'Requires list UUID (not slug); default limit 20, max per page varies by API.',
      recoveryHint:
        'Use filter-list-entries for attribute-based filtering instead.',
    }),
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the list to get entries for',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of entries to fetch (default: 20)',
          example: 50,
        },
        offset: {
          type: 'number',
          description: 'Number of entries to skip for pagination (default: 0)',
          example: 0,
        },
      },
      required: ['listId'],
      additionalProperties: false,
    },
  },
  {
    name: 'filter-list-entries',
    description: formatToolDescription({
      capability: 'Filter list entries by single attribute condition.',
      boundaries:
        'combine conditions; use advanced-filter for multi-condition.',
      constraints: 'Requires listId, attributeSlug, condition, value.',
      recoveryHint: 'Use get-list-details for valid attribute slugs.',
    }),
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID of the list to filter entries from',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        attributeSlug: {
          type: 'string',
          description:
            "Slug of the attribute to filter by (e.g., 'stage', 'status')",
          example: 'stage',
        },
        condition: {
          type: 'string',
          description:
            "Filter condition (e.g., 'equals', 'contains', 'greater_than')",
          enum: [
            'equals',
            'not_equals',
            'contains',
            'not_contains',
            'starts_with',
            'ends_with',
            'greater_than',
            'less_than',
            'greater_than_or_equals',
            'less_than_or_equals',
            'is_empty',
            'is_not_empty',
            'is_set',
            'is_not_set',
          ],
          example: 'equals',
        },
        value: {
          description: 'Value to filter by (type depends on the attribute)',
          example: 'Qualified',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of entries to fetch (default: 20)',
          example: 50,
        },
        offset: {
          type: 'number',
          description: 'Number of entries to skip for pagination (default: 0)',
          example: 0,
        },
      },
      required: ['listId', 'attributeSlug', 'condition', 'value'],
      additionalProperties: false,
    },
  },
  {
    name: 'advanced-filter-list-entries',
    description: formatToolDescription({
      capability: 'Filter entries with multi-condition queries (AND/OR logic).',
      boundaries: 'modify entries; read-only.',
      constraints: 'Requires listId, filters array; matchAny for OR logic.',
      recoveryHint: 'Use filter-list-entries for single conditions.',
    }),
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID of the list to filter entries from',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        filters: {
          type: 'object',
          description: 'Advanced filter configuration',
          properties: {
            filters: {
              type: 'array',
              description: 'Array of filter conditions',
              items: {
                type: 'object',
                properties: {
                  attribute: {
                    type: 'object',
                    properties: {
                      slug: {
                        type: 'string',
                        description:
                          "Slug of the attribute to filter by (e.g., 'stage', 'status')",
                      },
                    },
                    required: ['slug'],
                  },
                  condition: {
                    type: 'string',
                    description:
                      "Filter condition (e.g., 'equals', 'contains', 'greater_than')",
                    enum: [
                      'equals',
                      'not_equals',
                      'contains',
                      'not_contains',
                      'starts_with',
                      'ends_with',
                      'greater_than',
                      'less_than',
                      'greater_than_or_equals',
                      'less_than_or_equals',
                      'is_empty',
                      'is_not_empty',
                      'is_set',
                      'is_not_set',
                    ],
                  },
                  value: {
                    description:
                      'Value to filter by (type depends on the attribute)',
                  },
                  logicalOperator: {
                    type: 'string',
                    description:
                      "Logical operator to use with the next filter (default: 'and')",
                    enum: ['and', 'or'],
                  },
                },
                required: ['attribute', 'condition', 'value'],
              },
            },
            matchAny: {
              type: 'boolean',
              description:
                'When true, at least one filter must match (OR logic). When false, all filters must match (AND logic). Default: false',
            },
          },
          required: ['filters'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of entries to fetch (default: 20)',
          example: 50,
        },
        offset: {
          type: 'number',
          description: 'Number of entries to skip for pagination (default: 0)',
          example: 0,
        },
      },
      required: ['listId', 'filters'],
      additionalProperties: false,
    },
  },
  {
    name: 'add-record-to-list',
    description: formatToolDescription({
      capability: 'Add company or person to list with optional initial values.',
      boundaries: 'create records; record must exist first.',
      requiresApproval: true,
      constraints: 'Requires list UUID, record UUID, object type.',
      recoveryHint: 'If not found, create record first with create-record.',
    }),
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the list to add the record to',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        recordId: {
          type: 'string',
          description: 'UUID of the record to add to the list',
          example: '660e8400-e29b-41d4-a716-446655440001',
        },
        objectType: {
          type: 'string',
          description: 'Type of record (e.g., "companies", "people")',
          enum: ['companies', 'people'],
          example: 'companies',
        },
        initialValues: {
          type: 'object',
          description:
            'Initial values for the list entry (e.g., {"stage": "Prospect"})',
          example: { stage: 'Qualified' },
        },
      },
      required: ['listId', 'recordId', 'objectType'],
      additionalProperties: false,
    },
  },
  {
    name: 'remove-record-from-list',
    description: formatToolDescription({
      capability: 'Remove company or person from list (membership only).',
      boundaries: 'delete underlying record; membership only.',
      requiresApproval: true,
      constraints: 'Requires list UUID, entry UUID (not record UUID).',
      recoveryHint: 'Use get-list-entries to find entry UUID.',
    }),
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the list to remove the entry from',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        entryId: {
          type: 'string',
          description: 'UUID of the list entry to remove (not the record ID)',
          example: '770e8400-e29b-41d4-a716-446655440002',
        },
      },
      required: ['listId', 'entryId'],
      additionalProperties: false,
    },
  },
  {
    name: 'update-list-entry',
    description: formatToolDescription({
      capability:
        'Update list entry attributes (stage, status, custom fields).',
      boundaries: 'update record attributes; use update-record for that.',
      requiresApproval: true,
      constraints: 'Requires list UUID, entry UUID, attributes object.',
      recoveryHint: 'Use get-list-details for valid attributes and values.',
    }),
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the list containing the entry',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        entryId: {
          type: 'string',
          description: 'UUID of the list entry to update',
          example: '770e8400-e29b-41d4-a716-446655440002',
        },
        attributes: {
          type: 'object',
          description: 'Attributes to update on the list entry',
          properties: {
            stage: {
              type: 'string',
              description:
                "New stage value (e.g., 'Demo Scheduling', 'Interested', 'Won')",
              example: 'Demo Scheduling',
            },
          },
          additionalProperties: true,
        },
      },
      required: ['listId', 'entryId', 'attributes'],
      additionalProperties: false,
    },
  },
  {
    name: 'filter-list-entries-by-parent',
    description: formatToolDescription({
      capability:
        'Filter entries by parent record attributes (industry, role).',
      boundaries: 'search multiple lists or modify records.',
      constraints:
        'Requires listId, parentObjectType, parentAttributeSlug, condition, value.',
      recoveryHint: 'Use records_discover_attributes for valid slugs.',
    }),
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the list to filter entries from',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        parentObjectType: {
          type: 'string',
          description:
            'Type of the parent record (e.g., "companies", "people")',
          enum: ['companies', 'people'],
          example: 'companies',
        },
        parentAttributeSlug: {
          type: 'string',
          description:
            'Attribute of the parent record to filter by (e.g., "name", "email_addresses", "categories")',
          example: 'categories',
        },
        condition: {
          type: 'string',
          description:
            'Filter condition (e.g., "equals", "contains", "starts_with")',
          enum: [
            'equals',
            'not_equals',
            'contains',
            'not_contains',
            'starts_with',
            'ends_with',
            'greater_than',
            'less_than',
            'greater_than_or_equals',
            'less_than_or_equals',
            'is_empty',
            'is_not_empty',
            'is_set',
            'is_not_set',
          ],
          example: 'contains',
        },
        value: {
          description: 'Value to filter by (type depends on the attribute)',
          example: 'Technology',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of entries to fetch (default: 20)',
          example: 50,
        },
        offset: {
          type: 'number',
          description: 'Number of entries to skip for pagination (default: 0)',
          example: 0,
        },
      },
      required: [
        'listId',
        'parentObjectType',
        'parentAttributeSlug',
        'condition',
        'value',
      ],
      additionalProperties: false,
    },
  },
  {
    name: 'filter-list-entries-by-parent-id',
    description: formatToolDescription({
      capability: 'Filter entries by exact parent record UUID.',
      boundaries: 'search multiple lists.',
      constraints:
        'Requires list UUID, record UUID; faster than attribute filtering.',
      recoveryHint:
        'Use get-record-list-memberships for workspace-wide search.',
    }),
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the list to filter entries from',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        recordId: {
          type: 'string',
          description: 'UUID of the parent record to filter by',
          example: '660e8400-e29b-41d4-a716-446655440001',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of entries to fetch (default: 20)',
          example: 50,
        },
        offset: {
          type: 'number',
          description: 'Number of entries to skip for pagination (default: 0)',
          example: 0,
        },
      },
      required: ['listId', 'recordId'],
      additionalProperties: false,
    },
  },
];
