import { sanitizeErrorMessage } from '@/utils/error-sanitizer.js';
import type { JsonObject } from '@/types/attio.js';

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /\+?\d[\d\s().-]{6,}\d/g;
const TOKEN_REGEX = /(?:bearer\s+)?[A-Za-z0-9_\-]{24,}/gi;
const BEARER_TOKEN_REGEX = /bearer\s+[^\s]+/gi;
const SECRET_VALUE_REGEX =
  /(api[-_]?key|secret|token|session|cookie|password|authorization)=([^&\s]+)/gi;
const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;
const ISO_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const SAFE_KEY_NAMES = new Set(['timestamp', 'duration']);

function stripDevInfo(message: string): string {
  const devInfoIndex = message.indexOf('\n[Dev Info:');
  if (devInfoIndex === -1) {
    return message;
  }
  return message.slice(0, devInfoIndex);
}

const SENSITIVE_KEY_PATTERNS = [
  /(api[-_]?key|token|secret|password|passphrase|credential|cookie|session)/i,
  /(authorization|authHeader|authToken)/i,
  /(refresh[-_]?token|access[-_]?token)/i,
  /(email|e[-_]?mail)/i,
  /(phone|telephone|mobile)/i,
  /(address|street|city|postal|zip)/i,
];

const IDENTIFIER_KEY_PATTERN = /(\b(id|uuid|slug)\b|_id$|^id_|[-_]id$)/i;

const MAX_STRING_LENGTH = 2000;

function redactString(value: string): string {
  let sanitized = value;

  sanitized = sanitized.replace(
    SECRET_VALUE_REGEX,
    (_, key: string) => `${key}=[REDACTED]`
  );
  sanitized = sanitized.replace(BEARER_TOKEN_REGEX, 'Bearer [TOKEN_REDACTED]');
  sanitized = sanitized.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
  sanitized = sanitized.replace(TOKEN_REGEX, (match) => {
    if (match.length <= 6) return '[REDACTED]';
    return match.toLowerCase().startsWith('bearer ')
      ? 'Bearer [TOKEN_REDACTED]'
      : '[TOKEN_REDACTED]';
  });
  sanitized = sanitized.replace(PHONE_REGEX, '[PHONE_REDACTED]');
  sanitized = sanitized.replace(CREDIT_CARD_REGEX, '[CARD_REDACTED]');

  if (sanitized.length > MAX_STRING_LENGTH) {
    return `${sanitized.slice(0, MAX_STRING_LENGTH)}…[TRUNCATED]`;
  }

  return sanitized;
}

function shouldRedactKey(keyPath: string[]): boolean {
  const key = keyPath[keyPath.length - 1];
  if (SAFE_KEY_NAMES.has(key)) {
    return false;
  }
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function shouldMaskIdentifier(keyPath: string[], value: string): boolean {
  const key = keyPath[keyPath.length - 1];
  return IDENTIFIER_KEY_PATTERN.test(key) || /[A-F0-9\-]{16,}/i.test(value);
}

export function maskIdentifier(value: string): string {
  if (!value) {
    return '[ID_REDACTED]';
  }
  if (value.length <= 4) {
    return '[ID_REDACTED]';
  }
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function sanitizePrimitive(value: unknown, keyPath: string[]): unknown {
  const key = keyPath[keyPath.length - 1];

  if (typeof value === 'string') {
    if (key && SAFE_KEY_NAMES.has(key) && ISO_TIMESTAMP_REGEX.test(value)) {
      return value;
    }
    if (ISO_TIMESTAMP_REGEX.test(value)) {
      return value;
    }
    const lowerKey = key?.toLowerCase() ?? '';
    const isCredentialKey =
      /(token|secret|api[-_]?key|apikey|password|credential)/i.test(lowerKey);
    const redactForKey = shouldRedactKey(keyPath);
    const shouldMaskId = shouldMaskIdentifier(keyPath, value);
    const sanitizedValue = redactString(value);
    if (isCredentialKey) {
      return sanitizedValue === value ? '[REDACTED]' : sanitizedValue;
    }
    if (shouldMaskId) {
      return maskIdentifier(value);
    }
    if (redactForKey) {
      return sanitizedValue === value ? '[REDACTED]' : sanitizedValue;
    }
    return sanitizedValue;
  }

  if (typeof value === 'bigint') {
    const str = value.toString();
    return shouldMaskIdentifier(keyPath, str) ? maskIdentifier(str) : str;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof URL) {
    const sanitized = new URL(value.toString());
    sanitized.search = sanitized.search ? '?[REDACTED]' : '';
    return sanitized.toString();
  }

  if (value instanceof RegExp) {
    return value.toString();
  }

  return value;
}

function isBinary(value: unknown): boolean {
  return (
    typeof Buffer !== 'undefined' &&
    Buffer.isBuffer(value) &&
    value.byteLength > 0
  );
}

function sanitizeComplex(
  value: unknown,
  keyPath: string[],
  seen: WeakMap<object, unknown>
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return sanitizePrimitive(value, keyPath);
  }

  if (
    value instanceof Date ||
    value instanceof URL ||
    value instanceof RegExp
  ) {
    return sanitizePrimitive(value, keyPath);
  }

  if (isBinary(value)) {
    return '[BINARY_REDACTED]';
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      sanitizeComplex(item, [...keyPath, String(index)], seen)
    );
  }

  if (typeof value === 'object') {
    const existing = seen.get(value as object);
    if (existing) {
      return existing;
    }

    const sanitizedObject: Record<string, unknown> = {};
    seen.set(value as object, sanitizedObject);

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitizedObject[key] = sanitizeComplex(val, [...keyPath, key], seen);
    }

    return sanitizedObject;
  }

  return value;
}

export function sanitizeLogPayload<T = JsonObject>(payload?: T): T {
  if (payload === undefined) {
    return payload as T;
  }

  if (payload === null) {
    return payload;
  }

  if (typeof payload !== 'object') {
    return sanitizePrimitive(payload, []) as T;
  }

  return sanitizeComplex(payload, [], new WeakMap()) as T;
}

export function sanitizeLogMessage(message: string): string {
  return redactString(message);
}

export interface SanitizedErrorDetail {
  message: string;
  name: string;
  stack?: string;
  code?: string | number;
  details?: JsonObject;
}

export function sanitizeErrorDetail(
  errorObj: unknown
): SanitizedErrorDetail | undefined {
  if (!errorObj) {
    return undefined;
  }

  if (errorObj instanceof Error) {
    const message = sanitizeErrorMessage(errorObj, {
      logOriginal: false,
      includeContext: false,
      module: 'secure-logger',
      operation: 'sanitize-error',
    });
    const normalizedMessage = stripDevInfo(message);
    const stack = errorObj.stack
      ? sanitizeLogMessage(errorObj.stack)
      : undefined;
    const details = sanitizeLogPayload(
      (errorObj as Error & { safeMetadata?: JsonObject }).safeMetadata || {}
    );

    return {
      message: normalizedMessage,
      name: errorObj.name,
      ...(stack ? { stack } : {}),
      ...('code' in errorObj && (errorObj as { code?: string | number }).code
        ? { code: (errorObj as { code?: string | number }).code }
        : {}),
      ...(details && Object.keys(details).length > 0 ? { details } : {}),
    };
  }

  if (typeof errorObj === 'object') {
    const details = sanitizeLogPayload(errorObj as JsonObject);
    const sanitizedMessage = sanitizeErrorMessage(
      (errorObj as { message?: string }).message || 'Unknown error',
      {
        logOriginal: false,
        includeContext: false,
        module: 'secure-logger',
        operation: 'sanitize-error',
      }
    );
    return {
      message: stripDevInfo(sanitizedMessage),
      name: (errorObj as { name?: string }).name || 'ErrorObject',
      details,
    };
  }

  return {
    message: stripDevInfo(
      sanitizeErrorMessage(String(errorObj), {
        logOriginal: false,
        includeContext: false,
        module: 'secure-logger',
        operation: 'sanitize-error',
      })
    ),
    name: 'Error',
  };
}

export function sanitizeMetadata(
  metadata?: JsonObject
): JsonObject | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitized = sanitizeLogPayload(metadata);
  return sanitized && typeof sanitized === 'object'
    ? (sanitized as JsonObject)
    : undefined;
}
