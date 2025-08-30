/**
 * Batch operation handlers for tool execution
 *
 * Handles batch operations for multiple records
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

import { createErrorResult } from '../../../../utils/error-handler.js';
import { formatResponse } from '../../formatters.js';
import { hasResponseData } from '../../error-types.js';
import { ResourceType } from '../../../../types/attio.js';
import { ToolConfig } from '../../../tool-types.js';

/**
 * Handle batchUpdate operations
 */
export async function handleBatchUpdateOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {

  if (!updates || !Array.isArray(updates)) {
    return createErrorResult(
      new Error('updates parameter is required and must be an array'),
      `/${resourceType}/batch`,
      'PUT',
      { status: 400, message: 'Missing or invalid updates parameter' }
    );
  }

  if (updates.length === 0) {
    return createErrorResult(
      new Error('updates array cannot be empty'),
      `/${resourceType}/batch`,
      'PUT',
      { status: 400, message: 'Empty updates array' }
    );
  }

  // Validate each update has required fields
  for (let i = 0; i < updates.length; i++) {
    if (!update.id || !update.attributes) {
      return createErrorResult(
        new Error(
          `Update at index ${i} must have 'id' and 'attributes' properties`
        ),
        `/${resourceType}/batch`,
        'PUT',
        { status: 400, message: 'Invalid update structure' }
      );
    }
  }

  try {
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/batch`,
      'PUT',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle batchCreate operations
 */
export async function handleBatchCreateOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
    request.params.arguments?.companies ||
    request.params.arguments?.people ||
    request.params.arguments?.items;

  if (!items || !Array.isArray(items)) {
    return createErrorResult(
      new Error('items parameter is required and must be an array'),
      `/${resourceType}/batch`,
      'POST',
      { status: 400, message: 'Missing or invalid items parameter' }
    );
  }

  if (items.length === 0) {
    return createErrorResult(
      new Error('items array cannot be empty'),
      `/${resourceType}/batch`,
      'POST',
      { status: 400, message: 'Empty items array' }
    );
  }

  try {
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/batch`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle batchDelete operations
 */
export async function handleBatchDeleteOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
    request.params.arguments?.companyIds ||
    request.params.arguments?.personIds ||
    request.params.arguments?.ids;

  if (!ids || !Array.isArray(ids)) {
    return createErrorResult(
      new Error('ids parameter is required and must be an array'),
      `/${resourceType}/batch`,
      'DELETE',
      { status: 400, message: 'Missing or invalid ids parameter' }
    );
  }

  if (ids.length === 0) {
    return createErrorResult(
      new Error('ids array cannot be empty'),
      `/${resourceType}/batch`,
      'DELETE',
      { status: 400, message: 'Empty ids array' }
    );
  }

  try {
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/batch`,
      'DELETE',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle batchSearch operations
 */
export async function handleBatchSearchOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {

  if (!queries || !Array.isArray(queries)) {
    return createErrorResult(
      new Error('queries parameter is required and must be an array'),
      `/${resourceType}/batch/search`,
      'POST',
      { status: 400, message: 'Missing or invalid queries parameter' }
    );
  }

  if (queries.length === 0) {
    return createErrorResult(
      new Error('queries array cannot be empty'),
      `/${resourceType}/batch/search`,
      'POST',
      { status: 400, message: 'Empty queries array' }
    );
  }

  try {
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/batch/search`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle batchGetDetails operations
 */
export async function handleBatchGetDetailsOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
    request.params.arguments?.companyIds ||
    request.params.arguments?.personIds ||
    request.params.arguments?.ids;

  if (!ids || !Array.isArray(ids)) {
    return createErrorResult(
      new Error('ids parameter is required and must be an array'),
      `/${resourceType}/batch/details`,
      'POST',
      { status: 400, message: 'Missing or invalid ids parameter' }
    );
  }

  if (ids.length === 0) {
    return createErrorResult(
      new Error('ids array cannot be empty'),
      `/${resourceType}/batch/details`,
      'POST',
      { status: 400, message: 'Empty ids array' }
    );
  }

  try {
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/batch/details`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}
