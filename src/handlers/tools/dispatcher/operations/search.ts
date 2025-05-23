/**
 * Search operation handlers for tool execution
 * 
 * Handles basic search operations including search, searchByEmail, searchByPhone, and smartSearch
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { createErrorResult } from '../../../../utils/error-handler.js';
import { ResourceType } from '../../../../types/attio.js';
import { SearchToolConfig } from '../../../../types/tool-types.js';
import { formatResponse } from '../../formatters.js';
import { hasResponseData } from '../../error-types.js';

/**
 * Handle common search operations
 *
 * @param toolType - The type of search tool
 * @param searchConfig - The search tool configuration
 * @param searchParam - The search parameter
 * @param resourceType - The resource type being searched
 * @returns Formatted response
 */
export async function handleSearchOperation(
  toolType: string,
  searchConfig: SearchToolConfig,
  searchParam: string,
  resourceType: ResourceType
) {
  try {
    const results = await searchConfig.handler(searchParam);
    const formattedResults = searchConfig.formatResult(results);

    // Check if the formatter already includes a header
    const hasHeader = formattedResults.startsWith('Found ');

    // Format the response based on the tool type and formatted results
    let responseText = '';

    if (hasHeader) {
      // If the formatter already includes a "Found" header, use it as is
      responseText = formattedResults;
    } else {
      // Add a contextual header based on the tool type
      const searchType = toolType.replace('searchBy', '').toLowerCase();
      responseText = `Found ${String(results.length)} ${resourceType} matching ${searchType} "${searchParam}":\n${formattedResults}`;
    }

    return formatResponse(responseText);
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/objects/${resourceType}/records/query`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle basic search operations
 */
export async function handleBasicSearch(
  request: CallToolRequest,
  toolConfig: SearchToolConfig,
  resourceType: ResourceType
) {
  const query = request.params.arguments?.query as string;
  try {
    const results = await toolConfig.handler(query);
    const formattedResults = toolConfig.formatResult(results);

    // Check if the formatter already includes a header to avoid duplication
    const hasHeader =
      typeof formattedResults === 'string' &&
      formattedResults.startsWith('Found ');

    if (hasHeader) {
      // If the formatter already includes a "Found" header, use it as is
      return formatResponse(formattedResults);
    } else {
      // For basic search tools, we need to add the header
      const header = `Found ${results.length} ${resourceType}:`;
      return formatResponse(`${header}\n${formattedResults}`);
    }
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/objects/${resourceType}/records/query`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}

/**
 * Handle searchByEmail operations
 */
export async function handleSearchByEmail(
  request: CallToolRequest,
  toolConfig: SearchToolConfig,
  resourceType: ResourceType
) {
  const email = request.params.arguments?.email as string;
  return handleSearchOperation('searchByEmail', toolConfig, email, resourceType);
}

/**
 * Handle searchByPhone operations
 */
export async function handleSearchByPhone(
  request: CallToolRequest,
  toolConfig: SearchToolConfig,
  resourceType: ResourceType
) {
  const phone = request.params.arguments?.phone as string;
  return handleSearchOperation('searchByPhone', toolConfig, phone, resourceType);
}

/**
 * Handle smartSearch operations
 */
export async function handleSmartSearch(
  request: CallToolRequest,
  toolConfig: SearchToolConfig,
  resourceType: ResourceType
) {
  const query = request.params.arguments?.query as string;
  
  // Validate query parameter
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return createErrorResult(
      new Error('Query parameter is required for smart search and must be a non-empty string'),
      `/objects/${resourceType}/smart-search`,
      'POST',
      { status: 400, message: 'Missing or invalid required parameter: query' }
    );
  }
  
  try {
    const results = await toolConfig.handler(query);
    const formattedResults = toolConfig.formatResult(results);

    // Check if the formatter already includes a header to avoid duplication
    const hasHeader =
      typeof formattedResults === 'string' &&
      formattedResults.startsWith('Found ');

    if (hasHeader) {
      // If the formatter already includes a "Found" header, use it as is
      return formatResponse(formattedResults);
    } else {
      // For smart search tools, we need to add the header
      const header = `Found ${results.length} ${resourceType} (smart search):`;
      return formatResponse(`${header}\n${formattedResults}`);
    }
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/objects/${resourceType}/records/query`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}