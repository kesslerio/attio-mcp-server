/**
 * Add to List v1 Prompt
 *
 * Add person/company record(s) to a chosen List by exact name or ID.
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
    .describe('Comma-separated person/company URLs, IDs, or "search:<query>"'),
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
    description: 'Comma-separated person/company records or "search:<query>"',
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
   - If starts with "search:": call \`search_records\` with the right resource_type to resolve
   - Only companies and people are supported for list-entry adds. If a deal is requested, explain that this list tool cannot add deals and STOP.
   If ambiguous, disambiguate with user.

2. Resolve list: If "${validated.list}" is not a UUID, call \`search_records\` with resource_type="lists" to find one list by exact name.

3. Call \`manage-list-entry\` with Mode 1 (add) parameters:
   - List ID from step 2
   - Each record ID from step 1
   - objectType matching each record's supported resource type ("companies" or "people")

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
