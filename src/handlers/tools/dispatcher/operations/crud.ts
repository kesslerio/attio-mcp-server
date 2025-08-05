/**
 * CRUD operation handlers for tool execution
 *
 * Handles create, read, update, delete, and related operations
 */

import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ResourceType } from '../../../../types/attio.js';
import { createErrorResult } from '../../../../utils/error-handler.js';
import type { ToolConfig } from '../../../tool-types.js';
import { hasResponseData } from '../../error-types.js';
import { formatResponse } from '../../formatters.js';

/**
 * Handle create operations
 */
export async function handleCreateOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  try {
    const attributes = request.params.arguments?.attributes;

    if (!attributes) {
      return createErrorResult(
        new Error('Attributes parameter is required for create operation'),
        `/${resourceType}`,
        'POST',
        { status: 400, message: 'Missing required parameter: attributes' }
      );
    }

    const result = await toolConfig.handler(attributes);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : `${resourceType.slice(0, -1)} created successfully`;

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
 * Handle update operations
 */
export async function handleUpdateOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  try {
    // Support multiple parameter names for ID
    // recordId is the generic parameter used by update-record
    // companyId/personId are resource-specific parameters
    const recordId = request.params.arguments?.recordId as string;
    const id =
      recordId ||
      (resourceType === ResourceType.COMPANIES
        ? (request.params.arguments?.companyId as string)
        : (request.params.arguments?.personId as string));

    const attributes = request.params.arguments?.attributes;

    if (!id) {
      const idParamName =
        resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
      return createErrorResult(
        new Error(
          'ID parameter is required for update operation. ' +
            `Expected 'recordId' or '${idParamName}' parameter.`
        ),
        `/${resourceType}`,
        'PUT',
        {
          status: 400,
          message: `Missing required parameter: recordId or ${idParamName}`,
          hint: `For generic record updates use 'recordId', for specific resource types use '${idParamName}'`,
        }
      );
    }

    if (!attributes) {
      return createErrorResult(
        new Error('Attributes parameter is required for update operation'),
        `/${resourceType}/${id}`,
        'PUT',
        { status: 400, message: 'Missing required parameter: attributes' }
      );
    }

    const result = await toolConfig.handler(id, attributes);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : `${resourceType.slice(0, -1)} updated successfully`;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}`,
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
  try {
    // Support multiple parameter names for ID
    const recordId = request.params.arguments?.recordId as string;
    const id =
      recordId ||
      (resourceType === ResourceType.COMPANIES
        ? (request.params.arguments?.companyId as string)
        : (request.params.arguments?.personId as string));

    const attributeName = request.params.arguments?.attributeName as string;
    const value = request.params.arguments?.value;

    if (!id) {
      const idParamName =
        resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
      return createErrorResult(
        new Error(
          'ID parameter is required for updateAttribute operation. ' +
            `Expected 'recordId' or '${idParamName}' parameter.`
        ),
        `/${resourceType}`,
        'PATCH',
        {
          status: 400,
          message: `Missing required parameter: recordId or ${idParamName}`,
          hint: `For generic record updates use 'recordId', for specific resource types use '${idParamName}'`,
        }
      );
    }

    if (!attributeName) {
      return createErrorResult(
        new Error(
          'attributeName parameter is required for updateAttribute operation'
        ),
        `/${resourceType}/${id}`,
        'PATCH',
        { status: 400, message: 'Missing required parameter: attributeName' }
      );
    }

    if (value === undefined) {
      return createErrorResult(
        new Error('value parameter is required for updateAttribute operation'),
        `/${resourceType}/${id}`,
        'PATCH',
        { status: 400, message: 'Missing required parameter: value' }
      );
    }

    const result = await toolConfig.handler(id, attributeName, value);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : `${resourceType.slice(0, -1)} attribute updated successfully`;

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}`,
      'PATCH',
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
  try {
    const id =
      resourceType === ResourceType.COMPANIES
        ? (request.params.arguments?.companyId as string)
        : (request.params.arguments?.personId as string);

    if (!id) {
      const idParamName =
        resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
      return createErrorResult(
        new Error(`${idParamName} parameter is required for delete operation`),
        `/${resourceType}`,
        'DELETE',
        { status: 400, message: `Missing required parameter: ${idParamName}` }
      );
    }

    const result = await toolConfig.handler(id);
    const formattedResult = toolConfig.formatResult
      ? toolConfig.formatResult(result)
      : `${resourceType.slice(0, -1)} deleted successfully`;

    return formatResponse(formattedResult);
  } catch (error) {
    const id =
      resourceType === ResourceType.COMPANIES
        ? (request.params.arguments?.companyId as string)
        : (request.params.arguments?.personId as string);

    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/${resourceType}/${id || 'unknown'}`,
      'DELETE',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}
