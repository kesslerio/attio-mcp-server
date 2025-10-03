/**
 * Error handling utilities for the prompts module
 */
import { ErrorType, formatErrorResponse } from '@/utils/error-handler.js';
import sanitizeHtml from 'sanitize-html';
import { createScopedLogger, OperationType } from '@/utils/logger.js';
import { sanitizeErrorMessage } from '@/utils/error-sanitizer.js';

const promptErrorLogger = createScopedLogger(
  'prompts.error-handler',
  'createErrorResult',
  OperationType.TOOL_EXECUTION
);

const SAFE_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid prompt request. Please review the provided parameters.',
  401: 'Authentication is required to access prompts.',
  403: 'Access to this prompt is denied.',
  404: 'The requested prompt could not be found.',
  429: 'Too many prompt requests were made. Please try again later.',
  500: 'An internal error occurred while processing the prompt.',
};

const DEFAULT_ERROR_MESSAGE = 'Unable to process the prompt request.';

function stripDangerousContent(value: string): string {
  // Use sanitize-html to robustly remove all scripts and event handlers
  const sanitized = sanitizeHtml(value, {
    allowedTags: false, // Remove all HTML tags, or set to [] to allow plain text only
    allowedAttributes: false, // Remove all attributes
    disallowedTagsMode: 'discard',
  });
  // Remove dangerous URL schemes (javascript:, data:, vbscript:, file:, etc.)
  return sanitized
    .replace(/\b(javascript|data|vbscript|file):/gi, '[URL_REMOVED]:')
    .replace(/\son[a-z]+\s*=\s*/gi, ' ');
}

function encodeHtmlEntities(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

export interface PromptErrorOptions {
  toolName?: string;
  userId?: string;
  requestId?: string;
  context?: Record<string, unknown>;
}

// Error response type for prompts (consistent with base error handler)
interface PromptErrorResponse {
  error: {
    code: number;
    message: string;
    type: ErrorType;
    details?: Record<string, unknown> | null;
  };
  content: Array<{ type: string; text: string }>;
  isError: boolean;
}

/**
 * Creates a standardized error response for prompt-related errors
 *
 * @param error - The error object
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @returns Formatted error result
 */
export function createErrorResult(
  error: Error,
  message: string,
  statusCode: number,
  options: PromptErrorOptions = {}
): PromptErrorResponse {
  let errorType = ErrorType.UNKNOWN_ERROR;

  // Determine error type based on status code
  if (statusCode === 400) {
    errorType = ErrorType.VALIDATION_ERROR;
  } else if (statusCode === 401 || statusCode === 403) {
    errorType = ErrorType.AUTHENTICATION_ERROR;
  } else if (statusCode === 404) {
    errorType = ErrorType.NOT_FOUND_ERROR;
  } else if (statusCode === 429) {
    errorType = ErrorType.RATE_LIMIT_ERROR;
  } else if (statusCode >= 500) {
    errorType = ErrorType.SERVER_ERROR;
  }

  const safeClientMessage = encodeHtmlEntities(
    SAFE_ERROR_MESSAGES[statusCode] ?? DEFAULT_ERROR_MESSAGE
  );

  const sanitizedDetail = encodeHtmlEntities(
    stripDangerousContent(
      sanitizeErrorMessage(message, {
        includeContext: false,
        logOriginal: false,
        module: 'prompts.error-handler',
        operation: 'createErrorResult',
        safeMetadata: {
          statusCode,
          toolName: options.toolName,
        },
      })
    )
  );

  promptErrorLogger.error(
    `Prompt handler failure [${options.toolName ?? 'prompts.unknown'}]`,
    error,
    {
      toolName: options.toolName ?? 'prompts.unknown',
      userId: options.userId ?? 'unknown',
      requestId: options.requestId ?? 'unknown',
      statusCode,
      errorType,
      ...(options.context ? { context: options.context } : {}),
      sanitizedDetail,
    }
  );

  const errorDetails = {
    statusCode,
    message: safeClientMessage,
    sanitizedDetail,
  };

  // Get the base response from the utility function
  const baseResponse = formatErrorResponse(
    error,
    errorType,
    errorDetails
  ) as PromptErrorResponse;

  // Create a new response object with sanitized content
  const response: PromptErrorResponse = {
    ...baseResponse,
    error: {
      ...baseResponse.error,
      code: statusCode, // Keep as number for Express res.status()
      message: safeClientMessage,
    },
    content: baseResponse.content.map((entry) =>
      entry.type === 'text'
        ? { ...entry, text: encodeHtmlEntities(entry.text) }
        : entry
    ),
  };

  return response;
}
