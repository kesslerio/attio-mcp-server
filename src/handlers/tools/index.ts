/**
 * Main entry point for tool handlers - maintains backward compatibility
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import {
  warn,
  clearLogContext,
  getLogContext,
  OperationType,
} from '@/utils/logger.js';
import { ServerContext } from '@/server/createServer.js';
import { setGlobalContext } from '@/api/lazy-client.js';

// Import from modular components
import { TOOL_DEFINITIONS } from '@/handlers/tools/registry.js';
import { getToolsListPayload } from '@/utils/mcp-discovery.js';
import { executeToolRequest } from '@/handlers/tools/dispatcher.js';
import { initializeToolContext } from '@/handlers/tools/dispatcher/logging.js';
import { createSecureToolErrorResult } from '@/utils/secure-error-handler.js';

// Constants for configuration
const DEBUG_ENV_VAR = 'MCP_DEBUG_REQUESTS';
const MAX_ARGUMENT_SIZE = 1024 * 1024; // 1MB limit for arguments

/**
 * Extended type to handle requests with loose arguments
 */
interface LooseCallToolRequest extends Omit<CallToolRequest, 'params'> {
  params: {
    name: string;
    arguments?: Record<string, unknown>;
    [key: string]: unknown; // Allow additional properties
  };
}

/**
 * Normalize tool request to handle missing arguments wrapper
 * Fixes Issue #344: MCP protocol mismatch where arguments are not wrapped
 *
 * This function handles two cases:
 * 1. Standard format: { name: "tool", arguments: { query: "value" } }
 * 2. Loose format: { name: "tool", query: "value" }
 *
 * @param request - The incoming tool request (may have loose arguments)
 * @returns Normalized request with proper arguments structure
 */
function normalizeToolRequest(
  request: CallToolRequest | LooseCallToolRequest
): CallToolRequest {
  // Validate request structure
  if (!request.params || typeof request.params.name !== 'string') {
    throw new Error('Invalid tool request: missing params or tool name');
  }

  // Type guard to check if arguments are already properly wrapped
  if ('arguments' in request.params && request.params.arguments !== undefined) {
    // Validate argument size to prevent DoS
    const argSize = JSON.stringify(request.params.arguments).length;
    if (argSize > MAX_ARGUMENT_SIZE) {
      throw new Error(
        `Tool arguments too large: ${argSize} bytes (max: ${MAX_ARGUMENT_SIZE})`
      );
    }

    // Return clean request with only name and arguments
    // This ensures no extra parameters pollute the request
    return {
      ...request,
      params: {
        name: request.params.name,
        arguments: request.params.arguments,
      },
    };
  }

  // Handle loose arguments format
  const params = request.params as LooseCallToolRequest['params'];
  const { name, ...potentialArgs } = params;

  // If there are additional params beyond 'name', treat them as arguments
  const hasAdditionalParams = Object.keys(potentialArgs).length > 0;

  if (hasAdditionalParams) {
    // Validate argument size
    const argSize = JSON.stringify(potentialArgs).length;
    if (argSize > MAX_ARGUMENT_SIZE) {
      throw new Error(
        `Tool arguments too large: ${argSize} bytes (max: ${MAX_ARGUMENT_SIZE})`
      );
    }

    // Use structured logging instead of console.error
    if (process.env[DEBUG_ENV_VAR] === 'true') {
      warn(
        'tool:normalization',
        'Normalizing loose arguments format (Issue #344)',
        {
          tool: name,
          originalParamKeys: Object.keys(request.params),
          normalizedArgKeys: Object.keys(potentialArgs),
          argumentCount: Object.keys(potentialArgs).length,
        },
        'normalization'
      );
    }

    // Create normalized request with wrapped arguments
    return {
      ...request,
      params: {
        name,
        arguments: potentialArgs,
      },
    };
  }

  // No additional params, tool might not need arguments
  return {
    ...request,
    params: {
      name: request.params.name,
      arguments: undefined,
    },
  };
}

/**
 * Registers tool-related request handlers with the server
 *
 * @param server - The MCP server instance
 * @param context - Server context with configuration
 */
export function registerToolHandlers(
  server: Server,
  context?: ServerContext
): void {
  // Set the global context for lazy initialization if provided
  if (context) {
    setGlobalContext(context);
  }

  // Handler for listing available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const { tools } = getToolsListPayload();
    return {
      tools,
    };
  });

  // Handler for calling tools
  server.setRequestHandler(
    CallToolRequestSchema,
    async (request): Promise<CallToolResult> => {
      const toolName =
        typeof request.params?.name === 'string'
          ? request.params.name
          : 'unknown_tool';
      const correlationId = initializeToolContext(toolName);

      try {
        // Normalize request to handle missing arguments wrapper (Issue #344)
        // Cast is safe because we're handling the protocol mismatch
        const normalizedRequest = normalizeToolRequest(
          request as CallToolRequest | LooseCallToolRequest
        );
        const result = (await executeToolRequest(
          normalizedRequest
        )) as CallToolResult;
        return result;
      } catch (error: unknown) {
        warn(
          'tool:normalization',
          'Tool request failed before execution',
          {
            tool: toolName,
            correlationId,
            errorMessage:
              error instanceof Error ? error.message : String(error),
          },
          'call_tool',
          OperationType.TOOL_EXECUTION
        );

        const { requestId, userId } = getLogContext();
        return createSecureToolErrorResult(error, {
          module: 'handlers.tools',
          operation: `callTool:${toolName}`,
          resourceType: toolName,
          correlationId,
          requestId,
          userId,
          errorType: 'normalization_error',
          clientMessage:
            error instanceof Error
              ? error.message
              : 'Tool request normalization failed',
          fallbackMessage: 'Tool request normalization failed',
          suggestion:
            'Ensure the MCP request includes a tool name and wraps arguments inside the "arguments" object.',
        });
      } finally {
        clearLogContext();
      }
    }
  );
}

// Re-export commonly used components for backward compatibility
export { TOOL_DEFINITIONS, TOOL_CONFIGS } from './registry.js';
export { findToolConfig } from './registry.js';
export { executeToolRequest } from './dispatcher.js';
export {
  formatSearchResults,
  formatRecordDetails,
  formatListEntries,
  formatBatchResults,
  formatResponse,
} from './formatters.js';
