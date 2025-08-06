/**
 * Main entry point for tool handlers - maintains backward compatibility
 */
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  type CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { warn } from '../../utils/logger.js';
import { executeToolRequest } from './dispatcher.js';
// Import from modular components
import { TOOL_DEFINITIONS } from './registry.js';

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
  const { name, arguments: _arguments, ...potentialArgs } = params;

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
 */
export function registerToolHandlers(server: Server): void {
  // Handler for listing available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Dynamically collect all available tool definitions
    const allTools = [];

    for (const [_key, toolDefs] of Object.entries(TOOL_DEFINITIONS)) {
      if (toolDefs) {
        if (Array.isArray(toolDefs)) {
          // Legacy format: array of tool definitions
          allTools.push(...toolDefs);
        } else if (typeof toolDefs === 'object') {
          // Universal format: object with tool definitions as values
          allTools.push(...Object.values(toolDefs));
        }
      }
    }

    return {
      tools: allTools,
    };
  });

  // Handler for calling tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      // Normalize request to handle missing arguments wrapper (Issue #344)
      // Cast is safe because we're handling the protocol mismatch
      const normalizedRequest = normalizeToolRequest(
        request as CallToolRequest | LooseCallToolRequest
      );
      return await executeToolRequest(normalizedRequest);
    } catch (error) {
      // Handle normalization errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown normalization error';
      return {
        content: [
          {
            type: 'text',
            text: `Error normalizing tool request: ${errorMessage}`,
          },
        ],
        isError: true,
        error: {
          code: 400,
          message: errorMessage,
          type: 'normalization_error',
        },
      };
    }
  });
}

export { executeToolRequest } from './dispatcher.js';
export {
  formatBatchResults,
  formatListEntries,
  formatRecordDetails,
  formatResponse,
  formatSearchResults,
} from './formatters.js';
// Re-export commonly used components for backward compatibility
export { findToolConfig, TOOL_CONFIGS, TOOL_DEFINITIONS } from './registry.js';
