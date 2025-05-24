/**
 * Core dispatcher module - main tool execution dispatcher with modular operation handlers
 */
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ResourceType } from '../../../types/attio.js';

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

  try {
    const toolInfo = findToolConfig(toolName);

    if (!toolInfo) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const { resourceType, toolConfig, toolType } = toolInfo;

    // Handle search tools
    if (toolType === 'search') {
      return await handleBasicSearch(request, toolConfig as SearchToolConfig, resourceType);
    }

    // Handle searchByEmail tools
    if (toolType === 'searchByEmail') {
      return await handleSearchByEmail(request, toolConfig as SearchToolConfig, resourceType);
    }

    // Handle searchByPhone tools
    if (toolType === 'searchByPhone') {
      return await handleSearchByPhone(request, toolConfig as SearchToolConfig, resourceType);
    }

    // Handle smartSearch tools
    if (toolType === 'smartSearch') {
      return await handleSmartSearch(request, toolConfig as SearchToolConfig, resourceType);
    }

    // Handle details tools
    if (toolType === 'details') {
      return await handleDetailsOperation(request, toolConfig as DetailsToolConfig, resourceType);
    }

    // Handle notes tools
    if (toolType === 'notes') {
      return await handleNotesOperation(request, toolConfig as NotesToolConfig, resourceType);
    }

    // Handle createNote tools
    if (toolType === 'createNote') {
      return await handleCreateNoteOperation(request, toolConfig as CreateNoteToolConfig, resourceType);
    }

    // Handle getLists tool
    if (toolType === 'getLists') {
      return await handleGetListsOperation(request, toolConfig as GetListsToolConfig);
    }

    // Handle create tools
    if (toolType === 'create') {
      return await handleCreateOperation(request, toolConfig as ToolConfig, resourceType);
    }

    // Handle update tools
    if (toolType === 'update') {
      return await handleUpdateOperation(request, toolConfig as ToolConfig, resourceType);
    }

    // Handle updateAttribute tools
    if (toolType === 'updateAttribute') {
      return await handleUpdateAttributeOperation(request, toolConfig as ToolConfig, resourceType);
    }

    // Handle delete tools
    if (toolType === 'delete') {
      return await handleDeleteOperation(request, toolConfig as ToolConfig, resourceType);
    }

    // Placeholder for other operations - will be extracted to modules later
    throw new Error(`Tool handler not implemented for tool type: ${toolType}`);
  } catch (error) {
    // Enhanced error handling with detailed information
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

    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.error(
        `[executeToolRequest] Error executing tool '${toolName}':`,
        errorMessage,
        errorDetails
      );
    }

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

