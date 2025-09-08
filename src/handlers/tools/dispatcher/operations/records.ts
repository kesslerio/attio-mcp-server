/**
 * Generic record operation handlers for tool execution
 *
 * Handles generic record operations like list-records and get-record-details
 * that work across all object types (companies, people, deals, etc.)
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

import { createErrorResult } from '../../../../utils/error-handler.js';
import { formatResponse } from '../../formatters.js';
import { hasResponseData } from '../../error-types.js';
import { ToolConfig } from '../../../tool-types.js';

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

      ? toolConfig.formatResult(result)
      : `Found ${Array.isArray(result) ? result.length : 0} records`;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/objects/${objectSlug}/records`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle get-record-details operations
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

      objectSlug,
      recordId,
      attributes,
      objectId
    );
      ? toolConfig.formatResult(result)
      : `Record retrieved successfully`;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/objects/${objectSlug}/records/${recordId}`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}
