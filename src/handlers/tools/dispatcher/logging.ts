/**
 * Enhanced logging utilities for tool execution using structured logging
 */

import { ToolErrorContext } from '../../../types/tool-types.js';
import {
  error,
  warn,
  createScopedLogger,
  OperationType,
  setLogContext,
  generateCorrelationId,
  PerformanceTimer,
} from '../../../utils/logger.js';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

type RawCallToolRequest = CallToolRequest & {
  method?: string;
  id?: string | number;
  jsonrpc?: string;
};

/**
 * Initialize tool execution context with correlation ID
 */
export function initializeToolContext(toolName: string): string {
  const correlationId = generateCorrelationId();
  setLogContext({
    correlationId,
    operation: toolName,
    operationType: OperationType.TOOL_EXECUTION,
  });
  return correlationId;
}

/**
 * Create a scoped logger for tool execution
 */
export function createToolLogger(toolName: string, toolType?: string) {
  return createScopedLogger(
    `tool:${toolName}`,
    toolType || toolName,
    OperationType.TOOL_EXECUTION
  );
}

/**
 * Enhanced tool execution request logging with structured format
 *
 * @param toolType - The type of tool being executed (e.g., 'search', 'create', 'update')
 * @param toolName - The name of the tool as defined in the MCP configuration
 * @param request - The tool request data
 * @returns PerformanceTimer for tracking execution duration
 */
export function logToolRequest(
  toolType: string,
  toolName: string,
  request: CallToolRequest
): PerformanceTimer {
  const logger = createToolLogger(toolName, toolType);

  // Enhanced logging to debug MCP protocol issues
  const debugMode = process.env.MCP_DEBUG_REQUESTS === 'true';

  const requestData = {
    toolType,
    toolName,
    argumentsCount: request.params.arguments
      ? Object.keys(request.params.arguments).length
      : 0,
    hasArguments: !!request.params.arguments,
    // Log full request structure in debug mode
    ...(debugMode && {
      rawRequest: {
        // Type assertion needed: MCP request objects may have additional method/jsonrpc/id properties not in base type
        method: (request as RawCallToolRequest).method,
        params: request.params,
        jsonrpc: (request as RawCallToolRequest).jsonrpc,
        id: (request as RawCallToolRequest).id,
      },
      paramsKeys: Object.keys(request.params || {}),
      argumentsStructure: request.params.arguments
        ? Object.keys(request.params.arguments)
        : 'missing',
    }),
    ...(process.env.NODE_ENV === 'development' && {
      arguments: request.params.arguments,
    }),
  };

  // Log warning if arguments are missing (helps diagnose protocol issues)
  if (!request.params.arguments && debugMode) {
    warn(
      `tool:${toolName}`,
      `Tool called without arguments wrapper - params keys: ${Object.keys(
        request.params || {}
      ).join(', ')}`,
      { params: request.params },
      toolType,
      OperationType.TOOL_EXECUTION
    );
  }

  return logger.operationStart(
    'execute',
    OperationType.TOOL_EXECUTION,
    requestData
  );
}

/**
 * Log successful tool execution
 *
 * @param toolName - The name of the tool
 * @param toolType - The type of tool
 * @param result - The execution result
 * @param timer - Performance timer from logToolRequest
 */
export function logToolSuccess(
  toolName: string,
  toolType: string,
  result: unknown,
  timer: PerformanceTimer
): void {
  const logger = createToolLogger(toolName, toolType);
  const duration = timer.end();

  const resultSummary = {
    success: true,
    hasContent:
      typeof result === 'object' && result !== null && 'content' in result,
    contentLength:
      typeof result === 'object' && result !== null && 'content' in result
        ? Array.isArray((result as Record<string, unknown>).content)
          ? ((result as Record<string, unknown>).content as unknown[]).length
          : 0
        : 0,
    resultType:
      typeof result === 'object' && result !== null && 'content' in result
        ? Array.isArray((result as Record<string, unknown>).content)
          ? 'array'
          : typeof (result as Record<string, unknown>).content
        : typeof result,
  };

  logger.operationSuccess(
    'execute',
    resultSummary,
    OperationType.TOOL_EXECUTION,
    duration
  );
}

/**
 * Enhanced tool execution error logging with structured format
 *
 * @param toolName - The name of the tool where the error occurred
 * @param toolType - The type of tool where the error occurred
 * @param error - The error that was caught during execution
 * @param timer - Performance timer from logToolRequest
 * @param additionalInfo - Optional additional information about the execution context
 */
export function logToolError(
  toolName: string,
  toolType: string,
  error: unknown,
  timer: PerformanceTimer,
  additionalInfo: ToolErrorContext = {}
): void {
  const logger = createToolLogger(toolName, toolType);
  const duration = timer.end();

  const errorContext = {
    toolType,
    toolName,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    hasStack: error instanceof Error && !!error.stack,
    ...additionalInfo,
  };

  logger.operationFailure(
    'execute',
    error,
    errorContext,
    OperationType.TOOL_EXECUTION,
    duration
  );
}

/**
 * Log tool validation errors
 */
export function logToolValidationError(
  toolName: string,
  toolType: string,
  validationError: string,
  context?: Record<string, unknown>
): void {
  warn(
    `tool:${toolName}`,
    `Validation failed: ${validationError}`,
    context,
    toolType,
    OperationType.VALIDATION
  );
}

/**
 * Log tool configuration errors
 */
export function logToolConfigError(
  toolName: string,
  configError: string,
  context?: Record<string, unknown>
): void {
  error(
    'tool:registry',
    `Configuration error for tool ${toolName}: ${configError}`,
    undefined,
    context,
    'config-lookup',
    OperationType.SYSTEM
  );
}

/**
 * Log API fallback attempts during tool execution
 */
export function logToolFallback(
  toolName: string,
  toolType: string,
  reason: string,
  fallbackMethod: string
): void {
  warn(
    `tool:${toolName}`,
    `Using fallback method: ${fallbackMethod}`,
    { reason, fallbackMethod },
    toolType,
    OperationType.API_CALL
  );
}
