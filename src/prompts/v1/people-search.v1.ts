/**
 * People Search v1 Prompt
 *
 * Query people with filters (title, company, territory) and return tidy table
 * + IDs for follow-up actions.
 */

import { z } from 'zod';
import { PromptV1Definition, PromptMessage, PromptArgument } from './types.js';
import { UniversalReadArgs } from './types.js';
import { SEARCH_DEFAULTS, PAGINATION } from './constants.js';

/**
 * Argument schema for people_search.v1
 */
export const PeopleSearchArgs = z.object({
  query: z
    .string()
    .min(3)
    .describe("Search query (e.g., 'AE in SF at fintech companies')"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(SEARCH_DEFAULTS.maxLimit)
    .optional()
    .default(SEARCH_DEFAULTS.limit)
    .describe(
      `Maximum results to return (default ${SEARCH_DEFAULTS.limit}, max ${SEARCH_DEFAULTS.maxLimit})`
    ),
  ...UniversalReadArgs,
});

export type PeopleSearchArgsType = z.infer<typeof PeopleSearchArgs>;

/**
 * Argument definitions for registration
 */
export const peopleSearchArguments: PromptArgument[] = [
  {
    name: 'query',
    description: "E.g., 'AE in SF at fintech companies'",
    required: true,
    schema: z.string().min(3),
  },
  {
    name: 'limit',
    description: `Default ${SEARCH_DEFAULTS.limit} (max ${SEARCH_DEFAULTS.maxLimit})`,
    required: false,
    schema: z.number().int().min(1).max(SEARCH_DEFAULTS.maxLimit),
    default: SEARCH_DEFAULTS.limit,
  },
  {
    name: 'format',
    description: 'table | json | ids (default table)',
    required: false,
    schema: z.enum(['table', 'json', 'ids']),
    default: 'table',
  },
  {
    name: 'fields_preset',
    description: 'sales_short | full (default sales_short)',
    required: false,
    schema: z.enum(['sales_short', 'full']),
    default: 'sales_short',
  },
  {
    name: 'verbosity',
    description: 'brief | normal (default brief)',
    required: false,
    schema: z.enum(['brief', 'normal']),
    default: 'brief',
  },
];

/**
 * Build prompt messages for people search
 */
export function buildPeopleSearchMessages(
  args: Record<string, unknown>
): PromptMessage[] {
  const validated = PeopleSearchArgs.parse(args);

  const instructions = `Call \`records.query\` for object='people' with filters derived from "${validated.query}".

Output format=${validated.format}:
- If table: Markdown table with columns: id, name, title, company, email, owner (max ${validated.limit} rows)
- If json: Structured array with same fields
- If ids: Comma-separated list of record IDs only

Fields preset=${validated.fields_preset}:
- sales_short: Only id, name, title, company, email, owner (token-efficient)
- full: Include all available fields

Verbosity=${validated.verbosity}:
- brief: No preamble, just the data
- normal: Brief context + data

Include a "Next actions" section with inline tools for enrichment/outreach.
Append "${PAGINATION.moreAvailableText}" when results exceed ${validated.limit}.`;

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: instructions,
      },
    },
  ];
}

/**
 * Complete prompt definition
 */
export const peopleSearchPrompt: PromptV1Definition = {
  metadata: {
    name: 'people_search.v1',
    title: 'Find people',
    description:
      'Search people by title, company, territory, or free text. Return a compact table with id, name, title, company, email, and owner.',
    category: 'search',
    version: 'v1',
  },
  arguments: peopleSearchArguments,
  buildMessages: buildPeopleSearchMessages,
  tokenBudget: 500, // Per spec
};

export default peopleSearchPrompt;
