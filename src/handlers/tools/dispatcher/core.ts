/**
 * Core dispatcher module - main tool execution dispatcher with modular operation handlers
 */
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ResourceType } from '../../../types/attio.js';
import { sanitizeMcpResponse } from '../../../utils/json-serializer.js';
import { OperationType, PerformanceTimer } from '../../../utils/logger.js';
// Import tool type definitions
import {
  AdvancedSearchToolConfig,
  CreateNoteToolConfig,
  DetailsToolConfig,
  GetListsToolConfig,
  NotesToolConfig,
  SearchToolConfig,
  ToolConfig,
} from '../../tool-types.js';
// Import tool configurations
import { findToolConfig } from '../registry.js';
// Import utilities
import {
  initializeToolContext,
  logToolConfigError,
  logToolError,
  logToolRequest,
  logToolSuccess,
} from './logging.js';
import { handleAdvancedSearch } from './operations/advanced-search.js';
// Import Batch operation handlers
import {
  handleBatchCreateOperation,
  handleBatchDeleteOperation,
  handleBatchGetDetailsOperation,
  handleBatchSearchOperation,
  handleBatchUpdateOperation,
} from './operations/batch.js';
// Import CRUD operation handlers
import {
  handleCreateOperation,
  handleDeleteOperation,
  handleUpdateAttributeOperation,
  handleUpdateOperation,
} from './operations/crud.js';
import { handleDetailsOperation } from './operations/details.js';
// Import List operation handlers (additional operations from emergency fix)
import {
  handleAddRecordToListOperation,
  handleAdvancedFilterListEntriesOperation,
  handleFilterListEntriesByParentIdOperation,
  handleFilterListEntriesByParentOperation,
  handleFilterListEntriesOperation,
  handleGetListDetailsOperation,
  handleGetListEntriesOperation,
  handleGetListsOperation,
  handleRemoveRecordFromListOperation,
  handleUpdateListEntryOperation,
} from './operations/lists.js';
import {
  handleCreateNoteOperation,
  handleNotesOperation,
} from './operations/notes.js';

// Import Record operation handlers
import {
  handleGetOperation,
  handleListOperation,
} from './operations/records.js';
// Import operation handlers
import {
  handleBasicSearch,
  handleSearchByDomain,
  handleSearchByEmail,
  handleSearchByPhone,
  handleSmartSearch,
} from './operations/search.js';

/**
 * Execute a tool request and return formatted results
 *
 * @param request - The tool request to execute
 * @returns Tool execution result
 */
export async function executeToolRequest(request: CallToolRequest) {
  const toolName = request.params.name;

  // Initialize logging context for this tool execution
  const _correlationId = initializeToolContext(toolName);
  let timer: PerformanceTimer | undefined;
  let toolType: string | undefined;

  // Note: Argument normalization is handled in the request handler (Issue #344)
  // This dispatcher expects normalized requests with proper arguments structure

  try {
    const toolInfo = findToolConfig(toolName);

    if (!toolInfo) {
      logToolConfigError(toolName, 'Tool configuration not found');
      throw new Error(`Tool not found: ${toolName}`);
    }

    const { resourceType, toolConfig } = toolInfo;
    toolType = toolInfo.toolType; // Assign to outer scope variable

    // Start tool execution logging with performance tracking
    timer = logToolRequest(toolType, toolName, request);

    let result;

    // Handle search tools
    if (toolType === 'search') {
      result = await handleBasicSearch(
        request,
        toolConfig as SearchToolConfig,
        resourceType
      );
    } else if (toolType === 'searchByEmail') {
      result = await handleSearchByEmail(
        request,
        toolConfig as SearchToolConfig,
        resourceType
      );
    } else if (toolType === 'searchByPhone') {
      result = await handleSearchByPhone(
        request,
        toolConfig as SearchToolConfig,
        resourceType
      );
    } else if (toolType === 'searchByCompany') {
      // Use the tool config's own handler and format the result
      const rawResult = await toolConfig.handler(request.params.arguments);
      const formattedResult =
        toolConfig.formatResult?.(rawResult) ||
        JSON.stringify(rawResult, null, 2);
      result = { content: [{ type: 'text', text: formattedResult }] };
    } else if (toolType === 'smartSearch') {
      result = await handleSmartSearch(
        request,
        toolConfig as SearchToolConfig,
        resourceType
      );
    } else if (toolType === 'details') {
      result = await handleDetailsOperation(
        request,
        toolConfig as DetailsToolConfig,
        resourceType
      );
    } else if (toolType === 'notes') {
      result = await handleNotesOperation(
        request,
        toolConfig as NotesToolConfig,
        resourceType
      );
    } else if (toolType === 'createNote') {
      result = await handleCreateNoteOperation(
        request,
        toolConfig as CreateNoteToolConfig,
        resourceType
      );
    } else if (toolType === 'getLists') {
      result = await handleGetListsOperation(
        request,
        toolConfig as GetListsToolConfig
      );

      // Handle CRUD operations (from emergency fix)
    } else if (toolType === 'create') {
      result = await handleCreateOperation(
        request,
        toolConfig as ToolConfig,
        resourceType
      );
    } else if (toolType === 'update') {
      result = await handleUpdateOperation(
        request,
        toolConfig as ToolConfig,
        resourceType
      );
    } else if (toolType === 'updateAttribute') {
      result = await handleUpdateAttributeOperation(
        request,
        toolConfig as ToolConfig,
        resourceType
      );
    } else if (toolType === 'delete') {
      result = await handleDeleteOperation(
        request,
        toolConfig as ToolConfig,
        resourceType
      );

      // Handle additional info operations (from emergency fix)
    } else if (
      toolType === 'basicInfo' ||
      toolType === 'businessInfo' ||
      toolType === 'contactInfo' ||
      toolType === 'socialInfo' ||
      toolType === 'json'
    ) {
      result = await handleInfoOperation(request, toolConfig, resourceType);
    } else if (toolType === 'fields') {
      result = await handleFieldsOperation(request, toolConfig, resourceType);
    } else if (toolType === 'getAttributes') {
      result = await handleGetAttributesOperation(
        request,
        toolConfig,
        resourceType
      );
    } else if (toolType === 'discoverAttributes') {
      result = await handleDiscoverAttributesOperation(
        request,
        toolConfig,
        resourceType
      );
    } else if (toolType === 'customFields') {
      result = await handleInfoOperation(request, toolConfig, resourceType);

      // Handle List operations (from emergency fix)
    } else if (toolType === 'addRecordToList') {
      result = await handleAddRecordToListOperation(request, toolConfig);
    } else if (toolType === 'removeRecordFromList') {
      result = await handleRemoveRecordFromListOperation(request, toolConfig);
    } else if (toolType === 'updateListEntry') {
      result = await handleUpdateListEntryOperation(request, toolConfig);
    } else if (toolType === 'getListDetails') {
      result = await handleGetListDetailsOperation(request, toolConfig);
    } else if (toolType === 'getListEntries') {
      result = await handleGetListEntriesOperation(request, toolConfig);
    } else if (toolType === 'filterListEntries') {
      result = await handleFilterListEntriesOperation(request, toolConfig);
    } else if (toolType === 'advancedFilterListEntries') {
      result = await handleAdvancedFilterListEntriesOperation(
        request,
        toolConfig
      );
    } else if (toolType === 'filterListEntriesByParent') {
      result = await handleFilterListEntriesByParentOperation(
        request,
        toolConfig
      );
    } else if (toolType === 'filterListEntriesByParentId') {
      result = await handleFilterListEntriesByParentIdOperation(
        request,
        toolConfig
      );

      // Handle Batch operations (from emergency fix)
    } else if (toolType === 'batchUpdate') {
      result = await handleBatchUpdateOperation(
        request,
        toolConfig,
        resourceType
      );
    } else if (toolType === 'batchCreate') {
      result = await handleBatchCreateOperation(
        request,
        toolConfig,
        resourceType
      );
    } else if (toolType === 'batchDelete') {
      result = await handleBatchDeleteOperation(
        request,
        toolConfig,
        resourceType
      );
    } else if (toolType === 'batchSearch') {
      result = await handleBatchSearchOperation(
        request,
        toolConfig,
        resourceType
      );
    } else if (toolType === 'batchGetDetails') {
      result = await handleBatchGetDetailsOperation(
        request,
        toolConfig,
        resourceType
      );

      // Handle other advanced search operations (from emergency fix)
    } else if (toolType === 'advancedSearch') {
      result = await handleAdvancedSearch(
        request,
        toolConfig as AdvancedSearchToolConfig,
        resourceType
      );
    } else if (toolType === 'searchByDomain') {
      result = await handleSearchByDomain(
        request,
        toolConfig as SearchToolConfig,
        resourceType
      );

      // Handle generic record operations
    } else if (toolType === 'list') {
      result = await handleListOperation(request, toolConfig as ToolConfig);
    } else if (toolType === 'get') {
      result = await handleGetOperation(request, toolConfig as ToolConfig);

      // Handle Universal tools (Issue #352 - Universal tool consolidation)
    } else if (resourceType === ('UNIVERSAL' as any)) {
      // For universal tools, use the tool's own handler directly
      const args = request.params.arguments;

      // Universal tools have their own parameter validation and handling
      const rawResult = await toolConfig.handler(args);

      // Universal tools may have different formatResult signatures - handle flexibly
      let formattedResult: string;
      if (toolConfig.formatResult) {
        try {
          // Try with all possible parameters (result, resourceType, infoType)
          formattedResult = (toolConfig.formatResult as any)(
            rawResult,
            args?.resource_type,
            args?.info_type
          );
        } catch {
          // Fallback to just result if signature mismatch
          formattedResult = (toolConfig.formatResult as any)(rawResult);
        }
      } else {
        formattedResult = JSON.stringify(rawResult, null, 2);
      }

      result = { content: [{ type: 'text', text: formattedResult }] };

      // Handle General tools (relationship helpers, etc.)
    } else if (resourceType === ('GENERAL' as any)) {
      // For general tools, use the tool's own handler directly
      const args = request.params.arguments;
      let handlerArgs: any[] = [];

      // Map arguments based on tool type
      if (
        toolType === 'linkPersonToCompany' ||
        toolType === 'unlinkPersonFromCompany'
      ) {
        handlerArgs = [args?.personId, args?.companyId];
      } else if (toolType === 'getPersonCompanies') {
        handlerArgs = [args?.personId];
      } else if (toolType === 'getCompanyTeam') {
        handlerArgs = [args?.companyId];
      } else {
        // For other general tools, pass arguments as is
        handlerArgs = [args];
      }

      const rawResult = await toolConfig.handler(...handlerArgs);
      const formattedResult =
        toolConfig.formatResult?.(rawResult) ||
        JSON.stringify(rawResult, null, 2);
      result = { content: [{ type: 'text', text: formattedResult }] };
    } else {
      // Placeholder for other operations - will be extracted to modules later
      throw new Error(
        `Tool handler not implemented for tool type: ${toolType}`
      );
    }

    // Log successful execution
    logToolSuccess(toolName, toolType, result, timer);

    // Ensure the response is safely serializable
    const sanitizedResult = sanitizeMcpResponse(result);
    return sanitizedResult;
  } catch (error) {
    // Enhanced error handling with structured logging
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown error';

    // Get additional error details for better debugging
    const errorDetails = {
      tool: toolName,
      errorType:
        error && typeof error === 'object'
          ? error.constructor.name
          : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      additionalInfo:
        error && typeof error === 'object' && 'details' in error
          ? (error as any).details
          : undefined,
    };

    // Log error using enhanced structured logging
    // 'timer' (PerformanceTimer) from the try block should be used here.
    // If timer is undefined (e.g. error before timer initialization), create a new one.
    // toolType might also be undefined if error occurred before its assignment.
    const finalTimer = timer
      ? timer
      : new PerformanceTimer(
          'dispatcher_error_fallback',
          toolName,
          OperationType.TOOL_EXECUTION
        );

    logToolError(
      toolName,
      toolType || 'unknown_type_on_error',
      error,
      finalTimer,
      errorDetails
    );

    // Create properly formatted MCP response with detailed error information
    const errorResponse = {
      content: [
        {
          type: 'text',
          text: `Error executing tool '${toolName}': ${errorMessage}`,
        },
      ],
      isError: true,
      error: {
        code: 500,
        message: errorMessage,
        type: 'tool_execution_error',
        details: errorDetails,
      },
    };

    // Ensure the error response is safely serializable
    return sanitizeMcpResponse(errorResponse);
  }
}

// Placeholder functions that need to be implemented (missing from main branch)
async function handleInfoOperation(
  request: CallToolRequest,
  toolConfig: any,
  resourceType: ResourceType
) {
  // This should be moved to an appropriate operations module
  const idParam =
    resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  const id = request.params.arguments?.[idParam] as string;

  if (!id) {
    throw new Error(`${idParam} parameter is required`);
  }

  const result = await toolConfig.handler(id);
  const formattedResult = toolConfig.formatResult
    ? toolConfig.formatResult(result)
    : result;

  return {
    content: [{ type: 'text', text: formattedResult }],
    isError: false,
  };
}

async function handleFieldsOperation(
  request: CallToolRequest,
  toolConfig: any,
  resourceType: ResourceType
) {
  // This should be moved to an appropriate operations module
  const idParam =
    resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  const id = request.params.arguments?.[idParam] as string;
  const fields = request.params.arguments?.fields as string[];

  if (!id || !fields) {
    throw new Error('Both id and fields parameters are required');
  }

  const result = await toolConfig.handler(id, fields);
  const formattedResult = toolConfig.formatResult
    ? toolConfig.formatResult(result)
    : result;

  return {
    content: [{ type: 'text', text: formattedResult }],
    isError: false,
  };
}

async function handleGetAttributesOperation(
  request: CallToolRequest,
  toolConfig: any,
  resourceType: ResourceType
) {
  // This should be moved to an appropriate operations module
  const idParam =
    resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  const id = request.params.arguments?.[idParam] as string;
  const attributeName = request.params.arguments?.attributeName as string;

  if (!id) {
    throw new Error(`${idParam} parameter is required`);
  }

  const result = await toolConfig.handler(id, attributeName);
  const formattedResult = toolConfig.formatResult
    ? toolConfig.formatResult(result)
    : result;

  return {
    content: [{ type: 'text', text: formattedResult }],
    isError: false,
  };
}

async function handleDiscoverAttributesOperation(
  request: CallToolRequest,
  toolConfig: any,
  _resourceType: ResourceType
) {
  // This should be moved to an appropriate operations module
  const result = await toolConfig.handler();
  const formattedResult = toolConfig.formatResult
    ? toolConfig.formatResult(result)
    : result;

  return {
    content: [{ type: 'text', text: formattedResult }],
    isError: false,
  };
}
