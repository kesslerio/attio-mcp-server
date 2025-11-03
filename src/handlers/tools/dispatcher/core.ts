/**
 * Core dispatcher module - main tool execution dispatcher with modular operation handlers
 */
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ResourceType } from '@/types/attio.js';

// Import utilities
import {
  initializeToolContext,
  logToolRequest,
  logToolSuccess,
  logToolError,
  logToolConfigError,
} from '@/handlers/tools/dispatcher/logging.js';

// Import tool configurations
import { findToolConfig } from '@/handlers/tools/registry.js';

// Type for format result function that may accept additional parameters
type FormatResultFunction =
  | ((results: unknown) => string)
  | ((results: unknown, resourceType?: unknown, infoType?: unknown) => string);
import {
  PerformanceTimer,
  OperationType,
  getLogContext,
} from '@/utils/logger.js';
import { sanitizeMcpResponse } from '@/utils/json-serializer.js';
import { createSecureToolErrorResult } from '@/utils/secure-error-handler.js';

// Import operation handlers
import {
  handleBasicSearch,
  handleSearchByEmail,
  handleSearchByPhone,
  handleSearchByDomain,
  handleSmartSearch,
} from '@/handlers/tools/dispatcher/operations/search.js';
import { handleAdvancedSearch } from '@/handlers/tools/dispatcher/operations/advanced-search.js';
import { handleDetailsOperation } from '@/handlers/tools/dispatcher/operations/details.js';
import {
  handleNotesOperation,
  handleCreateNoteOperation,
} from '@/handlers/tools/dispatcher/operations/notes.js';
import { handleGetListsOperation } from '@/handlers/tools/dispatcher/operations/lists.js';

// Import CRUD operation handlers
import {
  handleCreateOperation,
  handleUpdateOperation,
  handleUpdateAttributeOperation,
  handleDeleteOperation,
} from '@/handlers/tools/dispatcher/operations/crud.js';

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
  handleGetRecordListMembershipsOperation,
} from '@/handlers/tools/dispatcher/operations/lists.js';

// Import Batch operation handlers
import {
  handleBatchUpdateOperation,
  handleBatchCreateOperation,
  handleBatchDeleteOperation,
  handleBatchSearchOperation,
  handleBatchGetDetailsOperation,
} from '@/handlers/tools/dispatcher/operations/batch.js';

// Import Record operation handlers
import {
  handleListOperation,
  handleGetOperation,
} from '@/handlers/tools/dispatcher/operations/records.js';
import {
  handleInfoOperation,
  handleFieldsOperation,
  handleGetAttributesOperation,
  handleDiscoverAttributesOperation,
} from '@/handlers/tools/dispatcher/misc-operations.js';

// Import tool type definitions
import {
  ToolConfig,
  SearchToolConfig,
  AdvancedSearchToolConfig,
  DetailsToolConfig,
  NotesToolConfig,
  CreateNoteToolConfig,
  GetListsToolConfig,
} from '@/handlers/tool-types.js';

/**
 * Normalize error messages by stripping tool execution prefixes
 * This improves test compatibility and error message clarity
 */
import { canonicalizeResourceType } from '@/handlers/tools/dispatcher/utils.js';

/**
 * Execute a tool request and return formatted results
 *
 * @param request - The tool request to execute
 * @returns Tool execution result
 */
export async function executeToolRequest(request: CallToolRequest) {
  const toolName = request.params.name;

  // Initialize logging context for this tool execution
  initializeToolContext(toolName);
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

    // Handle Universal and General tools first (Issue #352)
    if (resourceType === 'UNIVERSAL') {
      // For universal tools, use the tool's own handler directly
      const args = request.params.arguments as Record<string, unknown>;

      // Canonicalize and freeze resource_type to prevent mutation
      if (args && 'resource_type' in args) {
        args.resource_type = canonicalizeResourceType(args.resource_type);
        Object.defineProperty(args, 'resource_type', {
          value: args.resource_type,
          writable: false,
        });
      }

      // Universal tools have their own parameter validation and handling
      const rawResult = await (toolConfig as ToolConfig).handler(
        args as Record<string, unknown>
      );

      // If a tool already returned an MCP-shaped object, stop double-wrapping
      const isMcpResponseLike = (
        value: unknown
      ): value is {
        content: unknown;
        isError: boolean;
      } =>
        typeof value === 'object' &&
        value !== null &&
        'content' in value &&
        'isError' in value;

      if (isMcpResponseLike(rawResult)) {
        const sanitized = sanitizeMcpResponse(rawResult);
        logToolSuccess(toolName, toolType, sanitized, timer);
        return sanitized; // skip detection/formatting, it's already MCP
      }

      // Format the result using the tool's formatResult if available
      let formattedResult: string;
      if (rawResult === null || rawResult === undefined) {
        formattedResult = JSON.stringify(rawResult, null, 2);
      } else if (toolConfig.formatResult) {
        try {
          formattedResult = (toolConfig.formatResult as FormatResultFunction)(
            rawResult,
            args?.resource_type,
            args?.info_type
          );
        } catch {
          formattedResult = (toolConfig.formatResult as FormatResultFunction)(
            rawResult
          );
        }
      } else {
        formattedResult = JSON.stringify(rawResult, null, 2);
      }

      result = {
        content: [{ type: 'text', text: formattedResult }],
        isError: false,
      };
    } else if (resourceType === 'GENERAL') {
      // For general tools, use the tool's own handler directly
      const args = request.params.arguments as Record<string, unknown>;
      let handlerArgs: unknown[] = [];

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
        handlerArgs = [args];
      }

      const rawResult = await (toolConfig as ToolConfig).handler(
        ...handlerArgs
      );
      const formattedResult =
        toolConfig.formatResult?.(rawResult) ||
        JSON.stringify(rawResult, null, 2);

      result = {
        content: [{ type: 'text', text: formattedResult }],
        isError: false,
      };
    } else if (toolType === 'search') {
      result = await handleBasicSearch(
        request,
        toolConfig as SearchToolConfig,
        resourceType as ResourceType
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
      const rawResult = await (toolConfig as ToolConfig).handler(
        request.params.arguments as unknown as Record<string, unknown>
      );
      const formattedResult =
        toolConfig.formatResult?.(rawResult) ||
        JSON.stringify(rawResult, null, 2);
      result = {
        content: [{ type: 'text', text: formattedResult }],
        isError: false,
      };
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
      result = await handleDiscoverAttributesOperation(request, toolConfig);
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
    } else if (toolType === 'getRecordListMemberships') {
      result = await handleGetRecordListMembershipsOperation(
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

      // Handle workspace member operations (Issue #684)
    } else if (
      toolType === 'listWorkspaceMembers' ||
      toolType === 'searchWorkspaceMembers' ||
      toolType === 'getWorkspaceMember'
    ) {
      // Workspace member tools have simple handlers with formatResult
      const rawResult = await (toolConfig as ToolConfig).handler(
        request.params.arguments as unknown as Record<string, unknown>
      );
      const formattedResult =
        toolConfig.formatResult?.(rawResult) ||
        JSON.stringify(rawResult, null, 2);
      result = {
        content: [{ type: 'text', text: formattedResult }],
        isError: false,
      };

      // Handle generic record operations
    } else if (toolType === 'list') {
      result = await handleListOperation(request, toolConfig as ToolConfig);
    } else if (toolType === 'get') {
      result = await handleGetOperation(request, toolConfig as ToolConfig);
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
  } catch (error: unknown) {
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
          ? (error as { details: unknown }).details
          : undefined,
    };

    // Log error using enhanced structured logging
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
    const { correlationId, requestId, userId } = getLogContext();
    return createSecureToolErrorResult(error, {
      module: 'handlers.tools.dispatcher',
      operation: `execute:${toolName}`,
      resourceType: toolType,
      correlationId,
      requestId,
      userId,
    });
  }
}
