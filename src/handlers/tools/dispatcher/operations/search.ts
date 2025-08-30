/**
 * Search operation handlers for tool execution
 *
 * Handles basic search operations including search, searchByEmail, searchByPhone, and smartSearch
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

import { createErrorResult } from '../../../../utils/error-handler.js';
import { formatResponse } from '../../formatters.js';
import { hasResponseData } from '../../error-types.js';
import { ResourceType } from '../../../../types/attio.js';
import { SearchToolConfig } from '../../../tool-types.js';

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

      formattedResults,
      results,
      resourceType,
      searchContext
    );

    return formatResponse(responseText);
  } catch (error: unknown) {
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

  let effectiveQuery = queryFromArgs;

  // If 'query' is not provided, but 'domain' is, and the specific tool being handled is 'search-companies',
  // use the 'domain' value as the query. This makes 'search-companies' more robust to this specific invocation pattern.
  if (
    effectiveQuery === undefined &&
    domainFromArgs !== undefined &&
    toolConfig.name === 'search-records'
  ) {
    effectiveQuery = domainFromArgs;
    console.warn(
      `[handleBasicSearch] Tool 'search-records' was called with a 'domain' parameter instead of 'query'. ` +
        `Using the 'domain' value ("${effectiveQuery}") as the search query. ` +
        `For clarity and future compatibility, please use the 'query' parameter for the 'search-records' tool, ` +
        `or use domain-specific search parameters for explicit domain searches.`
    );
  }

  try {
      formattedResults,
      results,
      resourceType
    );

    return formatResponse(responseText);
  } catch (error: unknown) {
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
      if (
        typeof firstFilter === 'object' &&
        firstFilter !== null &&
        'value' in firstFilter
      ) {
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
    if (
      typeof firstFilter === 'object' &&
      firstFilter !== null &&
      'value' in firstFilter
    ) {
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
      formattedResults,
      results,
      resourceType,
      '(smart search)'
    );

    return formatResponse(responseText);
  } catch (error: unknown) {
    return createErrorResult(
      error instanceof Error ? error : new Error('Unknown error'),
      `/objects/${resourceType}/records/query`,
      'POST',
      hasResponseData(error) ? error.response.data : {}
    );
  }
}
