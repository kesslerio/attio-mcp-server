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
      return `Found ${results.length} lists:\n${results.map((list: AttioList) => 
        `- ${list.name} (ID: ${list.id})`).join('\n')}`;
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
        // Include both entry ID and record ID for better visibility
        const recordName = getRecordNameFromEntry(entry);
        const displayName = recordName ? ` (${recordName})` : '';
        
        return `- Entry ID: ${entry.id?.entry_id || 'unknown'}, Record ID: ${entry.record_id || 'unknown'}${displayName}`;
      }).join('\n')}`;
    }
  } as GetListEntriesToolConfig,
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
        }
      },
      required: ["listId"]
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
