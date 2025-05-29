/**
 * List operation handlers for tool execution
 * 
 * Handles list-related operations including adding/removing records from lists
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { createErrorResult } from '../../../../utils/error-handler.js';
import { ToolConfig, GetListsToolConfig } from '../../../tool-types.js';
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

/**
 * Handle addRecordToList operations
 * 
 * This function extracts parameters from the tool request and passes them to the handler.
 * It supports both required parameters (listId, recordId) and optional parameters 
 * (objectType, initialValues) needed for proper API payload construction.
 * 
 * @param request - The tool request containing parameters
 * @param toolConfig - The tool configuration with handler function
 * @returns Formatted response with success or error information
 */
export async function handleAddRecordToListOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;
  const recordId = request.params.arguments?.recordId as string;
  const objectType = request.params.arguments?.objectType as string | undefined;
  const initialValues = request.params.arguments?.initialValues as Record<string, any> | undefined;

  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'POST',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  if (!recordId) {
    return createErrorResult(
      new Error('recordId parameter is required'),
      `/lists/${listId}/records`,
      'POST',
      { status: 400, message: 'Missing required parameter: recordId' }
    );
  }

  try {
    // Pass objectType and initialValues to the handler function
    const result = await toolConfig.handler(listId, recordId, objectType, initialValues);
    const formattedResult = toolConfig.formatResult 
      ? toolConfig.formatResult(result) 
      : `Successfully added record ${recordId} to list ${listId}`;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/records`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle removeRecordFromList operations
 */
export async function handleRemoveRecordFromListOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;
  const entryId = request.params.arguments?.entryId as string;

  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'DELETE',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  if (!entryId) {
    return createErrorResult(
      new Error('entryId parameter is required'),
      `/lists/${listId}/entries`,
      'DELETE',
      { status: 400, message: 'Missing required parameter: entryId' }
    );
  }

  try {
    const result = await toolConfig.handler(listId, entryId);
    const formattedResult = toolConfig.formatResult 
      ? toolConfig.formatResult(result) 
      : `Successfully removed entry ${entryId} from list ${listId}`;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/entries/${entryId}`,
      'DELETE',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle updateListEntry operations
 */
export async function handleUpdateListEntryOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;
  const entryId = request.params.arguments?.entryId as string;
  const attributes = request.params.arguments?.attributes;

  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'PUT',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  if (!entryId) {
    return createErrorResult(
      new Error('entryId parameter is required'),
      `/lists/${listId}/entries`,
      'PUT',
      { status: 400, message: 'Missing required parameter: entryId' }
    );
  }

  if (!attributes || typeof attributes !== 'object') {
    return createErrorResult(
      new Error('attributes parameter is required and must be an object'),
      `/lists/${listId}/entries/${entryId}`,
      'PUT',
      { status: 400, message: 'Missing or invalid attributes parameter' }
    );
  }

  try {
    const result = await toolConfig.handler(listId, entryId, attributes);
    const formattedResult = toolConfig.formatResult ? toolConfig.formatResult(result) : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/entries/${entryId}`,
      'PUT',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle getListDetails operations
 */
export async function handleGetListDetailsOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;

  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'GET',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  try {
    const result = await toolConfig.handler(listId);
    const formattedResult = toolConfig.formatResult ? toolConfig.formatResult(result) : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle getListEntries operations
 */
export async function handleGetListEntriesOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;
  const limit = request.params.arguments?.limit as number;
  const offset = request.params.arguments?.offset as number;
  const filters = request.params.arguments?.filters;

  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'GET',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  try {
    const result = await toolConfig.handler(listId, limit, offset, filters);
    const formattedResult = toolConfig.formatResult ? toolConfig.formatResult(result) : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/entries`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle filterListEntries operations
 */
export async function handleFilterListEntriesOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;
  const attributeSlug = request.params.arguments?.attributeSlug as string;
  const condition = request.params.arguments?.condition as string;
  const value = request.params.arguments?.value;
  const limit = request.params.arguments?.limit as number;
  const offset = request.params.arguments?.offset as number;

  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'GET',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  if (!attributeSlug) {
    return createErrorResult(
      new Error('attributeSlug parameter is required'),
      `/lists/${listId}/entries`,
      'GET',
      { status: 400, message: 'Missing required parameter: attributeSlug' }
    );
  }

  if (!condition) {
    return createErrorResult(
      new Error('condition parameter is required'),
      `/lists/${listId}/entries`,
      'GET',
      { status: 400, message: 'Missing required parameter: condition' }
    );
  }

  if (value === undefined) {
    return createErrorResult(
      new Error('value parameter is required'),
      `/lists/${listId}/entries`,
      'GET',
      { status: 400, message: 'Missing required parameter: value' }
    );
  }

  try {
    const result = await toolConfig.handler(listId, attributeSlug, condition, value, limit, offset);
    const formattedResult = toolConfig.formatResult ? toolConfig.formatResult(result) : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/entries`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle advancedFilterListEntries operations
 */
export async function handleAdvancedFilterListEntriesOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig
) {
  const listId = request.params.arguments?.listId as string;
  const filters = request.params.arguments?.filters;
  const limit = request.params.arguments?.limit as number;
  const offset = request.params.arguments?.offset as number;

  if (!listId) {
    return createErrorResult(
      new Error('listId parameter is required'),
      '/lists',
      'GET',
      { status: 400, message: 'Missing required parameter: listId' }
    );
  }

  if (!filters || typeof filters !== 'object') {
    return createErrorResult(
      new Error('filters parameter is required and must be an object'),
      `/lists/${listId}/entries`,
      'GET',
      { status: 400, message: 'Missing or invalid filters parameter' }
    );
  }

  try {
    const result = await toolConfig.handler(listId, filters, limit, offset);
    const formattedResult = toolConfig.formatResult ? toolConfig.formatResult(result) : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/lists/${listId}/entries`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}