/**
 * Lists-related tool configurations
 */
import { AttioList, AttioListEntry } from '../../types/attio.js';
import { getRecordNameFromEntry } from '../../utils/record-utils.js';
import {
  getLists,
  getListDetails,
  getListEntries,
  addRecordToList,
  removeRecordFromList,
  updateListEntry,
  getRecordListMemberships,
  ListMembership,
} from '../../objects/lists.js';
import {
  GetListsToolConfig,
  ToolConfig,
  GetListEntriesToolConfig,
  ListActionToolConfig,
} from '../tool-types.js';

// Lists tool configurations
export const listsToolConfigs = {
  getLists: {
    name: 'get-lists',
    handler: getLists,
    formatResult: (results: AttioList[]) => {
      return `Found ${results.length} lists:\n${results
        .map((list: AttioList) => {
          // Extract list_id properly from id object
          const listId = list.id?.list_id || list.id || 'unknown';
          return `- ${list.name || list.title} (ID: ${listId})`;
        })
        .join('\n')}`;
    },
  } as GetListsToolConfig,
  getRecordListMemberships: {
    name: 'get-record-list-memberships',
    handler: getRecordListMemberships,
    formatResult: (results: ListMembership[]) => {
      if (results.length === 0) {
        return 'Record is not a member of any lists.';
      }
      
      return `Found ${results.length} list membership(s):\n${results
        .map((membership: ListMembership) => {
          // Format each membership with list name and IDs
          let membershipInfo = `- List: ${membership.listName} (ID: ${membership.listId})
  Entry ID: ${membership.entryId}`;
          
          // Add entry values if available
          if (membership.entryValues && Object.keys(membership.entryValues).length > 0) {
            const valuesString = Object.entries(membership.entryValues)
              .map(([key, value]) => `    ${key}: ${value}`)
              .join('\n');
            membershipInfo += `\n  Entry Values:\n${valuesString}`;
          }
          
          return membershipInfo;
        })
        .join('\n')}`;
    },
  } as ToolConfig,
  getListDetails: {
    name: 'get-list-details',
    handler: getListDetails,
    formatResult: (result: AttioList) => {
      // Extract list_id properly from id object
      const listId = result.id?.list_id || result.id || 'unknown';
      const listName = result.name || result.title || 'Unnamed List';
      const objectType = result.object_slug || 'unknown';
      const entryCount =
        result.entry_count !== undefined
          ? `${result.entry_count} entries`
          : 'Unknown entry count';
      // Format dates in ISO format for consistency across environments
      const createdAt = result.created_at
        ? new Date(result.created_at).toISOString().split('T')[0]
        : 'Unknown date';
      const updatedAt = result.updated_at
        ? new Date(result.updated_at).toISOString().split('T')[0]
        : 'Unknown date';

      return `List Details:
ID: ${listId}
Name: ${listName}
Object Type: ${objectType}
${entryCount}
Created: ${createdAt}
Updated: ${updatedAt}
${result.description ? `\nDescription: ${result.description}` : ''}`;
    },
  } as ToolConfig,
  getListEntries: {
    name: 'get-list-entries',
    handler: getListEntries,
    formatResult: (results: AttioListEntry[]) => {
      return `Found ${results.length} entries in list:\n${results
        .map((entry: AttioListEntry) => {
          // Extract record details with improved name and type extraction
          const recordDetails = getRecordNameFromEntry(entry);

          // Format display name with record type for better context
          let displayInfo = '';
          if (recordDetails.name) {
            displayInfo = recordDetails.type
              ? ` (${recordDetails.type}: ${recordDetails.name})`
              : ` (${recordDetails.name})`;
          }

          return `- Entry ID: ${entry.id?.entry_id || 'unknown'}, Record ID: ${entry.record_id || 'unknown'}${displayInfo}`;
        })
        .join('\n')}`;
    },
  } as GetListEntriesToolConfig,
  filterListEntries: {
    name: 'filter-list-entries',
    handler: (
      listId: string,
      attributeSlug: string,
      condition: string,
      value: any,
      limit?: number,
      offset?: number
    ) => {
      // Create filter structure
      const filters = {
        filters: [
          {
            attribute: {
              slug: attributeSlug,
            },
            condition: condition,
            value: value,
          },
        ],
      };

      // Call getListEntries with filters
      return getListEntries(listId, limit || 20, offset || 0, filters);
    },
    formatResult: (results: AttioListEntry[]) => {
      return `Found ${results.length} filtered entries in list:\n${results
        .map((entry: AttioListEntry) => {
          // Extract record details with improved name and type extraction
          const recordDetails = getRecordNameFromEntry(entry);

          // Format display name with record type for better context
          let displayInfo = '';
          if (recordDetails.name) {
            displayInfo = recordDetails.type
              ? ` (${recordDetails.type}: ${recordDetails.name})`
              : ` (${recordDetails.name})`;
          }

          return `- Entry ID: ${entry.id?.entry_id || 'unknown'}, Record ID: ${entry.record_id || 'unknown'}${displayInfo}`;
        })
        .join('\n')}`;
    },
  } as ToolConfig,

  advancedFilterListEntries: {
    name: 'advanced-filter-list-entries',
    handler: (
      listId: string,
      filters: {
        filters: Array<{
          attribute: { slug: string };
          condition: string;
          value: any;
          logicalOperator?: 'and' | 'or';
        }>;
        matchAny?: boolean;
      },
      limit?: number,
      offset?: number
    ) => {
      // Call getListEntries with the advanced filters
      return getListEntries(listId, limit || 20, offset || 0, filters);
    },
    formatResult: (results: AttioListEntry[]) => {
      return `Found ${results.length} filtered entries in list:\n${results
        .map((entry: AttioListEntry) => {
          // Extract record details with improved name and type extraction
          const recordDetails = getRecordNameFromEntry(entry);

          // Format display name with record type for better context
          let displayInfo = '';
          if (recordDetails.name) {
            displayInfo = recordDetails.type
              ? ` (${recordDetails.type}: ${recordDetails.name})`
              : ` (${recordDetails.name})`;
          }

          return `- Entry ID: ${entry.id?.entry_id || 'unknown'}, Record ID: ${entry.record_id || 'unknown'}${displayInfo}`;
        })
        .join('\n')}`;
    },
  } as ToolConfig,
  addRecordToList: {
    name: 'add-record-to-list',
    handler: addRecordToList,
    idParams: ['listId', 'recordId'],
    formatResult: (result: AttioListEntry) => {
      const entryId = result.id?.entry_id || 'unknown';
      const recordId = result.record_id || result.parent_record_id || 'unknown';
      
      return `Successfully added record ${recordId} to list (Entry ID: ${entryId})`;
    },
  } as ToolConfig,
  removeRecordFromList: {
    name: 'remove-record-from-list',
    handler: removeRecordFromList,
    idParams: ['listId', 'entryId'],
  } as ListActionToolConfig,
  updateListEntry: {
    name: 'update-list-entry',
    handler: updateListEntry,
    formatResult: (result: AttioListEntry) => {
      const entryId = result.id?.entry_id || 'unknown';
      const recordId = result.record_id || 'unknown';

      // Extract stage information if available
      let stageInfo = '';
      const values = result.values as any;
      if (values && values.stage) {
        const stageValue = Array.isArray(values.stage)
          ? values.stage[0]?.value || values.stage[0]
          : values.stage.value || values.stage;
        stageInfo = ` - Stage: ${stageValue}`;
      }

      return `Successfully updated list entry ${entryId} for record ${recordId}${stageInfo}`;
    },
  } as ToolConfig,
};

// Lists tool definitions
export const listsToolDefinitions = [
  {
    name: 'get-lists',
    description: 'Get all lists in Attio',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get-record-list-memberships',
    description: 'Find all lists that a specific record (company, person, etc.) belongs to',
    inputSchema: {
      type: 'object',
      properties: {
        recordId: {
          type: 'string',
          description: 'ID of the record to find in lists',
        },
        objectType: {
          type: 'string',
          description: 'Type of record (e.g., "companies", "people")',
          enum: ['companies', 'people'],
        },
        includeEntryValues: {
          type: 'boolean',
          description: 'Whether to include entry values in the response (e.g., stage, status)',
          default: false,
        },
        batchSize: {
          type: 'number',
          description: 'Number of lists to process in parallel (1-20, default: 5)',
          minimum: 1,
          maximum: 20,
          default: 5
        }
      },
      required: ['recordId'],
    },
  },
  {
    name: 'get-list-details',
    description: 'Get details for a specific list',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID of the list to get details for',
        },
      },
      required: ['listId'],
    },
  },
  {
    name: 'get-list-entries',
    description: 'Get entries for a specific list',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID of the list to get entries for',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of entries to fetch (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Number of entries to skip for pagination (default: 0)',
        },
      },
      required: ['listId'],
    },
  },
  {
    name: 'filter-list-entries',
    description: 'Filter entries in a list by a specific attribute',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID of the list to filter entries from',
        },
        attributeSlug: {
          type: 'string',
          description:
            "Slug of the attribute to filter by (e.g., 'stage', 'status')",
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
          description: 'Value to filter by (type depends on the attribute)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of entries to fetch (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Number of entries to skip for pagination (default: 0)',
        },
      },
      required: ['listId', 'attributeSlug', 'condition', 'value'],
    },
  },
  {
    name: 'advanced-filter-list-entries',
    description: 'Filter entries in a list with advanced multiple conditions',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID of the list to filter entries from',
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
        },
        offset: {
          type: 'number',
          description: 'Number of entries to skip for pagination (default: 0)',
        },
      },
      required: ['listId', 'filters'],
    },
  },
  {
    name: 'add-record-to-list',
    description: 'Add a record to a list',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID of the list to add the record to',
        },
        recordId: {
          type: 'string',
          description: 'ID of the record to add to the list',
        },
        objectType: {
          type: 'string',
          description: 'Type of record (e.g., "companies", "people")',
          enum: ['companies', 'people'],
        },
        initialValues: {
          type: 'object',
          description: 'Initial values for the list entry (e.g., {"stage": "Prospect"})',
        },
      },
      required: ['listId', 'recordId'],
    },
  },
  {
    name: 'remove-record-from-list',
    description: 'Remove a record from a list',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID of the list to remove the record from',
        },
        entryId: {
          type: 'string',
          description: 'ID of the list entry to remove',
        },
      },
      required: ['listId', 'entryId'],
    },
  },
  {
    name: 'update-list-entry',
    description:
      "Update a list entry (e.g., change stage from 'Interested' to 'Demo Scheduling')",
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID of the list containing the entry',
        },
        entryId: {
          type: 'string',
          description: 'ID of the list entry to update',
        },
        attributes: {
          type: 'object',
          description: 'Attributes to update on the list entry',
          properties: {
            stage: {
              type: 'string',
              description:
                "New stage value (e.g., 'Demo Scheduling', 'Interested', 'Won')",
            },
          },
          additionalProperties: true,
        },
      },
      required: ['listId', 'entryId', 'attributes'],
    },
  },
];
