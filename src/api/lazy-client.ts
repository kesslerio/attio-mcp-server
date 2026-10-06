/**
 * Lazy client initialization using request-aware configuration and context
 */

import { AxiosInstance } from 'axios';
import { createAttioClient } from '@/api/attio-client.js';
import { ClientCache, clearAllCaches } from '@/api/client-cache.js';
import {
  getClientContext,
  runWithClientContext,
  setClientContext,
} from '@/api/client-context.js';
import { ClientConfig } from '@/api/client-config.js';

export function getLazyAttioClient(config?: ClientConfig): AxiosInstance {
  // Resolve current credentials/configuration before every call; a shared client
  // can carry another request's credentials or bypass its upstream access denial.
  return createAttioClient(config || {});
}

export function setGlobalContext(context: Record<string, unknown>): void {
  setClientContext(context);
  // Context changes may carry different credentials; invalidate stale cached client
  ClientCache.clearInstance();
}

export async function withServerContext<T>(
  context: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  return runWithClientContext(context, fn);
}

export function clearClientCache(): void {
  // Use unified cache clearing
  clearAllCaches();
}

export function getGlobalContext(): Record<string, unknown> | null {
  return getClientContext();
}

export async function withGlobalContext<T>(
  context: Record<string, unknown>,
  operation: () => Promise<T>
): Promise<T> {
  return await runWithClientContext(context, operation);
}
