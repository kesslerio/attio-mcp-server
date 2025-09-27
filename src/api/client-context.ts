/**
 * Provides shared context storage for Attio client configuration
 */

let clientContext: Record<string, unknown> | null = null;

/**
 * Stores a shallow copy of the provided context so subsequent lookups can
 * access configuration values without tightly coupling modules.
 */
export function setClientContext(context: Record<string, unknown>): void {
  clientContext = { ...context };
}

/**
 * Clears any stored context data.
 */
export function clearClientContext(): void {
  clientContext = null;
}

/**
 * Returns the currently stored context (if any).
 */
export function getClientContext(): Record<string, unknown> | null {
  return clientContext;
}

/**
 * Attempts to resolve an Attio API key from the stored context.
 *
 * Preference order:
 * 1. invoke context.getApiKey() if provided
 * 2. read ATTIO_API_KEY field directly
 */
export function getContextApiKey(): string | undefined {
  if (!clientContext) {
    return undefined;
  }

  const context = clientContext as {
    getApiKey?: () => string | undefined;
    ATTIO_API_KEY?: string;
  };

  if (typeof context.getApiKey === 'function') {
    try {
      const key = context.getApiKey();
      if (key) {
        return key;
      }
    } catch {
      // Ignore context getter errors; fall back to other strategies
    }
  }

  if (
    typeof context.ATTIO_API_KEY === 'string' &&
    context.ATTIO_API_KEY.trim()
  ) {
    return context.ATTIO_API_KEY;
  }

  return undefined;
}
