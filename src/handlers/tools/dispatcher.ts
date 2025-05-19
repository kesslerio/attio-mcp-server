/**
 * Tool dispatcher module - handles tool execution dispatch and routing
 */
import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { createErrorResult } from "../../utils/error-handler.js";
import { ValueMatchError } from "../../errors/value-match-error.js";
import { parseResourceUri } from "../../utils/uri-parser.js";
import { ResourceType, AttioListEntry, AttioRecord } from "../../types/attio.js";
import { ListEntryFilters } from "../../api/operations/index.js";
import { processListEntries } from "../../utils/record-utils.js";
import { ApiError, isApiError, hasResponseData } from "./error-types.js";

// Import tool configurations
import { findToolConfig } from "./registry.js";
import { formatResponse, formatSearchResults, formatRecordDetails, formatListEntries, formatBatchResults } from "./formatters.js";

// Import attribute mapping upfront to avoid dynamic import
import { translateAttributeNamesInFilters } from "../../utils/attribute-mapping/index.js";

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
 * Handle common search operations
 * 
 * @param toolType - The type of search tool
 * @param searchConfig - The search tool configuration
 * @param searchParam - The search parameter
 * @param resourceType - The resource type being searched
 * @returns Formatted response
 */
async function handleSearchOperation(
  toolType: string,
  searchConfig: SearchToolConfig,
  searchParam: string,
  resourceType: ResourceType
) {
  try {
    const results = await searchConfig.handler(searchParam);
    const formattedResults = searchConfig.formatResult(results);
    
    if (toolType === 'search') {
      return formatResponse(`Found ${results.length} ${resourceType}:\n${formattedResults}`);
    }
    
    return formatResponse(formattedResults);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error("Unknown error"),
      `/objects/${resourceType}/records/query`,
      "POST",
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

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
      return handleSearchOperation(toolType, toolConfig as SearchToolConfig, query, resourceType);
    }
    
    // Handle searchByEmail tools
    if (toolType === 'searchByEmail') {
      const email = request.params.arguments?.email as string;
      return handleSearchOperation(toolType, toolConfig as SearchToolConfig, email, resourceType);
    }
    
    // Handle searchByPhone tools
    if (toolType === 'searchByPhone') {
      const phone = request.params.arguments?.phone as string;
      return handleSearchOperation(toolType, toolConfig as SearchToolConfig, phone, resourceType);
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
          hasResponseData(error) ? error.response.data : {}
        );
      }
    }
    
    // Handle notes tools
    if (toolType === 'notes') {
      const directId = resourceType === ResourceType.COMPANIES 
        ? request.params.arguments?.companyId as string 
        : request.params.arguments?.personId as string;
      const uri = request.params.arguments?.uri as string;
      
      if (!directId && !uri) {
        const idParamName = resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
        return createErrorResult(
          new Error(`Either ${idParamName} or uri parameter is required`),
          `/${resourceType}/notes`,
          "GET",
          { status: 400, message: "Missing required parameter" }
        );
      }
      
      let notesTargetId = directId;
      let notesResourceType = resourceType;
      
      try {
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
          uri || `/${resourceType}/${notesTargetId}/notes`,
          "GET",
          hasResponseData(error) ? error.response.data : {}
        );
      }
    }
    
    // Handle createNote tools
    if (toolType === 'createNote') {
      const directId = resourceType === ResourceType.COMPANIES 
        ? request.params.arguments?.companyId as string 
        : request.params.arguments?.personId as string;
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
      
      if (!directId && !uri) {
        const idParamName = resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
        return createErrorResult(
          new Error(`Either ${idParamName} or uri parameter is required`),
          `/${resourceType}/notes`,
          "POST",
          { status: 400, message: "Missing required parameter" }
        );
      }
      
      let noteTargetId = directId;
      let noteResourceType = resourceType;
      
      try {
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
          uri || `/${resourceType}/${noteTargetId}/notes`,
          "POST",
          hasResponseData(error) ? error.response.data : {}
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
          hasResponseData(error) ? error.response.data : {}
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
          hasResponseData(error) ? error.response.data : {}
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
          hasResponseData(error) ? error.response.data : {}
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
          hasResponseData(error) ? error.response.data : {}
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
          hasResponseData(error) ? error.response.data : {}
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
    
    // Handle relationship-based search tools (searchByCompany, searchByCompanyList, searchByNotes)
    if (['searchByCompany', 'searchByCompanyList', 'searchByNotes'].includes(toolType)) {
      return await executeRelationshipSearch(toolType, toolConfig, request, resourceType);
    }
    
    /**
     * Helper function to validate and extract resource ID based on resource type
     * 
     * @param resourceType - The type of resource (companies, people, etc.)
     * @param args - The request arguments containing the ID
     * @param apiPath - The API path for error reporting
     * @returns The validated ID or an error response
     */
    function validateResourceId(
      resourceType: ResourceType, 
      args: any,
      apiPath: string
    ): string | { error: ReturnType<typeof createErrorResult> } {
      const idParamName = resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
      const id = args?.[idParamName] as string;
      
      if (!id) {
        return {
          error: createErrorResult(
            new Error(`${idParamName} parameter is required`),
            apiPath,
            "GET",
            { status: 400, message: `Missing required parameter: ${idParamName}` }
          )
        };
      }
      
      return id;
    }
    
    /**
     * Safely formats an object as JSON string, handling potential circular references
     * 
     * @param obj - The object to stringify
     * @returns Formatted JSON string or fallback error message
     */
    function safeJsonStringify(obj: any): string {
      try {
        return JSON.stringify(obj, null, 2);
      } catch (error) {
        console.warn('Failed to stringify object:', error);
        return `[Object could not be converted to JSON: ${error instanceof Error ? error.message : 'Unknown error'}]`;
      }
    }
    
    // Handle getAttributes tool
    if (toolType === 'getAttributes') {
      const apiPath = `/${resourceType}/attributes`;
      
      // Validate and extract resource ID
      const idOrError = validateResourceId(resourceType, request.params.arguments, apiPath);
      if (typeof idOrError !== 'string') {
        return idOrError.error;
      }
      
      const id = idOrError;
      const attributeName = request.params.arguments?.attributeName as string;
      
      try {
        // Execute the handler with provided parameters
        const result = await toolConfig.handler(id, attributeName);
        
        // Format result using the tool's formatter if available
        const formattedResult = toolConfig.formatResult 
          ? toolConfig.formatResult(result)
          : safeJsonStringify(result);
        
        return formatResponse(formattedResult);
      } catch (error) {
        // Handle and format errors
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          `/${resourceType}/${id}/attributes`,
          "GET",
          hasResponseData(error) ? error.response.data : {}
        );
      }
    }
    
    // Handle json tool - returns raw JSON representation of a resource
    if (toolType === 'json') {
      const apiPath = `/${resourceType}/json`;
      
      // Validate and extract resource ID
      const idOrError = validateResourceId(resourceType, request.params.arguments, apiPath);
      if (typeof idOrError !== 'string') {
        return idOrError.error;
      }
      
      const id = idOrError;
      
      try {
        // Execute the handler and return formatted JSON result
        const result = await toolConfig.handler(id);
        
        // Format result as pretty-printed JSON with safety check
        return formatResponse(safeJsonStringify(result));
      } catch (error) {
        // Handle and format errors
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          `/${resourceType}/${id}/json`,
          "GET",
          hasResponseData(error) ? error.response.data : {}
        );
      }
    }
    
    // Handle discoverAttributes tool - discovers available attributes for a resource type
    if (toolType === 'discoverAttributes') {
      const apiPath = `/${resourceType}/attributes`;
      
      try {
        // Execute attribute discovery
        const result = await toolConfig.handler();
        
        // Format result using the tool's formatter if available
        const formattedResult = toolConfig.formatResult 
          ? toolConfig.formatResult(result)
          : safeJsonStringify(result);
        
        return formatResponse(formattedResult);
      } catch (error) {
        // Handle and format errors
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          apiPath,
          "GET",
          hasResponseData(error) ? error.response.data : {}
        );
      }
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
 * Execute relationship-based search operations
 */
async function executeRelationshipSearch(
  toolType: string,
  toolConfig: ToolConfig,
  request: CallToolRequest,
  resourceType: ResourceType
) {
  try {
    let results: AttioRecord[] = [];
    
    if (toolType === 'searchByCompany') {
      const companyFilter = request.params.arguments;
      results = await toolConfig.handler(companyFilter);
    } else if (toolType === 'searchByCompanyList') {
      const listId = request.params.arguments?.listId as string;
      results = await toolConfig.handler(listId);
    } else if (toolType === 'searchByNotes') {
      const searchText = request.params.arguments?.searchText as string;
      results = await toolConfig.handler(searchText);
    } else {
      throw new Error(`Unknown relationship search type: ${toolType}`);
    }
    
    // Format and return results
    const formattedResults = toolConfig.formatResult ? toolConfig.formatResult(results) : JSON.stringify(results, null, 2);
    
    return formatResponse(formattedResults);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error("Unknown error"),
      `/objects/${resourceType}/records/query`,
      "POST",
      hasResponseData(error) ? error.response.data : {}
    );
  }
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
      
      // Use the imported attribute mapping utility
      
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
      if (error.originalError && hasResponseData(error.originalError)) {
        errorDetailsForCreateResult = error.originalError.response.data;
      } else {
        errorDetailsForCreateResult = error.details || {};
      }
    } else if (hasResponseData(error)) {
      errorDetailsForCreateResult = error.response.data;
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