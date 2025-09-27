/**
 * OpenAI compatibility tool definitions.
 *
 * These wrappers expose the Attio universal search/retrieval capabilities via
 * the constrained `search` and `fetch` tools that OpenAI's MCP client expects.
 * We keep the implementations paper-thin and delegate all heavy lifting to the
 * shared OpenAiCompatibilityService to avoid code duplication.
 */
import { z } from 'zod';
import { ToolConfig } from '../../tool-types.js';
import {
  OpenAiCompatibilityService,
  OpenAiSearchParams,
} from '../../../services/OpenAiCompatibilityService.js';

const searchInputSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  type: z.enum(['companies', 'people', 'lists', 'tasks', 'all']).optional(),
  limit: z.number().int().positive().max(25).optional(),
});

const fetchInputSchema = z.object({
  id: z.string().min(1, 'Identifier is required'),
});

async function handleSearch(params: unknown) {
  try {
    const validated = searchInputSchema.parse(params) as OpenAiSearchParams;
    const results = await OpenAiCompatibilityService.search(validated);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ results }),
        },
      ],
      isError: false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown search error';
    return {
      content: [
        {
          type: 'text',
          text: `Search failed: ${message}`,
        },
      ],
      isError: true,
      error: {
        code: 400,
        message,
        type: 'openai_search_error',
      },
    };
  }
}

async function handleFetch(params: unknown) {
  try {
    const validated = fetchInputSchema.parse(params);
    const result = await OpenAiCompatibilityService.fetch(validated.id);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
      isError: false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown fetch error';
    return {
      content: [
        {
          type: 'text',
          text: `Fetch failed: ${message}`,
        },
      ],
      isError: true,
      error: {
        code: 400,
        message,
        type: 'openai_fetch_error',
      },
    };
  }
}

const searchToolConfig: ToolConfig = {
  name: 'search',
  handler: handleSearch,
  formatResult: (result: { results?: unknown }) =>
    JSON.stringify(result ?? {}, null, 2),
};

const fetchToolConfig: ToolConfig = {
  name: 'fetch',
  handler: handleFetch,
  formatResult: (result: unknown) => JSON.stringify(result ?? {}, null, 2),
};

export const openAiToolConfigs = {
  'openai-search': searchToolConfig,
  'openai-fetch': fetchToolConfig,
} as const;

export const openAiToolDefinitions = {
  'openai-search': {
    name: 'search',
    description: 'Search Attio data by query for OpenAI MCP clients',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string (required)',
        },
        type: {
          type: 'string',
          enum: ['companies', 'people', 'lists', 'tasks', 'all'],
          description: 'Optional resource filter (defaults to all)',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 25,
          description: 'Maximum number of results (default 10)',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  'openai-fetch': {
    name: 'fetch',
    description:
      'Retrieve the detailed content for a prior OpenAI search result',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Identifier returned by the search tool (format: <resource>:<id>)',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
} as const;
