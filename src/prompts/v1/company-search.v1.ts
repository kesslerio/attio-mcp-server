/**
 * Company Search v1 Prompt
 *
 * Query companies by domain, plan, segment with slim fields for decisioning.
 */

import { z } from 'zod';
import { PromptV1Definition, PromptMessage, PromptArgument } from './types.js';
import { UniversalReadArgs } from './types.js';
import { SEARCH_DEFAULTS, PAGINATION } from './constants.js';

/**
 * Argument schema for company_search.v1
 */
export const CompanySearchArgs = z.object({
  query: z
    .string()
    .min(3)
    .describe(
      "Search query (e.g., 'fintech companies in SF with >100 employees')"
    ),
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

export type CompanySearchArgsType = z.infer<typeof CompanySearchArgs>;

/**
 * Argument definitions for registration
 */
export const companySearchArguments: PromptArgument[] = [
  {
    name: 'query',
    description: "E.g., 'fintech companies in SF'",
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
 * Build prompt messages for company search
 */
export function buildCompanySearchMessages(
  args: Record<string, unknown>
): PromptMessage[] {
  const validated = CompanySearchArgs.parse(args);

  const instructions = `Call \`records.query\` for object='companies' with filters derived from "${validated.query}".

Output format=${validated.format}:
- If table: Markdown table with columns: id, name, domain, industry, employee_count, region, owner (max ${validated.limit} rows)
- If json: Structured array with same fields
- If ids: Comma-separated list of record IDs only

Fields preset=${validated.fields_preset}:
- sales_short: Only id, name, domain, industry, employee_count, region, owner (token-efficient)
- full: Include all available fields

Verbosity=${validated.verbosity}:
- brief: No preamble, just the data
- normal: Brief context + data

Include a "Next actions" section with inline tools for analysis/outreach.
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
export const companySearchPrompt: PromptV1Definition = {
  metadata: {
    name: 'company_search.v1',
    title: 'Find companies',
    description:
      'Query companies by domain, plan, segment with slim fields. Returns compact table with id, name, domain, industry, employee_count.',
    category: 'search',
    version: 'v1',
  },
  arguments: companySearchArguments,
  buildMessages: buildCompanySearchMessages,
  tokenBudget: 500, // Per spec
};

export default companySearchPrompt;
