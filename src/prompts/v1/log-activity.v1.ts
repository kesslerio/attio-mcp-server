/**
 * Log Activity v1 Prompt
 *
 * Append a call/meeting note/email summary to a Person, Company, or Deal
 * by URL/ID or quick search.
 */

import { z } from 'zod';
import { PromptV1Definition, PromptMessage, PromptArgument } from './types.js';
import { DryRunArg } from './types.js';

/**
 * Argument schema for log_activity.v1
 */
export const LogActivityArgs = z.object({
  target: z
    .string()
    .min(3)
    .describe('Attio URL, record ID, or "search:<query>"'),
  type: z
    .enum(['call', 'meeting', 'email', 'note'])
    .describe('Type of activity to log'),
  summary: z.string().min(5).describe('Plain-text synopsis of the activity'),
  visibility: z
    .enum(['internal', 'shared'])
    .optional()
    .default('internal')
    .describe('Visibility setting'),
  create_follow_up: z
    .boolean()
    .optional()
    .default(false)
    .describe('If true, prompt will suggest a follow-up task'),
  dry_run: DryRunArg,
});

export type LogActivityArgsType = z.infer<typeof LogActivityArgs>;

/**
 * Argument definitions for registration
 */
export const logActivityArguments: PromptArgument[] = [
  {
    name: 'target',
    description: 'Attio URL, ID, or "search:<query>"',
    required: true,
    schema: z.string().min(3),
  },
  {
    name: 'type',
    description: 'call | meeting | email | note',
    required: true,
    schema: z.enum(['call', 'meeting', 'email', 'note']),
  },
  {
    name: 'summary',
    description: 'Plain-text activity synopsis',
    required: true,
    schema: z.string().min(5),
  },
  {
    name: 'visibility',
    description: 'internal | shared (default internal)',
    required: false,
    schema: z.enum(['internal', 'shared']),
    default: 'internal',
  },
  {
    name: 'create_follow_up',
    description: 'Suggest follow-up task (default false)',
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
 * Build prompt messages for logging activity
 */
export function buildLogActivityMessages(
  args: Record<string, unknown>
): PromptMessage[] {
  const validated = LogActivityArgs.parse(args);

  const instructions = `You are a CRM assistant. Log a ${validated.type} activity to "${validated.target}".

Steps:
1. Resolve target: If starts with "search:", call \`records_query\` to find one record (prefer exact domain/email or name match). If multiple matches, list up to 5 for disambiguation and STOP.

2. Create activity note: Call \`notes.create\` (or appropriate write tool) with:
   - Type: ${validated.type}
   - Summary: "${validated.summary}"
   - Visibility: ${validated.visibility}
   - Link to resolved record

3. ${validated.create_follow_up ? 'Suggest a concrete follow-up task and, only on approval, call `tasks.create`.' : 'No follow-up task needed.'}

${validated.dry_run ? 'DRY RUN MODE: Output proposed tool calls as JSON only. Do NOT execute writes.' : 'Execute the writes after showing proposed actions.'}

Keep response concise. Confirm completion or show proposed changes.`;

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
export const logActivityPrompt: PromptV1Definition = {
  metadata: {
    name: 'log_activity.v1',
    title: 'Log a call or note',
    description:
      'Append a call/meeting note/email summary to a Person, Company, or Deal. Asks for confirmation before write.',
    category: 'activity',
    version: 'v1',
  },
  arguments: logActivityArguments,
  buildMessages: buildLogActivityMessages,
  tokenBudget: 300, // Per spec
};

export default logActivityPrompt;
