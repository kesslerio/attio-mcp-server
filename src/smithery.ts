/**
 * Smithery entry point for MCP server
 *
 * This file exports the server in the format expected by Smithery's runtime.
 * Smithery manages the HTTP transport and calls this function to get the MCP server instance.
 */

import { createServer as buildServer } from './server/createServer.js';
import { z } from 'zod';

/**
 * Configuration schema for user-provided settings
 * All fields are optional so the server can start without config (for scanning)
 */
export const configSchema = z.object({
  ATTIO_API_KEY: z.string().describe('Your Attio API key').optional(),
  ATTIO_WORKSPACE_ID: z
    .string()
    .describe('Optional Attio workspace ID')
    .optional(),
  debug: z.boolean().default(false).describe('Enable debug logging').optional(),
});

/**
 * Create and return an MCP server instance for Smithery
 *
 * @param config - User-provided configuration (validated against configSchema)
 * @returns The MCP server instance
 */
export default function createServer({
  config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  // Enable debug logging if requested
  if (config?.debug) {
    process.env.MCP_LOG_LEVEL = 'DEBUG';
  }

  // Set server mode flag to enable background intervals (performance tracking, etc.)
  process.env.MCP_SERVER_MODE = 'true';

  // CRITICAL: Ensure full tool mode by default (expose all 33 tools, not just search/fetch)
  // This prevents Smithery or other deployment platforms from defaulting to search-only mode.
  //
  // Context: The ATTIO_MCP_TOOL_MODE environment variable controls tool filtering:
  //   - Unset/empty (default): Full mode with all 33 universal tools
  //   - "search": Search-only mode with just 'search', 'fetch', 'aaa-health-check'
  //
  // Issue #869: ChatGPT was only seeing search/fetch tools because the env var
  // was somehow being set to 'search' during Smithery deployment. This guard
  // ensures we always default to full mode unless explicitly configured otherwise.
  //
  // See: src/config/tool-mode.ts for the filtering logic
  // See: docs/chatgpt-developer-mode.md for ChatGPT integration details
  if (!process.env.ATTIO_MCP_TOOL_MODE) {
    // Empty/unset = full mode with all universal tools
    delete process.env.ATTIO_MCP_TOOL_MODE;
  }

  // Create the MCP server with a context that provides access to config
  // The API key is only checked when tools are actually invoked
  const server = buildServer({
    getApiKey: () => config?.ATTIO_API_KEY || process.env.ATTIO_API_KEY,
    getWorkspaceId: () =>
      config?.ATTIO_WORKSPACE_ID || process.env.ATTIO_WORKSPACE_ID,
  });

  // Return the raw server instance - Smithery handles the transport
  return server;
}
