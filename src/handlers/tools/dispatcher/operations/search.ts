/**
 * Search operation handlers for tool execution
 *
 * Handles basic search operations including search, searchByEmail, searchByPhone, and smartSearch
 */

import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { ResourceType } from '../../../../types/attio.js';
import { createErrorResult } from '../../../../utils/error-handler.js';
import type { SearchToolConfig } from '../../../tool-types.js';
import { hasResponseData } from '../../error-types.js';
import { formatResponse } from '../../formatters.js';

/**
 * Check if the formatted results already contain a header to avoid duplication
 */
function hasResultHeader(formattedResults: unknown): boolean {
  return (
    typeof formattedResults === 'string' &&
    formattedResults.startsWith('Found ')
  );
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
    const responseText = formatSearchResults(
      formattedResults,
      results,
      resourceType,
      searchContext
    );

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
  const queryFromArgs = request.params.arguments?.query as string;
  const domainFromArgs = request.params.arguments?.domain as string;

  let effectiveQuery = queryFromArgs;

  // If 'query' is not provided, but 'domain' is, and the specific tool being handled is 'search-companies',
  // use the 'domain' value as the query. This makes 'search-companies' more robust to this specific invocation pattern.
  if (
    effectiveQuery === undefined &&
    domainFromArgs !== undefined &&
    toolConfig.name === 'search-companies'
  ) {
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
    const responseText = formatSearchResults(
      formattedResults,
      results,
      resourceType
    );

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
  return handleSearchOperation(
    'searchByEmail',
    toolConfig,
    email,
    resourceType
  );
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
  return handleSearchOperation(
    'searchByPhone',
    toolConfig,
    phone,
    resourceType
  );
}

/**
 * Handle searchByDomain operations
 */
export async function handleSearchByDomain(
  request: CallToolRequest,
  toolConfig: SearchToolConfig,
  resourceType: ResourceType
) {
  const domain = request.params.arguments?.domain as string;
  return handleSearchOperation(
    'searchByDomain',
    toolConfig,
    domain,
    resourceType
  );
}

/**
 * Handle searchByCompany operations
 */
export async function handleSearchByCompany(
  request: CallToolRequest,
  toolConfig: SearchToolConfig,
  resourceType: ResourceType
) {
  const companyFilter = request.params.arguments?.companyFilter;

  // Extract company identifier from filter
  let companyIdentifier: string;
  if (typeof companyFilter === 'string') {
    companyIdentifier = companyFilter;
  } else if (typeof companyFilter === 'object' && companyFilter !== null) {
    // Handle object format with filters array
    if (
      'filters' in companyFilter &&
      Array.isArray(companyFilter.filters) &&
      companyFilter.filters.length > 0
    ) {
      const firstFilter = companyFilter.filters[0];
      if (
        typeof firstFilter === 'object' &&
        firstFilter !== null &&
        'value' in firstFilter
      ) {
        const value = firstFilter.value;
        // Extract record_id if it's an object with record_id, otherwise use the value directly
        if (
          typeof value === 'object' &&
          value !== null &&
          'record_id' in value
        ) {
          companyIdentifier = value.record_id as string;
        } else {
          companyIdentifier = String(value);
        }
      } else {
        throw new Error('Invalid filter structure in companyFilter');
      }
    } else if ('value' in companyFilter) {
      // Handle direct value format
      const value = companyFilter.value;
      if (typeof value === 'object' && value !== null && 'record_id' in value) {
        companyIdentifier = value.record_id as string;
      } else {
        companyIdentifier = String(value);
      }
    } else {
      throw new Error(
        'Invalid companyFilter format: missing filters array or value'
      );
    }
  } else if (Array.isArray(companyFilter) && companyFilter.length > 0) {
    // Handle array format - use the first valid filter
    const firstFilter = companyFilter[0];
    if (
      typeof firstFilter === 'object' &&
      firstFilter !== null &&
      'value' in firstFilter
    ) {
      const value = firstFilter.value;
      if (typeof value === 'object' && value !== null && 'record_id' in value) {
        companyIdentifier = value.record_id as string;
      } else {
        companyIdentifier = String(value);
      }
    } else {
      companyIdentifier = String(firstFilter);
    }
  } else {
    throw new Error('Invalid companyFilter format');
  }
  return handleSearchOperation(
    'searchByCompany',
    toolConfig,
    companyIdentifier,
    resourceType
  );
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
      new Error(
        'Query parameter is required for smart search and must be a non-empty string'
      ),
      `/objects/${resourceType}/smart-search`,
      'POST',
      { status: 400, message: 'Missing or invalid required parameter: query' }
    );
  }

  try {
    const results = await toolConfig.handler(query);
    const formattedResults = toolConfig.formatResult(results);
    const responseText = formatSearchResults(
      formattedResults,
      results,
      resourceType,
      '(smart search)'
    );

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
