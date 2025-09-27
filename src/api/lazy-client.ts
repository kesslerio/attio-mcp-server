/**
 * Enhanced lazy client - no circular dependencies
 * Uses direct import since circular dependency has been resolved
 */

import { AxiosInstance } from 'axios';
import { getAttioClient } from './attio-client.js';
import {
  clearClientContext,
  getClientContext,
  setClientContext,
} from './client-context.js';

export function getLazyAttioClient(): AxiosInstance {
  // Direct call since circular dependency has been resolved elsewhere
  return getAttioClient();
}

export function setGlobalContext(context: Record<string, unknown>): void {
  setClientContext(context);
}

export function clearClientCache(): void {
  clearClientContext();
}

export function getGlobalContext(): Record<string, unknown> | null {
  return getClientContext();
}
