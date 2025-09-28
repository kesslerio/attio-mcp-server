/**
 * Enhanced lazy client - uses unified client architecture
 * Provides lazy initialization with caching and context management
 */

import { AxiosInstance } from 'axios';
import { createAttioClient } from './attio-client.js';
import { ClientCache, clearAllCaches } from './client-cache.js';
import { getClientContext, setClientContext } from './client-context.js';
import { ClientConfig } from './client-config.js';

export function getLazyAttioClient(config?: ClientConfig): AxiosInstance {
  // Check if we have a cached client
  const cachedClient = ClientCache.getInstance();
  if (cachedClient && !config?.bypassCache) {
    return cachedClient;
  }

  // Create new client using unified interface
  const client = createAttioClient(config || {});

  // Cache the client for future use
  if (!config?.bypassCache) {
    ClientCache.setInstance(client);
  }

  return client;
}

export function setGlobalContext(context: Record<string, unknown>): void {
  setClientContext(context);
}

export function clearClientCache(): void {
  // Use unified cache clearing
  clearAllCaches();
}

export function getGlobalContext(): Record<string, unknown> | null {
  return getClientContext();
}
