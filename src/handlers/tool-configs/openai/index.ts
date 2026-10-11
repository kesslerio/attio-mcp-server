import { defineOperationTool } from '@/handlers/tools/operation-descriptor.js';
import { z } from 'zod';
import { ToolConfig } from '@/handlers/tool-types.js';
import {
  OpenAiCompatibilityService,
  OpenAiSearchParams,
} from '@/services/OpenAiCompatibilityService.js';
import {
  connectorFetchDataSchema,
  connectorFetchResultContract,
  connectorItemDataSchema,
  connectorSearchResultContract,
} from '@/handlers/tools/result-schemas.js';
import { boundedPaginationMetadata } from '@/handlers/tools/result-cursor.js';
import { validateConnectorSearchControls } from '@/services/search/search-input-validation.js';

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
      description:
        'Select companies, people, or lists; all (the default) searches those three resources. Task text queries are unsupported.',
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
  validateConnectorSearchControls(params);
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
  'openai-search': defineOperationTool({
    name: 'search',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        action: 'search',
        resourceTypes: ['companies', 'people', 'lists'],
        readOnly: true,
        destructive: false,
        idempotent: true,
        pagination: { kind: 'offset', supported: false, cap: 25 },
      },
      guidance: {
        capability: 'Connector text search (e.g. ChatGPT).',
        boundaries:
          'accept filters, sorting, search_type, fields, match_type, batches or rich records.',
        constraints:
          'Requires query. Omitted type/all searches companies/people/lists; select one to narrow. Tasks excluded; explicit task queries fail before upstream. Results carry metadata.resource_type; total limit 25.',
        recovery:
          'Refine and repeat; full-mode records_search provides attribute filtering and continuation. See docs/universal-tools/api-reference.md#connector-search-guidance.',
        alternatives: ['fetch', 'records_search'],
      },
    },
    inputSchema: searchInputSchema,
  }),
  'openai-fetch': defineOperationTool({
    name: 'fetch',
    facts: {
      operation: {
        customObjectSlugs: false,
        authRequired: true,
        pagination: { kind: 'none', supported: false, cap: null },
        action: 'read',
        resourceTypes: ['companies', 'people', 'lists', 'tasks'],
        readOnly: true,
        destructive: false,
        idempotent: true,
      },
      guidance: {
        capability:
          'Return the canonical record payload for a reference emitted by search.',
        boundaries:
          'perform writes, or resolve identifiers that search did not emit.',
        constraints:
          'Accepts a <resource>:<uuid> identifier and serializes JSON as text.',
        recovery: 'Re-run search to refresh the identifier, then fetch again.',
        alternatives: ['search', 'records_get_details'],
      },
    },
    inputSchema: fetchInputSchema,
  }),
} as const;
