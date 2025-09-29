/**
 * Unified cache management for Attio client instances and context
 * Consolidates cache clearing from multiple modules into single interface
 */

import { AxiosInstance } from 'axios';
import { clearClientContext } from './client-context.js';

// Global client instance cache
let apiInstanceCache: AxiosInstance | null = null;

/**
 * Cache management for client instances
 */
export class ClientCache {
  /**
   * Set the cached client instance
   */
  static setInstance(client: AxiosInstance): void {
    apiInstanceCache = client;
  }

  /**
   * Get the cached client instance
   */
  static getInstance(): AxiosInstance | null {
    return apiInstanceCache;
  }

  /**
   * Clear the cached client instance
   */
  static clearInstance(): void {
    apiInstanceCache = null;
  }

  /**
   * Check if a cached instance exists
   */
  static hasInstance(): boolean {
    return apiInstanceCache !== null;
  }
}

/**
 * Unified cache clearing interface
 * Consolidates all cache clearing operations into a single function
 */
export function clearAllCaches(): void {
  // Clear client instance cache
  ClientCache.clearInstance();

  // Clear client context (from client-context.ts)
  clearClientContext();

  // Note: Additional caches can be added here as needed
  // Example: clearInterceptorCache(), clearFailedRequestCache(), etc.
}

/**
 * Memory management utility for clearing caches on process exit
 */
export function setupCacheCleanup(): void {
  const cleanup = () => {
    clearAllCaches();
  };

  // Handle various exit scenarios
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('uncaughtException', cleanup);
}

/**
 * Get cache status for debugging
 */
export function getCacheStatus(): {
  hasClientInstance: boolean;
  cacheSize: number;
} {
  return {
    hasClientInstance: ClientCache.hasInstance(),
    cacheSize: apiInstanceCache ? 1 : 0,
  };
}
