/**
 * Factory function to create and configure an MCP server instance
 * This centralizes all server setup logic to be reused by different transports
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createScopedLogger } from '../utils/logger.js';
import { z } from 'zod';
import { registerResourceHandlers } from '../handlers/resources.js';
import { registerToolHandlers } from '../handlers/tools/index.js';
import { registerPromptHandlers } from '../prompts/handlers.js';
import { setGlobalContext } from '../api/lazy-client.js';

/**
 * Context interface for passing configuration to the server
 */
export interface ServerContext {
  getApiKey?: () => string | undefined;
  getWorkspaceId?: () => string | undefined;
  [key: string]: unknown;
}

/**
 * Configuration schema for Smithery/Playground auto-discovery
 * This allows scanners to build a test configuration without guessing.
 */
export const configSchema = z.object({
  ATTIO_API_KEY: z.string().min(1).optional().describe('Attio API key'),
  ATTIO_WORKSPACE_ID: z
    .string()
    .min(1)
    .optional()
    .describe('Attio workspace ID'),
  ALLOWED_ORIGINS: z
    .string()
    .optional()
    .describe('Comma-separated CORS origins'),
  debug: z.boolean().default(false).describe('Enable verbose logging'),
});

/**
 * Creates an MCP server instance
 *
 * @param context - Optional context for configuration (used by Smithery)
 * @returns Configured MCP server instance
 */
export function createServer(context?: ServerContext) {
  const startTime = Date.now();
  const logger = createScopedLogger('mcp.init', 'createServer');
  logger.info('Server creation started');

  // For backward compatibility: if no context provided (STDIO mode),
  // create one that reads from environment variables
  // Issue #928: Support both ATTIO_API_KEY and ATTIO_ACCESS_TOKEN (OAuth alternative)
  const ctx: ServerContext = context || {
    getApiKey: () =>
      process.env.ATTIO_API_KEY || process.env.ATTIO_ACCESS_TOKEN,
    getWorkspaceId: () => process.env.ATTIO_WORKSPACE_ID,
  };

  // Debug logging for Issue #891: Track context setup
  if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
    const typedContext = ctx as {
      getApiKey?: () => string | undefined;
      getWorkspaceId?: () => string | undefined;
    };
    logger.debug('Context configuration', {
      hasContext: Boolean(context),
      contextKeys: context ? Object.keys(context) : [],
      hasGetApiKey: typeof typedContext.getApiKey === 'function',
      hasGetWorkspaceId: typeof typedContext.getWorkspaceId === 'function',
      mode: context ? 'smithery' : 'stdio',
      timestamp: new Date().toISOString(),
    });
  }

  // Set the global context so lazy client can access it
  setGlobalContext(ctx);
  logger.info('Global context set');

  // Create MCP server with proper capabilities declaration
  // Note: No API key validation here - it's checked when tools are invoked
  const mcpServer = new Server(
    {
      name: 'attio-mcp-server',
      version: '1.1.1',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {
          listChanged: true,
        },
      },
    }
  );

  // Register all handlers with the context
  // The handlers will use the context to get API key when needed
  logger.info('Registering handlers');
  registerResourceHandlers(mcpServer, ctx);
  registerToolHandlers(mcpServer, ctx);
  registerPromptHandlers(mcpServer, ctx);

  const duration = Date.now() - startTime;
  logger.info('Server created', {
    durationMs: duration,
  });

  // Final debug summary for Issue #891
  if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
    logger.debug('Server initialization complete', {
      duration: `${duration}ms`,
      serverVersion: '1.1.2',
      capabilities: ['resources', 'tools', 'prompts'],
      hasContext: Boolean(context),
      timestamp: new Date().toISOString(),
    });
  }

  return mcpServer;
}
