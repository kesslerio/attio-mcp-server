/**
 * Batch operation handlers for tool execution
 *
 * Handles batch operations for multiple records
 */

import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { ResourceType } from '../../../../types/attio.js';
import { createErrorResult } from '../../../../utils/error-handler.js';
import type { ToolConfig } from '../../../tool-types.js';
import { hasResponseData } from '../../error-types.js';
import { formatResponse } from '../../formatters.js';

/**
 * Handle batchUpdate operations
 */
export async function handleBatchUpdateOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  const updates = request.params.arguments?.updates;
  const config = request.params.arguments?.config;

  if (!(updates && Array.isArray(updates))) {
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
    const update = updates[i];
    if (!(update.id && update.attributes)) {
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
    const result = await toolConfig.handler(updates, config);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error) {
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
  const items =
    request.params.arguments?.companies ||
    request.params.arguments?.people ||
    request.params.arguments?.items;
  const config = request.params.arguments?.config;

  if (!(items && Array.isArray(items))) {
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
    const result = await toolConfig.handler(items, config);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error) {
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
  const ids =
    request.params.arguments?.companyIds ||
    request.params.arguments?.personIds ||
    request.params.arguments?.ids;
  const config = request.params.arguments?.config;

  if (!(ids && Array.isArray(ids))) {
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
    const result = await toolConfig.handler(ids, config);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error) {
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
  const queries = request.params.arguments?.queries;
  const config = request.params.arguments?.config;

  if (!(queries && Array.isArray(queries))) {
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
    const result = await toolConfig.handler(queries, config);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error) {
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
  const ids =
    request.params.arguments?.companyIds ||
    request.params.arguments?.personIds ||
    request.params.arguments?.ids;
  const config = request.params.arguments?.config;

  if (!(ids && Array.isArray(ids))) {
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
    const result = await toolConfig.handler(ids, config);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/batch/details`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}
