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
  ATTIO_ACCESS_TOKEN: z
    .string()
    .describe(
      'Attio OAuth access token (alternative to API key for OAuth integrations)'
    )
    .optional(),
  ATTIO_WORKSPACE_ID: z
    .string()
    .describe('Optional Attio workspace ID')
    .optional(),
  ATTIO_MCP_TOOL_MODE: z
    .enum(['full', 'search'])
    .describe(
      'Tool mode: "full" (all 33 tools, requires ChatGPT Developer Mode) or "search" (only search/fetch/health-check for non-Developer Mode users)'
    )
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
  // Enable debug logging if requested (Issue #891: MCP_LOG_LEVEL support)
  // Check both config.debug and existing MCP_LOG_LEVEL environment variable
  if (config?.debug || process.env.MCP_LOG_LEVEL === 'DEBUG') {
    process.env.MCP_LOG_LEVEL = 'DEBUG';
  }

  // Debug logging for Issue #891: Track config propagation in Smithery hosted environment
  if (process.env.MCP_LOG_LEVEL === 'DEBUG') {
    console.error('[smithery:init] Config received:', {
      hasConfig: Boolean(config),
      configKeys: config ? Object.keys(config) : [],
      hasApiKeyInConfig: Boolean(config?.ATTIO_API_KEY),
      hasAccessTokenInConfig: Boolean(config?.ATTIO_ACCESS_TOKEN),
      apiKeyLength: config?.ATTIO_API_KEY?.length || 0,
      accessTokenLength: config?.ATTIO_ACCESS_TOKEN?.length || 0,
      hasWorkspaceId: Boolean(config?.ATTIO_WORKSPACE_ID),
      hasEnvApiKey: Boolean(process.env.ATTIO_API_KEY),
      hasEnvAccessToken: Boolean(process.env.ATTIO_ACCESS_TOKEN),
      envApiKeyLength: process.env.ATTIO_API_KEY?.length || 0,
      envAccessTokenLength: process.env.ATTIO_ACCESS_TOKEN?.length || 0,
      toolMode:
        config?.ATTIO_MCP_TOOL_MODE ||
        process.env.ATTIO_MCP_TOOL_MODE ||
        'full',
      debug: config?.debug || false,
      timestamp: new Date().toISOString(),
    });
  }

  // Set server mode flag to enable background intervals (performance tracking, etc.)
  process.env.MCP_SERVER_MODE = 'true';

  // CRITICAL: Tool mode configuration (Issue #869 final fix)
  // Do NOT set environment variables - Smithery manages them at container level
  // If user didn't provide ATTIO_MCP_TOOL_MODE, ensure env var is not set
  // This allows isSearchOnlyMode() to return false (full tool access)
  if (!config?.ATTIO_MCP_TOOL_MODE) {
    delete process.env.ATTIO_MCP_TOOL_MODE;
  } else if (config.ATTIO_MCP_TOOL_MODE === 'search') {
    process.env.ATTIO_MCP_TOOL_MODE = 'search';
  } else {
    // User explicitly set 'full' mode
    delete process.env.ATTIO_MCP_TOOL_MODE;
  }

  // Create the MCP server with a context that provides access to config
  // The API key is only checked when tools are actually invoked
  // Supports both API keys and OAuth access tokens (Issue #928)
  const server = buildServer({
    getApiKey: () => {
      // Resolution order: ATTIO_API_KEY (config) > ATTIO_ACCESS_TOKEN (config) >
      //                   ATTIO_API_KEY (env) > ATTIO_ACCESS_TOKEN (env)
      const apiKey =
        config?.ATTIO_API_KEY ||
        config?.ATTIO_ACCESS_TOKEN ||
        process.env.ATTIO_API_KEY ||
        process.env.ATTIO_ACCESS_TOKEN;
      if (process.env.MCP_LOG_LEVEL === 'DEBUG' || config?.debug) {
        console.error('[smithery:getApiKey] API key/token resolution:', {
          fromConfigApiKey: Boolean(config?.ATTIO_API_KEY),
          fromConfigAccessToken: Boolean(config?.ATTIO_ACCESS_TOKEN),
          fromEnvApiKey: Boolean(process.env.ATTIO_API_KEY),
          fromEnvAccessToken: Boolean(process.env.ATTIO_ACCESS_TOKEN),
          resolved: Boolean(apiKey),
          keyLength: apiKey?.length || 0,
        });
      }
      return apiKey;
    },
    getWorkspaceId: () =>
      config?.ATTIO_WORKSPACE_ID || process.env.ATTIO_WORKSPACE_ID,
  });

  if (process.env.MCP_LOG_LEVEL === 'DEBUG' || config?.debug) {
    console.error('[smithery:init] Server created successfully');
  }

  // Return the raw server instance - Smithery handles the transport
  return server;
}
