/**
 * Provides shared context storage for Attio client configuration
 * Uses WeakMap for memory-safe storage and implements security best practices
 */

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
 * Attempts to resolve an Attio API key from the stored context.
 * Uses caching to avoid repeated failed context getter calls.
 *
 * Preference order:
 * 1. invoke context.getApiKey() if provided
 * 2. read ATTIO_API_KEY field directly
 */
export function getContextApiKey(): string | undefined {
  const context = getClientContext();
  if (!context) {
    return undefined;
  }

  const typedContext = context as {
    getApiKey?: () => string | undefined;
    ATTIO_API_KEY?: string;
  };

  // Check if we should avoid calling getApiKey due to recent failures
  const getApiKeyIdentifier = 'getApiKey';
  const shouldSkipGetter = failedContextCache.has(getApiKeyIdentifier);

  if (typeof typedContext.getApiKey === 'function' && !shouldSkipGetter) {
    try {
      const key = typedContext.getApiKey();
      if (key && typeof key === 'string' && key.trim()) {
        return key;
      }
    } catch {
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

  // Try direct property access
  if (
    typeof typedContext.ATTIO_API_KEY === 'string' &&
    typedContext.ATTIO_API_KEY.trim()
  ) {
    return typedContext.ATTIO_API_KEY;
  }

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
  failedContextCacheSize: number;
} {
  const context = getClientContext();
  const typedContext = context as {
    getApiKey?: () => string | undefined;
    ATTIO_API_KEY?: string;
  };

  return {
    hasContext: Boolean(context),
    hasWeakMapStorage: Boolean(contextKey && contextStorage.has(contextKey)),
    hasFallbackStorage: Boolean(clientContext),
    hasApiKeyGetter: typeof typedContext?.getApiKey === 'function',
    hasDirectApiKey: typeof typedContext?.ATTIO_API_KEY === 'string',
    failedContextCacheSize: failedContextCache.size,
  };
}
