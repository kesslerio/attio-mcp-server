/**
 * Search operation handlers for tool execution
 * 
 * Handles basic search operations including search, searchByEmail, searchByPhone, and smartSearch
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { createErrorResult } from '../../../../utils/error-handler.js';
import { ResourceType } from '../../../../types/attio.js';
import { SearchToolConfig } from '../../../tool-types.js';
import { formatResponse } from '../../formatters.js';
import { hasResponseData } from '../../error-types.js';

/**
 * Check if the formatted results already contain a header to avoid duplication
 */
function hasResultHeader(formattedResults: unknown): boolean {
  return typeof formattedResults === 'string' && formattedResults.startsWith('Found ');
}

/**
 * Format search results with appropriate header
 */
function formatSearchResults(
  formattedResults: string,
  results: unknown[],
  resourceType: ResourceType,
  searchContext?: string
): string {
  if (hasResultHeader(formattedResults)) {
    return formattedResults;
  }
  
  const header = searchContext 
    ? `Found ${results.length} ${resourceType} ${searchContext}:`
    : `Found ${results.length} ${resourceType}:`;
  
  return `${header}\n${formattedResults}`;
}

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
    
    const searchType = toolType.replace('searchBy', '').toLowerCase();
    const searchContext = `matching ${searchType} "${searchParam}"`;
    const responseText = formatSearchResults(formattedResults, results, resourceType, searchContext);

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
  let queryFromArgs = request.params.arguments?.query as string;
  const domainFromArgs = request.params.arguments?.domain as string;

  let effectiveQuery = queryFromArgs;

  // If 'query' is not provided, but 'domain' is, and the specific tool being handled is 'search-companies',
  // use the 'domain' value as the query. This makes 'search-companies' more robust to this specific invocation pattern.
  if (effectiveQuery === undefined && domainFromArgs !== undefined && toolConfig.name === 'search-companies') {
    effectiveQuery = domainFromArgs;
    console.warn(
        `[handleBasicSearch] Tool 'search-companies' was called with a 'domain' parameter instead of 'query'. ` +
        `Using the 'domain' value ("${effectiveQuery}") as the search query. ` +
        `For clarity and future compatibility, please use the 'query' parameter for the 'search-companies' tool, ` +
        `or use the 'search-companies-by-domain' tool for explicit domain searches.`
    );
  }

  const query = effectiveQuery; // Use 'query' as the variable name for the rest of the function for minimal changes
  try {
    const results = await toolConfig.handler(query);
    const formattedResults = toolConfig.formatResult(results);
    const responseText = formatSearchResults(formattedResults, results, resourceType);

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
    const responseText = formatSearchResults(formattedResults, results, resourceType, '(smart search)');

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