/**
 * Create Task v1 Prompt
 *
 * Create a task linked to record(s); natural-language due date; priority/owner.
 */

import { z } from 'zod';
import { PromptV1Definition, PromptMessage, PromptArgument } from './types.js';
import { DryRunArg } from './types.js';

/**
 * Argument schema for create_task.v1
 */
export const CreateTaskArgs = z.object({
  title: z.string().min(3).describe('Task title/subject'),
  content: z.string().min(5).describe('Task description/details'),
  target: z
    .string()
    .optional()
    .describe(
      'Optional: Attio URL, record ID, or "search:<query>" to link task to'
    ),
  due_date: z
    .string()
    .optional()
    .describe('Natural language due date (e.g., "tomorrow", "next Friday")'),
  priority: z
    .enum(['low', 'medium', 'high'])
    .optional()
    .default('medium')
    .describe('Task priority'),
  owner: z
    .string()
    .optional()
    .default('@me')
    .describe('Task assignee (default @me)'),
  dry_run: DryRunArg,
});

export type CreateTaskArgsType = z.infer<typeof CreateTaskArgs>;

/**
 * Argument definitions for registration
 */
export const createTaskArguments: PromptArgument[] = [
  {
    name: 'title',
    description: 'Task title/subject',
    required: true,
    schema: z.string().min(3),
  },
  {
    name: 'content',
    description: 'Task description/details',
    required: true,
    schema: z.string().min(5),
  },
  {
    name: 'target',
    description: 'Optional: Record to link task to',
    required: false,
    schema: z.string(),
  },
  {
    name: 'due_date',
    description: 'Natural language due date',
    required: false,
    schema: z.string(),
  },
  {
    name: 'priority',
    description: 'low | medium | high (default medium)',
    required: false,
    schema: z.enum(['low', 'medium', 'high']),
    default: 'medium',
  },
  {
    name: 'owner',
    description: 'Task assignee (default @me)',
    required: false,
    schema: z.string(),
    default: '@me',
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
 * Build prompt messages for creating task
 */
export function buildCreateTaskMessages(
  args: Record<string, unknown>
): PromptMessage[] {
  const validated = CreateTaskArgs.parse(args);

  const targetResolution = validated.target
    ? `\n1. Resolve target: If target="${validated.target}" starts with "search:", call \`records_query\` to find one record. If multiple matches, disambiguate.`
    : '';

  const dueDateParsing = validated.due_date
    ? `\n- Parse due_date="${validated.due_date}" into ISO date format`
    : '';

  const instructions = `You are a CRM assistant. Create a task with:
- Title: "${validated.title}"
- Content: "${validated.content}"
- Priority: ${validated.priority}
- Owner: ${validated.owner}${dueDateParsing}${targetResolution}

${targetResolution ? '2' : '1'}. Call \`tasks.create\` with:
   - title, content (required)
   - assignees: [owner]
   - deadline: parsed due_date (if provided)
   - linked_records: [resolved target] (if provided)

${validated.dry_run ? 'DRY RUN MODE: Output proposed tool call as JSON only. Do NOT execute write.' : 'Execute the task creation after showing proposed action.'}

Confirm completion or show proposed task.`;

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
export const createTaskPrompt: PromptV1Definition = {
  metadata: {
    name: 'create_task.v1',
    title: 'Create follow-up task',
    description:
      'Create a task linked to record(s); natural-language due date; priority/owner.',
    category: 'activity',
    version: 'v1',
  },
  arguments: createTaskArguments,
  buildMessages: buildCreateTaskMessages,
  tokenBudget: 300, // Per spec
};

export default createTaskPrompt;
