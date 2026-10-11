/**
 * Lists-related tool configurations
 */
import { defineOperationTool } from '@/handlers/tools/operation-descriptor.js';

import { AttioList, AttioListEntry } from '@/types/attio.js';
import { isValidUUID } from '@/utils/validation/uuid-validation.js';
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
} from '@/objects/lists.js';
import {
  GetListsToolConfig,
  ToolConfig,
  GetListEntriesToolConfig,
  ListActionToolConfig,
  CreateListToolConfig,
  UpdateListConfigurationToolConfig,
} from '@/handlers/tool-types.js';
import {
  listCollectionResultContract,
  listConfigResultContract,
  listDetailsResultContract,
  listEntryCollectionResultContract,
  listEntryDeleteResultContract,
  listEntryMutationResultContract,
  listEntryResultContract,
  listMembershipCollectionResultContract,
} from '@/handlers/tools/result-schemas.js';
import {
  normalizeListCollection,
  normalizeListConfig,
  normalizeListDetails,
  normalizeListEntry,
  normalizeListEntryCollection,
  normalizeListEntryDelete,
  normalizeListEntryMutation,
  normalizeListMemberships,
} from '@/handlers/tool-configs/list-result-adapters.js';
import {
  InvalidCursorError,
  issueNextCursor,
  rejectCursorWithOffset,
  resolveCollectionCursor,
  splitLookaheadPage,
} from '@/handlers/tools/result-cursor.js';

/**
 * lists_list reports a finite, bounded directory. A cursor argument is a
 * continuation request against a family that cannot continue: reject it before
 * any Attio request (KTD6) instead of silently returning the first page.
 */
async function handleGetListsCursorAware(
  cursor?: unknown
): Promise<AttioList[]> {
  if (typeof cursor === 'string' && cursor.length > 0) {
    throw new InvalidCursorError(
      'lists_list is a finite bounded collection and does not support continuation cursors'
    );
  }
  return getLists();
}

/**
 * U5 continuation page for list entries (KTD6): offset-backed body pagination
 * with a one-item lookahead. The cursor is verified against the caller's
 * credential scope and list scope before any Attio request.
 */
async function handleListEntriesCursorPage(input: {
  listId: string;
  limit?: number;
  offset?: number;
  cursor?: string;
}): Promise<{
  data: AttioListEntry[];
  next_cursor: string | null;
  pagination: { supported: boolean; truncated: boolean };
}> {
  rejectCursorWithOffset({ cursor: input.cursor, offset: input.offset });
  const pageSize = input.limit ?? 20;
  const scope = {
    operation: 'list_entries_list',
    resource: input.listId,
    query: null,
  };
  let offset = input.offset ?? 0;
  if (input.cursor) {
    const resolved = resolveCollectionCursor(input.cursor, scope);
    if (resolved.pageSize !== pageSize) {
      throw new InvalidCursorError(
        'Continuation cursor page size does not match this request'
      );
    }
    offset = resolved.offset;
  }
  const page = await getListEntries(input.listId, pageSize + 1, offset);
  const { page: entries, hasMore } = splitLookaheadPage(page, pageSize);
  const issued = issueNextCursor({
    scope,
    pageSize,
    offset: offset + entries.length,
    hasMore,
  });
  return {
    data: entries,
    next_cursor: issued.next_cursor,
    pagination: issued.pagination,
  };
}

// Lists tool configurations
export const listsToolConfigs = {
  getLists: {
    name: 'lists_list',
    ...listCollectionResultContract,
    structuredOutput: normalizeListCollection,
    handler: handleGetListsCursorAware,
    formatResult: (results: AttioList[]) => {
      return JSON.stringify(Array.isArray(results) ? results : []);
    },
  } as GetListsToolConfig,
  getRecordListMemberships: {
    name: 'records_get_list_memberships',
    ...listMembershipCollectionResultContract,
    structuredOutput: normalizeListMemberships,
    handler: getRecordListMemberships,
    formatResult: (results: ListMembership[] | null | undefined) => {
      return JSON.stringify(Array.isArray(results) ? results : []);
    },
  } as ToolConfig,
  getListDetails: {
    name: 'lists_get',
    ...listDetailsResultContract,
    structuredOutput: normalizeListDetails,
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
    name: 'list_entries_list',
    ...listEntryCollectionResultContract,
    structuredOutput: normalizeListEntryCollection,
    handler: async (
      listId: string,
      limit?: number,
      offset?: number,
      _filters?: unknown,
      cursor?: unknown
    ) => {
      // UUID validation - hard fail for invalid list IDs
      if (!isValidUUID(listId)) {
        throw Object.assign(
          new Error(`Invalid list_id: must be a UUID. Got: ${listId}`),
          {
            code: 'VALIDATION_ERROR',
          }
        );
      }
      return handleListEntriesCursorPage({
        listId,
        limit,
        offset,
        cursor: typeof cursor === 'string' ? cursor : undefined,
      });
    },
    formatResult: (results: AttioListEntry[] | { data: AttioListEntry[] }) =>
      JSON.stringify(Array.isArray(results) ? results : results.data),
  } as GetListEntriesToolConfig,
  filterListEntries: {
    name: 'list_entries_filter',
    ...listEntryCollectionResultContract,
    structuredOutput: normalizeListEntryCollection,
    handler: filterListEntries,
    formatResult: (results: AttioListEntry[]) => {
      // Return JSON string
      return JSON.stringify(Array.isArray(results) ? results : []);
    },
  } as ToolConfig,

  advancedFilterListEntries: {
    name: 'list_entries_filter_advanced',
    ...listEntryCollectionResultContract,
    structuredOutput: normalizeListEntryCollection,
    handler: advancedFilterListEntries,
    formatResult: (results: AttioListEntry[]) => {
      // Return JSON string
      return JSON.stringify(Array.isArray(results) ? results : []);
    },
  } as ToolConfig,
  addRecordToList: {
    name: 'list_entries_add',
    ...listEntryResultContract,
    structuredOutput: normalizeListEntry,
    handler: async (
      listId: string,
      recordId: string,
      objectType: string,
      values?: Record<string, unknown>
    ) => {
      // UUID validation - hard fail for invalid list IDs
      if (!isValidUUID(listId)) {
        throw Object.assign(
          new Error(`Invalid list_id: must be a UUID. Got: ${listId}`),
          {
            code: 'VALIDATION_ERROR',
          }
        );
      }
      return await addRecordToList(listId, recordId, objectType, values);
    },
    idParams: ['listId', 'recordId'],
    formatResult: (result: AttioListEntry) => JSON.stringify(result),
  } as ToolConfig,
  removeRecordFromList: {
    name: 'list_entries_remove',
    ...listEntryDeleteResultContract,
    structuredOutput: normalizeListEntryDelete,
    handler: async (listId: string, entryId: string) => {
      // UUID validation - hard fail for invalid list IDs
      if (!isValidUUID(listId)) {
        throw Object.assign(
          new Error(`Invalid list_id: must be a UUID. Got: ${listId}`),
          {
            code: 'VALIDATION_ERROR',
          }
        );
      }
      return await removeRecordFromList(listId, entryId);
    },
    idParams: ['listId', 'entryId'],
  } as ListActionToolConfig<boolean>,
  updateListEntry: {
    name: 'list_entries_update',
    ...listEntryResultContract,
    structuredOutput: normalizeListEntry,
    handler: updateListEntry,
    formatResult: (result: AttioListEntry) => {
      // Return JSON string
      return JSON.stringify(result);
    },
  } as ToolConfig,

  manageListEntry: {
    name: 'list_entries_manage',
    type: 'manageListEntry' as const,
    ...listEntryMutationResultContract,
    structuredOutput: normalizeListEntryMutation,
    handler: () => {
      // Placeholder - actual routing happens in dispatcher
      throw new Error('Direct handler call not supported - use dispatcher');
    },
    idParams: ['listId'],
    formatResult: (result: AttioListEntry | boolean) => {
      // Return JSON string
      // Boolean result (from remove) is handled in dispatcher
      return JSON.stringify(result);
    },
  } as ListActionToolConfig,

  filterListEntriesByParent: {
    name: 'list_entries_filter_by_parent',
    ...listEntryCollectionResultContract,
    structuredOutput: normalizeListEntryCollection,
    handler: filterListEntriesByParent,
    formatResult: (results: AttioListEntry[]) => {
      // Return JSON string
      return JSON.stringify(Array.isArray(results) ? results : []);
    },
  } as ToolConfig,

  filterListEntriesByParentId: {
    name: 'list_entries_filter_by_parent_id',
    ...listEntryCollectionResultContract,
    structuredOutput: normalizeListEntryCollection,
    handler: filterListEntriesByParentId,
    formatResult: (results: AttioListEntry[]) => {
      // Return JSON string
      return JSON.stringify(Array.isArray(results) ? results : []);
    },
  } as ToolConfig,

  // Dedicated list configuration tools (Issue #1195)
  createList: {
    name: 'lists_create',
    type: 'createList' as const,
    ...listConfigResultContract,
    structuredOutput: normalizeListConfig,
    handler: () => {
      // Placeholder - actual routing happens in dispatcher
      throw new Error('Direct handler call not supported - use dispatcher');
    },
    formatResult: (result: unknown) => {
      return JSON.stringify(result);
    },
  } as CreateListToolConfig,

  updateListConfiguration: {
    name: 'lists_update_configuration',
    type: 'updateListConfiguration' as const,
    ...listConfigResultContract,
    structuredOutput: normalizeListConfig,
    handler: () => {
      // Placeholder - actual routing happens in dispatcher
      throw new Error('Direct handler call not supported - use dispatcher');
    },
    formatResult: (result: unknown) => {
      return JSON.stringify(result);
    },
  } as UpdateListConfigurationToolConfig,
};

// Lists tool definitions
export const listsToolDefinitions = [
  defineOperationTool({
    name: 'lists_list',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        action: 'read',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: false, cap: null },
      },
      guidance: {
        capability: 'List every CRM list visible to the workspace.',
        boundaries: 'create or modify lists.',
        constraints:
          'Returns all visible lists; no paging controls are exposed.',
        recovery: 'Inspect one list with lists_get for its schema.',
        alternatives: ['lists_get'],
      },
    },
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  }),
  defineOperationTool({
    name: 'records_get_list_memberships',
    facts: {
      operation: {
        customObjectSlugs: false,
        action: 'read',
        resourceTypes: ['lists', 'companies', 'people'],
        authRequired: true,
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: false, cap: null },
      },
      guidance: {
        capability: 'Find every list that contains one record.',
        boundaries: 'change membership, or read list entries themselves.',
        constraints:
          'Requires recordId; walks 5 lists in parallel by default (max 20).',
        recovery: 'Verify the record identifier with records_search first.',
        alternatives: ['list_entries_filter_by_parent_id'],
      },
    },
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
  }),
  defineOperationTool({
    name: 'lists_get',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        pagination: { kind: 'none', supported: false, cap: null },
        action: 'read',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
      },
      guidance: {
        capability: 'Read the schema and configuration of one list.',
        boundaries: 'change list structure or read its entries.',
        constraints: 'Accepts a list UUID or slug.',
        recovery: 'Discover identifiers with lists_list first.',
        alternatives: ['list_entries_list', 'lists_create'],
      },
    },
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
  }),
  defineOperationTool({
    name: 'list_entries_list',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        action: 'read',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'cursor', supported: true, cap: null },
      },
      guidance: {
        capability: 'Page through the records held in one list.',
        boundaries: 'filter entries or change memberships.',
        constraints:
          'Requires a list UUID (not a slug); default limit 20 under upstream page caps; continue with next_cursor only.',
        recovery: 'Use the filter tools when a condition is needed.',
        alternatives: ['list_entries_filter', 'list_entries_filter_advanced'],
      },
    },
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
        cursor: {
          type: 'string',
          maxLength: 512,
          description:
            'Opaque continuation token from a previous page of this exact list query. Never combine with offset.',
        },
      },
      required: ['listId'],
      additionalProperties: false,
    },
  }),
  defineOperationTool({
    name: 'list_entries_filter',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        action: 'search',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: false, cap: null },
      },
      guidance: {
        capability:
          'Filter list entries by attribute, parent attribute, or parent record.',
        boundaries: 'modify entries or search several lists at once.',
        constraints:
          'Mode auto-detects from the parameters supplied; exactly one mode per call. Offset-only live view; no continuation cursor.',
        recovery: 'Confirm attribute slugs with records_discover_attributes.',
        alternatives: [
          'list_entries_list',
          'list_entries_filter_advanced',
          'list_entries_filter_by_parent_id',
        ],
      },
    },
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description:
            'UUID of the list to filter entries from (required for all modes)',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        // Mode 1: Simple filtering parameters
        attributeSlug: {
          type: 'string',
          description:
            "Mode 1: Slug of the attribute to filter by (e.g., 'stage', 'status')",
          example: 'stage',
        },
        condition: {
          type: 'string',
          description:
            "Mode 1 & 3: Filter condition (e.g., 'equals', 'contains', 'greater_than')",
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
          description:
            'Mode 1 & 3: Value to filter by (type depends on the attribute)',
          example: 'Qualified',
        },
        // Mode 2: Advanced multi-condition filtering
        filters: {
          type: 'object',
          description:
            'Mode 2: Advanced filter configuration with multiple conditions',
          properties: {
            filters: {
              type: 'array',
              description: 'Array of filter conditions to apply',
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
        // Mode 3: Parent attribute filtering
        parentObjectType: {
          type: 'string',
          description:
            'Mode 3: Type of the parent record (e.g., "companies", "people")',
          enum: ['companies', 'people'],
          example: 'companies',
        },
        parentAttributeSlug: {
          type: 'string',
          description:
            'Mode 3: Attribute of the parent record to filter by (e.g., "name", "email_addresses", "categories")',
          example: 'categories',
        },
        // Mode 4: Parent UUID filtering
        parentRecordId: {
          type: 'string',
          description:
            'Mode 4: UUID of the parent record to filter by (fastest mode for exact record filtering)',
          example: '660e8400-e29b-41d4-a716-446655440001',
        },
        // Common pagination parameters for all modes
        limit: {
          type: 'number',
          description:
            'Maximum number of entries to fetch (default: 20, applies to all modes)',
          example: 50,
        },
        offset: {
          type: 'number',
          description:
            'Number of entries to skip for pagination (default: 0, applies to all modes)',
          example: 0,
        },
      },
      required: ['listId'],
      additionalProperties: false,
    },
  }),
  defineOperationTool({
    name: 'list_entries_filter_advanced',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        action: 'search',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: false, cap: null },
      },
      guidance: {
        capability:
          '[DEPRECATED] Filter list entries with nested filter groups.',
        boundaries: 'mutate entries or search across multiple lists.',
        constraints:
          'Requires listId and a filters structure. Offset-only live view; no continuation cursor.',
        recovery: 'Falling back to single-attribute filtering is cheaper.',
        alternatives: ['list_entries_filter', 'list_entries_list'],
      },
    },
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
  }),
  defineOperationTool({
    name: 'list_entries_add',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        pagination: { kind: 'none', supported: false, cap: null },
        action: 'write',
        resourceTypes: ['lists', 'companies', 'people'],
        readOnly: false,
        destructive: false,
        idempotent: true,
      },
      guidance: {
        capability:
          '[DEPRECATED] Add an existing record to a list with initial values.',
        boundaries: 'create the record itself, or delete anything.',
        constraints:
          'May require explicit user approval from the host. Requires list UUID, record UUID, and object type; the record must exist first.',
        recovery: 'Create the record, then add it to the list.',
        alternatives: ['list_entries_manage', 'records_create'],
      },
    },
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
  }),
  defineOperationTool({
    name: 'list_entries_remove',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        pagination: { kind: 'none', supported: false, cap: null },
        action: 'write',
        resourceTypes: ['lists'],
        readOnly: false,
        destructive: true,
        idempotent: true,
      },
      guidance: {
        capability: '[DEPRECATED] Remove a membership entry from a list.',
        boundaries: 'delete the underlying record; only membership changes.',
        constraints:
          'May require explicit user approval from the host. Requires listId and entryId (not the record UUID).',
        recovery: 'Locate the entry identifier with list_entries_list.',
        alternatives: ['list_entries_manage', 'list_entries_list'],
      },
    },
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
  }),
  defineOperationTool({
    name: 'list_entries_update',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        pagination: { kind: 'none', supported: false, cap: null },
        action: 'write',
        resourceTypes: ['lists'],
        readOnly: false,
        destructive: false,
        idempotent: true,
      },
      guidance: {
        capability: '[DEPRECATED] Update attributes on an existing list entry.',
        boundaries: 'update record attributes; use records_update for those.',
        constraints:
          'May require explicit user approval from the host. Requires listId, entryId, and an attributes object.',
        recovery: 'Read valid attributes and values with lists_get.',
        alternatives: ['list_entries_manage', 'records_update'],
      },
    },
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
  }),
  defineOperationTool({
    name: 'list_entries_manage',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        pagination: { kind: 'none', supported: false, cap: null },
        action: 'write',
        resourceTypes: ['lists', 'companies', 'people'],
        readOnly: false,
        destructive: true,
        idempotent: false,
      },
      guidance: {
        capability:
          'Add, remove, or update list entries through one parameter-driven surface.',
        boundaries:
          'create records, change list configuration, or run more than one mode per call.',
        constraints:
          'Mode is inferred from the parameters given; supply parameters for exactly one mode.',
        recovery: 'Re-read the list entries to confirm which mode applied.',
        alternatives: ['list_entries_add', 'list_entries_remove'],
      },
    },

    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the list (required for all modes)',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        // Mode 1 parameters
        recordId: {
          type: 'string',
          description: 'Mode 1: UUID of the record to add to the list',
          example: '660e8400-e29b-41d4-a716-446655440001',
        },
        objectType: {
          type: 'string',
          enum: ['companies', 'people'],
          description: 'Mode 1: Type of record to add',
        },
        initialValues: {
          type: 'object',
          description: 'Mode 1: Initial attribute values for the list entry',
          additionalProperties: true,
        },
        // Mode 2 & 3 parameters
        entryId: {
          type: 'string',
          description: 'Mode 2 & 3: UUID of the list entry to remove or update',
          example: '770e8400-e29b-41d4-a716-446655440002',
        },
        // Mode 3 parameters
        attributes: {
          type: 'object',
          description: 'Mode 3: Attributes to update on the list entry',
          additionalProperties: true,
        },
      },
      required: ['listId'],
      additionalProperties: false,
    },
  }),
  defineOperationTool({
    name: 'list_entries_filter_by_parent',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        action: 'search',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: false, cap: null },
      },
      guidance: {
        capability: '[DEPRECATED] Filter entries by a parent record attribute.',
        boundaries: 'search multiple lists, or modify records.',
        constraints:
          'Requires listId, parentObjectType, parentAttributeSlug, condition, and value. Offset-only live view; no continuation cursor.',
        recovery: 'Verify parent attribute slugs before filtering.',
        alternatives: [
          'list_entries_filter',
          'list_entries_filter_by_parent_id',
        ],
      },
    },
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
  }),
  defineOperationTool({
    name: 'list_entries_filter_by_parent_id',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        action: 'search',
        resourceTypes: ['lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: false, cap: null },
      },
      guidance: {
        capability:
          '[DEPRECATED] Filter entries by an exact parent record identifier.',
        boundaries: 'search multiple lists.',
        constraints:
          'Requires listId and recordId; faster than attribute-based filtering. Offset-only live view; no continuation cursor.',
        recovery: 'For workspace-wide membership, list memberships instead.',
        alternatives: ['records_get_list_memberships', 'list_entries_filter'],
      },
    },
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
  }),
  // Dedicated list configuration tools (Issue #1195)
  defineOperationTool({
    name: 'lists_create',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        pagination: { kind: 'none', supported: false, cap: null },
        action: 'write',
        resourceTypes: ['lists'],
        readOnly: false,
        destructive: false,
        idempotent: false,
      },
      guidance: {
        capability: 'Create a new CRM list, optionally from a template.',
        boundaries: 'update an existing list or manage its entries.',
        constraints:
          'Requires name and parent_object; template defaults apply before validation; dry-run previews without creating.',
        recovery: 'Confirm the result with lists_list, then configure it.',
        alternatives: ['lists_update_configuration'],
      },
    },
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the list to create',
          example: 'My Sales Pipeline',
        },
        parent_object: {
          type: 'string',
          description:
            'Object type this list is for (e.g., "companies", "people"). Auto-validated against workspace objects.',
          example: 'companies',
        },
        description: {
          type: 'string',
          description: 'Optional description for the list',
        },
        workspace_access: {
          type: 'string',
          description:
            'Workspace-wide access level for this list. Values: full-access, read-and-write, read-only, or "null" (private list; access granted only via workspace_member_access — sent to Attio as JSON null). New lists must have workspace_access=full-access or at least one member with full-access. Omitting both access fields defaults to full-access.',
          enum: ['full-access', 'read-and-write', 'read-only', 'null'],
        },
        workspace_member_access: {
          type: 'array',
          description:
            'Access granted to specific workspace members. Each entry grants a member a level. Member-level access can add access above the workspace default but cannot reduce it below workspace_access.',
          items: {
            type: 'object',
            properties: {
              workspace_member_id: {
                type: 'string',
                description: 'UUID of the workspace member to grant access to.',
              },
              level: {
                type: 'string',
                description: 'Access level for the member.',
                enum: ['full-access', 'read-and-write', 'read-only'],
              },
            },
            required: ['workspace_member_id', 'level'],
          },
        },
        template: {
          type: 'string',
          description:
            'Optional template name for smart defaults. Expands before validation so errors reference actual values.',
          enum: ['sales_pipeline', 'recruiting_tracker', 'support_queue'],
        },
        attributes: {
          type: 'object',
          description:
            'Additional list attributes (e.g., stages, custom fields). Merged onto template defaults if template is specified. Explicit first-class fields (workspace_access, workspace_member_access) take precedence over same-named keys here.',
          additionalProperties: true,
        },
        dry_run: {
          type: 'boolean',
          description:
            'Preview the creation without committing. Returns normalized preview of what would be created.',
          default: false,
        },
      },
      required: ['name', 'parent_object'],
      additionalProperties: false,
    },
  }),
  defineOperationTool({
    name: 'lists_update_configuration',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        pagination: { kind: 'none', supported: false, cap: null },
        action: 'write',
        resourceTypes: ['lists'],
        readOnly: false,
        destructive: true,
        idempotent: true,
      },
      guidance: {
        capability: 'Update configuration of an existing list.',
        boundaries:
          'change the immutable parent_object, or manage list entries.',
        constraints:
          'Requires listId; immutable fields are rejected before the API call; dry-run previews.',
        recovery: 'Read the current configuration, then retry the patch.',
        alternatives: ['lists_get', 'lists_create'],
      },
    },
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'UUID of the list to update',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        attributes: {
          type: 'object',
          description:
            'Attributes to update. Immutable fields (parent_object) will be rejected with a clear error. Explicit first-class fields (workspace_access, workspace_member_access) take precedence over same-named keys here.',
          additionalProperties: true,
        },
        workspace_access: {
          type: 'string',
          description:
            'Workspace-wide access level for this list. Values: full-access, read-and-write, read-only, or "null" (private list; access granted only via workspace_member_access — sent to Attio as JSON null). Lists must retain workspace_access=full-access or at least one member with full-access (enforced by Attio on update).',
          enum: ['full-access', 'read-and-write', 'read-only', 'null'],
        },
        workspace_member_access: {
          type: 'array',
          description:
            'Access granted to specific workspace members. Each entry grants a member a level. Member-level access can add access above the workspace default but cannot reduce it below workspace_access.',
          items: {
            type: 'object',
            properties: {
              workspace_member_id: {
                type: 'string',
                description: 'UUID of the workspace member to grant access to.',
              },
              level: {
                type: 'string',
                description: 'Access level for the member.',
                enum: ['full-access', 'read-and-write', 'read-only'],
              },
            },
            required: ['workspace_member_id', 'level'],
          },
        },
        dry_run: {
          type: 'boolean',
          description:
            'Preview the update without committing. Returns normalized preview of what would change.',
          default: false,
        },
      },
      required: ['listId', 'attributes'],
      additionalProperties: false,
    },
  }),
];
