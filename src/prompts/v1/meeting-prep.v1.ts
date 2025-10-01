/**
 * Meeting Prep v1 Prompt
 *
 * Summarize last notes, open tasks, related deals, and suggested agenda
 * for a contact/company (360° prep sheet).
 */

import { z } from 'zod';
import { PromptV1Definition, PromptMessage, PromptArgument } from './types.js';
import { UniversalReadArgs } from './types.js';

/**
 * Argument schema for meeting_prep.v1
 */
export const MeetingPrepArgs = z.object({
  target: z
    .string()
    .min(3)
    .describe('Attio URL, record ID, or "search:<query>" for contact/company'),
  ...UniversalReadArgs,
});

export type MeetingPrepArgsType = z.infer<typeof MeetingPrepArgs>;

/**
 * Argument definitions for registration
 */
export const meetingPrepArguments: PromptArgument[] = [
  {
    name: 'target',
    description: 'Attio URL, ID, or "search:<query>"',
    required: true,
    schema: z.string().min(3),
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
 * Build prompt messages for meeting prep
 */
export function buildMeetingPrepMessages(
  args: Record<string, unknown>
): PromptMessage[] {
  const validated = MeetingPrepArgs.parse(args);

  const instructions = `Goal: Create a 360° meeting prep sheet for ${validated.target}.

Steps:
1. Resolve target: If starts with "search:", call \`records_query\` to find one Person or Company record (prefer exact domain/email or name match). If multiple matches, list up to 5 for disambiguation and STOP.

2. Gather context (call these in parallel):
   - \`notes.list\` for the record (last 5 notes)
   - \`tasks.list\` for the record (open tasks only)
   - \`deals.list\` for related deals (active deals)

3. Output format=${validated.format}:
   - If table: Markdown sections: "Contact Info", "Recent Notes", "Open Tasks", "Active Deals", "Suggested Agenda"
   - If json: Structured object with same sections

Fields preset=${validated.fields_preset}:
- sales_short: Key fields only (token-efficient)
- full: Include all available context

Verbosity=${validated.verbosity}:
- brief: Bullet points only
- normal: Brief narrative + bullets

Include "Suggested Agenda" with 3-5 discussion topics based on recent activity.`;

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
export const meetingPrepPrompt: PromptV1Definition = {
  metadata: {
    name: 'meeting_prep.v1',
    title: '360° prep sheet',
    description:
      'Summarize last notes, open tasks, related deals, and suggested agenda for a contact/company.',
    category: 'workflow',
    version: 'v1',
  },
  arguments: meetingPrepArguments,
  buildMessages: buildMeetingPrepMessages,
  tokenBudget: 600, // Per spec
};

export default meetingPrepPrompt;
