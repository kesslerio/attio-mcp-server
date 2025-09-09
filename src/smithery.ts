/**
 * Smithery entry point for MCP server
 * 
 * This file exports the server in the format expected by Smithery's runtime.
 * Smithery manages the HTTP transport and calls this function to get the MCP server instance.
 */

import { createServer } from './server/createServer.js';
import { z } from 'zod';

/**
 * Optional configuration schema for user-provided settings
 * Users can provide these when connecting to the server
 */
export const configSchema = z.object({
  // Currently we get ATTIO_API_KEY from environment
  // In future, could allow users to provide their own
  debug: z.boolean().default(false).describe('Enable debug logging'),
});

/**
 * Create and return an MCP server instance for Smithery
 * 
 * @param config - User-provided configuration (validated against configSchema)
 * @returns The MCP server instance
 */
export default function createSmitheryServer({ config }: { config?: z.infer<typeof configSchema> }) {
  // Enable debug logging if requested
  if (config?.debug) {
    process.env.MCP_LOG_LEVEL = 'DEBUG';
  }

  // Create the MCP server using our shared logic
  const server = createServer();
  
  // Return the raw server instance - Smithery handles the transport
  return server;
}