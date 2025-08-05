/**
 * Details operation handlers for tool execution
 *
 * Handles details operations for retrieving detailed record information
 */

import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ResourceType } from '../../../../types/attio.js';
import { createErrorResult } from '../../../../utils/error-handler.js';
import { parseResourceUri } from '../../../../utils/uri-parser.js';
import type { DetailsToolConfig } from '../../../tool-types.js';
import { hasResponseData } from '../../error-types.js';
import { formatResponse } from '../../formatters.js';

/**
 * Handle details operations
 */
export async function handleDetailsOperation(
  request: CallToolRequest,
  toolConfig: DetailsToolConfig,
  resourceType: ResourceType
) {
  let id: string;
  let uri: string;

  // Check which parameter is provided
  const directId =
    resourceType === ResourceType.COMPANIES
      ? (request.params.arguments?.companyId as string)
      : (request.params.arguments?.personId as string);

  uri = request.params.arguments?.uri as string;

  // Use either direct ID or URI, with priority to URI if both are provided
  if (uri) {
    try {
      const [uriType, uriId] = parseResourceUri(uri);
      if (uriType !== resourceType) {
        throw new Error(
          `URI type mismatch: Expected ${resourceType}, got ${uriType}`
        );
      }
      id = uriId;
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error : new Error('Invalid URI format'),
        uri,
        'GET',
        { status: 400, message: 'Invalid URI format' }
      );
    }
  } else if (directId) {
    id = directId;
    // For logging purposes
    uri = `attio://${resourceType}/${directId}`;
  } else {
    return createErrorResult(
      new Error('Either companyId/personId or uri parameter is required'),
      `/${resourceType}`,
      'GET',
      { status: 400, message: 'Missing required parameter' }
    );
  }

  try {
    const record = await toolConfig.handler(id);
    const formattedResult = toolConfig.formatResult!(record);

    return formatResponse(formattedResult);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      uri,
      'GET',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}
