import { z } from 'zod';
import { ToolConfig } from '../../tool-types.js';
import {
  OpenAiCompatibilityService,
  OpenAiSearchParams,
} from '../../../services/OpenAiCompatibilityService.js';

const searchParamsValidator = z.object({
  query: z.string().min(1, 'Query is required'),
  type: z.enum(['companies', 'people', 'lists', 'tasks', 'all']).optional(),
  limit: z.number().int().positive().max(25).optional(),
});

const fetchParamsValidator = z.object({
  id: z.string().min(1, 'Identifier is required'),
});

const searchInputSchema = {
  type: 'object' as const,
  properties: {
    query: {
      type: 'string' as const,
      description: 'Search query string (required).',
    },
    type: {
      type: 'string' as const,
      enum: ['companies', 'people', 'lists', 'tasks', 'all'] as const,
      description: 'Optional resource filter (defaults to all).',
    },
    limit: {
      type: 'integer' as const,
      minimum: 1,
      maximum: 25,
      description: 'Maximum number of results to return (default 10).',
    },
  },
  required: ['query'] as const,
  additionalProperties: false,
};

const fetchInputSchema = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string' as const,
      description: 'Identifier emitted by the search tool (<resource>:<id>).',
    },
  },
  required: ['id'] as const,
  additionalProperties: false,
};

async function handleSearch(params: unknown) {
  try {
    const validated = searchParamsValidator.parse(params) as OpenAiSearchParams;
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
    const validated = fetchParamsValidator.parse(params);
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
    description: 'Search Attio data by query for OpenAI MCP clients.',
    inputSchema: searchInputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  'openai-fetch': {
    name: 'fetch',
    description: 'Retrieve the full record payload for a search result ID.',
    inputSchema: fetchInputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
} as const;
