/**
 * Provides shared context storage for Attio client configuration
 * Uses WeakMap for memory-safe storage and implements security best practices
 */

import { createScopedLogger } from '@/utils/logger.js';
import { AsyncLocalStorage } from 'node:async_hooks';

const logger = createScopedLogger('client-context');

// Use WeakMap to prevent memory leaks and provide secure storage
const contextStorage = new WeakMap<object, Record<string, unknown>>();
let contextKey: object | null = null;

// Fallback for simple context storage (legacy compatibility)
let clientContext: Record<string, unknown> | null = null;
const requestContextStorage = new AsyncLocalStorage<Record<string, unknown>>();

/**
 * Stores a shallow copy of the provided context so subsequent lookups can
 * access configuration values without tightly coupling modules.
 * Uses WeakMap for secure storage when possible.
 */
export function setClientContext(context: Record<string, unknown>): void {
  logger.debug('Storing context', {
    hasContext: Boolean(context),
    contextKeyCount: Object.keys(context).length,
    timestamp: new Date().toISOString(),
  });

  // Reuse existing key if available to prevent memory accumulation
  if (!contextKey) {
    contextKey = {};
  }
  contextStorage.set(contextKey, { ...context });

  // Also maintain legacy fallback storage
  clientContext = { ...context };
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
}

/**
 * Returns the currently stored context (if any).
 * Prioritizes WeakMap storage over fallback storage.
 */
export function getClientContext(): Record<string, unknown> | null {
  const requestContext = requestContextStorage.getStore();
  if (requestContext) {
    return requestContext;
  }

  // Try WeakMap storage first
  if (contextKey && contextStorage.has(contextKey)) {
    return contextStorage.get(contextKey) || null;
  }

  // Fallback to legacy storage
  return clientContext;
}

export async function runWithClientContext<T>(
  context: Record<string, unknown>,
  operation: () => Promise<T>
): Promise<T> {
  return await requestContextStorage.run({ ...context }, operation);
}

/**
 * True while a request-local context (runWithClientContext) is active.
 */
export function hasRequestContext(): boolean {
  return requestContextStorage.getStore() !== undefined;
}

/**
 * Resolves the Attio credential of the active principal. Client creation,
 * cursor ownership, and credential-scoped caches all use this one decision.
 *
 * A request-local context is authoritative: it supplies its own credential or
 * none, and never inherits the process environment or another request's
 * credential. Only the single-principal path, with no request context active,
 * falls back to ATTIO_API_KEY / ATTIO_ACCESS_TOKEN.
 */
export function resolveAttioCredential(): string | undefined {
  const contextApiKey = getContextApiKey();
  if (contextApiKey || hasRequestContext()) {
    return contextApiKey;
  }
  return (
    process.env.ATTIO_API_KEY || process.env.ATTIO_ACCESS_TOKEN || undefined
  );
}

/**
 * Gets the current context key for debugging/testing purposes
 */
export function getContextKey(): object | null {
  return contextKey;
}

/**
 * Attempts to resolve an Attio API key or OAuth access token from the stored context.
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

  logger.debug('Attempting API key/token resolution', {
    hasContext: Boolean(context),
  });

  // A failed getter only falls through to this same context's properties;
  // the failure is never remembered across requests or principals.
  if (typeof typedContext.getApiKey === 'function') {
    logger.debug('Calling context credential getter');
    try {
      const key = typedContext.getApiKey();
      if (key && typeof key === 'string' && key.trim()) {
        logger.debug('Context credential getter returned a usable credential');
        return key;
      }
      logger.debug('Context credential getter returned no usable credential');
    } catch (_error) {
      logger.debug('Context credential getter failed');
    }
  }

  // Try direct property access - ATTIO_API_KEY first
  if (
    typeof typedContext.ATTIO_API_KEY === 'string' &&
    typedContext.ATTIO_API_KEY.trim()
  ) {
    logger.debug('Using direct context credential property');
    return typedContext.ATTIO_API_KEY;
  }

  // Fallback to ATTIO_ACCESS_TOKEN (Issue #928 - OAuth token support)
  if (
    typeof typedContext.ATTIO_ACCESS_TOKEN === 'string' &&
    typedContext.ATTIO_ACCESS_TOKEN.trim()
  ) {
    logger.debug('Using direct context credential property');
    return typedContext.ATTIO_ACCESS_TOKEN;
  }

  logger.debug('No usable credential found in context');

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
  };
}
