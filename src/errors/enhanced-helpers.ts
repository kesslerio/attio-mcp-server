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
  return (
    !!e &&
    typeof e === 'object' &&
    ((e as any).name === 'EnhancedApiError' ||
      // Check if it has the typical EnhancedApiError properties (from real class or mock)
      (typeof (e as any).statusCode === 'number' &&
        typeof (e as any).endpoint === 'string' &&
        typeof (e as any).method === 'string'))
  );
}

export function withEnumerableMessage<T extends Error>(e: T): T {
  try {
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
    (e as any).context = { ...(e as any).context, ...ctx };
    return e as EnhancedApiErrorLike;
  }

    (e as any)?.message ?? String(e)
  ) as EnhancedApiErrorLike;
  err.name = 'EnhancedApiError';
  err.statusCode =
    (e as any)?.statusCode ??
    (e as any)?.status ??
    (e as any)?.response?.status ??
    500;
  err.endpoint = ctx?.endpoint;
  err.method = ctx?.method;
  err.context = { ...ctx, originalError: e };
  return err;
}
