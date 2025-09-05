/**
 * Enhanced API Error helpers for duck-typing approach
 * Avoids class import issues with mocked modules
 */

export interface EnhancedApiErrorLike extends Error {
  name: 'EnhancedApiError';
  statusCode?: number;
  endpoint?: string;
  method?: string;
  context?: Record<string, unknown>;
}

export function isEnhancedApiError(e: unknown): e is EnhancedApiErrorLike {
  if (!e || typeof e !== 'object') {
    return false;
  }

  const errorObj = e as Record<string, unknown>;
  return (
    errorObj.name === 'EnhancedApiError' ||
    // Check if it has the typical EnhancedApiError properties (from real class or mock)
    (typeof errorObj.statusCode === 'number' &&
      typeof errorObj.endpoint === 'string' &&
      typeof errorObj.method === 'string')
  );
}

export function withEnumerableMessage<T extends Error>(e: T): T {
  try {
    const desc = Object.getOwnPropertyDescriptor(e, 'message');
    if (!desc || desc.enumerable !== true) {
      Object.defineProperty(e, 'message', {
        value: e.message,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  } catch {
    /* best-effort only */
  }
  return e;
}

export function ensureEnhanced(
  e: unknown,
  ctx?: Record<string, unknown>
): EnhancedApiErrorLike {
  if (isEnhancedApiError(e)) {
    // Enrich context and return as-is
    const enhanced = e as EnhancedApiErrorLike;
    enhanced.context = { ...enhanced.context, ...ctx };
    return enhanced;
  }

  const errorObj = e as Record<string, unknown>;
  const err = new Error(
    (errorObj?.message as string) ?? String(e)
  ) as EnhancedApiErrorLike;
  err.name = 'EnhancedApiError';
  err.statusCode =
    (errorObj?.statusCode as number) ??
    (errorObj?.status as number) ??
    ((errorObj?.response as Record<string, unknown>)?.status as number) ??
    500;
  err.endpoint = ctx?.endpoint as string;
  err.method = ctx?.method as string;
  err.context = { ...ctx, originalError: e };
  return err;
}
