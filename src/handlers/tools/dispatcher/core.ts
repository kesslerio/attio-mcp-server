/**
 * Core dispatcher module - main tool execution dispatcher with modular operation handlers
 */
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ResourceType } from '../../../types/attio.js';

// Import utilities
import {
  initializeToolContext,
  logToolRequest,
  logToolSuccess,
  logToolError,
  logToolConfigError,
} from './logging.js';

// Import tool configurations
import { findToolConfig } from '../registry.js';
import { PerformanceTimer, OperationType } from '../../../utils/logger.js';
import { sanitizeMcpResponse } from '../../../utils/json-serializer.js';

// Import operation handlers
import {
  handleBasicSearch,
  handleSearchByEmail,
  handleSearchByPhone,
  handleSearchByDomain,
  handleSearchByCompany,
  handleSmartSearch,
} from './operations/search.js';
import { handleDetailsOperation } from './operations/details.js';
import {
  handleNotesOperation,
  handleCreateNoteOperation,
} from './operations/notes.js';
import { handleGetListsOperation } from './operations/lists.js';

// Import CRUD operation handlers
import {
  handleCreateOperation,
  handleUpdateOperation,
  handleUpdateAttributeOperation,
  handleDeleteOperation,
} from './operations/crud.js';

// Import List operation handlers (additional operations from emergency fix)
import {
  handleAddRecordToListOperation,
  handleRemoveRecordFromListOperation,
  handleUpdateListEntryOperation,
  handleGetListDetailsOperation,
  handleGetListEntriesOperation,
  handleFilterListEntriesOperation,
  handleAdvancedFilterListEntriesOperation,
  handleFilterListEntriesByParentOperation,
  handleFilterListEntriesByParentIdOperation,
} from './operations/lists.js';

// Import Batch operation handlers
import {
  handleBatchUpdateOperation,
  handleBatchCreateOperation,
  handleBatchDeleteOperation,
  handleBatchSearchOperation,
  handleBatchGetDetailsOperation,
} from './operations/batch.js';

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
  DateBasedSearchToolConfig,
} from '../../tool-types.js';

/**
 * Execute a tool request and return formatted results
 *
 * @param request - The tool request to execute
 * @returns Tool execution result
 */
export async function executeToolRequest(request: CallToolRequest) {
  const toolName = request.params.name;

  // Initialize logging context for this tool execution
  const correlationId = initializeToolContext(toolName);
  let timer: PerformanceTimer | undefined;
  let toolType: string | undefined;

  // Additional safety check for missing arguments wrapper (Issue #344)
  if (!request.params.arguments && process.env.MCP_DEBUG_REQUESTS === 'true') {
    console.error('[Dispatcher] Warning: Tool request missing arguments wrapper', {
      tool: toolName,
      params: request.params,
    });
  }

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
      // Add fallback for missing arguments wrapper (Issue #344)
      const args = request.params.arguments || {};
      const rawResult = await toolConfig.handler(args);
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
      result = await handleBasicSearch(
        request,
        toolConfig as SearchToolConfig,
        resourceType
      );
    } else if (toolType === 'searchByDomain') {
      result = await handleSearchByDomain(
        request,
        toolConfig as SearchToolConfig,
        resourceType
      );
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
  resourceType: ResourceType
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
