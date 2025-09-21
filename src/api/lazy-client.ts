/**
 * Enhanced lazy client - no circular dependencies
 * Uses direct import since circular dependency has been resolved
 */

import { AxiosInstance } from 'axios';
import { getAttioClient } from './attio-client.js';

let globalContext: Record<string, unknown> | null = null;

export function getLazyAttioClient(): AxiosInstance {
  // Direct call since circular dependency is now resolved
  return getAttioClient();
}

export function setGlobalContext(context: Record<string, unknown>): void {
  globalContext = { ...context };
}

export function clearClientCache(): void {
  globalContext = null;
}

export function getGlobalContext(): Record<string, unknown> | null {
  return globalContext;
}
