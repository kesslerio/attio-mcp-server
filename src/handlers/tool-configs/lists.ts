/**
 * Lists-related tool configurations
 */

import {
  addRecordToList,
  advancedFilterListEntries,
  filterListEntries,
  filterListEntriesByParent,
  filterListEntriesByParentId,
  getListDetails,
  getListEntries,
  getLists,
  getRecordListMemberships,
  type ListMembership,
  removeRecordFromList,
  updateListEntry,
} from '../../objects/lists.js';
import type { AttioList, AttioListEntry } from '../../types/attio.js';
import { getRecordNameFromEntry } from '../../utils/record-utils.js';
import type {
  GetListEntriesToolConfig,
  GetListsToolConfig,
  ListActionToolConfig,
  ToolConfig,
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
          if (
            membership.entryValues &&
            Object.keys(membership.entryValues).length > 0
          ) {
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

          return `- Entry ID: ${entry.id?.entry_id || 'unknown'}, Record ID: ${
            entry.record_id || 'unknown'
          }${displayInfo}`;
        })
        .join('\n')}`;
    },
  } as GetListEntriesToolConfig,
  filterListEntries: {
    name: 'filter-list-entries',
    handler: filterListEntries,
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

          return `- Entry ID: ${entry.id?.entry_id || 'unknown'}, Record ID: ${
            entry.record_id || 'unknown'
          }${displayInfo}`;
        })
        .join('\n')}`;
    },
  } as ToolConfig,

  advancedFilterListEntries: {
    name: 'advanced-filter-list-entries',
    handler: advancedFilterListEntries,
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

          return `- Entry ID: ${entry.id?.entry_id || 'unknown'}, Record ID: ${
            entry.record_id || 'unknown'
          }${displayInfo}`;
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
      const values = result.values as Record<string, unknown>;
      if (values?.stage) {
        const stageValue = Array.isArray(values.stage)
          ? (values.stage[0] as { value: string }).value || values.stage[0]
          : (values.stage as { value: string }).value || values.stage;
        stageInfo = ` - Stage: ${stageValue}`;
      }

      return `Successfully updated list entry ${entryId} for record ${recordId}${stageInfo}`;
    },
  } as ToolConfig,

  filterListEntriesByParent: {
    name: 'filter-list-entries-by-parent',
    handler: filterListEntriesByParent,
    formatResult: (results: AttioListEntry[]) => {
      if (results.length === 0) {
        return 'No entries found matching the filter criteria.';
      }

      return `Found ${
        results.length
      } entries matching the parent record filter:\n${results
        .map((entry, index) => {
          // Extract record details with improved name and type extraction
          const recordDetails = getRecordNameFromEntry(entry);

          // Format display name with record type for better context
          let displayInfo = '';
          if (recordDetails.name) {
            displayInfo = recordDetails.type
              ? ` (${recordDetails.type}: ${recordDetails.name})`
              : ` (${recordDetails.name})`;
          }

          return `${index + 1}. Entry ID: ${
            entry.id?.entry_id || 'unknown'
          }, Record ID: ${entry.record_id || 'unknown'}${displayInfo}`;
        })
        .join('\n')}`;
    },
  } as ToolConfig,

  filterListEntriesByParentId: {
    name: 'filter-list-entries-by-parent-id',
    handler: filterListEntriesByParentId,
    formatResult: (results: AttioListEntry[]) => {
      if (results.length === 0) {
        return 'No entries found with the specified parent record ID.';
      }

      return `Found ${
        results.length
      } entries with the specified parent record ID:\n${results
        .map((entry, index) => {
          // Extract record details with improved name and type extraction
          const recordDetails = getRecordNameFromEntry(entry);

          // Format display name with record type for better context
          let displayInfo = '';
          if (recordDetails.name) {
            displayInfo = recordDetails.type
              ? ` (${recordDetails.type}: ${recordDetails.name})`
              : ` (${recordDetails.name})`;
          }

          return `${index + 1}. Entry ID: ${
            entry.id?.entry_id || 'unknown'
          }, Record ID: ${entry.record_id || 'unknown'}${displayInfo}`;
        })
        .join('\n')}`;
    },
  } as ToolConfig,
};

// Lists tool definitions
export const listsToolDefinitions = [
  {
    name: 'get-lists',
    description:
      'Get all CRM lists from Attio (sales pipelines, lead stages, customer segments, etc.)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get-record-list-memberships',
    description:
      'Find all CRM lists that a specific record (company, person, etc.) belongs to',
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
    },
  },
  {
    name: 'get-list-details',
    description:
      'Get details for a specific CRM list (pipeline stages, field configuration, etc.)',
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
    description:
      'Get entries for a specific CRM list (companies, people, etc. in sales pipelines)',
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
    description:
      'Filter entries in a CRM list by a specific attribute (e.g., stage, status)',
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
    description:
      'Filter entries in a CRM list with advanced multiple conditions (complex sales pipeline queries)',
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
    description:
      'Add a company or person to a CRM list (sales pipeline, lead list, etc.)',
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
          description:
            'Initial values for the list entry (e.g., {"stage": "Prospect"})',
        },
      },
      required: ['listId', 'recordId', 'objectType'],
    },
  },
  {
    name: 'remove-record-from-list',
    description:
      'Remove a company or person from a CRM list (sales pipeline, lead list, etc.)',
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
  {
    name: 'filter-list-entries-by-parent',
    description:
      'Filter CRM list entries based on parent record properties (find companies by industry, people by role, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID of the list to filter entries from',
        },
        parentObjectType: {
          type: 'string',
          description:
            'Type of the parent record (e.g., "companies", "people")',
          enum: ['companies', 'people'],
        },
        parentAttributeSlug: {
          type: 'string',
          description:
            'Attribute of the parent record to filter by (e.g., "name", "email_addresses", "industry")',
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
      required: [
        'listId',
        'parentObjectType',
        'parentAttributeSlug',
        'condition',
        'value',
      ],
    },
  },
  {
    name: 'filter-list-entries-by-parent-id',
    description:
      'Filter CRM list entries by parent record ID (find all lists containing a specific company or person)',
    inputSchema: {
      type: 'object',
      properties: {
        listId: {
          type: 'string',
          description: 'ID of the list to filter entries from',
        },
        recordId: {
          type: 'string',
          description: 'ID of the parent record to filter by',
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
      required: ['listId', 'recordId'],
    },
  },
];
