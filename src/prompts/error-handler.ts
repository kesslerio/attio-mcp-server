/**
 * Error handling utilities for the prompts module
 */
import { ErrorType, formatErrorResponse } from '@/utils/error-handler.js';
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
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '[blocked_script]')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
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

// Extend the error response type to allow string codes for Express
interface PromptErrorResponse {
  error: {
    code: string | number;
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

  // Create a new response object with our extended type
  const response: PromptErrorResponse = {
    ...baseResponse,
    error: {
      ...baseResponse.error,
      code: String(statusCode), // Convert to string for Express
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
