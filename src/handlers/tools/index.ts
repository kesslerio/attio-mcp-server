/**
 * Main entry point for tool handlers - maintains backward compatibility
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ResourceType } from '../../types/attio.js';

// Import from modular components
import { TOOL_DEFINITIONS } from './registry.js';
import { executeToolRequest } from './dispatcher.js';

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
    return await executeToolRequest(request);
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
