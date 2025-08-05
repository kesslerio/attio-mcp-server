/**
 * OpenAI-compliant search tool implementation
 * Transforms Attio search results to match OpenAI's required format
 */

import { getAttioClient } from '../api/attio-client.js';
import { executeToolRequest } from '../handlers/tools/dispatcher.js';
// import { createErrorResult } from '../utils/response-formatter.js';
import { debug, warn } from '../utils/logger.js';
import { transformToSearchResult } from './transformers/index.js';
import type { OpenAISearchResult, SupportedAttioType } from './types.js';

/**
 * Search for records across all Attio object types
 * @param query - Search query string
 * @returns Array of search results in OpenAI format
 */
export async function search(query: string): Promise<OpenAISearchResult[]> {
  if (!query || typeof query !== 'string') {
    throw new Error('Query parameter is required and must be a string');
  }

  debug('OpenAI', 'Starting search with query', { query }, 'search');

  const results: OpenAISearchResult[] = [];
  const resourceTypes: SupportedAttioType[] = [
    'companies',
    'people',
    'lists',
    'tasks',
  ];

  // Search across all resource types in parallel
  const searchPromises = resourceTypes.map(async (resourceType) => {
    try {
      // Use the universal search-records tool
      const request = {
        method: 'tools/call' as const,
        params: {
          name: 'search-records',
          arguments: {
            resource_type: resourceType,
            query,
            limit: 10, // Limit per resource type
          },
        },
      };

      const result = await executeToolRequest(request);

      // Check the result structure
      debug(
        'OpenAI',
        `Search result structure for ${resourceType}`,
        {
          hasContent: !!result.content,
          contentType: result.content?.[0]?.type,
          contentLength: result.content?.[0]?.text?.length,
          isArray: Array.isArray(result),
          hasToolResult: !!result.toolResult,
        },
        'search'
      );

      if (result.content && result.content[0]?.type === 'text') {
        // Parse the text response to extract records
        const records = parseSearchResponse(result.content[0].text);

        // Transform each record to OpenAI format
        for (const record of records) {
          const transformed = transformToSearchResult(record, resourceType);
          if (transformed) {
            results.push(transformed);
          }
        }
      }
    } catch (error: any) {
      warn(`[OpenAI Search] Failed to search ${resourceType}:`, error);
      // Continue with other resource types
    }
  });

  await Promise.all(searchPromises);

  // Sort by relevance (can be improved with scoring)
  results.sort((a, b) => {
    // Prioritize exact matches in title
    const aScore = a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
    const bScore = b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
    return bScore - aScore;
  });

  // Limit total results
  const maxResults = 20;
  const finalResults = results.slice(0, maxResults);

  debug(
    'OpenAI',
    `Found ${finalResults.length} results`,
    { count: finalResults.length },
    'search'
  );
  return finalResults;
}

/**
 * Parse the text response from universal search tool
 * @param content - Text content from tool response
 * @returns Array of parsed records
 */
function parseSearchResponse(content: string): any[] {
  try {
    // The universal tools return formatted text like:
    // "Found 130 records:
    // 1. Company Name (website) (ID: uuid)"
    const records: any[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Match lines that look like: "1. Name (details) (ID: uuid)"
      const match = line.match(/^\d+\.\s+(.+?)\s*\(ID:\s*([a-f0-9-]+)\)/);
      if (match) {
        const [, nameAndDetails, recordId] = match;

        // Extract name and other details
        let name = nameAndDetails;
        let website = '';
        let email = '';

        // Extract website or email from parentheses
        const detailsMatch = nameAndDetails.match(/^(.+?)\s*\(([^)]+)\)/);
        if (detailsMatch) {
          name = detailsMatch[1].trim();
          const details = detailsMatch[2];

          if (details.includes('@')) {
            email = details;
          } else if (details.includes('http') || details.includes('.com')) {
            website = details;
          }
        }

        const record: any = {
          id: { record_id: recordId },
          values: {
            name: [{ value: name }],
          },
        };

        if (website) {
          record.values.website = [{ value: website }];
        }
        if (email) {
          record.values.email_addresses = [{ value: email }];
        }

        records.push(record);
      }
    }

    return records;
  } catch (error: any) {
    warn('[OpenAI Search] Failed to parse search response:', error);
    return [];
  }
}

/**
 * Alternative search implementation using direct API calls
 * (Fallback if universal tools are not available)
 */
export async function searchDirect(
  query: string
): Promise<OpenAISearchResult[]> {
  const client = getAttioClient();
  const results: OpenAISearchResult[] = [];

  try {
    // Search companies
    const companiesResponse = await client.post(
      '/objects/companies/records/query',
      {
        filter: {
          $or: [
            { 'name.value': { $contains: query } },
            { 'domains.value': { $contains: query } },
          ],
        },
        limit: 10,
      }
    );

    for (const company of companiesResponse.data.data || []) {
      const transformed = transformToSearchResult(company, 'companies');
      if (transformed) {
        results.push(transformed);
      }
    }

    // Search people
    const peopleResponse = await client.post('/objects/people/records/query', {
      filter: {
        $or: [
          { 'name.value': { $contains: query } },
          { 'email_addresses.value': { $contains: query } },
        ],
      },
      limit: 10,
    });

    for (const person of peopleResponse.data.data || []) {
      const transformed = transformToSearchResult(person, 'people');
      if (transformed) {
        results.push(transformed);
      }
    }
  } catch (error: any) {
    warn('[OpenAI Search] Direct search failed:', error);
  }

  return results;
}
