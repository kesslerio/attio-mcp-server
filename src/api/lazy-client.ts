/**
 * Lazy Attio client initialization for Smithery compatibility
 * This module provides a way to get an Attio client that's initialized
 * only when needed, using the API key from context or environment.
 */

import { AxiosInstance } from 'axios';
import { createAttioClient } from './attio-client.js';
import { ServerContext } from '../server/createServer.js';

// Cache for initialized clients by API key
const clientCache = new Map<string, AxiosInstance>();

// Global server context for lazy initialization
let globalContext: ServerContext | undefined;

/**
 * Get or create an Attio client using the provided context
 * Throws a helpful error if no API key is available
 *
 * @param context - Server context with getApiKey function
 * @returns Initialized Attio client
 */
export function getLazyAttioClient(context?: ServerContext): AxiosInstance {
  // Use provided context, fall back to global context, then environment
  const activeContext = context || globalContext;
  const apiKey = activeContext?.getApiKey?.() || process.env.ATTIO_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing ATTIO_API_KEY. Please configure it in your MCP client settings (e.g., Claude Desktop) or set the ATTIO_API_KEY environment variable.'
    );
  }

  // Check cache for existing client
  let client = clientCache.get(apiKey);
  if (!client) {
    // Create new client and cache it
    client = createAttioClient(apiKey);
    clientCache.set(apiKey, client);
  }

  return client;
}

/**
 * Set the global server context for lazy initialization
 * This should be called once at server startup
 *
 * @param context - Server context with getApiKey function
 */
export function setGlobalContext(context: ServerContext): void {
  globalContext = context;
}

/**
 * Clear the client cache (useful for testing)
 */
export function clearClientCache(): void {
  clientCache.clear();
}
