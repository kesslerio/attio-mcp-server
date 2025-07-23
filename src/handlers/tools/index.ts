/**
 * Main entry point for tool handlers - maintains backward compatibility
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { ResourceType } from '../../types/attio.js';

// Import from modular components
import { TOOL_DEFINITIONS } from './registry.js';
import { executeToolRequest } from './dispatcher.js';

/**
 * Normalize tool request to handle missing arguments wrapper
 * Fixes Issue #344: MCP protocol mismatch where arguments are not wrapped
 * 
 * @param request - The incoming tool request
 * @returns Normalized request with proper arguments structure
 */
function normalizeToolRequest(request: CallToolRequest): CallToolRequest {
  // If arguments are already properly wrapped, clean up any extra params
  if (request.params.arguments) {
    // Return clean request with only name and arguments
    return {
      ...request,
      params: {
        name: request.params.name,
        arguments: request.params.arguments,
      },
    };
  }

  // Extract the tool name to exclude it from arguments
  const { name, ...potentialArgs } = request.params as any;
  
  // If there are additional params beyond 'name', treat them as arguments
  const hasAdditionalParams = Object.keys(potentialArgs).length > 0;
  
  if (hasAdditionalParams) {
    // Log the normalization for debugging
    if (process.env.MCP_DEBUG_REQUESTS === 'true') {
      console.error('[MCP Normalization] Wrapping loose arguments:', {
        tool: name,
        originalParams: request.params,
        wrappedArgs: potentialArgs,
      });
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
  return request;
}

/**
 * Registers tool-related request handlers with the server
 *
 * @param server - The MCP server instance
 */
export function registerToolHandlers(server: Server): void {
  // Handler for listing available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        ...TOOL_DEFINITIONS[ResourceType.COMPANIES],
        ...TOOL_DEFINITIONS[ResourceType.PEOPLE],
        ...TOOL_DEFINITIONS[ResourceType.LISTS],
        ...TOOL_DEFINITIONS[ResourceType.TASKS],
        ...TOOL_DEFINITIONS[ResourceType.RECORDS],
      ],
    };
  });

  // Handler for calling tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // Normalize request to handle missing arguments wrapper (Issue #344)
    const normalizedRequest = normalizeToolRequest(request);
    return await executeToolRequest(normalizedRequest);
  });
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
