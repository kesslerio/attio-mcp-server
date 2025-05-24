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
  logToolConfigError 
} from './logging.js';

// Import tool configurations
import { findToolConfig } from '../registry.js';

// Import operation handlers
import {
  handleBasicSearch,
  handleSearchByEmail,
  handleSearchByPhone,
  handleSmartSearch
} from './operations/search.js';
import { handleDetailsOperation } from './operations/details.js';
import { 
  handleNotesOperation, 
  handleCreateNoteOperation 
} from './operations/notes.js';
import { handleGetListsOperation } from './operations/lists.js';
import {
  handleCreateOperation,
  handleUpdateOperation,
  handleUpdateAttributeOperation,
  handleDeleteOperation
} from './operations/crud.js';

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

  try {
    const toolInfo = findToolConfig(toolName);

    if (!toolInfo) {
      logToolConfigError(toolName, 'Tool configuration not found');
      throw new Error(`Tool not found: ${toolName}`);
    }

    const { resourceType, toolConfig, toolType } = toolInfo;
    
    // Start tool execution logging with performance tracking
    const timer = logToolRequest(toolType, toolName, request);

    let result;

    // Handle search tools
    if (toolType === 'search') {
      result = await handleBasicSearch(request, toolConfig as SearchToolConfig, resourceType);
    } else if (toolType === 'searchByEmail') {
      result = await handleSearchByEmail(request, toolConfig as SearchToolConfig, resourceType);
    } else if (toolType === 'searchByPhone') {
      result = await handleSearchByPhone(request, toolConfig as SearchToolConfig, resourceType);
    } else if (toolType === 'smartSearch') {
      result = await handleSmartSearch(request, toolConfig as SearchToolConfig, resourceType);
    } else if (toolType === 'details') {
      result = await handleDetailsOperation(request, toolConfig as DetailsToolConfig, resourceType);
    } else if (toolType === 'notes') {
      result = await handleNotesOperation(request, toolConfig as NotesToolConfig, resourceType);
    } else if (toolType === 'createNote') {
      result = await handleCreateNoteOperation(request, toolConfig as CreateNoteToolConfig, resourceType);
    } else if (toolType === 'getLists') {
      result = await handleGetListsOperation(request, toolConfig as GetListsToolConfig);
    } else if (toolType === 'create') {
      result = await handleCreateOperation(request, toolConfig as ToolConfig, resourceType);
    } else if (toolType === 'update') {
      result = await handleUpdateOperation(request, toolConfig as ToolConfig, resourceType);
    } else if (toolType === 'updateAttribute') {
      result = await handleUpdateAttributeOperation(request, toolConfig as ToolConfig, resourceType);
    } else if (toolType === 'delete') {
      result = await handleDeleteOperation(request, toolConfig as ToolConfig, resourceType);
    } else {
      // Placeholder for other operations - will be extracted to modules later
      throw new Error(`Tool handler not implemented for tool type: ${toolType}`);
    }

    // Log successful execution
    logToolSuccess(toolName, toolType, result, timer);
    return result;
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
    logToolError(toolName, 'unknown', error, timer!, errorDetails);

    // Create properly formatted MCP response with detailed error information
    return {
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
  }
}

