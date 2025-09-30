/**
 * Qualify Lead v1 Prompt
 *
 * Resolve lead, scan 2-3 web sources, return BANT/CHAMP summary with evidence,
 * propose next actions.
 */

import { z } from 'zod';
import { PromptV1Definition, PromptMessage, PromptArgument } from './types.js';
import { DryRunArg } from './types.js';
import { WEB_RESEARCH_LIMITS } from './constants.js';

/**
 * Argument schema for qualify_lead.v1
 */
export const QualifyLeadArgs = z.object({
  target: z
    .string()
    .min(3)
    .describe('Attio Person/Company/Deal URL or ID, or "search:<text>"'),
  icp_preset: z
    .string()
    .optional()
    .describe("Optional ICP preset (e.g., 'SaaS mid-market NA')"),
  framework: z
    .enum(['bant', 'champ'])
    .optional()
    .default('bant')
    .describe('Qualification framework'),
  format: z
    .enum(['json', 'table'])
    .optional()
    .default('json')
    .describe('Output format'),
  verbosity: z
    .enum(['brief', 'normal'])
    .optional()
    .default('brief')
    .describe('Response detail level'),
  dry_run: DryRunArg,
  limit_web: z
    .number()
    .int()
    .min(1)
    .max(WEB_RESEARCH_LIMITS.maxLimitWeb)
    .optional()
    .default(WEB_RESEARCH_LIMITS.defaultLimitWeb)
    .describe(
      `Max pages to fetch (default ${WEB_RESEARCH_LIMITS.defaultLimitWeb}, max ${WEB_RESEARCH_LIMITS.maxLimitWeb})`
    ),
});

export type QualifyLeadArgsType = z.infer<typeof QualifyLeadArgs>;

/**
 * Argument definitions for registration
 */
export const qualifyLeadArguments: PromptArgument[] = [
  {
    name: 'target',
    description: 'Attio URL, ID, or "search:<text>"',
    required: true,
    schema: z.string().min(3),
  },
  {
    name: 'icp_preset',
    description: "Optional ICP preset (e.g., 'SaaS mid-market NA')",
    required: false,
    schema: z.string(),
  },
  {
    name: 'framework',
    description: 'bant | champ (default bant)',
    required: false,
    schema: z.enum(['bant', 'champ']),
    default: 'bant',
  },
  {
    name: 'format',
    description: 'json | table (default json)',
    required: false,
    schema: z.enum(['json', 'table']),
    default: 'json',
  },
  {
    name: 'verbosity',
    description: 'brief | normal (default brief)',
    required: false,
    schema: z.enum(['brief', 'normal']),
    default: 'brief',
  },
  {
    name: 'dry_run',
    description: "Only propose, don't execute (default false)",
    required: false,
    schema: z.boolean(),
    default: false,
  },
  {
    name: 'limit_web',
    description: `Max pages (default ${WEB_RESEARCH_LIMITS.defaultLimitWeb}, max ${WEB_RESEARCH_LIMITS.maxLimitWeb})`,
    required: false,
    schema: z.number().int().min(1).max(WEB_RESEARCH_LIMITS.maxLimitWeb),
    default: WEB_RESEARCH_LIMITS.defaultLimitWeb,
  },
];

/**
 * Build prompt messages for qualifying lead
 */
export function buildQualifyLeadMessages(
  args: Record<string, unknown>
): PromptMessage[] {
  const validated = QualifyLeadArgs.parse(args);

  const icpContext = validated.icp_preset
    ? `ICP context: "${validated.icp_preset}" affects scoring thresholds.`
    : '';

  const instructions = `Goal: produce a compact lead-qualification summary with evidence, then optionally update fields and create a next-action task.

${icpContext}

Steps:
1) Resolve \`target\`: If starts with \`search:\`, call \`records.query\` to find one Person/Company (prefer exact domain/email + title+company). If multiple, list up to 5 for disambiguation and STOP.

2) Build a tiny web plan (token-light): At most ${validated.limit_web} pages total. Prioritize: company homepage (domain), LinkedIn company page, product/pricing page. Call \`web.search\` only if domain is unknown; otherwise skip search. Call \`web.fetch\` and extract readable text only (strip nav/boilerplate). Truncate each page to the first ~${WEB_RESEARCH_LIMITS.maxWordsPerPage} words.

3) Extract key facts for ${validated.framework.toUpperCase()}:
   - Firmographic: industry, employee bucket, region; ICP match
   - Problem fit: product category/keywords
   - Budget: pricing tier mentions
   - Authority: likely buyer role(s)
   - Timing/Priority: hiring/funding/news in last 12 months

4) Output (${validated.format}):
   - If json: return ONLY a JSON object with fields: lead, framework, fit, score, summary (≤80w), evidence (≤${WEB_RESEARCH_LIMITS.maxEvidence}), fields_to_update, recommended_next_step (≤20w)
   - If table: return a 2-column table
   Verbosity=${validated.verbosity} → no preamble

5) Propose actions: Suggest a single \`records.update\` and optionally \`tasks.create\`. ${validated.dry_run ? 'Output proposed tool call(s) as JSON only.' : 'Ask for approval before any write.'}

Constraints: Pages ≤ ${validated.limit_web}, each ≤ ~${WEB_RESEARCH_LIMITS.maxWordsPerPage} words; evidence max ${WEB_RESEARCH_LIMITS.maxEvidence}. Keep answers short and structured; no raw dumps; JSON under ~120 lines. MORE_AVAILABLE: true when results exceed limits.`;

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
export const qualifyLeadPrompt: PromptV1Definition = {
  metadata: {
    name: 'qualify_lead.v1',
    title: 'Qualify a lead (light web research)',
    description:
      'Resolve a lead, scan 2-3 web sources, return a BANT/CHAMP summary with evidence, and propose next actions.',
    category: 'analysis',
    version: 'v1',
  },
  arguments: qualifyLeadArguments,
  buildMessages: buildQualifyLeadMessages,
  tokenBudget: 400, // Per spec (with defaults)
};

export default qualifyLeadPrompt;
