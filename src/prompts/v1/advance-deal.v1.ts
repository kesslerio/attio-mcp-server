/**
 * Advance Deal v1 Prompt
 *
 * Move a deal to a target stage with optional next action + task creation.
 */

import { z } from 'zod';
import { PromptV1Definition, PromptMessage, PromptArgument } from './types.js';
import { DryRunArg } from './types.js';

/**
 * Argument schema for advance_deal.v1
 */
export const AdvanceDealArgs = z.object({
  deal: z.string().min(3).describe('Deal URL, ID, or "search:<query>"'),
  target_stage: z
    .string()
    .min(2)
    .describe('Target stage name (e.g., "Qualified", "Proposal Sent")'),
  create_task: z
    .boolean()
    .optional()
    .default(false)
    .describe('Create a next-action task after advancing'),
  dry_run: DryRunArg,
});

export type AdvanceDealArgsType = z.infer<typeof AdvanceDealArgs>;

/**
 * Argument definitions for registration
 */
export const advanceDealArguments: PromptArgument[] = [
  {
    name: 'deal',
    description: 'Deal URL, ID, or "search:<query>"',
    required: true,
    schema: z.string().min(3),
  },
  {
    name: 'target_stage',
    description: 'Target stage name',
    required: true,
    schema: z.string().min(2),
  },
  {
    name: 'create_task',
    description: 'Create next-action task (default false)',
    required: false,
    schema: z.boolean(),
    default: false,
  },
  {
    name: 'dry_run',
    description: "Only propose, don't execute (default false)",
    required: false,
    schema: z.boolean(),
    default: false,
  },
];

/**
 * Build prompt messages for advancing deal
 */
export function buildAdvanceDealMessages(
  args: Record<string, unknown>
): PromptMessage[] {
  const validated = AdvanceDealArgs.parse(args);

  const instructions = `You are a CRM assistant. Advance deal "${validated.deal}" to stage "${validated.target_stage}".

Steps:
1. Resolve deal: If starts with "search:", call \`records_query\` to find one deal. If multiple matches, disambiguate.

2. Call \`deals.update\` (or \`records.update\` for object='deals') with:
   - Record ID from step 1
   - stage: "${validated.target_stage}"

3. ${validated.create_task ? 'Suggest a concrete next-action task based on the new stage and, only on approval, call `tasks.create`.' : 'No follow-up task needed.'}

${validated.dry_run ? 'DRY RUN MODE: Output proposed tool calls as JSON only. Do NOT execute writes.' : 'Execute the stage change after showing proposed action.'}

Confirm completion or show proposed changes.`;

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
export const advanceDealPrompt: PromptV1Definition = {
  metadata: {
    name: 'advance_deal.v1',
    title: 'Advance a deal stage',
    description:
      'Move a deal to a target stage with optional next action + task creation.',
    category: 'workflow',
    version: 'v1',
  },
  arguments: advanceDealArguments,
  buildMessages: buildAdvanceDealMessages,
  tokenBudget: 350, // Per spec
};

export default advanceDealPrompt;
