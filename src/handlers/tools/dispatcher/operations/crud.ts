/**
 * CRUD operation handlers for tool execution
 *
 * Handles create, read, update, delete, and related operations
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

import { createErrorResult } from '../../../../utils/error-handler.js';
import { formatResponse } from '../../formatters.js';
import { hasResponseData } from '../../error-types.js';
import { ResourceType } from '../../../../types/attio.js';
import { ToolConfig } from '../../../tool-types.js';

/**
 * Handle create operations
 */
export async function handleCreateOperation(
  request: CallToolRequest,
  toolConfig: ToolConfig,
  resourceType: ResourceType
) {
  try {

    if (!attributes) {
      return createErrorResult(
        new Error('Attributes parameter is required for create operation'),
        `/${resourceType}`,
        'POST',
        { status: 400, message: 'Missing required parameter: attributes' }
      );
    }

      ? toolConfig.formatResult(result)
      : `${resourceType.slice(0, -1)} created successfully`;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
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
      recordId ||
      (resourceType === ResourceType.COMPANIES
        ? (request.params.arguments?.companyId as string)
        : (request.params.arguments?.personId as string));


    if (!id) {
        resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
      return createErrorResult(
        new Error(
          `ID parameter is required for update operation. ` +
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

      ? toolConfig.formatResult(result)
      : `${resourceType.slice(0, -1)} updated successfully`;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
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
      recordId ||
      (resourceType === ResourceType.COMPANIES
        ? (request.params.arguments?.companyId as string)
        : (request.params.arguments?.personId as string));


    if (!id) {
        resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
      return createErrorResult(
        new Error(
          `ID parameter is required for updateAttribute operation. ` +
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

      ? toolConfig.formatResult(result)
      : `${resourceType.slice(0, -1)} attribute updated successfully`;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
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
      resourceType === ResourceType.COMPANIES
        ? (request.params.arguments?.companyId as string)
        : (request.params.arguments?.personId as string);

    if (!id) {
        resourceType === ResourceType.COMPANIES ? 'companyId' : 'personId';
      return createErrorResult(
        new Error(`${idParamName} parameter is required for delete operation`),
        `/${resourceType}`,
        'DELETE',
        { status: 400, message: `Missing required parameter: ${idParamName}` }
      );
    }

      ? toolConfig.formatResult(result)
      : `${resourceType.slice(0, -1)} deleted successfully`;

    return formatResponse(formattedResult);
  } catch (error: unknown) {
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
