/**
 * Pipeline Health v1 Prompt
 *
 * Weekly pipeline recap: owner/segment-scoped snapshot (created/won/slipped)
 * with risk flags and recommended actions.
 */

import { z } from 'zod';
import { PromptV1Definition, PromptMessage, PromptArgument } from './types.js';
import { UniversalReadArgs } from './types.js';
import { SEARCH_DEFAULTS } from './constants.js';

/**
 * Argument schema for pipeline_health.v1
 */
export const PipelineHealthArgs = z.object({
  owner: z
    .string()
    .optional()
    .default(SEARCH_DEFAULTS.ownerDefault)
    .describe('Owner filter (default @me)'),
  timeframe: z
    .string()
    .optional()
    .default(SEARCH_DEFAULTS.timeframeDefault)
    .describe('Timeframe for analysis (default 30d)'),
  segment: z.string().optional().describe('Optional segment/pipeline filter'),
  ...UniversalReadArgs,
});

export type PipelineHealthArgsType = z.infer<typeof PipelineHealthArgs>;

/**
 * Argument definitions for registration
 */
export const pipelineHealthArguments: PromptArgument[] = [
  {
    name: 'owner',
    description: 'Owner filter (default @me)',
    required: false,
    schema: z.string(),
    default: SEARCH_DEFAULTS.ownerDefault,
  },
  {
    name: 'timeframe',
    description: 'Timeframe (default 30d)',
    required: false,
    schema: z.string(),
    default: SEARCH_DEFAULTS.timeframeDefault,
  },
  {
    name: 'segment',
    description: 'Optional segment/pipeline filter',
    required: false,
    schema: z.string(),
  },
  {
    name: 'format',
    description: 'table | json (default table)',
    required: false,
    schema: z.enum(['table', 'json']),
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
 * Build prompt messages for pipeline health
 */
export function buildPipelineHealthMessages(
  args: Record<string, unknown>
): PromptMessage[] {
  const validated = PipelineHealthArgs.parse(args);

  const segmentFilter = validated.segment
    ? ` and segment="${validated.segment}"`
    : '';

  const instructions = `Goal: Create a pipeline health snapshot for owner="${validated.owner}" over the last ${validated.timeframe}${segmentFilter}.

Steps:
1. Call \`deals.list\` or \`records_query\` for deals matching: owner="${validated.owner}", modified_date within ${validated.timeframe}${segmentFilter}

2. Analyze and categorize deals:
   - Created: New deals in timeframe
   - Won: Deals moved to "Closed Won"
   - Slipped: Deals past close_date still open
   - At Risk: Deals with no activity in >14 days

3. Output format=${validated.format}:
   - If table: Markdown sections: "Summary Metrics", "Risk Flags", "Top Priorities", "Recommended Actions"
   - If json: Structured object with same sections

Fields preset=${validated.fields_preset}:
- sales_short: Counts and key deals only (token-efficient)
- full: Include all deal details

Verbosity=${validated.verbosity}:
- brief: Metrics + bullet points
- normal: Narrative analysis + metrics

Include "Recommended Actions" with 3-5 specific next steps based on risk flags.`;

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
export const pipelineHealthPrompt: PromptV1Definition = {
  metadata: {
    name: 'pipeline_health.v1',
    title: 'Weekly pipeline recap',
    description:
      'Owner/segment-scoped snapshot (created/won/slipped; risk flags) with recommended actions.',
    category: 'analysis',
    version: 'v1',
  },
  arguments: pipelineHealthArguments,
  buildMessages: buildPipelineHealthMessages,
  tokenBudget: 700, // Per spec
};

export default pipelineHealthPrompt;
