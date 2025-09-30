/**
 * Add to List v1 Prompt
 *
 * Add person/company/deal(s) to a chosen List by exact name or ID.
 */

import { z } from 'zod';
import { PromptV1Definition, PromptMessage, PromptArgument } from './types.js';
import { DryRunArg } from './types.js';

/**
 * Argument schema for add_to_list.v1
 */
export const AddToListArgs = z.object({
  records: z
    .string()
    .min(3)
    .describe('Comma-separated record URLs, IDs, or "search:<query>"'),
  list: z.string().min(2).describe('List name or ID to add records to'),
  dry_run: DryRunArg,
});

export type AddToListArgsType = z.infer<typeof AddToListArgs>;

/**
 * Argument definitions for registration
 */
export const addToListArguments: PromptArgument[] = [
  {
    name: 'records',
    description: 'Comma-separated records or "search:<query>"',
    required: true,
    schema: z.string().min(3),
  },
  {
    name: 'list',
    description: 'List name or ID',
    required: true,
    schema: z.string().min(2),
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
 * Build prompt messages for adding to list
 */
export function buildAddToListMessages(
  args: Record<string, unknown>
): PromptMessage[] {
  const validated = AddToListArgs.parse(args);

  const instructions = `You are a CRM assistant. Add records to list "${validated.list}".

Steps:
1. Resolve records: Parse "${validated.records}" (comma-separated). For each:
   - If URL or ID: use directly
   - If starts with "search:": call \`records.query\` to resolve
   If ambiguous, disambiguate with user.

2. Resolve list: If "${validated.list}" is not a UUID, call \`lists.list\` to find list by name (exact match).

3. Call \`lists.add_entries\` (or \`entries.create\`) with:
   - List ID from step 2
   - Record IDs from step 1 (array)

${validated.dry_run ? 'DRY RUN MODE: Output proposed tool call as JSON only. Do NOT execute write.' : 'Execute the list addition after showing proposed action.'}

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
export const addToListPrompt: PromptV1Definition = {
  metadata: {
    name: 'add_to_list.v1',
    title: 'Add records to list',
    description:
      'Add person/company/deal(s) to a chosen List by exact name or ID.',
    category: 'workflow',
    version: 'v1',
  },
  arguments: addToListArguments,
  buildMessages: buildAddToListMessages,
  tokenBudget: 300, // Per spec
};

export default addToListPrompt;
