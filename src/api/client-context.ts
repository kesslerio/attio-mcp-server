/**
 * Provides shared context storage for Attio client configuration
 * Uses WeakMap for memory-safe storage and implements security best practices
 */

import { createScopedLogger } from '@/utils/logger.js';

const logger = createScopedLogger('client-context');

// Use WeakMap to prevent memory leaks and provide secure storage
const contextStorage = new WeakMap<object, Record<string, unknown>>();
let contextKey: object | null = null;

// Fallback for simple context storage (legacy compatibility)
let clientContext: Record<string, unknown> | null = null;

// Cache for failed context getter attempts to avoid repeated exceptions
const failedContextCache = new Map<string, NodeJS.Timeout>();
const FAILED_CONTEXT_CACHE_TTL = 10000; // 10 seconds - increased for retry scenarios

/**
 * Stores a shallow copy of the provided context so subsequent lookups can
 * access configuration values without tightly coupling modules.
 * Uses WeakMap for secure storage when possible.
 */
export function setClientContext(context: Record<string, unknown>): void {
  // Debug logging for Issue #891: Track context storage
  const typedContext = context as {
    getApiKey?: () => string | undefined;
    ATTIO_API_KEY?: string;
  };
  logger.debug('Storing context', {
    hasContext: Boolean(context),
    contextKeys: Object.keys(context),
    hasGetApiKeyFunction: typeof typedContext.getApiKey === 'function',
    hasDirectApiKey: Boolean(typedContext.ATTIO_API_KEY),
    timestamp: new Date().toISOString(),
  });

  // Reuse existing key if available to prevent memory accumulation
  if (!contextKey) {
    contextKey = {};
  }
  contextStorage.set(contextKey, { ...context });

  // Also maintain legacy fallback storage
  clientContext = { ...context };

  // Clear failed context cache when new context is set
  clearFailedContextCache();
}

/**
 * Clears any stored context data from both WeakMap and fallback storage.
 */
export function clearClientContext(): void {
  if (contextKey) {
    contextStorage.delete(contextKey);
    contextKey = null;
  }
  clientContext = null;
  clearFailedContextCache();
}

/**
 * Clears all failed context cache timers
 */
function clearFailedContextCache(): void {
  for (const [key, timerId] of failedContextCache.entries()) {
    clearTimeout(timerId);
    failedContextCache.delete(key);
  }
}

/**
 * Returns the currently stored context (if any).
 * Prioritizes WeakMap storage over fallback storage.
 */
export function getClientContext(): Record<string, unknown> | null {
  // Try WeakMap storage first
  if (contextKey && contextStorage.has(contextKey)) {
    return contextStorage.get(contextKey) || null;
  }

  // Fallback to legacy storage
  return clientContext;
}

/**
 * Gets the current context key for debugging/testing purposes
 */
export function getContextKey(): object | null {
  return contextKey;
}

/**
 * Attempts to resolve an Attio API key or OAuth access token from the stored context.
 * Uses caching to avoid repeated failed context getter calls.
 *
 * Preference order (Issue #928 - OAuth token support):
 * 1. invoke context.getApiKey() if provided
 * 2. read ATTIO_API_KEY field directly
 * 3. read ATTIO_ACCESS_TOKEN field directly (OAuth alternative)
 */
export function getContextApiKey(): string | undefined {
  const context = getClientContext();
  if (!context) {
    logger.debug('No context available');
    return undefined;
  }

  const typedContext = context as {
    getApiKey?: () => string | undefined;
    ATTIO_API_KEY?: string;
    ATTIO_ACCESS_TOKEN?: string;
  };

  // Check if we should avoid calling getApiKey due to recent failures
  const getApiKeyIdentifier = 'getApiKey';
  const shouldSkipGetter = failedContextCache.has(getApiKeyIdentifier);

  logger.debug('Attempting API key/token resolution', {
    hasContext: Boolean(context),
    hasGetApiKeyFunction: typeof typedContext.getApiKey === 'function',
    shouldSkipGetter,
    hasDirectApiKey: Boolean(typedContext.ATTIO_API_KEY),
    hasDirectAccessToken: Boolean(typedContext.ATTIO_ACCESS_TOKEN),
    directKeyLength: typedContext.ATTIO_API_KEY?.length || 0,
    directTokenLength: typedContext.ATTIO_ACCESS_TOKEN?.length || 0,
  });

  if (typeof typedContext.getApiKey === 'function' && !shouldSkipGetter) {
    try {
      const key = typedContext.getApiKey();
      logger.debug('Function call result', {
        resolved: Boolean(key),
        keyLength: key?.length || 0,
      });
      if (key && typeof key === 'string' && key.trim()) {
        return key;
      }
    } catch (error) {
      logger.debug('Function call failed', { error });
      // Cache this failure to avoid repeated exceptions
      // Clear existing timer if present to prevent duplicates
      const existingTimer = failedContextCache.get(getApiKeyIdentifier);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timerId = setTimeout(() => {
        failedContextCache.delete(getApiKeyIdentifier);
      }, FAILED_CONTEXT_CACHE_TTL);

      failedContextCache.set(getApiKeyIdentifier, timerId);

      // Ignore context getter errors; fall back to other strategies
    }
  }

  // Try direct property access - ATTIO_API_KEY first
  if (
    typeof typedContext.ATTIO_API_KEY === 'string' &&
    typedContext.ATTIO_API_KEY.trim()
  ) {
    logger.debug('Using direct ATTIO_API_KEY property');
    return typedContext.ATTIO_API_KEY;
  }

  // Fallback to ATTIO_ACCESS_TOKEN (Issue #928 - OAuth token support)
  if (
    typeof typedContext.ATTIO_ACCESS_TOKEN === 'string' &&
    typedContext.ATTIO_ACCESS_TOKEN.trim()
  ) {
    logger.debug('Using direct ATTIO_ACCESS_TOKEN property');
    return typedContext.ATTIO_ACCESS_TOKEN;
  }

  logger.debug('No API key or access token found in context');

  return undefined;
}

/**
 * Validates that an API key meets basic security requirements
 * without exposing specific implementation details
 */
export function validateApiKey(apiKey: string): boolean {
  return (
    typeof apiKey === 'string' &&
    apiKey.trim().length > 0 &&
    !apiKey.includes(' ') && // No spaces in API keys
    apiKey.trim() === apiKey // No leading/trailing whitespace
  );
}

/**
 * Gets context statistics for debugging (without exposing sensitive data)
 */
export function getContextStats(): {
  hasContext: boolean;
  hasWeakMapStorage: boolean;
  hasFallbackStorage: boolean;
  hasApiKeyGetter: boolean;
  hasDirectApiKey: boolean;
  hasDirectAccessToken: boolean;
  failedContextCacheSize: number;
} {
  const context = getClientContext();
  const typedContext = context as {
    getApiKey?: () => string | undefined;
    ATTIO_API_KEY?: string;
    ATTIO_ACCESS_TOKEN?: string;
  };

  return {
    hasContext: Boolean(context),
    hasWeakMapStorage: Boolean(contextKey && contextStorage.has(contextKey)),
    hasFallbackStorage: Boolean(clientContext),
    hasApiKeyGetter: typeof typedContext?.getApiKey === 'function',
    hasDirectApiKey: typeof typedContext?.ATTIO_API_KEY === 'string',
    hasDirectAccessToken: typeof typedContext?.ATTIO_ACCESS_TOKEN === 'string',
    failedContextCacheSize: failedContextCache.size,
  };
}
