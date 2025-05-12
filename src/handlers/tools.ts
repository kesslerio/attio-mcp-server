/**
 * Handlers for tool-related requests
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createErrorResult } from "../utils/error-handler.js";
import { 
  searchCompanies, 
  getCompanyDetails, 
  getCompanyNotes, 
  createCompanyNote 
} from "../objects/companies.js";
import {
  searchPeople,
  searchPeopleByEmail,
  searchPeopleByPhone,
  getPersonDetails,
  getPersonNotes,
  createPersonNote
} from "../objects/people.js";
import {
  getLists,
  getListDetails,
  getListEntries,
  addRecordToList,
  removeRecordFromList
} from "../objects/lists.js";
import { parseResourceUri } from "../utils/uri-parser.js";
import { ResourceType, AttioRecord, AttioNote, AttioList, AttioListEntry } from "../types/attio.js";

// Tool Configuration Types
interface ToolConfig {
  name: string;
  handler: (...args: any[]) => Promise<any>;
}

interface SearchToolConfig extends ToolConfig {
  formatResult: (results: AttioRecord[]) => string;
}

interface DetailsToolConfig extends ToolConfig {
}

interface NotesToolConfig extends ToolConfig {
}

interface CreateNoteToolConfig extends ToolConfig {
  idParam: string;
}

interface GetListsToolConfig extends ToolConfig {
  formatResult: (results: AttioList[]) => string;
}

interface GetListEntriesToolConfig extends ToolConfig {
  formatResult: (results: AttioListEntry[]) => string;
}

interface ListActionToolConfig extends ToolConfig {
  idParams: string[];
}

// Configuration for all tools by resource type
const TOOL_CONFIGS: Record<ResourceType, {
  search?: SearchToolConfig;
  details?: DetailsToolConfig;
  notes?: NotesToolConfig;
  createNote?: CreateNoteToolConfig;
  
  // Lists-specific operations
  getLists?: GetListsToolConfig;
  getListDetails?: ToolConfig;
  getListEntries?: GetListEntriesToolConfig;
  addRecordToList?: ListActionToolConfig;
  removeRecordFromList?: ListActionToolConfig;
}> = {
  [ResourceType.COMPANIES]: {
    search: {
      name: "search-companies",
      handler: searchCompanies,
      formatResult: (results) => results.map((company) => {
        const companyName = company.values?.name?.[0]?.value || "Unknown Company";
        const companyId = company.id?.record_id || "Record ID not found";
        return `${companyName}: attio://companies/${companyId}`;
      }).join("\n"),
    },
    details: {
      name: "read-company-details",
      handler: getCompanyDetails,
    },
    notes: {
      name: "read-company-notes",
      handler: getCompanyNotes,
    },
    createNote: {
      name: "create-company-note",
      handler: createCompanyNote,
      idParam: "companyId",
    },
  },
  [ResourceType.PEOPLE]: {
    search: {
      name: "search-people",
      handler: searchPeople,
      formatResult: (results) => results.map((person) => {
        const personName = person.values?.name?.[0]?.value || "Unknown Person";
        const personId = person.id?.record_id || "Record ID not found";
        const personEmail = person.values?.email?.[0]?.value ? ` (${person.values.email[0].value})` : '';
        return `${personName}${personEmail}: attio://people/${personId}`;
      }).join("\n"),
    },
    details: {
      name: "read-person-details",
      handler: getPersonDetails,
    },
    notes: {
      name: "read-person-notes",
      handler: getPersonNotes,
    },
    createNote: {
      name: "create-person-note",
      handler: createPersonNote,
      idParam: "personId",
    },
  },
  [ResourceType.LISTS]: {
    getLists: {
      name: "get-lists",
      handler: getLists,
      formatResult: (results) => results.map((list) => {
        const listTitle = list.title || "Untitled List";
        const listId = typeof list.id === 'object' ? list.id.list_id : list.id;
        return `${listTitle}: attio://lists/${listId}`;
      }).join("\n"),
    },
    getListDetails: {
      name: "get-list-details",
      handler: getListDetails,
    },
    getListEntries: {
      name: "get-list-entries",
      handler: getListEntries,
      formatResult: (results) => results.map((entry) => {
        const entryId = typeof entry.id === 'object' ? entry.id.entry_id : entry.id;
        const recordId = entry.record_id;
        return `Entry ID: ${entryId}, Record ID: ${recordId}`;
      }).join("\n"),
    },
    addRecordToList: {
      name: "add-record-to-list",
      handler: addRecordToList,
      idParams: ["listId", "recordId"],
    },
    removeRecordFromList: {
      name: "remove-record-from-list",
      handler: removeRecordFromList,
      idParams: ["listId", "entryId"],
    },
  },
};

// Tool definitions including schemas, organized by resource type
const TOOL_DEFINITIONS: Record<ResourceType, Array<{
  name: string;
  description: string;
  inputSchema: any;
}>> = {
  [ResourceType.COMPANIES]: [
    {
      name: "search-companies",
      description: "Search for companies by name",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Company name or keyword to search for",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "read-company-details",
      description: "Read details of a company",
      inputSchema: {
        type: "object",
        properties: {
          uri: {
            type: "string",
            description: "URI of the company to read",
          },
        },
        required: ["uri"],
      },
    },
    {
      name: "read-company-notes",
      description: "Read notes for a company",
      inputSchema: {
        type: "object",
        properties: {
          uri: {
            type: "string",
            description: "URI of the company to read notes for",
          },
          limit: {
            type: "number",
            description: "Maximum number of notes to fetch (optional, default 10)",
          },
          offset: {
            type: "number",
            description: "Number of notes to skip (optional, default 0)",
          },
        },
        required: ["uri"],
      },
    },
    {
      name: "create-company-note",
      description: "Add a new note to a company",
      inputSchema: {
        type: "object",
        properties: {
          companyId: {
            type: "string",
            description: "ID of the company to add the note to",
          },
          noteTitle: {
            type: "string",
            description: "Title of the note",
          },
          noteText: {
            type: "string",
            description: "Text content of the note",
          },
        },
        required: ["companyId", "noteTitle", "noteText"],
      },
    }
  ],
  [ResourceType.PEOPLE]: [
    {
      name: "search-people",
      description: "Search for people by name, email, or phone number",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Person name, email, phone number, or keyword to search for",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "read-person-details",
      description: "Read details of a person",
      inputSchema: {
        type: "object",
        properties: {
          uri: {
            type: "string",
            description: "URI of the person to read",
          },
        },
        required: ["uri"],
      },
    },
    {
      name: "read-person-notes",
      description: "Read notes for a person",
      inputSchema: {
        type: "object",
        properties: {
          uri: {
            type: "string",
            description: "URI of the person to read notes for",
          },
          limit: {
            type: "number",
            description: "Maximum number of notes to fetch (optional, default 10)",
          },
          offset: {
            type: "number",
            description: "Number of notes to skip (optional, default 0)",
          },
        },
        required: ["uri"],
      },
    },
    {
      name: "create-person-note",
      description: "Add a new note to a person",
      inputSchema: {
        type: "object",
        properties: {
          personId: {
            type: "string",
            description: "ID of the person to add the note to",
          },
          noteTitle: {
            type: "string",
            description: "Title of the note",
          },
          noteText: {
            type: "string",
            description: "Text content of the note",
          },
        },
        required: ["personId", "noteTitle", "noteText"],
      },
    }
  ],
  [ResourceType.LISTS]: [
    {
      name: "get-lists",
      description: "Get all lists in the workspace",
      inputSchema: {
        type: "object",
        properties: {
          objectSlug: {
            type: "string",
            description: "Optional object type to filter lists by (e.g., 'companies', 'people')",
          },
          limit: {
            type: "number",
            description: "Maximum number of lists to fetch (default: 20)",
          },
        },
      },
    },
    {
      name: "get-list-details",
      description: "Get details for a specific list",
      inputSchema: {
        type: "object",
        properties: {
          listId: {
            type: "string",
            description: "The ID of the list",
          },
        },
        required: ["listId"],
      },
    },
    {
      name: "get-list-entries",
      description: "Get entries for a specific list",
      inputSchema: {
        type: "object",
        properties: {
          listId: {
            type: "string",
            description: "The ID of the list",
          },
          limit: {
            type: "number",
            description: "Maximum number of entries to fetch (default: 20)",
          },
          offset: {
            type: "number",
            description: "Number of entries to skip (default: 0)",
          },
        },
        required: ["listId"],
      },
    },
    {
      name: "add-record-to-list",
      description: "Add a record to a list",
      inputSchema: {
        type: "object",
        properties: {
          listId: {
            type: "string",
            description: "The ID of the list",
          },
          recordId: {
            type: "string",
            description: "The ID of the record to add",
          },
        },
        required: ["listId", "recordId"],
      },
    },
    {
      name: "remove-record-from-list",
      description: "Remove a record from a list",
      inputSchema: {
        type: "object",
        properties: {
          listId: {
            type: "string",
            description: "The ID of the list",
          },
          entryId: {
            type: "string",
            description: "The ID of the list entry to remove",
          },
        },
        required: ["listId", "entryId"],
      },
    }
  ]
};

/**
 * Find the tool config for a given tool name
 * 
 * @param toolName - The name of the tool
 * @returns Tool configuration or undefined if not found
 */
function findToolConfig(toolName: string): { 
  resourceType: ResourceType; 
  toolConfig: ToolConfig; 
  toolType: string;
} | undefined {
  // Define all possible tool types
  const toolTypes = [
    'search', 'details', 'notes', 'createNote',
    'getLists', 'getListDetails', 'getListEntries', 'addRecordToList', 'removeRecordFromList'
  ] as const;
  
  for (const resourceType of Object.values(ResourceType)) {
    const resourceConfig = TOOL_CONFIGS[resourceType];
    
    for (const toolType of toolTypes) {
      if (resourceConfig[toolType]?.name === toolName) {
        return {
          resourceType,
          toolConfig: resourceConfig[toolType],
          toolType
        };
      }
    }
  }
  return undefined;
}

/**
 * Registers tool-related request handlers with the server
 * 
 * @param server - The MCP server instance
 */
export function registerToolHandlers(server: Server): void {
  // Handler for listing available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        ...TOOL_DEFINITIONS[ResourceType.COMPANIES],
        ...TOOL_DEFINITIONS[ResourceType.PEOPLE],
        ...TOOL_DEFINITIONS[ResourceType.LISTS]
      ],
    };
  });

  // Handler for calling tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    try {
      const toolInfo = findToolConfig(toolName);
      
      if (!toolInfo) {
        throw new Error(`Tool not found: ${toolName}`);
      }
      
      const { resourceType, toolConfig, toolType } = toolInfo;
      
      // Handle search tools
      if (toolType === 'search') {
        const query = request.params.arguments?.query as string;
        try {
          const searchToolConfig = toolConfig as SearchToolConfig;
          const results = await searchToolConfig.handler(query);
          const formattedResults = searchToolConfig.formatResult(results);
          
          return {
            content: [
              {
                type: "text",
                text: `Found ${results.length} ${resourceType}:\n${formattedResults}`,
              },
            ],
            isError: false,
          };
        } catch (error) {
          return createErrorResult(
            error instanceof Error ? error : new Error("Unknown error"),
            `/objects/${resourceType}/records/query`,
            "POST",
            (error as any).response?.data || {}
          );
        }
      }
      
      // Handle details tools
      if (toolType === 'details') {
        const uri = request.params.arguments?.uri as string;
        
        try {
          const [uriType, id] = parseResourceUri(uri);
          if (uriType !== resourceType) {
            throw new Error(`URI type mismatch: Expected ${resourceType}, got ${uriType}`);
          }
          
          const details = await toolConfig.handler(id);
          return {
            content: [
              {
                type: "text",
                text: `${resourceType.slice(0, -1).charAt(0).toUpperCase() + resourceType.slice(1, -1)} details for ${id}:\n${JSON.stringify(details, null, 2)}`,
              },
            ],
            isError: false,
          };
        } catch (error) {
          return createErrorResult(
            error instanceof Error ? error : new Error("Unknown error"),
            uri,
            "GET",
            (error as any).response?.data || {}
          );
        }
      }
      
      // Handle notes tools
      if (toolType === 'notes') {
        const uri = request.params.arguments?.uri as string;
        const limit = request.params.arguments?.limit as number || 10;
        const offset = request.params.arguments?.offset as number || 0;
        
        try {
          const [uriType, id] = parseResourceUri(uri);
          if (uriType !== resourceType) {
            throw new Error(`URI type mismatch: Expected ${resourceType}, got ${uriType}`);
          }
          
          const notes = await toolConfig.handler(id, limit, offset);
          
          return {
            content: [
              {
                type: "text",
                text: `Found ${notes.length} notes for ${resourceType.slice(0, -1)} ${id}:\n${notes.map((note: any) => JSON.stringify(note)).join("----------\n")}`,
              },
            ],
            isError: false,
          };
        } catch (error) {
          return createErrorResult(
            error instanceof Error ? error : new Error("Unknown error"),
            uri,
            "GET",
            (error as any).response?.data || {}
          );
        }
      }
      
      // Handle create note tools
      if (toolType === 'createNote') {
        const createNoteConfig = toolConfig as CreateNoteToolConfig;
        const idParam = createNoteConfig.idParam;
        const id = request.params.arguments?.[idParam] as string;
        const noteTitle = request.params.arguments?.noteTitle as string;
        const noteText = request.params.arguments?.noteText as string;
        
        try {
          const response = await toolConfig.handler(id, noteTitle, noteText);
          
          return {
            content: [
              {
                type: "text",
                text: `Note added to ${resourceType.slice(0, -1)} ${id}: attio://notes/${response?.id?.note_id}`,
              },
            ],
            isError: false,
          };
        } catch (error) {
          return createErrorResult(
            error instanceof Error ? error : new Error("Unknown error"),
            "/notes",
            "POST",
            (error as any).response?.data || {}
          );
        }
      }
      
      // Lists API tools
      
      // Handle getLists tool
      if (toolType === 'getLists') {
        const objectSlug = request.params.arguments?.objectSlug as string;
        const limit = request.params.arguments?.limit as number || 20;
        
        try {
          const lists = await toolConfig.handler(objectSlug, limit);
          const getListsToolConfig = toolConfig as GetListsToolConfig;
          const formattedResults = getListsToolConfig.formatResult 
            ? getListsToolConfig.formatResult(lists)
            : JSON.stringify(lists, null, 2);
          
          return {
            content: [
              {
                type: "text",
                text: `Found ${lists.length} lists:\n${formattedResults}`,
              },
            ],
            isError: false,
          };
        } catch (error) {
          return createErrorResult(
            error instanceof Error ? error : new Error("Unknown error"),
            "/lists",
            "GET",
            (error as any).response?.data || {}
          );
        }
      }
      
      // Handle getListDetails tool
      if (toolType === 'getListDetails') {
        const listId = request.params.arguments?.listId as string;
        
        try {
          const list = await toolConfig.handler(listId);
          
          return {
            content: [
              {
                type: "text",
                text: `List details for ${listId}:\n${JSON.stringify(list, null, 2)}`,
              },
            ],
            isError: false,
          };
        } catch (error) {
          return createErrorResult(
            error instanceof Error ? error : new Error("Unknown error"),
            `/lists/${listId}`,
            "GET",
            (error as any).response?.data || {}
          );
        }
      }
      
      // Handle getListEntries tool
      if (toolType === 'getListEntries') {
        const listId = request.params.arguments?.listId as string;
        const limit = request.params.arguments?.limit as number || 20;
        const offset = request.params.arguments?.offset as number || 0;
        
        try {
          const entries = await toolConfig.handler(listId, limit, offset);
          const getListEntriesToolConfig = toolConfig as GetListEntriesToolConfig;
          const formattedResults = getListEntriesToolConfig.formatResult 
            ? getListEntriesToolConfig.formatResult(entries)
            : JSON.stringify(entries, null, 2);
          
          return {
            content: [
              {
                type: "text",
                text: `Found ${entries.length} entries in list ${listId}:\n${formattedResults}`,
              },
            ],
            isError: false,
          };
        } catch (error) {
          return createErrorResult(
            error instanceof Error ? error : new Error("Unknown error"),
            `/lists/${listId}/entries`,
            "GET",
            (error as any).response?.data || {}
          );
        }
      }
      
      // Handle addRecordToList tool
      if (toolType === 'addRecordToList') {
        const listId = request.params.arguments?.listId as string;
        const recordId = request.params.arguments?.recordId as string;
        
        try {
          const entry = await toolConfig.handler(listId, recordId);
          
          return {
            content: [
              {
                type: "text",
                text: `Record ${recordId} added to list ${listId}. Entry ID: ${typeof entry.id === 'object' ? entry.id.entry_id : entry.id}`,
              },
            ],
            isError: false,
          };
        } catch (error) {
          return createErrorResult(
            error instanceof Error ? error : new Error("Unknown error"),
            `/lists/${listId}/entries`,
            "POST",
            (error as any).response?.data || {}
          );
        }
      }
      
      // Handle removeRecordFromList tool
      if (toolType === 'removeRecordFromList') {
        const listId = request.params.arguments?.listId as string;
        const entryId = request.params.arguments?.entryId as string;
        
        try {
          const success = await toolConfig.handler(listId, entryId);
          
          return {
            content: [
              {
                type: "text",
                text: success 
                  ? `Successfully removed entry ${entryId} from list ${listId}`
                  : `Failed to remove entry ${entryId} from list ${listId}`,
              },
            ],
            isError: !success,
          };
        } catch (error) {
          return createErrorResult(
            error instanceof Error ? error : new Error("Unknown error"),
            `/lists/${listId}/entries/${entryId}`,
            "DELETE",
            (error as any).response?.data || {}
          );
        }
      }
      
      throw new Error(`Tool handler not implemented for tool type: ${toolType}`);
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing tool '${toolName}': ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  });
}