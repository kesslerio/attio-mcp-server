/**
 * Lists-related tool configurations
 */
import { ResourceType, AttioList, AttioListEntry } from "../../types/attio.js";
import { getRecordNameFromEntry } from "../../utils/record-utils.js";
import {
  getLists,
  getListDetails,
  getListEntries,
  addRecordToList,
  removeRecordFromList
} from "../../objects/lists.js";
import { 
  GetListsToolConfig, 
  ToolConfig, 
  GetListEntriesToolConfig, 
  ListActionToolConfig 
} from "../tool-types.js";

// Lists tool configurations
export const listsToolConfigs = {
  getLists: {
    name: "get-lists",
    handler: getLists,
    formatResult: (results: AttioList[]) => {
      return `Found ${results.length} lists:\n${results.map((list: AttioList) => {
        // Extract list_id properly from id object
        const listId = list.id?.list_id || list.id || 'unknown';
        return `- ${list.name || list.title} (ID: ${listId})`;
      }).join('\n')}`;
    }
  } as GetListsToolConfig,
  getListDetails: {
    name: "get-list-details",
    handler: getListDetails,
  } as ToolConfig,
  getListEntries: {
    name: "get-list-entries",
    handler: getListEntries,
    formatResult: (results: AttioListEntry[]) => {
      return `Found ${results.length} entries in list:\n${results.map((entry: AttioListEntry) => {
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
      }).join('\n')}`;
    }
  } as GetListEntriesToolConfig,
  filterListEntries: {
    name: "filter-list-entries",
    handler: (listId: string, attributeSlug: string, condition: string, value: any, limit?: number, offset?: number) => {
      // Create filter structure
      const filters = {
        filters: [
          {
            attribute: {
              slug: attributeSlug
            },
            condition: condition,
            value: value
          }
        ]
      };
      
      // Call getListEntries with filters
      return getListEntries(listId, limit || 20, offset || 0, filters);
    },
    formatResult: (results: AttioListEntry[]) => {
      return `Found ${results.length} filtered entries in list:\n${results.map((entry: AttioListEntry) => {
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
      }).join('\n')}`;
    }
  } as ToolConfig,
  addRecordToList: {
    name: "add-record-to-list",
    handler: addRecordToList,
    idParams: ["listId", "recordId"],
  } as ListActionToolConfig,
  removeRecordFromList: {
    name: "remove-record-from-list",
    handler: removeRecordFromList,
    idParams: ["listId", "entryId"],
  } as ListActionToolConfig
};

// Lists tool definitions
export const listsToolDefinitions = [
  {
    name: "get-lists",
    description: "Get all lists in Attio",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get-list-details",
    description: "Get details for a specific list",
    inputSchema: {
      type: "object",
      properties: {
        listId: {
          type: "string",
          description: "ID of the list to get details for"
        }
      },
      required: ["listId"]
    }
  },
  {
    name: "get-list-entries",
    description: "Get entries for a specific list",
    inputSchema: {
      type: "object",
      properties: {
        listId: {
          type: "string",
          description: "ID of the list to get entries for"
        },
        limit: {
          type: "number",
          description: "Maximum number of entries to fetch (default: 20)"
        },
        offset: {
          type: "number",
          description: "Number of entries to skip for pagination (default: 0)"
        }
      },
      required: ["listId"]
    }
  },
  {
    name: "filter-list-entries",
    description: "Filter entries in a list by a specific attribute",
    inputSchema: {
      type: "object",
      properties: {
        listId: {
          type: "string",
          description: "ID of the list to filter entries from"
        },
        attributeSlug: {
          type: "string",
          description: "Slug of the attribute to filter by (e.g., 'stage', 'status')"
        },
        condition: {
          type: "string",
          description: "Filter condition (e.g., 'equals', 'contains', 'greater_than')",
          enum: [
            "equals", "not_equals", "contains", "not_contains", 
            "starts_with", "ends_with", "greater_than", "less_than", 
            "greater_than_or_equals", "less_than_or_equals", 
            "is_empty", "is_not_empty", "is_set", "is_not_set"
          ]
        },
        value: {
          description: "Value to filter by (type depends on the attribute)"
        },
        limit: {
          type: "number",
          description: "Maximum number of entries to fetch (default: 20)"
        },
        offset: {
          type: "number",
          description: "Number of entries to skip for pagination (default: 0)"
        }
      },
      required: ["listId", "attributeSlug", "condition", "value"]
    }
  },
  {
    name: "add-record-to-list",
    description: "Add a record to a list",
    inputSchema: {
      type: "object",
      properties: {
        listId: {
          type: "string",
          description: "ID of the list to add the record to"
        },
        recordId: {
          type: "string",
          description: "ID of the record to add to the list"
        }
      },
      required: ["listId", "recordId"]
    }
  },
  {
    name: "remove-record-from-list",
    description: "Remove a record from a list",
    inputSchema: {
      type: "object",
      properties: {
        listId: {
          type: "string",
          description: "ID of the list to remove the record from"
        },
        entryId: {
          type: "string",
          description: "ID of the list entry to remove"
        }
      },
      required: ["listId", "entryId"]
    }
  }
];
