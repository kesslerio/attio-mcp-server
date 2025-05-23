/**
 * Core dispatcher module - main tool execution dispatcher with modular operation handlers
 */
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { createErrorResult } from '../../../utils/error-handler.js';
import { parseResourceUri } from '../../../utils/uri-parser.js';
import { ResourceType } from '../../../types/attio.js';
import { safeJsonStringify } from '../../../utils/json-serializer.js';

// Import utilities
import { logToolRequest, logToolError } from './logging.js';
import { validateAttributes, validateResourceId } from './validation.js';
import { formatSuccessResponse } from './formatting.js';

// Import tool configurations
import { findToolConfig } from '../registry.js';
import { formatResponse } from '../formatters.js';
import { hasResponseData } from '../error-types.js';

// Import operation handlers
import {
  handleBasicSearch,
  handleSearchByEmail,
  handleSearchByPhone,
  handleSmartSearch
} from './operations/search.js';

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

/**
 * Handle details operation
 */
async function handleDetailsOperation(
  request: CallToolRequest,
  toolConfig: DetailsToolConfig,
  resourceType: ResourceType
) {
  let id: string;
  let uri: string;

  // Check which parameter is provided
  const directId =
    resourceType === ResourceType.COMPANIES
      ? (request.params.arguments?.companyId as string)
      : (request.params.arguments?.personId as string);

  uri = request.params.arguments?.uri as string;

  // Use either direct ID or URI, with priority to URI if both are provided
  if (uri) {
    try {
      const [uriType, uriId] = parseResourceUri(uri);
      if (uriType !== resourceType) {
        throw new Error(
          `URI type mismatch: Expected ${resourceType}, got ${uriType}`
        );
      }
      id = uriId;
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error : new Error('Invalid URI format'),
        uri,
        'GET',
        { status: 400, message: 'Invalid URI format' }
      );
    }
  } else if (directId) {
    id = directId;
    // For logging purposes
    uri = `attio://${resourceType}/${directId}`;
  } else {
    return createErrorResult(
      new Error('Either companyId/personId or uri parameter is required'),
      `/${resourceType}`,
      'GET',
      { status: 400, message: 'Missing required parameter' }
    );
  }

  try {
    const record = await toolConfig.handler(id);
    const formattedResult = toolConfig.formatResult!(record);

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      uri,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle notes operation
 */
async function handleNotesOperation(
  request: CallToolRequest,
  toolConfig: NotesToolConfig,
  resourceType: ResourceType
) {
  const directId =
    resourceType === ResourceType.COMPANIES
      ? (request.params.arguments?.companyId as string)
      : (request.params.arguments?.personId as string);
  const uri = request.params.arguments?.uri as string;

  if (!directId && !uri) {
    const idParamName =
      resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
    return createErrorResult(
      new Error(`Either ${idParamName} or uri parameter is required`),
      `/${resourceType}/notes`,
      'GET',
      { status: 400, message: 'Missing required parameter' }
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
          error instanceof Error ? error : new Error('Invalid URI format'),
          uri,
          'GET',
          { status: 400, message: 'Invalid URI format' }
        );
      }
    }

    const limit = request.params.arguments?.limit as number;
    const offset = request.params.arguments?.offset as number;

    const notes = await toolConfig.handler(notesTargetId, limit, offset);
    const formattedResult = toolConfig.formatResult!(notes);

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      uri || `/${resourceType}/${notesTargetId}/notes`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle createNote operation
 */
async function handleCreateNoteOperation(
  request: CallToolRequest,
  toolConfig: CreateNoteToolConfig,
  resourceType: ResourceType
) {
  const directId =
    resourceType === ResourceType.COMPANIES
      ? (request.params.arguments?.companyId as string)
      : (request.params.arguments?.personId as string);
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
  const title = (request.params.arguments?.title ||
    request.params.arguments?.noteTitle) as string;
  const content = (request.params.arguments?.content ||
    request.params.arguments?.noteText) as string;

  if (!title || !content) {
    return createErrorResult(
      new Error('Both title and content are required'),
      `/${resourceType}/notes`,
      'POST',
      { status: 400, message: 'Missing required parameters' }
    );
  }

  if (!directId && !uri) {
    const idParamName =
      resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
    return createErrorResult(
      new Error(`Either ${idParamName} or uri parameter is required`),
      `/${resourceType}/notes`,
      'POST',
      { status: 400, message: 'Missing required parameter' }
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
          error instanceof Error ? error : new Error('Invalid URI format'),
          uri,
          'POST',
          { status: 400, message: 'Invalid URI format' }
        );
      }
    }

    const note = await toolConfig.handler(noteTargetId, title, content);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(note)
      : `Note added to ${resourceType.slice(0, -1)} ${noteTargetId}: ${note.title || 'Untitled'}`;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      uri || `/${resourceType}/${noteTargetId}/notes`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle getLists operation
 */
async function handleGetListsOperation(
  request: CallToolRequest,
  toolConfig: GetListsToolConfig
) {
  try {
    const lists = await toolConfig.handler();
    const formattedResult = toolConfig.formatResult!(lists);

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      '/lists',
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}