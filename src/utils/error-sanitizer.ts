/**
 * Error message sanitization utility to prevent information disclosure
 *
 * This module provides secure error handling by sanitizing error messages
 * that might expose sensitive information to potential attackers.
 */

import { error as logError, OperationType } from './logger.js';

/**
 * Types of sensitive information to remove from error messages
 */
enum SensitiveInfoType {
  FILE_PATH = 'file_path',
  API_KEY = 'api_key',
  INTERNAL_ID = 'internal_id',
  STACK_TRACE = 'stack_trace',
  DATABASE_SCHEMA = 'database_schema',
  SYSTEM_INFO = 'system_info',
  URL_WITH_PARAMS = 'url_with_params',
  EMAIL_ADDRESS = 'email_address',
  IP_ADDRESS = 'ip_address',
}

/**
 * Patterns for detecting sensitive information in error messages
 */
const SENSITIVE_PATTERNS: Record<SensitiveInfoType, RegExp> = {
  [SensitiveInfoType.FILE_PATH]:
    /([A-Z]:)?[\/\\](?:Users|home|var|opt|etc|tmp|src|app)[\/\\][^\s"']+/gi,
  [SensitiveInfoType.API_KEY]:
    /(?:api[_-]?key|token|bearer|authorization|secret|password|passwd|pwd)[\s:=]*["']?[a-zA-Z0-9\-_]{20,}["']?/gi,
  [SensitiveInfoType.INTERNAL_ID]:
    /(?:workspace_id|record_id|object_id|user_id|session_id)[\s:=]*["']?[a-f0-9\-]{20,}["']?/gi,
  [SensitiveInfoType.STACK_TRACE]: /\s*at\s+[^\n]+/gi,
  [SensitiveInfoType.DATABASE_SCHEMA]:
    /(?:table|column|field|attribute|slug)[\s:]+["']?[a-z_][a-z0-9_]*["']?/gi,
  [SensitiveInfoType.SYSTEM_INFO]:
    /(?:node|npm|v\d+\.\d+\.\d+|darwin|linux|win32|x64|x86)/gi,
  [SensitiveInfoType.URL_WITH_PARAMS]: /https?:\/\/[^\s]+\?[^\s]+/gi,
  [SensitiveInfoType.EMAIL_ADDRESS]:
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  [SensitiveInfoType.IP_ADDRESS]: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/gi,
};

/**
 * User-friendly error messages mapped by error type
 */
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  // Authentication & Authorization
  authentication: 'Authentication failed. Please check your credentials.',
  authorization: 'You do not have permission to perform this action.',
  forbidden: 'Access denied. This resource requires additional permissions.',
  unauthorized: 'Authentication required. Please provide valid credentials.',

  // Resource errors
  not_found: 'The requested resource could not be found.',
  resource_not_found:
    'The specified record does not exist or you do not have access to it.',
  invalid_id: 'The provided ID is invalid. Please check and try again.',

  // Validation errors
  validation: 'The provided data is invalid. Please check your input.',
  invalid_format:
    'The data format is incorrect. Please review the expected format.',
  missing_required:
    'Required information is missing. Please provide all required fields.',
  duplicate: 'A record with this information already exists.',

  // Rate limiting
  rate_limit: 'Too many requests. Please wait a moment before trying again.',
  quota_exceeded: 'Usage quota exceeded. Please try again later.',

  // System errors
  internal_error: 'An internal error occurred. Please try again later.',
  service_unavailable:
    'The service is temporarily unavailable. Please try again later.',
  timeout: 'The request took too long to process. Please try again.',
  network_error: 'A network error occurred. Please check your connection.',

  // Field-specific errors
  invalid_field: 'One or more fields contain invalid values.',
  unknown_field: 'Unknown field provided. Please check the available fields.',
  field_type_mismatch:
    'Field value type mismatch. Please check the expected type.',

  // Default fallback
  default: 'An error occurred while processing your request.',
};

/**
 * Map specific error patterns to error types
 */
function classifyError(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('api key') ||
    lowerMessage.includes('api_key')
  ) {
    return 'authentication';
  }
  if (
    lowerMessage.includes('authorization') ||
    lowerMessage.includes('permission')
  ) {
    return 'authorization';
  }
  if (lowerMessage.includes('forbidden')) {
    return 'forbidden';
  }
  if (lowerMessage.includes('not found')) {
    return 'not_found';
  }
  if (lowerMessage.includes('invalid') && lowerMessage.includes('id')) {
    return 'invalid_id';
  }
  if (
    lowerMessage.includes('validation') ||
    lowerMessage.includes('invalid value')
  ) {
    return 'validation';
  }
  if (lowerMessage.includes('format')) {
    return 'invalid_format';
  }
  if (lowerMessage.includes('required')) {
    return 'missing_required';
  }
  if (
    lowerMessage.includes('duplicate') ||
    lowerMessage.includes('already exists')
  ) {
    return 'duplicate';
  }
  if (lowerMessage.includes('rate limit')) {
    return 'rate_limit';
  }
  if (lowerMessage.includes('timeout')) {
    return 'timeout';
  }
  if (lowerMessage.includes('network')) {
    return 'network_error';
  }
  if (
    lowerMessage.includes('cannot find attribute') ||
    lowerMessage.includes('unknown field')
  ) {
    return 'unknown_field';
  }
  if (
    lowerMessage.includes('internal') ||
    lowerMessage.includes('server error')
  ) {
    return 'internal_error';
  }

  return 'default';
}

/**
 * Extract helpful context from error without exposing sensitive data
 */
function extractSafeContext(message: string): string | undefined {
  // Extract field names (but not values or system paths)
  const fieldMatch = message.match(
    /(?:field|attribute)[s]?\s+(?:with\s+)?["']?([a-z_]+)["']?/i
  );
  if (fieldMatch && fieldMatch[1] && !fieldMatch[1].includes('/')) {
    return `Field: ${fieldMatch[1]}`;
  }

  // Extract resource type
  const resourceMatch = message.match(
    /\b(company|companies|person|people|deal|deals|task|tasks|record|records)\b/i
  );
  if (resourceMatch) {
    return `Resource: ${resourceMatch[1].toLowerCase()}`;
  }

  return undefined;
}

/**
 * Options for error sanitization
 */
export interface SanitizationOptions {
  /** Include safe context in the sanitized message */
  includeContext?: boolean;
  /** Log the full error internally before sanitizing */
  logOriginal?: boolean;
  /** Module name for logging */
  module?: string;
  /** Operation name for logging */
  operation?: string;
  /** Additional safe metadata to include */
  safeMetadata?: Record<string, unknown>;
}

/**
 * Sanitize an error message to remove sensitive information
 *
 * @param error - The error to sanitize (Error object or string)
 * @param options - Sanitization options
 * @returns Sanitized error message safe for external exposure
 */
export function sanitizeErrorMessage(
  error: Error | string | any,
  options: SanitizationOptions = {}
): string {
  const {
    includeContext = true,
    logOriginal = true,
    module = 'error-sanitizer',
    operation = 'sanitize',
    safeMetadata = {},
  } = options;

  // Extract the original message
  let originalMessage: string;
  let errorName = 'Error';
  let stackTrace: string | undefined;

  if (error instanceof Error) {
    originalMessage = error.message;
    errorName = error.name;
    stackTrace = error.stack;
  } else if (typeof error === 'string') {
    originalMessage = error;
  } else if (error?.message) {
    originalMessage = String(error.message);
    errorName = error.name || 'Error';
    stackTrace = error.stack;
  } else {
    originalMessage = String(error);
  }

  // Log the original error internally if requested
  if (logOriginal && process.env.NODE_ENV !== 'production') {
    logError(
      module,
      `Original error (internal only): ${originalMessage}`,
      { name: errorName, stack: stackTrace, ...safeMetadata },
      undefined,
      operation,
      OperationType.SYSTEM
    );
  }

  // Remove sensitive patterns
  let sanitized = originalMessage;

  // Remove file paths
  sanitized = sanitized.replace(
    SENSITIVE_PATTERNS[SensitiveInfoType.FILE_PATH],
    '[PATH_REDACTED]'
  );

  // Remove API keys and tokens
  sanitized = sanitized.replace(
    SENSITIVE_PATTERNS[SensitiveInfoType.API_KEY],
    '[CREDENTIAL_REDACTED]'
  );

  // Remove internal IDs (but keep generic reference)
  sanitized = sanitized.replace(
    SENSITIVE_PATTERNS[SensitiveInfoType.INTERNAL_ID],
    '[ID_REDACTED]'
  );

  // Remove stack traces
  sanitized = sanitized.replace(
    SENSITIVE_PATTERNS[SensitiveInfoType.STACK_TRACE],
    ''
  );

  // Remove URLs with parameters
  sanitized = sanitized.replace(
    SENSITIVE_PATTERNS[SensitiveInfoType.URL_WITH_PARAMS],
    '[URL_REDACTED]'
  );

  // Remove email addresses
  sanitized = sanitized.replace(
    SENSITIVE_PATTERNS[SensitiveInfoType.EMAIL_ADDRESS],
    '[EMAIL_REDACTED]'
  );

  // Remove IP addresses
  sanitized = sanitized.replace(
    SENSITIVE_PATTERNS[SensitiveInfoType.IP_ADDRESS],
    '[IP_REDACTED]'
  );

  // Get user-friendly message based on error classification
  const errorType = classifyError(originalMessage);
  let userMessage =
    USER_FRIENDLY_MESSAGES[errorType] || USER_FRIENDLY_MESSAGES.default;

  // Add safe context if available and requested
  if (includeContext) {
    const safeContext = extractSafeContext(originalMessage);
    if (safeContext) {
      userMessage = `${userMessage} (${safeContext})`;
    }
  }

  // In production, return only the user-friendly message
  if (process.env.NODE_ENV === 'production') {
    return userMessage;
  }

  // In development, include sanitized technical details
  return `${userMessage}\n[Dev Info: ${sanitized.substring(0, 200)}${sanitized.length > 200 ? '...' : ''}]`;
}

/**
 * Create a sanitized error object with safe properties
 */
export interface SanitizedError {
  message: string;
  type: string;
  statusCode?: number;
  safeMetadata?: Record<string, unknown>;
}

/**
 * Create a fully sanitized error object
 *
 * @param error - The error to sanitize
 * @param statusCode - Optional HTTP status code
 * @param options - Sanitization options
 * @returns Sanitized error object
 */
export function createSanitizedError(
  error: Error | string | any,
  statusCode?: number,
  options: SanitizationOptions = {}
): SanitizedError {
  const sanitizedMessage = sanitizeErrorMessage(error, options);
  const errorType = classifyError(
    error instanceof Error ? error.message : String(error)
  );

  return {
    message: sanitizedMessage,
    type: errorType,
    statusCode: statusCode || inferStatusCode(errorType),
    safeMetadata: options.safeMetadata,
  };
}

/**
 * Infer HTTP status code from error type
 */
function inferStatusCode(errorType: string): number {
  switch (errorType) {
    case 'authentication':
      return 401;
    case 'authorization':
    case 'forbidden':
      return 403;
    case 'not_found':
    case 'resource_not_found':
      return 404;
    case 'validation':
    case 'invalid_format':
    case 'missing_required':
    case 'invalid_id':
    case 'unknown_field':
    case 'field_type_mismatch':
      return 400;
    case 'duplicate':
      return 409;
    case 'rate_limit':
    case 'quota_exceeded':
      return 429;
    case 'timeout':
      return 408;
    case 'service_unavailable':
      return 503;
    case 'internal_error':
    case 'network_error':
    default:
      return 500;
  }
}

/**
 * Middleware-style error sanitizer for wrapping async functions
 *
 * @param fn - The async function to wrap
 * @param options - Sanitization options
 * @returns Wrapped function that sanitizes errors
 */
export function withErrorSanitization<
  T extends (...args: unknown[]) => Promise<unknown>,
>(fn: T, options: SanitizationOptions = {}): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const sanitized = createSanitizedError(error, undefined, options);
      const sanitizedError = new Error(sanitized.message) as Error & {
        statusCode?: number;
        type?: string;
        safeMetadata?: Record<string, unknown>;
      };
      sanitizedError.name = 'SanitizedError';
      sanitizedError.statusCode = sanitized.statusCode;
      sanitizedError.type = sanitized.type;
      sanitizedError.safeMetadata = sanitized.safeMetadata;
      throw sanitizedError;
    }
  }) as T;
}

/**
 * Check if a message contains sensitive information
 *
 * @param message - The message to check
 * @returns True if sensitive information is detected
 */
export function containsSensitiveInfo(message: string): boolean {
  for (const pattern of Object.values(SENSITIVE_PATTERNS)) {
    if (pattern.test(message)) {
      return true;
    }
  }
  return false;
}

/**
 * Get a safe error summary for logging or metrics
 *
 * @param error - The error to summarize
 * @returns Safe summary string
 */
export function getErrorSummary(error: Error | string | any): string {
  const errorType = classifyError(
    error instanceof Error ? error.message : String(error)
  );
  const safeContext = extractSafeContext(
    error instanceof Error ? error.message : String(error)
  );

  return safeContext ? `${errorType} (${safeContext})` : errorType;
}

export default {
  sanitizeErrorMessage,
  createSanitizedError,
  withErrorSanitization,
  containsSensitiveInfo,
  getErrorSummary,
};
