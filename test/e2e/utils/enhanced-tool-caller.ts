/**
 * Enhanced Tool Caller for E2E Tests
 *
 * Provides a unified interface for calling MCP tools with:
 * - Automatic legacy-to-universal tool migration
 * - Comprehensive logging of all API calls
 * - Error handling and retry logic
 * - Performance monitoring
 * - Test data tracking
 *
 * This module allows existing E2E tests to work without modification
 * while using the correct universal tools and comprehensive logging.
 */

import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

import { configLoader } from './config-loader.js';
import { executeToolRequest } from '../../../src/handlers/tools/dispatcher.js';
import { extractRecordId } from '../../../src/utils/validation/uuid-validation.js';
import type { ToolParameters } from '../types/index.js';

export interface ToolCallOptions {
  testName?: string;
  retryCount?: number;
  timeout?: number;
  trackAsTestData?: boolean;
  logResponse?: boolean;
}

export interface ToolCallResult {
  success: boolean;
  content?: unknown;
  error?: Error;
  timing: {
    start: number;
    end: number;
    duration: number;
  };
  toolName: string;
  originalToolName: string;
  wasTransformed: boolean;
  isError?: boolean;
}

/**
 * Preprocess parameters to handle special cases like URI-to-record_id extraction
 */
function preprocessParameters(
  toolName: string,
  parameters: ToolParameters
): ToolParameters {
  // Handle URI parameter for note creation tools
  if (
    toolName === 'create-note' &&
    'uri' in parameters &&
    !('record_id' in parameters)
  ) {

    if (recordId) {
      const { uri: _uri, ...otherParams } = parameters;
      return {
        ...otherParams,
        record_id: recordId,
        resource_type:
          parameters.resource_type || inferResourceTypeFromUri(uri),
      };
    }
  }

  return parameters;
}

/**
 * Infer resource type from URI format
 */
function inferResourceTypeFromUri(uri: string): string {
  if (uri.includes('/companies/') || uri.includes('companies')) {
    return 'companies';
  }
  if (uri.includes('/people/') || uri.includes('people')) {
    return 'people';
  }
  return 'companies'; // default fallback
}

/**
 * Enhanced tool caller that handles migration, logging, and error handling
 */
export async function callToolWithEnhancements(
  toolName: string,
  parameters: ToolParameters,
  options: ToolCallOptions = {}
): Promise<ToolCallResult> {
  let actualToolName = toolName;
  let actualParams = parameters;
  let wasTransformed = false;

  try {
    // Step 0: Check if API key is available for API-dependent operations
      process.env.E2E_MODE === 'true' &&
      process.env.USE_MOCK_DATA !== 'false' &&
      // Tools that provide E2E-safe fallbacks (no real API needed)
      ['list-notes'].includes(toolName);

    if (!apiKeyStatus.available && isApiDependentTool(toolName) && !allowE2EMock) {
      logInfo(errorMessage, { toolName, skipped: true }, options.testName);

      return {
        success: false,
        error: new Error(errorMessage),
        timing: {
          start: startTime,
          end: Date.now(),
          duration: Date.now() - startTime,
        },
        toolName: actualToolName,
        originalToolName,
        wasTransformed,
      };
    }

    // Step 0.5: Preprocess parameters to handle special cases (URI extraction, etc.)
    actualParams = preprocessParameters(actualToolName, actualParams);

    // Step 1: Check if this is a legacy tool that needs migration
    if (isLegacyTool(toolName)) {
      if (transformation) {
        actualToolName = transformation.toolName;
        actualParams = transformation.params;
        wasTransformed = true;

        logInfo(
          `Transformed legacy tool: ${toolName} → ${actualToolName}`,
          {
            originalParams: parameters,
            transformedParams: actualParams,
            resourceType: transformation.resourceType,
          },
          options.testName
        );
      }
    }

    // Step 2: Execute the tool request
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: actualToolName,
        arguments: actualParams,
      },
    };


    // Step 3: Transform response if needed

    // Step 4: Log the tool call
      start: startTime,
      end: endTime,
      duration: endTime - startTime,
    };

    logToolCall(
      actualToolName,
      actualParams,
      options.logResponse !== false
        ? finalResponse
        : '[Response logging disabled]',
      timing,
      options.testName
    );

    // Step 5: Check if the response indicates an error (enhanced detection logic)
    let isErrorResponse = false;
    let errorInfo: string | undefined;

    // 1) If MCP already says success, trust it
    if (finalResponse && finalResponse.isError === false) {
      isErrorResponse = false;
    } else {
      // 2) Check for arrays - non-empty arrays are valid successes
      let parsed: unknown | undefined;
      try {
        parsed = JSON.parse(String(first?.text ?? ''));
      } catch {
        // Parsing failed, continue with other checks
      }

      // Non-empty arrays are success
      if (Array.isArray(parsed) && parsed.length > 0) {
        isErrorResponse = false;
      }
      // Check for explicit errors in parsed content
      else if (parsed) {
          !!parsed?.error ||
          (Array.isArray(parsed?.errors) && parsed.errors.length > 0);
        isErrorResponse = hasExplicitError;
      }
      // Strict error detection - only flag actual errors, not text content
      else if (finalResponse?.isError === true) {
        isErrorResponse = true;
      } else if (finalResponse?.error) {
        // Only consider it an error if there's an actual error object with meaningful content
        isErrorResponse = true;
      } else if (
        Array.isArray(finalResponse?.content) &&
        finalResponse.content[0]?.type === 'error'
      ) {
        // Check if the response content type is explicitly 'error'
        isErrorResponse = true;
      }
    }
    // DO NOT check response text for error keywords - this causes false positives

    if (isErrorResponse) {
      // Extract error message from MCP error response
      if (finalResponse.content?.[0]?.text) {
        errorInfo = finalResponse.content[0].text;
      } else if (finalResponse.error?.message) {
        errorInfo = finalResponse.error.message;
      } else if (typeof finalResponse.error === 'string') {
        errorInfo = finalResponse.error;
      } else {
        errorInfo = 'Unknown error occurred';
      }
    }

    // Step 6: Track test data if requested (only for successful operations)
    if (
      !isErrorResponse &&
      options.trackAsTestData &&
      finalResponse?.content?.[0]
    ) {
      if (record.id?.record_id) {
        logTestDataCreation(
          resourceType,
          record.id.record_id,
          record,
          options.testName
        );
      }
    }

    return {
      success: !isErrorResponse,
      isError: isErrorResponse,
      content: finalResponse.content,
      error: errorInfo ? new Error(errorInfo) : undefined,
      timing,
      toolName: actualToolName,
      originalToolName,
      wasTransformed,
    };
  } catch (error: unknown) {
      start: startTime,
      end: endTime,
      duration: endTime - startTime,
    };

    // Log the error
    logToolCall(
      actualToolName,
      actualParams,
      null,
      timing,
      options.testName,
      error as Error
    );

    // Extract error information from MCP response or exception
    let errorInfo: string | Error = error as Error;

    // If the error is an MCP response with error details, extract the message
    if (error && typeof error === 'object' && 'content' in error) {
        content?: Array<{ text?: string }>;
        error?: { message?: string };
      };
      if (mcpError.content?.[0]?.text) {
        errorInfo = mcpError.content[0].text;
      } else if (mcpError.error?.message) {
        errorInfo = mcpError.error.message;
      }
    }

    return {
      success: false,
      isError: true,
      error: typeof errorInfo === 'string' ? new Error(errorInfo) : errorInfo,
      timing,
      toolName: actualToolName,
      originalToolName,
      wasTransformed,
    };
  }
}

/**
 * Simplified tool caller for backward compatibility with existing tests
 * This matches the signature expected by existing E2E tests
 */
export async function callTool(
  toolName: string,
  parameters: ToolParameters,
  testName?: string
): Promise<unknown> {
    testName,
    trackAsTestData: isCreationTool(toolName),
    logResponse: true,
  });

  // Return response in the format expected by existing tests
  // Don't throw on error - let tests handle error responses
    isError: !result.success,
    error:
      typeof result.error === 'string'
        ? result.error
        : result.error?.message || result.error,
    content: result.content,
    _meta: {
      toolName: result.toolName,
      executionTime: result.timing.duration,
    },
  };

  // Special handling for list operations to ensure array returns
  if (
    result.toolName.includes('search-records') ||
    result.toolName.includes('get-lists')
  ) {
    if (!response.isError && result.content?.[0]?.text) {
      try {
        // If content is parsed successfully but not an array, wrap in array or provide empty array
        if (
          parsedContent === false ||
          parsedContent === null ||
          parsedContent === undefined
        ) {
          response.content = [
            { type: 'text', text: JSON.stringify([], null, 2) },
          ];
        }
      } catch {
        // If parsing fails, keep original content
      }
    }
  }

  return response;
}

/**
 * Create multiple tool callers for different test suites (for backward compatibility)
 */
export function createToolCaller(suiteContext: string) {
  return {
    call: async (
      toolName: string,
      parameters: ToolParameters
    ): Promise<unknown> => {
      return callTool(toolName, parameters, suiteContext);
    },
    callWithOptions: async (
      toolName: string,
      parameters: ToolParameters,
      options: ToolCallOptions
    ): Promise<ToolCallResult> => {
      return callToolWithEnhancements(toolName, parameters, {
        ...options,
        testName: options.testName || suiteContext,
      });
    },
  };
}

/**
 * Helper functions for test suites (maintaining backward compatibility)
 */
export const TasksToolCaller = createToolCaller('tasks-management');
export const NotesToolCaller = createToolCaller('notes-management');
export const ListsToolCaller = createToolCaller('lists-management');
export const UniversalToolCaller = createToolCaller('universal-tools');

/**
 * Legacy helper functions to maintain existing test interfaces
 */
export async function callTasksTool(
  toolName: string,
  params: ToolParameters
): Promise<unknown> {
  // Handle cross-resource tool calls that may have been historically called through callTasksTool
  // This provides backward compatibility for tests that call non-task tools through callTasksTool
  return UniversalToolCaller.call(toolName, params);
}

export async function callNotesTool(
  toolName: string,
  params: ToolParameters
): Promise<unknown> {
  return NotesToolCaller.call(toolName, params);
}

export async function callListTool(
  toolName: string,
  params: ToolParameters
): Promise<unknown> {
  return ListsToolCaller.call(toolName, params);
}

export async function callUniversalTool(
  toolName: string,
  params: ToolParameters
): Promise<unknown> {
  return UniversalToolCaller.call(toolName, params);
}

/**
 * Utility functions
 */
function isCreationTool(toolName: string): boolean {
  return (
    toolName.includes('create-') ||
    toolName === 'create-record' ||
    toolName.startsWith('create')
  );
}

/**
 * Check if a tool requires API access
 */
function isApiDependentTool(toolName: string): boolean {
  // Tools that can work without API access (mostly validation and formatting tools)
    'validate-email',
    'format-phone',
    'parse-name',
    'validate-domain',
  ];

  if (apiIndependentTools.includes(toolName)) {
    return false;
  }

  // Most MCP tools require API access
  return true;
}

/**
 * Get migration statistics for debugging
 */
export function getToolMigrationStats(): unknown {
  return getMappingStats();
}

/**
 * Validate tool environment before running tests
 */
export async function validateTestEnvironment(): Promise<{
  valid: boolean;
  warnings: string[];
  stats: unknown;
  apiKeyStatus: { available: boolean; message?: string };
}> {
  const warnings: string[] = [];

  // Check API key status
  if (!apiKeyStatus.available) {
    warnings.push(`API Key not available: ${apiKeyStatus.message}`);
  }

  // Test a basic universal tool call (only if API key is available)
  if (apiKeyStatus.available) {
    try {
        'search-records',
        {
          resource_type: 'companies',
          query: 'test',
          limit: 1,
        },
        { logResponse: false }
      );

      if (!result.success) {
        warnings.push(
          `Basic universal tool test failed: ${result.error?.toString()}`
        );
      }
    } catch (error: unknown) {
      warnings.push(
        `Universal tools not available: ${(error as Error).message}`
      );
    }
  } else {
    warnings.push('Skipping universal tool test - no API key available');
  }

  return {
    valid: apiKeyStatus.available && warnings.length <= 1, // Allow API key warning
    warnings,
    stats,
    apiKeyStatus,
  };
}
