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
import { safeJsonStringify } from "../../utils/json-serializer.js";

// Import tool configurations
import { findToolConfig } from "./registry.js";
import { formatResponse, formatSearchResults, formatRecordDetails, formatListEntries, formatBatchResults } from "./formatters.js";

// Import attribute mapping upfront to avoid dynamic import
import { translateAttributeNamesInFilters } from "../../utils/attribute-mapping/index.js";

/**
 * Logs tool execution requests in a consistent format (for development mode)
 * 
 * @param toolType - The type of tool being executed (e.g., 'search', 'create', 'update')
 * @param toolName - The name of the tool as defined in the MCP configuration
 * @param request - The request data containing parameters and arguments
 */
function logToolRequest(toolType: string, toolName: string, request: any) {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.error(`[${toolName}] Tool execution request:`);
  console.error(`- Tool type: ${toolType}`);
  console.error(`- Arguments:`, request.params.arguments ? 
    JSON.stringify(request.params.arguments, null, 2) : 'No arguments provided');
}

/**
 * Logs tool execution errors in a consistent format
 * 
 * @param toolType - The type of tool where the error occurred (e.g., 'search', 'create', 'update')
 * @param error - The error that was caught during execution
 * @param additionalInfo - Optional additional information about the execution context, such as parameters
 */
function logToolError(toolType: string, error: unknown, additionalInfo: Record<string, any> = {}) {
  console.error(`[${toolType}] Execution error:`, error);
  console.error(`- Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
  console.error(`- Message: ${error instanceof Error ? error.message : String(error)}`);
  
  if (error instanceof Error && error.stack) {
    console.error(`- Stack trace: ${error.stack}`);
  } else {
    console.error('- No stack trace available');
  }
  
  if (Object.keys(additionalInfo).length > 0) {
    console.error('- Additional context:', additionalInfo);
  }
}

/**
 * Validates attribute parameters for company operations
 * 
 * @param attributes - The attributes object to validate (key-value pairs of company attributes)
 * @returns True if validation passes, or an error message string if validation fails
 */
function validateAttributes(attributes: Record<string, any> | null | undefined): true | string {
  if (!attributes) {
    return "Attributes parameter is required";
  }
  
  if (typeof attributes !== 'object' || Array.isArray(attributes)) {
    return "Attributes parameter must be an object";
  }
  
  if (Object.keys(attributes).length === 0) {
    return "Attributes parameter cannot be empty";
  }
  
  return true;
}

/**
 * Formats a company operation success response in a consistent manner
 * 
 * @param operation - The operation type (e.g., 'create', 'update', 'delete')
 * @param resourceType - The resource type (e.g., 'companies')
 * @param resourceId - The ID of the affected resource
 * @param details - Additional details to include in the response
 * @returns Formatted success message
 */
function formatSuccessResponse(
  operation: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, any>
): string {
  let message = `Successfully ${operation}d ${resourceType} record with ID: ${resourceId}`;
  
  if (details && Object.keys(details).length > 0) {
    const detailsText = Object.entries(details)
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join(', ');
    
    message += ` (${detailsText})`;
  }
  
  return message;
}

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
    
    // Check if the formatter already includes a header
    const hasHeader = formattedResults.startsWith('Found ');
    
    // Format the response based on the tool type and formatted results
    let responseText = "";
    
    if (hasHeader) {
      // If the formatter already includes a "Found" header, use it as is
      responseText = formattedResults;
    } else {
      // Add a contextual header based on the tool type
      const searchType = toolType.replace('searchBy', '').toLowerCase();
      responseText = `Found ${String(results.length)} ${resourceType} matching ${searchType} "${searchParam}":\n${formattedResults}`;
    }
    
    return formatResponse(responseText);
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
      try {
        const searchConfig = toolConfig as SearchToolConfig;
        const results = await searchConfig.handler(query);
        const formattedResults = searchConfig.formatResult(results);
        
        // Check if the formatter already includes a header to avoid duplication
        const hasHeader = typeof formattedResults === 'string' && formattedResults.startsWith('Found ');
        
        if (hasHeader) {
          // If the formatter already includes a "Found" header, use it as is
          return formatResponse(formattedResults);
        } else {
          // For basic search tools, we need to add the header
          const header = `Found ${results.length} ${resourceType}:`;
          return formatResponse(`${header}\n${formattedResults}`);
        }
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          `/objects/${resourceType}/records/query`,
          "POST",
          hasResponseData(error) ? error.response.data : {}
        );
      }
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
        
        const limit = request.params.arguments?.limit as number;
        const offset = request.params.arguments?.offset as number;
        
        const notesToolConfig = toolConfig as NotesToolConfig;
        const notes = await notesToolConfig.handler(notesTargetId, limit, offset);
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
      
      /**
       * Parameter Mapping Strategy for Note Creation
       * 
       * This function supports multiple parameter names for backward compatibility
       * and to accommodate different API clients:
       * 
       * - title: Primary parameter name (preferred)
       * - noteTitle: Legacy/alternative parameter name for title
       * - content: Primary parameter name (preferred) 
       * - noteText: Legacy/alternative parameter name for content
       * 
       * The fallback pattern (primary || legacy) ensures compatibility while
       * encouraging use of the standardized parameter names.
       */
      const title = (request.params.arguments?.title || request.params.arguments?.noteTitle) as string;
      const content = (request.params.arguments?.content || request.params.arguments?.noteText) as string;
      
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
        const formattedResult = createNoteToolConfig.formatResult 
          ? createNoteToolConfig.formatResult(note)
          : `Note added to ${resourceType.slice(0, -1)} ${noteTargetId}: ${note.title || 'Untitled'}`;
        
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

    // Handle listsForCompany tool
    if (toolType === 'listsForCompany') {
      const companyId = request.params.arguments?.companyId as string;

      let limit: number | undefined;
      if (
        request.params.arguments?.limit !== undefined &&
        request.params.arguments?.limit !== null
      ) {
        limit = Number(request.params.arguments.limit);
      }

      if (!companyId) {
        return createErrorResult(
          new Error('companyId parameter is required'),
          '/lists-entries/query',
          'POST',
          { status: 400, message: 'Missing required parameter: companyId' }
        );
      }

      try {
        const lists = await toolConfig.handler(companyId, limit);
        const formattedResult = toolConfig.formatResult
          ? toolConfig.formatResult(lists)
          : JSON.stringify(lists, null, 2);

        return formatResponse(formattedResult);
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error('Unknown error'),
          '/lists-entries/query',
          'POST',
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
    
    /**
     * Handle getListDetails tool
     * 
     * This handler processes requests for the get-list-details tool, which retrieves
     * information about a specific Attio list by ID.
     * 
     * The handler:
     * 1. Validates the required listId parameter
     * 2. Calls the getListDetails function with the list ID
     * 3. Formats the response using the tool's formatResult function
     * 4. Handles API errors with proper error formatting
     */
    if (toolType === 'getListDetails') {
      const listId = request.params.arguments?.listId as string;
      
      if (!listId) {
        return createErrorResult(
          new Error("Missing required parameter: listId"),
          "/lists/details",
          "GET",
          { status: 400, message: "Missing required parameter: listId" }
        );
      }
      
      try {
        const result = await toolConfig.handler(listId);
        // Format the result
        const formattedResult = toolConfig.formatResult 
          ? toolConfig.formatResult(result)
          : JSON.stringify(result, null, 2);
        
        return formatResponse(formattedResult);
      } catch (error) {
        const responseData = hasResponseData(error) ? error.response.data : {};
        if (hasResponseData(error) && 'status' in error.response) {
          (responseData as any).status = error.response.status;
        }
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          `/lists/${listId}`,
          "GET",
          responseData
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
    
    // Handle filterListEntries tool (simple filtering)
    if (toolType === 'filterListEntries') {
      const listId = request.params.arguments?.listId as string;
      const attributeSlug = request.params.arguments?.attributeSlug as string;
      const condition = request.params.arguments?.condition as string;
      const value = request.params.arguments?.value as any;
      
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
        console.error('[filterListEntries] Processing request with parameters:', {
          listId,
          attributeSlug,
          condition,
          value,
          limit,
          offset
        });
      }
      
      try {
        const entries = await toolConfig.handler(listId, attributeSlug, condition, value, limit, offset);
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

    // Handle advanced filterListEntries tool
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
        console.error('[advancedFilterListEntries] Processing request with parameters:', {
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
      
      // Validate required parameters
      if (!listId) {
        return createErrorResult(
          new Error("listId parameter is required"),
          `/lists/entries`,
          "POST",
          { status: 400, message: "Missing required parameter: listId" }
        );
      }
      
      if (!recordId) {
        return createErrorResult(
          new Error("recordId parameter is required"),
          `/lists/${listId}/entries`,
          "POST",
          { status: 400, message: "Missing required parameter: recordId" }
        );
      }
      
      // Debug logging for the request in development mode
      if (process.env.NODE_ENV === 'development') {
        console.error(`[addRecordToList] Adding record to list:`);
        console.error(`- List ID: ${listId}`);
        console.error(`- Record ID: ${recordId}`);
      }
      
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
    
    // Handle updateListEntry tool
    if (toolType === 'updateListEntry') {
      const listId = request.params.arguments?.listId as string;
      const entryId = request.params.arguments?.entryId as string;
      const attributes = request.params.arguments?.attributes as Record<string, any>;
      
      // Validate required parameters
      if (!listId) {
        return createErrorResult(
          new Error("listId parameter is required"),
          `/lists/entries`,
          "PATCH",
          { status: 400, message: "Missing required parameter: listId" }
        );
      }
      
      if (!entryId) {
        return createErrorResult(
          new Error("entryId parameter is required"),
          `/lists/${listId}/entries`,
          "PATCH",
          { status: 400, message: "Missing required parameter: entryId" }
        );
      }
      
      if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
        return createErrorResult(
          new Error("attributes parameter is required and must be an object"),
          `/lists/${listId}/entries/${entryId}`,
          "PATCH",
          { status: 400, message: "Missing or invalid attributes parameter" }
        );
      }
      
      // Debug logging for the request in development mode
      if (process.env.NODE_ENV === 'development') {
        console.error(`[updateListEntry] Updating list entry:`);
        console.error(`- List ID: ${listId}`);
        console.error(`- Entry ID: ${entryId}`);
        console.error(`- Attributes: ${JSON.stringify(attributes)}`);
      }
      
      try {
        const entry = await toolConfig.handler(listId, entryId, attributes);
        
        // Use the tool's formatter if available
        const formattedResult = toolConfig.formatResult 
          ? toolConfig.formatResult(entry)
          : `Successfully updated list entry ${entryId} in list ${listId}`;
        
        return formatResponse(formattedResult);
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          `/lists/${listId}/entries/${entryId}`,
          "PATCH",
          hasResponseData(error) ? error.response.data : {}
        );
      }
    }
    
        /**
     * Helper function to handle company batch operations consistently
     * 
     * @param operation - The batch operation type ('create' for new records or 'update' for existing records)
     * @param request - The MCP tool request object containing parameters and arguments
     * @param toolConfig - The tool configuration with handler and formatter functions
     * @returns Formatted MCP response with operation results or error details
     */
    async function handleCompanyBatchOperation(
      operation: 'create' | 'update',
      request: CallToolRequest,
      toolConfig: ToolConfig
    ) {
      // Extract the appropriate parameter based on operation type
      const paramName = operation === 'create' ? 'companies' : 'updates';
      const logName = operation === 'create' ? 'batchCreateCompanies' : 'batchUpdateCompanies';
      const httpMethod = operation === 'create' ? 'POST' : 'PATCH';
      
      // Log the request in development mode
      logToolRequest(operation === 'create' ? 'batchCreate' : 'batchUpdate', 
                    operation === 'create' ? 'batch-create-companies' : 'batch-update-companies', 
                    request);
      
      // Enhanced debugging
      if (process.env.NODE_ENV === 'development') {
        console.error(`[handleCompanyBatchOperation:${operation}] Debug info:`);
        console.error('- Parameter name:', paramName);
        console.error('- Request arguments:', JSON.stringify(request.params.arguments, null, 2));
        console.error('- Arguments has paramName:', request.params.arguments && paramName in request.params.arguments);
      }
      
      // Extract and validate parameters
      const records = request.params.arguments?.[paramName] || [];
      
      if (!Array.isArray(records)) {
        return createErrorResult(
          new Error(`${paramName} parameter must be an array`),
          `/objects/companies/records/batch`,
          httpMethod,
          { status: 400, message: `Invalid parameter: ${paramName} must be an array` }
        );
      }
      
      if (records.length === 0) {
        return createErrorResult(
          new Error(`${paramName} parameter cannot be empty`),
          `/objects/companies/records/batch`,
          httpMethod,
          { status: 400, message: `Invalid parameter: ${paramName} cannot be empty` }
        );
      }
      
      // Validate each record in the array
      if (operation === 'update') {
        // For updates, check id and attributes
        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          if (!record || typeof record !== 'object') {
            return createErrorResult(
              new Error(`Invalid update data at index ${i}: must be a non-null object`),
              `/objects/companies/records/batch`,
              httpMethod,
              { status: 400, message: `Invalid update data at index ${i}: must be a non-null object` }
            );
          }
          
          if (!record.id) {
            return createErrorResult(
              new Error(`Invalid update data at index ${i}: 'id' is required`),
              `/objects/companies/records/batch`,
              httpMethod,
              { status: 400, message: `Invalid update data at index ${i}: 'id' is required` }
            );
          }
          
          const attributesValidation = validateAttributes(record.attributes);
          if (attributesValidation !== true) {
            return createErrorResult(
              new Error(`Invalid update data at index ${i}: ${attributesValidation}`),
              `/objects/companies/records/batch`,
              httpMethod,
              { status: 400, message: `Invalid update data at index ${i}: ${attributesValidation}` }
            );
          }
        }
      } else {
        // For creates, validate required fields
        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          if (!record || typeof record !== 'object') {
            return createErrorResult(
              new Error(`Invalid company data at index ${i}: must be a non-null object`),
              `/objects/companies/records/batch`,
              httpMethod,
              { status: 400, message: `Invalid company data at index ${i}: must be a non-null object` }
            );
          }
          
          if (!record.name) {
            return createErrorResult(
              new Error(`Invalid company data at index ${i}: 'name' is required`),
              `/objects/companies/records/batch`,
              httpMethod,
              { status: 400, message: `Invalid company data at index ${i}: 'name' is required` }
            );
          }
        }
      }
      
      try {
        // Create the proper parameter object structure expected by the handler
        const params = {
          [paramName]: records,
          config: request.params.arguments?.config
        };
        
        // Debug the params object
        if (process.env.NODE_ENV === 'development') {
          console.error(`[handleCompanyBatchOperation:${operation}] Calling handler with params:`, JSON.stringify(params, null, 2));
          console.error('- Handler function:', toolConfig.handler.name || 'anonymous');
        }
        
        const result = await toolConfig.handler(params);
        return formatResponse(formatBatchResults(result, operation), result.summary.failed > 0);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          logToolError(logName, error, { [paramName]: records });
        }
        
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          `/objects/companies/records/batch`,
          httpMethod,
          hasResponseData(error) ? error.response.data : {}
        );
      }
    }
    
    // Handle specific batch operations for companies
    if (toolType === 'batchUpdate' && toolName === 'batch-update-companies') {
      return await handleCompanyBatchOperation('update', request, toolConfig);
    }
    
    // Handle specific batch operations for companies
    if (toolType === 'batchCreate' && toolName === 'batch-create-companies') {
      // Add extra debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('[batch-create-companies] Debug:');
        console.error('- Request arguments:', JSON.stringify(request.params.arguments, null, 2));
        console.error('- Tool type:', toolType);
        console.error('- Tool name:', toolName);
        console.error('- Tool config exists:', !!toolConfig);
        console.error('- Handler exists:', toolConfig && typeof toolConfig.handler === 'function');
      }
      
      return await handleCompanyBatchOperation('create', request, toolConfig);
    }
    
    /**
     * Helper function to handle individual company operations consistently
     * 
     * @param operation - The operation type ('create' for new company or 'update' for existing company)
     * @param request - The MCP tool request object containing parameters and arguments
     * @param toolConfig - The tool configuration with handler and formatter functions
     * @returns Formatted MCP response with operation results or error details
     */
    async function handleCompanyOperation(
      operation: 'create' | 'update',
      request: CallToolRequest, 
      toolConfig: ToolConfig
    ) {
      // Extract parameters based on operation type
      const logName = operation === 'create' ? 'createCompany' : 'updateCompany';
      const httpMethod = operation === 'create' ? 'POST' : 'PATCH';
      
      // Log the request in development mode
      logToolRequest(operation, 
                    operation === 'create' ? 'create-company' : 'update-company', 
                    request);
      
      // For updates, extract and validate companyId
      let companyId: string | undefined;
      if (operation === 'update') {
        companyId = request.params.arguments?.companyId as string | undefined;
        if (!companyId) {
          return createErrorResult(
            new Error("companyId parameter is required"),
            `/objects/companies/records/undefined`,
            httpMethod,
            { status: 400, message: "Missing required parameter: companyId" }
          );
        }
      }
      
      // Extract and validate attributes
      const attributes = operation === 'create' 
        ? (request.params.arguments?.attributes || request.params.arguments || {})
        : (request.params.arguments?.attributes || {});
      
      const attributesValidation = validateAttributes(attributes);
      if (attributesValidation !== true) {
        return createErrorResult(
          new Error(attributesValidation),
          `/objects/companies/records${operation === 'update' ? `/${companyId}` : ''}`,
          httpMethod,
          { status: 400, message: attributesValidation }
        );
      }
      
      try {
        // Call appropriate handler based on operation type
        const result = operation === 'create'
          ? await toolConfig.handler(attributes)
          : await toolConfig.handler(companyId, attributes);
        
        // Use success formatter if no custom formatter is provided
        if (toolConfig.formatResult) {
          const formattedResult = toolConfig.formatResult(result);
          return formatResponse(formattedResult);
        } else {
          // For create operations, extract the ID from the result
          const resultId = operation === 'create' 
            ? (result.id?.record_id || 'Unknown') 
            : companyId as string;
            
          // Format a standard success message
          const details = {
            attributeCount: Object.keys(attributes).length
          };
          
          const successMessage = formatSuccessResponse(
            operation, 
            'company', 
            resultId, 
            details
          );
          
          return formatResponse(successMessage);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          logToolError(logName, error, { companyId, attributes });
        }
        
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          `/objects/companies/records${operation === 'update' ? `/${companyId}` : ''}`,
          httpMethod,
          hasResponseData(error) ? error.response.data : {}
        );
      }
    }
    
    // Handle create-company tool specifically
    if (toolType === 'create' && toolName === 'create-company') {
      return await handleCompanyOperation('create', request, toolConfig);
    }
    
    // Handle update-company tool specifically
    if (toolType === 'update' && toolName === 'update-company') {
      return await handleCompanyOperation('update', request, toolConfig);
    }
    
    // Handle generic record operations
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
          : safeJsonStringify(result, { 
              maxDepth: 6, 
              includeStackTraces: process.env.NODE_ENV === 'development' 
            });
        
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
      
      // Debug logging to help diagnose issues
      if (process.env.NODE_ENV === 'development') {
        console.error('[discoverAttributes] Handler execution:');
        console.error('- Resource type:', resourceType);
        console.error('- Tool handler exists:', typeof toolConfig.handler === 'function');
        console.error('- Tool formatter exists:', typeof toolConfig.formatResult === 'function');
      }
      
      try {
        // Execute attribute discovery - explicitly call without args to avoid undefined params
        const result = await toolConfig.handler();
        
        // Format result using the tool's formatter if available
        const formattedResult = toolConfig.formatResult 
          ? toolConfig.formatResult(result)
          : safeJsonStringify(result, { 
              maxDepth: 6, 
              includeStackTraces: process.env.NODE_ENV === 'development' 
            });
        
        return formatResponse(formattedResult);
      } catch (error) {
        // Enhanced error handling with more details
        logToolError('discoverAttributes', error);
        
        return createErrorResult(
          error instanceof Error ? error : new Error(`Unknown error in discoverAttributes: ${String(error)}`),
          apiPath,
          "GET",
          hasResponseData(error) ? error.response.data : {}
        );
      }
    }
    
    /**
     * Helper function to handle company information tools with consistent error handling
     * 
     * @param resourceType - The resource type (e.g., companies)
     * @param toolType - The specific tool type (e.g., basicInfo, businessInfo)
     * @param toolConfig - The tool configuration
     * @param request - The tool request
     * @param extraParams - Optional parameters specific to certain tool types
     * @returns Formatted response or error
     */
    async function handleCompanyInfoTool(
      resourceType: ResourceType, 
      toolType: string, 
      toolConfig: ToolConfig,
      request: CallToolRequest,
      extraParams?: Record<string, any>
    ) {
      // Construct API path from tool type (convert camelCase to kebab-case)
      const formattedToolType = toolType.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      const apiPath = `/${resourceType}/${formattedToolType}`;
      
      // Validate and extract resource ID
      const idOrError = validateResourceId(resourceType, request.params.arguments, apiPath);
      if (typeof idOrError !== 'string') {
        return idOrError.error;
      }
      
      const id = idOrError;
      
      // Process any extra parameters if provided
      if (extraParams?.requireFields) {
        const fields = request.params.arguments?.fields;
        
        if (!fields || !Array.isArray(fields) || fields.length === 0) {
          return createErrorResult(
            new Error("fields parameter is required and must be a non-empty array"),
            apiPath,
            "GET",
            { status: 400, message: "Missing or invalid fields parameter" }
          );
        }
        
        try {
          // Execute handler with fields parameter
          const result = await toolConfig.handler(id, fields);
          const formattedResult = toolConfig.formatResult 
            ? toolConfig.formatResult(result)
            : safeJsonStringify(result);
          
          return formatResponse(formattedResult);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            logToolError(toolType, error, { id, fields });
          }
          
          return createErrorResult(
            error instanceof Error ? error : new Error("Unknown error"),
            apiPath,
            "GET",
            hasResponseData(error) ? error.response.data : {}
          );
        }
      }
      
      // Standard case without extra parameters
      try {
        const result = await toolConfig.handler(id);
        const formattedResult = toolConfig.formatResult 
          ? toolConfig.formatResult(result)
          : safeJsonStringify(result);
        
        return formatResponse(formattedResult);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          logToolError(toolType, error, { id });
        }
        
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          apiPath,
          "GET",
          hasResponseData(error) ? error.response.data : {}
        );
      }
    }
    
    // Handle company information tools with a consistent pattern
    const companyInfoTools = ['basicInfo', 'businessInfo', 'contactInfo', 'socialInfo'];
    if (companyInfoTools.includes(toolType)) {
      return await handleCompanyInfoTool(resourceType, toolType, toolConfig, request);
    }
    
    // Handle fields tool - retrieves specific fields from a company
    if (toolType === 'fields') {
      return await handleCompanyInfoTool(resourceType, toolType, toolConfig, request, { requireFields: true });
    }
    
    /**
     * Helper function to handle update-company-attribute operation consistently
     * 
     * @param resourceType - The resource type being updated (typically ResourceType.COMPANIES)
     * @param request - The MCP tool request object containing parameters and arguments
     * @param toolConfig - The tool configuration with handler and formatter functions
     * @returns Formatted MCP response with operation results or error details
     */
    async function handleCompanyAttributeUpdate(
      resourceType: ResourceType,
      request: CallToolRequest,
      toolConfig: ToolConfig
    ) {
      const apiPath = `/${resourceType}/attributes`;
      
      // Log the request in development mode
      logToolRequest('updateAttribute', 'update-company-attribute', request);
      
      // Validate and extract resource ID
      const idOrError = validateResourceId(resourceType, request.params.arguments, apiPath);
      if (typeof idOrError !== 'string') {
        return idOrError.error;
      }
      
      const id = idOrError;
      const attributeName = request.params.arguments?.attributeName as string;
      const value = request.params.arguments?.value;
      
      // Enhanced parameter validation
      if (!attributeName || typeof attributeName !== 'string' || attributeName.trim() === '') {
        return createErrorResult(
          new Error("attributeName parameter is required and must be a non-empty string"),
          apiPath,
          "PATCH",
          { 
            status: 400, 
            message: "Missing or invalid required parameter: attributeName must be a non-empty string" 
          }
        );
      }
      
      // Check if value exists in the arguments (null is a valid value for clearing attributes)
      if (request.params.arguments && !('value' in request.params.arguments)) {
        return createErrorResult(
          new Error("value parameter is required (use null to clear an attribute)"),
          apiPath,
          "PATCH",
          { 
            status: 400, 
            message: "Missing required parameter: value (use null to clear an attribute)" 
          }
        );
      }
      
      // Debug logging in development mode
      if (process.env.NODE_ENV === 'development') {
        console.error(`[updateAttribute] Updating attribute for ${resourceType} ${id}:`, {
          attributeName,
          valueType: value === null ? 'null' : typeof value,
          value: value === null ? 'null' : 
                Array.isArray(value) ? `Array with ${value.length} items` : 
                typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : String(value)
        });
      }
      
      try {
        // Execute handler with attribute name and value
        const result = await toolConfig.handler(id, attributeName, value);
        
        // Enhance response with information about the update using the formatter
        const operation = value === null ? 'clear' : 'update';
        const details = {
          attribute: attributeName,
          action: value === null ? 'cleared' : 'updated'
        };
        
        const successMessage = formatSuccessResponse(operation, resourceType, id, details);
        
        const formattedResult = toolConfig.formatResult 
          ? toolConfig.formatResult(result)
          : successMessage;
        
        return formatResponse(formattedResult);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          logToolError('updateAttribute', error, { id, attributeName, value });
        }
        
        // Enhanced error response with more context
        const errorMessage = error instanceof Error 
          ? error.message 
          : `Failed to update attribute '${attributeName}' on ${resourceType} ${id}`;
          
        return createErrorResult(
          error instanceof Error ? error : new Error(errorMessage),
          `/${resourceType}/${id}/attributes/${attributeName}`,
          "PATCH",
          hasResponseData(error) ? error.response.data : {
            status: 500,
            message: errorMessage,
            details: {
              resourceType,
              resourceId: id,
              attributeName,
              valueType: value === null ? 'null' : typeof value
            }
          }
        );
      }
    }
    
    // Handle updateAttribute tool - updates a specific attribute of a company
    if (toolType === 'updateAttribute' && toolName === 'update-company-attribute') {
      return await handleCompanyAttributeUpdate(ResourceType.COMPANIES, request, toolConfig);
    }
    
    // Handle json tool - returns raw JSON representation of a resource
    if (toolType === 'json') {
      // Add debug logging for json tool processing
      if (process.env.NODE_ENV === 'development') {
        console.error(`[json] Processing JSON tool request for ${resourceType}:`);
        console.error('- Tool name:', toolName);
        console.error('- Request arguments:', JSON.stringify(request.params.arguments, null, 2));
      }
      
      const apiPath = `/${resourceType}/json`;
      
      // Validate and extract resource ID
      const idParamName = resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
      const id = request.params.arguments?.[idParamName] as string;
      
      if (!id) {
        return createErrorResult(
          new Error(`${idParamName} parameter is required`),
          apiPath,
          "GET",
          { status: 400, message: `Missing required parameter: ${idParamName}` }
        );
      }
      
      try {
        // Execute the handler and return formatted JSON result
        const result = await toolConfig.handler(id);
        
        // Format result using the tool's formatResult function if available, or fall back to JSON.stringify
        const formattedResult = toolConfig.formatResult ? 
          toolConfig.formatResult(result) : 
          safeJsonStringify(result);
        
        return formatResponse(formattedResult);
      } catch (error) {
        return createErrorResult(
          error instanceof Error ? error : new Error("Unknown error"),
          `/${resourceType}/${id}/json`,
          "GET",
          hasResponseData(error) ? error.response.data : {}
        );
      }
    }
    
    throw new Error(`Tool handler not implemented for tool type: ${toolType}`);
  } catch (error) {
    // Enhanced error handling with detailed information
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'Unknown error';
        
    // Get additional error details for better debugging
    const errorDetails = {
      tool: toolName,
      errorType: error && typeof error === 'object' ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      additionalInfo: error && typeof error === 'object' && 'details' in error ? (error as any).details : undefined
    };
    
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.error(`[executeToolRequest] Error executing tool '${toolName}':`, errorMessage, errorDetails);
    }
    
    // Create properly formatted MCP response with detailed error information
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool '${toolName}': ${errorMessage}`,
        },
      ],
      isError: true,
      error: {
        code: 500,
        message: errorMessage,
        type: 'tool_execution_error',
        details: errorDetails
      }
    };
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
  // Get object slug from request or use resourceType if it's a known resource
  const objectSlug = request.params.arguments?.objectSlug as string || resourceType;
  const objectId = request.params.arguments?.objectId as string;
  
  // For debugging
  if (process.env.NODE_ENV === 'development') {
    console.error(`[executeRecordOperation] Processing ${toolType} operation for ${resourceType}`);
    console.error(`[executeRecordOperation] Object slug: ${objectSlug}`);
    console.error(`[executeRecordOperation] Request arguments:`, JSON.stringify(request.params.arguments, null, 2));
  }
  
  // Handle tool types based on specific operation
  if (toolType === 'create') {
    const recordData = request.params.arguments?.recordData || request.params.arguments?.attributes;
    
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
    /**
     * Handle batch create operations
     * 
     * Note on parameter structure differences:
     * - Company-specific batch operations: Expects {companies, config} structure from MCP tool schema
     * - Generic record batch operations: Expects (objectSlug, records, objectId) parameters
     * 
     * This difference in parameter structure is due to how the MCP tools are defined in the schema.
     * Company-specific tools use a more domain-specific parameter naming ('companies' instead of 'records')
     * to provide a more intuitive API for clients.
     */
    try {
      // Log request parameters for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error(`[batchCreate] Processing request for ${resourceType || objectSlug}:`, {
          resourceType,
          objectSlug,
          arguments: request.params.arguments
        });
      }
      
      // Check if we're dealing with companies batch create (special case)
      if (resourceType === ResourceType.COMPANIES) {
        // Extract parameters with basic validation
        const companies = request.params.arguments?.companies;
        const config = request.params.arguments?.config;
        
        // Enhanced validation
        if (!companies) {
          return createErrorResult(
            new Error("'companies' parameter is required"),
            `objects/${ResourceType.COMPANIES}/records/batch`,
            "POST",
            { status: 400, message: "Missing 'companies' parameter" }
          );
        }
        
        if (!Array.isArray(companies)) {
          return createErrorResult(
            new Error("'companies' parameter must be an array"),
            `objects/${ResourceType.COMPANIES}/records/batch`,
            "POST",
            { status: 400, message: "Invalid 'companies' parameter: expected array" }
          );
        }
        
        if (companies.length === 0) {
          return createErrorResult(
            new Error("'companies' parameter must be a non-empty array"),
            `objects/${ResourceType.COMPANIES}/records/batch`,
            "POST",
            { status: 400, message: "Invalid 'companies' parameter: array cannot be empty" }
          );
        }
        
        // Call the handler with the correct parameter structure
        const result = await toolConfig.handler({ companies, config });
        
        // Format the response based on success/failure
        return formatResponse(formatBatchResults(result, 'create'), result.summary.failed > 0);
      } else {
        // Handle generic record batch create
        const records = request.params.arguments?.records;
        
        // Enhanced validation
        if (!records) {
          return createErrorResult(
            new Error("'records' parameter is required"),
            `objects/${objectSlug}/records/batch`,
            "POST",
            { status: 400, message: "Missing 'records' parameter" }
          );
        }
        
        if (!Array.isArray(records)) {
          return createErrorResult(
            new Error("'records' parameter must be an array"),
            `objects/${objectSlug}/records/batch`,
            "POST",
            { status: 400, message: "Invalid 'records' parameter: expected array" }
          );
        }
        
        if (records.length === 0) {
          return createErrorResult(
            new Error("'records' parameter must be a non-empty array"),
            `objects/${objectSlug}/records/batch`,
            "POST",
            { status: 400, message: "Invalid 'records' parameter: array cannot be empty" }
          );
        }
        
        const recordBatchCreateConfig = toolConfig as RecordBatchCreateToolConfig;
        const result = await recordBatchCreateConfig.handler(objectSlug, records, objectId);
        
        return formatResponse(formatBatchResults(result, 'create'), result.summary.failed > 0);
      }
    } catch (error) {
      // Enhanced error handling for batch operations
      console.error(`[batchCreate] Error executing batch create for ${resourceType || objectSlug}:`, error);
      
      // Include more context in the error message
      const errorMessage = error instanceof Error 
        ? `Batch create operation failed: ${error.message}`
        : `Batch create operation failed: ${String(error)}`;
      
      const errorDetails = {
        resourceType: resourceType || objectSlug,
        operation: 'batchCreate',
        message: errorMessage,
        ...(error instanceof Error && error.stack ? { stack: error.stack } : {})
      };
      
      return createErrorResult(
        error instanceof Error ? error : new Error(errorMessage),
        `objects/${resourceType || objectSlug}/records/batch`,
        "POST",
        (error as any).response?.data || errorDetails
      );
    }
  }
  
  if (toolType === 'batchUpdate') {
    /**
     * Handle batch update operations
     * 
     * Note on parameter structure differences:
     * - Company-specific batch operations: Expects {updates, config} structure from MCP tool schema
     * - Generic record batch operations: Expects (objectSlug, records, objectId) parameters
     * 
     * This difference in parameter structure is due to how the MCP tools are defined in the schema.
     * Company-specific tools use a more domain-specific parameter naming ('updates' instead of 'records')
     * to provide a more intuitive API for clients.
     */
    try {
      // Log request parameters for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error(`[batchUpdate] Processing request for ${resourceType || objectSlug}:`, {
          resourceType,
          objectSlug,
          arguments: request.params.arguments
        });
      }
      
      // Check if we're dealing with companies batch update (special case)
      if (resourceType === ResourceType.COMPANIES) {
        // Extract parameters with basic validation
        const updates = request.params.arguments?.updates;
        const config = request.params.arguments?.config;
        
        // Enhanced validation
        if (!updates) {
          return createErrorResult(
            new Error("'updates' parameter is required"),
            `objects/${ResourceType.COMPANIES}/records/batch`,
            "PATCH",
            { status: 400, message: "Missing 'updates' parameter" }
          );
        }
        
        if (!Array.isArray(updates)) {
          return createErrorResult(
            new Error("'updates' parameter must be an array"),
            `objects/${ResourceType.COMPANIES}/records/batch`,
            "PATCH",
            { status: 400, message: "Invalid 'updates' parameter: expected array" }
          );
        }
        
        if (updates.length === 0) {
          return createErrorResult(
            new Error("'updates' parameter must be a non-empty array"),
            `objects/${ResourceType.COMPANIES}/records/batch`,
            "PATCH",
            { status: 400, message: "Invalid 'updates' parameter: array cannot be empty" }
          );
        }
        
        // Additional validation of array contents
        for (let i = 0; i < updates.length; i++) {
          const update = updates[i];
          if (!update || typeof update !== 'object') {
            return createErrorResult(
              new Error(`Invalid update data at index ${i}: must be a non-null object`),
              `objects/${ResourceType.COMPANIES}/records/batch`,
              "PATCH",
              { status: 400, message: `Invalid update data at index ${i}: must be a non-null object` }
            );
          }
          
          if (!update.id) {
            return createErrorResult(
              new Error(`Invalid update data at index ${i}: 'id' is required`),
              `objects/${ResourceType.COMPANIES}/records/batch`,
              "PATCH",
              { status: 400, message: `Invalid update data at index ${i}: 'id' is required` }
            );
          }
          
          if (!update.attributes || typeof update.attributes !== 'object') {
            return createErrorResult(
              new Error(`Invalid update data at index ${i}: 'attributes' must be a non-null object`),
              `objects/${ResourceType.COMPANIES}/records/batch`,
              "PATCH",
              { status: 400, message: `Invalid update data at index ${i}: 'attributes' must be a non-null object` }
            );
          }
        }
        
        // Call the handler with the correct parameter structure
        const result = await toolConfig.handler({ updates, config });
        
        // Format the response based on success/failure
        return formatResponse(formatBatchResults(result, 'update'), result.summary.failed > 0);
      } else {
        // Handle generic record batch update
        const records = request.params.arguments?.records;
        
        // Enhanced validation
        if (!records) {
          return createErrorResult(
            new Error("'records' parameter is required"),
            `objects/${objectSlug}/records/batch`,
            "PATCH",
            { status: 400, message: "Missing 'records' parameter" }
          );
        }
        
        if (!Array.isArray(records)) {
          return createErrorResult(
            new Error("'records' parameter must be an array"),
            `objects/${objectSlug}/records/batch`,
            "PATCH",
            { status: 400, message: "Invalid 'records' parameter: expected array" }
          );
        }
        
        if (records.length === 0) {
          return createErrorResult(
            new Error("'records' parameter must be a non-empty array"),
            `objects/${objectSlug}/records/batch`,
            "PATCH",
            { status: 400, message: "Invalid 'records' parameter: array cannot be empty" }
          );
        }
        
        const recordBatchUpdateConfig = toolConfig as RecordBatchUpdateToolConfig;
        const result = await recordBatchUpdateConfig.handler(objectSlug, records, objectId);
        
        return formatResponse(formatBatchResults(result, 'update'), result.summary.failed > 0);
      }
    } catch (error) {
      // Enhanced error handling for batch operations
      console.error(`[batchUpdate] Error executing batch update for ${resourceType || objectSlug}:`, error);
      
      // Include more context in the error message
      const errorMessage = error instanceof Error 
        ? `Batch update operation failed: ${error.message}`
        : `Batch update operation failed: ${String(error)}`;
      
      const errorDetails = {
        resourceType: resourceType || objectSlug,
        operation: 'batchUpdate',
        message: errorMessage,
        ...(error instanceof Error && error.stack ? { stack: error.stack } : {})
      };
      
      return createErrorResult(
        error instanceof Error ? error : new Error(errorMessage),
        `objects/${resourceType || objectSlug}/records/batch`,
        "PATCH",
        (error as any).response?.data || errorDetails
      );
    }
  }
  
  // Add handlers for get, update, delete, list operations...
  if (toolType === 'get') {
    // For company-specific tools, check for companyId instead of generic recordId
    let recordId: string | undefined;
    
    if (resourceType === ResourceType.COMPANIES) {
      recordId = request.params.arguments?.companyId as string || request.params.arguments?.recordId as string;
      
      // Enhanced debug logging for company-specific operation
      if (process.env.NODE_ENV === 'development') {
        console.error(`[executeRecordOperation:get:company] Request arguments:`, JSON.stringify(request.params.arguments, null, 2));
        console.error(`[executeRecordOperation:get:company] Extracted companyId: ${recordId}`);
      }
    } else if (resourceType === ResourceType.PEOPLE) {
      recordId = request.params.arguments?.personId as string || request.params.arguments?.recordId as string;
    } else {
      recordId = request.params.arguments?.recordId as string;
    }
    
    // Validate recordId exists before proceeding
    if (!recordId || typeof recordId !== 'string') {
      const idParamName = resourceType === ResourceType.COMPANIES ? 'companyId' : 
                         resourceType === ResourceType.PEOPLE ? 'personId' : 'recordId';
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`[executeRecordOperation:get] Missing or invalid ${idParamName} parameter:`, 
          { resourceType, toolType, requestArgs: request.params.arguments });
      }
      
      return createErrorResult(
        new Error(`${idParamName} parameter is required and must be a non-empty string`),
        `objects/${objectSlug}/records/get`,
        "GET",
        { status: 400, message: `Missing required parameter: ${idParamName}` }
      );
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[executeRecordOperation:get] Record ID: ${recordId}`);
      console.error(`[executeRecordOperation:get] API endpoint: /objects/${objectSlug}/records/${recordId}`);
    }
    
    try {
      const recordGetConfig = toolConfig as RecordGetToolConfig;
      const record = await recordGetConfig.handler(objectSlug, recordId);
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`[executeRecordOperation:get] Retrieval successful for ID: ${recordId}`);
        console.error(`[executeRecordOperation:get] Response:`, 
          JSON.stringify(record, (key, value) => 
            key === 'values' ? Object.keys(value).length + ' fields retrieved' : value, 2));
      }
      
      return formatResponse(
        `Successfully retrieved ${objectSlug} record with ID: ${recordId}`
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[executeRecordOperation:get] Retrieval failed for ID: ${recordId}:`, 
          error instanceof Error ? error.message : String(error));
        
        if (error instanceof Error && error.stack) {
          console.error(`[executeRecordOperation:get] Stack trace:`, error.stack);
        }
      }
      
      return createErrorResult(
        error instanceof Error ? error : new Error(`Failed to get ${objectSlug} record: ${String(error)}`),
        `objects/${objectSlug}/records/${recordId}`,
        "GET",
        (error as any).response?.data || {}
      );
    }
  }
  
  if (toolType === 'update') {
    // For company-specific tools, check for companyId instead of generic recordId
    let recordId: string | undefined;
    
    if (resourceType === ResourceType.COMPANIES) {
      recordId = request.params.arguments?.companyId as string;
      
      // Enhanced debug logging for company-specific operation
      if (process.env.NODE_ENV === 'development') {
        console.error(`[executeRecordOperation:update:company] Request arguments:`, JSON.stringify(request.params.arguments, null, 2));
        console.error(`[executeRecordOperation:update:company] Extracted companyId: ${recordId}`);
        console.error(`[executeRecordOperation:update:company] Tool name: ${request.params.name}`);
      }
    } else if (resourceType === ResourceType.PEOPLE) {
      recordId = request.params.arguments?.personId as string;
    } else {
      recordId = request.params.arguments?.recordId as string;
    }
    
    // Validate recordId exists before proceeding
    if (!recordId || typeof recordId !== 'string') {
      const idParamName = resourceType === ResourceType.COMPANIES ? 'companyId' : 
                         resourceType === ResourceType.PEOPLE ? 'personId' : 'recordId';
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`[executeRecordOperation:update] Missing or invalid ${idParamName} parameter:`, 
          { resourceType, toolType, requestArgs: request.params.arguments });
      }
      
      return createErrorResult(
        new Error(`${idParamName} parameter is required and must be a non-empty string`),
        `objects/${objectSlug}/records/update`,
        "PATCH",
        { status: 400, message: `Missing required parameter: ${idParamName}` }
      );
    }
    
    // For company-specific tools, check for attributes instead of generic recordData
    const recordData = request.params.arguments?.recordData || request.params.arguments?.attributes;
    
    // Validate recordData exists and is an object
    if (!recordData || typeof recordData !== 'object' || Array.isArray(recordData)) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[executeRecordOperation:update] Missing or invalid record data:`, 
          { resourceType, recordId, recordData });
      }
      
      return createErrorResult(
        new Error(`Record data parameter is required and must be a non-empty object`),
        `objects/${objectSlug}/records/${recordId}`,
        "PATCH",
        { status: 400, message: `Missing or invalid record data` }
      );
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[executeRecordOperation:update] Record ID: ${recordId}`);
      console.error(`[executeRecordOperation:update] Record data:`, JSON.stringify(recordData, null, 2));
      console.error(`[executeRecordOperation:update] API endpoint: /objects/${objectSlug}/records/${recordId}`);
    }
    
    try {
      const recordUpdateConfig = toolConfig as RecordUpdateToolConfig;
      const record = await recordUpdateConfig.handler(objectSlug, recordId, recordData);
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`[executeRecordOperation:update] Update successful for ID: ${recordId}`);
        console.error(`[executeRecordOperation:update] Response:`, 
          JSON.stringify(record, (key, value) => 
            key === 'values' ? Object.keys(value).length + ' fields updated' : value, 2));
      }
      
      return formatResponse(
        `Successfully updated ${objectSlug} record with ID: ${recordId}`
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[executeRecordOperation:update] Update failed for ID: ${recordId}:`, 
          error instanceof Error ? error.message : String(error));
        
        if (error instanceof Error && error.stack) {
          console.error(`[executeRecordOperation:update] Stack trace:`, error.stack);
        }
      }
      
      return createErrorResult(
        error instanceof Error ? error : new Error(`Failed to update ${objectSlug} record: ${String(error)}`),
        `objects/${objectSlug}/records/${recordId}`,
        "PATCH",
        (error as any).response?.data || {}
      );
    }
  }
  
  if (toolType === 'delete') {
    // For company-specific tools, check for companyId instead of generic recordId
    let recordId: string | undefined;
    
    if (resourceType === ResourceType.COMPANIES) {
      recordId = request.params.arguments?.companyId as string;
      
      // Enhanced debug logging for company-specific operation
      if (process.env.NODE_ENV === 'development') {
        console.error(`[executeRecordOperation:delete:company] Request arguments:`, JSON.stringify(request.params.arguments, null, 2));
        console.error(`[executeRecordOperation:delete:company] Extracted companyId: ${recordId}`);
      }
    } else if (resourceType === ResourceType.PEOPLE) {
      recordId = request.params.arguments?.personId as string;
    } else {
      recordId = request.params.arguments?.recordId as string;
    }
    
    // Validate recordId exists before proceeding
    if (!recordId || typeof recordId !== 'string') {
      const idParamName = resourceType === ResourceType.COMPANIES ? 'companyId' : 
                         resourceType === ResourceType.PEOPLE ? 'personId' : 'recordId';
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`[executeRecordOperation:delete] Missing or invalid ${idParamName} parameter:`, 
          { resourceType, toolType, requestArgs: request.params.arguments });
      }
      
      return createErrorResult(
        new Error(`${idParamName} parameter is required and must be a non-empty string`),
        `objects/${objectSlug}/records/delete`,
        "DELETE",
        { status: 400, message: `Missing required parameter: ${idParamName}` }
      );
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[executeRecordOperation:delete] Record ID: ${recordId}`);
      console.error(`[executeRecordOperation:delete] API endpoint: /objects/${objectSlug}/records/${recordId}`);
    }
    
    try {
      const recordDeleteConfig = toolConfig as RecordDeleteToolConfig;
      const success = await recordDeleteConfig.handler(objectSlug, recordId);
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`[executeRecordOperation:delete] Deletion ${success ? 'successful' : 'unsuccessful'} for ID: ${recordId}`);
      }
      
      return formatResponse(
        `Successfully deleted ${objectSlug} record with ID: ${recordId}`
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[executeRecordOperation:delete] Deletion failed for ID: ${recordId}:`, 
          error instanceof Error ? error.message : String(error));
        
        if (error instanceof Error && error.stack) {
          console.error(`[executeRecordOperation:delete] Stack trace:`, error.stack);
        }
      }
      
      return createErrorResult(
        error instanceof Error ? error : new Error(`Failed to delete ${objectSlug} record: ${String(error)}`),
        `objects/${objectSlug}/records/${recordId}`,
        "DELETE",
        (error as any).response?.data || {}
      );
    }
  }
  
  if (toolType === 'list') {
    const limit = Number(request.params.arguments?.limit) || 20;
    const offset = Number(request.params.arguments?.offset) || 0;
    
    try {
      const recordListConfig = toolConfig as RecordListToolConfig;
      const records = await recordListConfig.handler(objectSlug, String(limit), String(offset));
      return formatResponse(
        `Successfully retrieved ${records.length.toString()} ${objectSlug} records`
      );
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error : new Error(`Failed to list ${objectSlug} records: ${String(error)}`),
        `objects/${objectSlug}/records`,
        "GET",
        (error as any).response?.data || {}
      );
    }
  }
  
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
    
    // Check if the formatter already includes a header to avoid duplication
    const hasHeader = typeof formattedResults === 'string' && formattedResults.startsWith('Found ');
    
    // Return the formatted result directly if it already has a header
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
    
    // Check if the formatter already includes a header to avoid duplication
    const hasHeader = typeof formattedResults === 'string' && formattedResults.startsWith('Found ');
    
    // Return the formatted result directly - the formatters now include appropriate headers
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