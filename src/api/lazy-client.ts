/**
 * Lazy Attio client initialization for Smithery compatibility
 * This module provides a way to get an Attio client that's initialized
 * only when needed, using the API key from context or environment.
 */

import { AxiosInstance } from 'axios';
import * as AttioClientModule from './attio-client.js';
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

  // Prefer mocked getAttioClient in test/offline environments even if apiKey exists
  const isTestEnv =
    process.env.NODE_ENV === 'test' ||
    typeof process.env.VITEST_WORKER_ID !== 'undefined' ||
    process.env.SKIP_INTEGRATION_TESTS === 'true' ||
    process.env.OFFLINE_MODE === 'true';
  const possibleGet = (AttioClientModule as any).getAttioClient;
  if (typeof possibleGet === 'function' && (!apiKey || isTestEnv)) {
    return possibleGet();
  }

  if (!apiKey) {
    throw new Error(
      'Missing ATTIO_API_KEY. Please configure it in your MCP client settings (e.g., Claude Desktop) or set the ATTIO_API_KEY environment variable.'
    );
  }

  // Check cache for existing client
  let client = clientCache.get(apiKey);
  if (!client) {
    // Create new client using whichever factory is available.
    // This supports test environments where only getAttioClient is mocked.
    const mod: any = AttioClientModule as any;
    let newClient: AxiosInstance | undefined;
    if (typeof mod.createAttioClient === 'function') {
      newClient = mod.createAttioClient(apiKey);
    } else if (typeof mod.buildAttioClient === 'function') {
      newClient = mod.buildAttioClient({ apiKey });
    } else if (typeof mod.getAttioClient === 'function') {
      newClient = mod.getAttioClient();
    }
    if (!newClient) {
      throw new Error(
        'attio-client module does not expose a supported factory (createAttioClient, buildAttioClient, getAttioClient)'
      );
    }
    client = newClient;
    clientCache.set(apiKey, newClient);
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
