/**
 * Tool dispatcher module - handles tool execution dispatch and routing
 */
import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { createErrorResult } from "../../utils/error-handler.js";
import { ValueMatchError } from "../../errors/value-match-error.js";
import { parseResourceUri } from "../../utils/uri-parser.js";
import { ResourceType, AttioListEntry, AttioRecord } from "../../types/attio.js";
import { ListEntryFilters } from "../../api/attio-operations.js";
import { processListEntries } from "../../utils/record-utils.js";
// Axios will be imported from main project

// Import tool configurations
import { findToolConfig } from "./registry.js";
import { formatResponse, formatSearchResults, formatRecordDetails, formatListEntries, formatBatchResults } from "./formatters.js";

// Import tool type definitions
import { 
  ToolConfig,
  SearchToolConfig,
  AdvancedSearchToolConfig,
  DetailsToolConfig,
  NotesToolConfig,
  CreateNoteToolConfig,
  GetListsToolConfig,
  GetListEntriesToolConfig,
  ListActionToolConfig,
  DateBasedSearchToolConfig
} from "../tool-types.js";

// Import record tool types
import {
  RecordCreateToolConfig,
  RecordGetToolConfig,
  RecordUpdateToolConfig,
  RecordDeleteToolConfig,
  RecordListToolConfig,
  RecordBatchCreateToolConfig,
  RecordBatchUpdateToolConfig
} from "../tool-configs/records.js";

// Import resource-specific tool configuration
import {
  RESOURCE_SPECIFIC_CREATE_TOOLS,
  ResourceSpecificCreateTool,
  RESOURCE_TYPE_MAP,
  VALIDATION_RULES
} from "../tool-configs/resource-specific-tools.js";

/**
 * Execute a tool request and return formatted results
 * 
 * @param request - The tool request to execute
 * @returns Tool execution result
 */
export async function executeToolRequest(request: CallToolRequest) {
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
        
        return formatResponse(
          `Found ${results.length} ${resourceType}:\n${formattedResults}`
        );
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          `/objects/${resourceType}/records/query`,
          "POST",
          (error as any).response?.data || {}
        );
      }
    }
    
    // Handle searchByEmail tools
    if (toolType === 'searchByEmail') {
      const email = request.params.arguments?.email as string;
      try {
        const searchToolConfig = toolConfig as SearchToolConfig;
        const results = await searchToolConfig.handler(email);
        const formattedResults = searchToolConfig.formatResult(results);
        
        return formatResponse(formattedResults);
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          `/objects/${resourceType}/records/query`,
          "POST",
          (error as any).response?.data || {}
        );
      }
    }
    
    // Handle searchByPhone tools
    if (toolType === 'searchByPhone') {
      const phone = request.params.arguments?.phone as string;
      try {
        const searchToolConfig = toolConfig as SearchToolConfig;
        const results = await searchToolConfig.handler(phone);
        const formattedResults = searchToolConfig.formatResult(results);
        
        return formatResponse(formattedResults);
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
      let id: string;
      let uri: string;
      
      // Check which parameter is provided
      const directId = resourceType === ResourceType.COMPANIES 
        ? request.params.arguments?.companyId as string 
        : request.params.arguments?.personId as string;
        
      uri = request.params.arguments?.uri as string;
      
      // Use either direct ID or URI, with priority to URI if both are provided
      if (uri) {
        try {
          const [uriType, uriId] = parseResourceUri(uri);
          if (uriType !== resourceType) {
            throw new Error(`URI type mismatch: Expected ${resourceType}, got ${uriType}`);
          }
          id = uriId;
        } catch (error) {
          return createErrorResult(
            error instanceof Error ? error : new Error("Invalid URI format"),
            uri,
            "GET",
            { status: 400, message: "Invalid URI format" }
          );
        }
      } else if (directId) {
        id = directId;
        // For logging purposes
        uri = `attio://${resourceType}/${directId}`;
      } else {
        return createErrorResult(
          new Error("Either companyId/personId or uri parameter is required"),
          `/${resourceType}`,
          "GET",
          { status: 400, message: "Missing required parameter" }
        );
      }
      
      try {
        const detailsToolConfig = toolConfig as DetailsToolConfig;
        const record = await detailsToolConfig.handler(id);
        const formattedResult = detailsToolConfig.formatResult!(record);
        
        return formatResponse(formattedResult);
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
      const notesId = request.params.arguments?.notesId as string;
      const uri = request.params.arguments?.uri as string;
      
      if (!notesId && !uri) {
        return createErrorResult(
          new Error("Either notesId or uri parameter is required"),
          `/${resourceType}/notes`,
          "GET",
          { status: 400, message: "Missing required parameter" }
        );
      }
      
      try {
        let notesTargetId = notesId;
        let notesResourceType = resourceType;
        
        if (uri) {
          try {
            const [uriType, uriId] = parseResourceUri(uri);
            notesResourceType = uriType as ResourceType;
            notesTargetId = uriId;
          } catch (error) {
            return createErrorResult(
              error instanceof Error ? error : new Error("Invalid URI format"),
              uri,
              "GET",
              { status: 400, message: "Invalid URI format" }
            );
          }
        }
        
        const notesToolConfig = toolConfig as NotesToolConfig;
        const notes = await notesToolConfig.handler(notesTargetId);
        const formattedResult = notesToolConfig.formatResult!(notes);
        
        return formatResponse(formattedResult);
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          uri || `/${resourceType}/${notesId}/notes`,
          "GET",
          (error as any).response?.data || {}
        );
      }
    }
    
    // Handle createNote tools
    if (toolType === 'createNote') {
      const notesId = request.params.arguments?.notesId as string;
      const uri = request.params.arguments?.uri as string;
      const title = request.params.arguments?.title as string;
      const content = request.params.arguments?.content as string;
      
      if (!title || !content) {
        return createErrorResult(
          new Error("Both title and content are required"),
          `/${resourceType}/notes`,
          "POST",
          { status: 400, message: "Missing required parameters" }
        );
      }
      
      if (!notesId && !uri) {
        return createErrorResult(
          new Error("Either notesId or uri parameter is required"),
          `/${resourceType}/notes`,
          "POST",
          { status: 400, message: "Missing required parameter" }
        );
      }
      
      try {
        let noteTargetId = notesId;
        let noteResourceType = resourceType;
        
        if (uri) {
          try {
            const [uriType, uriId] = parseResourceUri(uri);
            noteResourceType = uriType as ResourceType;
            noteTargetId = uriId;
          } catch (error) {
            return createErrorResult(
              error instanceof Error ? error : new Error("Invalid URI format"),
              uri,
              "POST",
              { status: 400, message: "Invalid URI format" }
            );
          }
        }
        
        const createNoteToolConfig = toolConfig as CreateNoteToolConfig;
        const note = await createNoteToolConfig.handler(noteTargetId, title, content);
        const formattedResult = createNoteToolConfig.formatResult!(note);
        
        return formatResponse(formattedResult);
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          uri || `/${resourceType}/${notesId}/notes`,
          "POST",
          (error as any).response?.data || {}
        );
      }
    }
    
    // Handle getLists tool
    if (toolType === 'getLists') {
      try {
        const getListsToolConfig = toolConfig as GetListsToolConfig;
        const lists = await getListsToolConfig.handler();
        const formattedResult = getListsToolConfig.formatResult!(lists);
        
        return formatResponse(formattedResult);
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          "/lists",
          "GET",
          (error as any).response?.data || {}
        );
      }
    }
    
    // Handle getListEntries tool
    if (toolType === 'getListEntries') {
      const listId = request.params.arguments?.listId as string;
      
      // Convert parameters to the correct type
      let limit: number | undefined;
      let offset: number | undefined;
      
      if (request.params.arguments?.limit !== undefined && request.params.arguments?.limit !== null) {
        limit = Number(request.params.arguments.limit);
      }
      
      if (request.params.arguments?.offset !== undefined && request.params.arguments?.offset !== null) {
        offset = Number(request.params.arguments.offset);
      }
      
      try {
        const getListEntriesToolConfig = toolConfig as GetListEntriesToolConfig;
        const entries = await getListEntriesToolConfig.handler(listId);
        const formattedResult = getListEntriesToolConfig.formatResult!(entries);
        
        return formatResponse(formattedResult);
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          `/lists/${listId}/entries`,
          "GET",
          (error as any).response?.data || {}
        );
      }
    }
    
    // Handle filterListEntries tool
    if (toolType === 'advancedFilterListEntries') {
      const listId = request.params.arguments?.listId as string;
      const filters = request.params.arguments?.filters as any;
      
      // Convert parameters to the correct type
      let limit: number | undefined;
      let offset: number | undefined;
      
      if (request.params.arguments?.limit !== undefined && request.params.arguments?.limit !== null) {
        limit = Number(request.params.arguments.limit);
      }
      
      if (request.params.arguments?.offset !== undefined && request.params.arguments?.offset !== null) {
        offset = Number(request.params.arguments.offset);
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[advancedFilterListEntries] Processing request with parameters:', {
          listId,
          filters: JSON.stringify(filters),
          limit,
          offset
        });
      }
      
      try {
        const entries = await toolConfig.handler(listId, filters, limit, offset);
        const processedEntries = entries ? processListEntries(entries) : [];
        const formattedResults = toolConfig.formatResult 
          ? toolConfig.formatResult(processedEntries) 
          : JSON.stringify(processedEntries, null, 2);
        
        return formatResponse(formattedResults);
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          `/lists/${listId}/entries/query`,
          "POST",
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
        
        return formatResponse(
          `Record ${recordId} added to list ${listId}. Entry ID: ${typeof entry.id === 'object' ? entry.id.entry_id : entry.id}`
        );
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
        
        return formatResponse(
          success 
            ? `Successfully removed entry ${entryId} from list ${listId}`
            : `Failed to remove entry ${entryId} from list ${listId}`,
          !success
        );
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          `/lists/${listId}/entries/${entryId}`,
          "DELETE",
          (error as any).response?.data || {}
        );
      }
    }
    
    // Handle record operations
    if (['create', 'get', 'update', 'delete', 'list', 'batchCreate', 'batchUpdate'].includes(toolType)) {
      return await executeRecordOperation(toolType, toolConfig, request, resourceType);
    }
    
    // Handle advanced search and date-based tools
    if (['advancedSearch', 'searchByCreationDate', 'searchByModificationDate', 'searchByLastInteraction', 'searchByActivity'].includes(toolType)) {
      return await executeAdvancedSearch(toolType, toolConfig, request, resourceType);
    }
    
    throw new Error(`Tool handler not implemented for tool type: ${toolType}`);
  } catch (error) {
    return formatResponse(
      `Error executing tool '${toolName}': ${(error as Error).message}`,
      true
    );
  }
}

/**
 * Execute record-specific operations
 */
async function executeRecordOperation(
  toolType: string,
  toolConfig: ToolConfig,
  request: CallToolRequest,
  resourceType: ResourceType
) {
  const objectSlug = request.params.arguments?.objectSlug as string;
  const objectId = request.params.arguments?.objectId as string;
  
  // Handle tool types based on specific operation
  if (toolType === 'create') {
    const recordData = request.params.arguments?.recordData;
    
    try {
      const recordCreateConfig = toolConfig as RecordCreateToolConfig;
      const record = await recordCreateConfig.handler(objectSlug, recordData, objectId);
      
      return formatResponse(
        `Successfully created ${objectSlug} record with ID: ${record.id?.record_id || 'Unknown'}`
      );
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error : new Error("Unknown error"),
        `objects/${objectSlug}/records`,
        "POST",
        (error as any).response?.data || {}
      );
    }
  }
  
  if (toolType === 'batchCreate') {
    const records = Array.isArray(request.params.arguments?.records) ? request.params.arguments?.records : [];
    
    try {
      const recordBatchCreateConfig = toolConfig as RecordBatchCreateToolConfig;
      const result = await recordBatchCreateConfig.handler(objectSlug, records, objectId);
      
      return formatResponse(formatBatchResults(result, 'create'));
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error : new Error("Unknown error"),
        `objects/${objectSlug}/records/batch`,
        "POST",
        (error as any).response?.data || {}
      );
    }
  }
  
  if (toolType === 'batchUpdate') {
    const records = Array.isArray(request.params.arguments?.records) ? request.params.arguments?.records : [];
    
    try {
      const recordBatchUpdateConfig = toolConfig as RecordBatchUpdateToolConfig;
      const result = await recordBatchUpdateConfig.handler(objectSlug, records, objectId);
      
      return formatResponse(formatBatchResults(result, 'update'), result.summary.failed > 0);
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error : new Error("Unknown error"),
        `objects/${objectSlug}/records/batch`,
        "PATCH",
        (error as any).response?.data || {}
      );
    }
  }
  
  // Add handlers for get, update, delete, list operations...
  throw new Error(`Record operation handler not implemented for tool type: ${toolType}`);
}

/**
 * Execute advanced search operations
 */
async function executeAdvancedSearch(
  toolType: string,
  toolConfig: ToolConfig,
  request: CallToolRequest,
  resourceType: ResourceType
) {
  const advancedSearchConfig = toolConfig as AdvancedSearchToolConfig | DateBasedSearchToolConfig;
  let results: AttioRecord[] = [];
  
  try {
    // Handle different types of advanced search
    if (toolType === 'searchByCreationDate' || toolType === 'searchByModificationDate') {
      let dateRange = request.params.arguments?.dateRange;
      const limit = Number(request.params.arguments?.limit) || 20;
      const offset = Number(request.params.arguments?.offset) || 0;
      
      // Parse dateRange if it's a string
      if (typeof dateRange === 'string') {
        try {
          dateRange = JSON.parse(dateRange);
        } catch (error) {
          console.warn(`Failed to parse dateRange parameter: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      let filter: ListEntryFilters = { filters: [] };
      if (typeof dateRange === 'object' && dateRange !== null) {
        filter = dateRange as ListEntryFilters;
      } else {
        filter = { filters: [{ attribute: { slug: 'created_at' }, condition: 'equals', value: dateRange }] };
      }
      const response = await advancedSearchConfig.handler(filter, limit, offset);
      results = response || [];
    } else if (toolType === 'advancedSearch') {
      const filters = request.params.arguments?.filters as any;
      let limit: number | undefined;
      let offset: number | undefined;
      
      if (request.params.arguments?.limit !== undefined && request.params.arguments?.limit !== null) {
        limit = Number(request.params.arguments.limit);
      }
      
      if (request.params.arguments?.offset !== undefined && request.params.arguments?.offset !== null) {
        offset = Number(request.params.arguments.offset);
      }
      
      // Import the attribute mapping utility
      const { translateAttributeNamesInFilters } = await import("../../utils/attribute-mapping/index.js");
      
      // Translate any human-readable attribute names to their slug equivalents
      const translatedFilters = translateAttributeNamesInFilters(filters, resourceType);
      
      const response = await advancedSearchConfig.handler(translatedFilters, limit, offset);
      results = response || [];
    }
    
    // Format and return results
    const formattedResults = advancedSearchConfig.formatResult(results);
    
    return formatResponse(formattedResults);
  } catch (error) {
    let errorDetailsForCreateResult: any = {};
    if (error instanceof ValueMatchError) {
      if (error.originalError && (error.originalError as any).response) {
        errorDetailsForCreateResult = (error.originalError as any).response.data;
      } else {
        errorDetailsForCreateResult = error.details || {};
      }
    } else if ((error as any).response) {
      errorDetailsForCreateResult = (error as any).response.data;
    } else if (error instanceof Error && (error as any).details) {
      errorDetailsForCreateResult = (error as any).details;
    } else {
      errorDetailsForCreateResult = { message: (error as Error)?.message || 'Unknown error details' };
    }
    
    return createErrorResult(
      error instanceof Error ? error : new Error("Unknown error caught in advancedSearch"),
      `/objects/${resourceType}/records/query`,
      "POST",
      errorDetailsForCreateResult
    );
  }
}