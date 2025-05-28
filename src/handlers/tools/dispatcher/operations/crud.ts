/**
 * CRUD operation handlers for tool execution
 * 
 * Handles create, read, update, delete, and related operations
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { createErrorResult } from '../../../../utils/error-handler.js';
import { ResourceType } from '../../../../types/attio.js';
import { ToolConfig } from '../../../tool-types.js';
import { formatResponse } from '../../formatters.js';
import { hasResponseData } from '../../error-types.js';
import { validateAttributes, validateResourceId } from '../validation.js';

/**
 * Handle update operations
 */
export async function handleUpdateOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  const idParam = resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  const id = request.params.arguments?.[idParam] as string;
  const attributes = request.params.arguments?.attributes;

  if (!id) {
    return createErrorResult(
      new Error(`${idParam} parameter is required`),
      `/${resourceType}`,
      'PUT',
      { status: 400, message: 'Missing required parameter' }
    );
  }

  if (!attributes || typeof attributes !== 'object') {
    return createErrorResult(
      new Error('attributes parameter is required and must be an object'),
      `/${resourceType}/${id}`,
      'PUT',
      { status: 400, message: 'Missing or invalid attributes parameter' }
    );
  }

  try {
    const result = await toolConfig.handler(id, attributes);
    const formattedResult = toolConfig.formatResult ? toolConfig.formatResult(result) : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/${id}`,
      'PUT',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle updateAttribute operations
 */
export async function handleUpdateAttributeOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  const idParam = resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  const id = request.params.arguments?.[idParam] as string;
  const attributeName = request.params.arguments?.attributeName as string;
  const value = request.params.arguments?.value;

  if (!id) {
    return createErrorResult(
      new Error(`${idParam} parameter is required`),
      `/${resourceType}`,
      'PUT',
      { status: 400, message: 'Missing required parameter' }
    );
  }

  if (!attributeName) {
    return createErrorResult(
      new Error('attributeName parameter is required'),
      `/${resourceType}/${id}`,
      'PUT',
      { status: 400, message: 'Missing required parameter: attributeName' }
    );
  }

  if (value === undefined) {
    return createErrorResult(
      new Error('value parameter is required'),
      `/${resourceType}/${id}`,
      'PUT',
      { status: 400, message: 'Missing required parameter: value' }
    );
  }

  try {
    const result = await toolConfig.handler(id, attributeName, value);
    const formattedResult = toolConfig.formatResult ? toolConfig.formatResult(result) : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/${id}`,
      'PUT',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle getAttributes operations
 */
export async function handleGetAttributesOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  const idParam = resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  const id = request.params.arguments?.[idParam] as string;
  const attributeName = request.params.arguments?.attributeName as string;

  if (!id) {
    return createErrorResult(
      new Error(`${idParam} parameter is required`),
      `/${resourceType}`,
      'GET',
      { status: 400, message: 'Missing required parameter' }
    );
  }

  try {
    const result = await toolConfig.handler(id, attributeName);
    const formattedResult = toolConfig.formatResult ? toolConfig.formatResult(result) : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/${id}/attributes`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle create operations
 */
export async function handleCreateOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  const attributes = request.params.arguments?.attributes;

  if (!attributes || typeof attributes !== 'object') {
    return createErrorResult(
      new Error('attributes parameter is required and must be an object'),
      `/${resourceType}`,
      'POST',
      { status: 400, message: 'Missing or invalid attributes parameter' }
    );
  }

  try {
    const result = await toolConfig.handler(attributes);
    const formattedResult = toolConfig.formatResult ? toolConfig.formatResult(result) : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle basicInfo and other info operations
 */
export async function handleInfoOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  const idParam = resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  const id = request.params.arguments?.[idParam] as string;

  if (!id) {
    return createErrorResult(
      new Error(`${idParam} parameter is required`),
      `/${resourceType}`,
      'GET',
      { status: 400, message: 'Missing required parameter' }
    );
  }

  try {
    const result = await toolConfig.handler(id);
    const formattedResult = toolConfig.formatResult ? toolConfig.formatResult(result) : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/${id}`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle fields operations
 */
export async function handleFieldsOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  const idParam = resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  const id = request.params.arguments?.[idParam] as string;
  const fields = request.params.arguments?.fields as string[];

  if (!id) {
    return createErrorResult(
      new Error(`${idParam} parameter is required`),
      `/${resourceType}`,
      'GET',
      { status: 400, message: 'Missing required parameter' }
    );
  }

  if (!fields || !Array.isArray(fields)) {
    return createErrorResult(
      new Error('fields parameter is required and must be an array'),
      `/${resourceType}/${id}`,
      'GET',
      { status: 400, message: 'Missing or invalid fields parameter' }
    );
  }

  try {
    const result = await toolConfig.handler(id, fields);
    const formattedResult = toolConfig.formatResult ? toolConfig.formatResult(result) : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/${id}/fields`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle discoverAttributes operations
 */
export async function handleDiscoverAttributesOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  try {
    const result = await toolConfig.handler();
    const formattedResult = toolConfig.formatResult ? toolConfig.formatResult(result) : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/attributes/discover`,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle delete operations
 */
export async function handleDeleteOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  const idParam = resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
  const id = request.params.arguments?.[idParam] as string;

  if (!id) {
    return createErrorResult(
      new Error(`${idParam} parameter is required`),
      `/${resourceType}`,
      'DELETE',
      { status: 400, message: 'Missing required parameter' }
    );
  }

  try {
    const result = await toolConfig.handler(id);
    const formattedResult = toolConfig.formatResult ? toolConfig.formatResult(result) : result;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/${id}`,
      'DELETE',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}
