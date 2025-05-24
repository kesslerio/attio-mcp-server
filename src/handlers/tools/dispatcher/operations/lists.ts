/**
 * Lists operation handlers for tool execution
 * 
 * Handles list-related operations including retrieving lists
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { createErrorResult } from '../../../../utils/error-handler.js';
import { GetListsToolConfig } from '../../../tool-types.js';
import { formatResponse } from '../../formatters.js';
import { hasResponseData } from '../../error-types.js';

/**
 * Handle getLists operations
 */
export async function handleGetListsOperation(
  request: CallToolRequest,
  toolConfig: GetListsToolConfig
) {
  try {
    const lists = await toolConfig.handler();
    const formattedResult = toolConfig.formatResult!(lists);

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      '/lists',
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}