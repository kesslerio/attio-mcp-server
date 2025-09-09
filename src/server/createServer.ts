/**
 * Factory function to create and configure an MCP server instance
 * This centralizes all server setup logic to be reused by both STDIO and HTTP transports
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { initializeAttioClient } from '../api/attio-client.js';
import { registerResourceHandlers } from '../handlers/resources.js';
import { registerToolHandlers } from '../handlers/tools/index.js';
import { registerPromptHandlers } from '../prompts/handlers.js';

export function createServer() {
  // Validate required environment variables
  if (!process.env.ATTIO_API_KEY) {
    throw new Error('ATTIO_API_KEY environment variable not found');
  }

  // Initialize API client
  initializeAttioClient(process.env.ATTIO_API_KEY);

  // Create MCP server with proper capabilities declaration
  const mcpServer = new Server(
    {
      name: 'attio-mcp-server',
      version: '0.2.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {
          list: {},
          get: {},
        },
      },
    }
  );

  // Register all handlers
  registerResourceHandlers(mcpServer);
  registerToolHandlers(mcpServer);
  registerPromptHandlers(mcpServer);

  return mcpServer;
}
