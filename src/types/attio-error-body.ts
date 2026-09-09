/**
 * Attio API error-body contract (Issue #1148).
 *
 * Attio error responses use a fixed shape: { status_code, type, code, message }.
 * Only these keys are allowed to travel into AttioApiError.details — raw
 * response bodies must not be forwarded to error serializers or logs
 * (information-disclosure guard, CWE-200/532).
 */
export interface AttioErrorBody {
  status_code?: number;
  type?: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Normalize an Attio error body, accepting both the flat form
 * ({ status_code, type, code, message }) and the wrapped form
 * ({ error: { ... } }).
 */
export function safeErrorDetails(data: unknown): AttioErrorBody {
  if (typeof data !== 'object' || data === null) return {};
  const src = data as Record<string, unknown>;
  const nested =
    typeof src.error === 'object' && src.error !== null
      ? (src.error as Record<string, unknown>)
      : undefined;
  const flat = nested ? { ...src, ...nested } : src;
  const out: AttioErrorBody = {};
  if (typeof flat.status_code === 'number') out.status_code = flat.status_code;
  if (typeof flat.type === 'string') out.type = flat.type;
  if (typeof flat.code === 'string') out.code = flat.code;
  if (typeof flat.message === 'string') out.message = flat.message;
  return out;
}
