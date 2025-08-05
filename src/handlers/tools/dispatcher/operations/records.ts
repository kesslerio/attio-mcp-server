/**
 * Generic record operation handlers for tool execution
 *
 * Handles generic record operations like list-records and get-record
 * that work across all object types (companies, people, deals, etc.)
 */

import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { createErrorResult } from '../../../../utils/error-handler.js';
import type { ToolConfig } from '../../../tool-types.js';
import { hasResponseData } from '../../error-types.js';
import { formatResponse } from '../../formatters.js';

/**
 * Handle list-records operations
 *
 * Executes generic record listing for any object type
 */
export async function handleListOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  try {
    const { objectSlug, objectId, ...options } = request.params.arguments || {};

    if (!objectSlug) {
      return createErrorResult(
        new Error('objectSlug parameter is required for list operation'),
        `/objects/${objectSlug || 'unknown'}/records`,
        'GET',
        { status: 400, message: 'Missing required parameter: objectSlug' }
      );
    }

    // Extract the list options, excluding objectSlug and objectId
    const listOptions = {
      page: options.page,
      pageSize: options.pageSize,
      query: options.query,
      attributes: options.attributes,
      sort: options.sort,
      direction: options.direction,
    };

    // Remove undefined properties to keep the options clean
    Object.keys(listOptions).forEach((key) => {
      if (listOptions[key as keyof typeof listOptions] === undefined) {
        delete listOptions[key as keyof typeof listOptions];
      }
    });

    const result = await toolConfig.handler(objectSlug, listOptions, objectId);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : `Found ${Array.isArray(result) ? result.length : 0} records`;

    return formatResponse(formattedResult);
  } catch (error) {
    const objectSlug = request.params.arguments?.objectSlug || 'unknown';
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/objects/${objectSlug}/records`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle get-record operations
 *
 * Executes generic record retrieval for any object type
 */
export async function handleGetOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  try {
    const { objectSlug, recordId, attributes, objectId } =
      request.params.arguments || {};

    if (!objectSlug) {
      return createErrorResult(
        new Error('objectSlug parameter is required for get operation'),
        `/objects/${objectSlug || 'unknown'}/records/${recordId || 'unknown'}`,
        'GET',
        { status: 400, message: 'Missing required parameter: objectSlug' }
      );
    }

    if (!recordId) {
      return createErrorResult(
        new Error('recordId parameter is required for get operation'),
        `/objects/${objectSlug}/records/${recordId || 'unknown'}`,
        'GET',
        { status: 400, message: 'Missing required parameter: recordId' }
      );
    }

    const result = await toolConfig.handler(
      objectSlug,
      recordId,
      attributes,
      objectId
    );
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : 'Record retrieved successfully';

    return formatResponse(formattedResult);
  } catch (error) {
    const objectSlug = request.params.arguments?.objectSlug || 'unknown';
    const recordId = request.params.arguments?.recordId || 'unknown';
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/objects/${objectSlug}/records/${recordId}`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}
