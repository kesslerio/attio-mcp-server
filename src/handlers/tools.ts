/**
 * Handlers for tool-related requests
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createErrorResult } from "../utils/error-handler.js";
import { parseResourceUri } from "../utils/uri-parser.js";
import { ResourceType, AttioListEntry } from "../types/attio.js";

// Import tool configurations and definitions
import {
  companyToolConfigs,
  companyToolDefinitions,
  peopleToolConfigs,
  peopleToolDefinitions,
  listsToolConfigs,
  listsToolDefinitions,
  promptsToolConfigs,
  promptsToolDefinitions
} from "./tool-configs/index.js";

// Import tool types
import { 
  ToolConfig,
  SearchToolConfig,
  DetailsToolConfig,
  NotesToolConfig,
  CreateNoteToolConfig,
  GetListsToolConfig,
  GetListEntriesToolConfig,
  ListActionToolConfig
} from "./tool-types.js";

// Consolidated tool configurations from modular files
const TOOL_CONFIGS = {
  [ResourceType.COMPANIES]: companyToolConfigs,
  [ResourceType.PEOPLE]: peopleToolConfigs,
  [ResourceType.LISTS]: listsToolConfigs,
  // Add other resource types as needed
};

// Consolidated tool definitions from modular files
const TOOL_DEFINITIONS = {
  [ResourceType.COMPANIES]: companyToolDefinitions,
  [ResourceType.PEOPLE]: peopleToolDefinitions,
  [ResourceType.LISTS]: listsToolDefinitions,
  // Add other resource types as needed
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
  for (const resourceType of Object.values(ResourceType)) {
    const resourceConfig = TOOL_CONFIGS[resourceType];
    if (!resourceConfig) continue;
    
    for (const [toolType, config] of Object.entries(resourceConfig)) {
      if (config && config.name === toolName) {
        return {
          resourceType: resourceType as ResourceType,
          toolConfig: config as ToolConfig,
          toolType,
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
        
        if (!idParam) {
          const configError = new Error('Missing idParam in tool configuration');
          return createErrorResult(configError, 'tool-config', 'GET', { status: 400 });
        }
        
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
          
          // Special handling for entries to ensure record_id is available
          const processedEntries = entries.map((entry: AttioListEntry) => {
            // If record_id is already defined, no processing needed
            if (entry.record_id) {
              return entry;
            }
            
            // Try to extract record_id from the nested record structure
            if (entry.record?.id?.record_id) {
              entry.record_id = entry.record.id.record_id;
            }
            
            return entry;
          });
          
          const formattedResults = getListEntriesToolConfig.formatResult 
            ? getListEntriesToolConfig.formatResult(processedEntries)
            : JSON.stringify(processedEntries, null, 2);
          
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