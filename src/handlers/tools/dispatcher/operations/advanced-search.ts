/**
 * Advanced search operation handlers for tool execution
 *
 * Handles advanced search operations with complex filter structures
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ListEntryFilters } from '../../../../api/operations/index.js';
import { ResourceType } from '../../../../types/attio.js';
import { createErrorResult } from '../../../../utils/error-handler.js';
import { AdvancedSearchToolConfig } from '../../../tool-types.js';
import { hasResponseData } from '../../error-types.js';
import { formatResponse } from '../../formatters.js';

/**
 * Handle advanced search operations
 *
 * @param request - The MCP tool request
 * @param toolConfig - The advanced search tool configuration
 * @param resourceType - The resource type being searched
 * @returns Formatted response
 */
export async function handleAdvancedSearch(
  request: CallToolRequest,
  toolConfig: AdvancedSearchToolConfig,
  resourceType: ResourceType
) {
  const filters = request.params.arguments?.filters as ListEntryFilters;
  const limit = request.params.arguments?.limit as number | undefined;
  const offset = request.params.arguments?.offset as number | undefined;

  // Validate filters parameter
  if (!filters) {
    return createErrorResult(
      new Error(
        'Filters parameter is required for advanced search. Expected a filters object with a "filters" array property.'
      ),
      `/objects/${resourceType}/advanced-search`,
      'POST',
      {
        status: 400,
        message: 'Missing required parameter: filters',
        example: {
          filters: {
            filters: [
              {
                attribute: { slug: 'name' },
                condition: 'contains',
                value: 'Company Inc',
              },
            ],
          },
        },
      }
    );
  }

  // Ensure filters is not null/undefined and has proper structure
  if (
    typeof filters !== 'object' ||
    filters === null ||
    !('filters' in filters)
  ) {
    return createErrorResult(
      new Error(
        'Invalid filters format. Expected an object with a "filters" array property.'
      ),
      `/objects/${resourceType}/advanced-search`,
      'POST',
      {
        status: 400,
        message: 'Invalid filters format',
        received: filters,
        example: {
          filters: {
            filters: [
              {
                attribute: { slug: 'name' },
                condition: 'contains',
                value: 'Company Inc',
              },
            ],
          },
        },
      }
    );
  }

  try {
    const results = await toolConfig.handler(filters, limit, offset);
    const formattedResults = toolConfig.formatResult(results);

    return formatResponse(formattedResults);
  } catch (error) {
    // If it's a specific validation error, preserve the detailed message
    if (
      error instanceof Error &&
      error.message.includes('Filter') &&
      error.message.includes('invalid')
    ) {
      return createErrorResult(
        error,
        `/objects/${resourceType}/advanced-search`,
        'POST',
        {
          status: 400,
          message: error.message,
          hint: 'Check your filter structure and ensure all required fields are present.',
        }
      );
    }

    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/objects/${resourceType}/records/query`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}
