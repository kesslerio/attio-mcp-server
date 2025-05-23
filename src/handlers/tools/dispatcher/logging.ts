/**
 * Logging utilities for tool execution
 * 
 * Provides consistent logging for tool requests and errors during development
 */

import { ToolExecutionRequest, ToolErrorContext } from '../../../types/tool-types.js';

/**
 * Logs tool execution requests in a consistent format (for development mode)
 *
 * @param toolType - The type of tool being executed (e.g., 'search', 'create', 'update')
 * @param toolName - The name of the tool as defined in the MCP configuration
 * @param request - The request data containing parameters and arguments
 */
export function logToolRequest(toolType: string, toolName: string, request: ToolExecutionRequest) {
  if (process.env.NODE_ENV !== 'development') return;

  console.error(`[${toolName}] Tool execution request:`);
  console.error(`- Tool type: ${toolType}`);
  console.error(
    `- Arguments:`,
    request.params.arguments
      ? JSON.stringify(request.params.arguments, null, 2)
      : 'No arguments provided'
  );
}

/**
 * Logs tool execution errors in a consistent format
 *
 * @param toolType - The type of tool where the error occurred (e.g., 'search', 'create', 'update')
 * @param error - The error that was caught during execution
 * @param additionalInfo - Optional additional information about the execution context, such as parameters
 */
export function logToolError(
  toolType: string,
  error: unknown,
  additionalInfo: ToolErrorContext = {}
) {
  console.error(`[${toolType}] Execution error:`, error);
  console.error(
    `- Error type: ${error instanceof Error ? error.constructor.name : typeof error}`
  );
  console.error(
    `- Message: ${error instanceof Error ? error.message : String(error)}`
  );

  if (error instanceof Error && error.stack) {
    console.error(`- Stack trace: ${error.stack}`);
  } else {
    console.error('- No stack trace available');
  }

  if (Object.keys(additionalInfo).length > 0) {
    console.error('- Additional context:', additionalInfo);
  }
}