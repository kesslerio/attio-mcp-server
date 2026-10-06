import { z } from 'zod';
import { ToolConfig } from '@/handlers/tool-types.js';
import {
  OpenAiCompatibilityService,
  OpenAiSearchParams,
} from '@/services/OpenAiCompatibilityService.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';
import {
  connectorFetchDataSchema,
  connectorFetchResultContract,
  connectorItemDataSchema,
  connectorSearchResultContract,
} from '@/handlers/tools/result-schemas.js';
import { boundedPaginationMetadata } from '@/handlers/tools/result-cursor.js';

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
  const validated = searchParamsValidator.parse(params) as OpenAiSearchParams;
  // The adapter owns the envelope; the handler returns the domain results.
  return await OpenAiCompatibilityService.search(validated);
}

async function handleFetch(params: unknown) {
  const validated = fetchParamsValidator.parse(params);
  return await OpenAiCompatibilityService.fetch(validated.id);
}

/**
 * ChatGPT's connector contract parses the JSON document in content[0], so the
 * text channel keeps its documented shape while structuredContent carries the
 * shared envelope. The projection is derived from the validated envelope, never
 * from formatted prose (KTD4).
 */
const searchTextProjection = (structured: Record<string, unknown>): string =>
  JSON.stringify({ results: structured.data });

const fetchTextProjection = (structured: Record<string, unknown>): string =>
  JSON.stringify(structured.data);

const searchToolConfig: ToolConfig = {
  name: 'search',
  ...connectorSearchResultContract,
  structuredOutput: (results: unknown): Record<string, unknown> => {
    const data = z
      .array(connectorItemDataSchema)
      .parse(results)
      .map((item) =>
        Object.fromEntries(
          Object.entries(item).filter(([, value]) => value !== undefined)
        )
      );
    return {
      data,
      count: data.length,
      next_cursor: null,
      // Connector search is a relevance-ranked provider, not a stable page
      // sequence; disclose the bound instead of fabricating continuation.
      pagination: boundedPaginationMetadata(
        (results as { truncated?: boolean }).truncated ?? true
      ),
    };
  },
  textProjection: searchTextProjection,
  handler: handleSearch,
  // No prose companion: the connector text channel already carries the payload.
  formatResult: () => '',
};

const fetchToolConfig: ToolConfig = {
  name: 'fetch',
  ...connectorFetchResultContract,
  structuredOutput: (result: unknown): Record<string, unknown> => ({
    data: Object.fromEntries(
      Object.entries(connectorFetchDataSchema.parse(result)).filter(
        ([, value]) => value !== undefined
      )
    ),
  }),
  textProjection: fetchTextProjection,
  handler: handleFetch,
  formatResult: () => '',
};

export const openAiToolConfigs = {
  'openai-search': searchToolConfig,
  'openai-fetch': fetchToolConfig,
} as const;

export const openAiToolDefinitions = {
  'openai-search': {
    name: 'search',
    description: formatToolDescription({
      capability:
        'Run lightweight compatibility search across companies, people, lists, and tasks for ChatGPT MCP.',
      boundaries:
        'support complex filters, batch queries, or return rich record payloads (use records_search* tools).',
      constraints:
        'Requires query string (min 1 char); optional type filter; limit up to 25 results per call.',
      recoveryHint:
        'When you need pagination or attribute filtering, switch to records_search or records_search_advanced.',
    }),
    inputSchema: searchInputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
  'openai-fetch': {
    name: 'fetch',
    description: formatToolDescription({
      capability:
        'Return the canonical Attio record payload for a search connector reference.',
      boundaries:
        'perform write operations or resolve IDs not emitted by the search tool.',
      constraints:
        'Accepts identifier generated by search (<resource>:<uuid>) and returns JSON serialized as text.',
      recoveryHint:
        'If fetch fails, rerun search to refresh the identifier or verify the record still exists.',
    }),
    inputSchema: fetchInputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
    },
  },
} as const;
