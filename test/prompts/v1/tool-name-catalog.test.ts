import { describe, expect, it } from 'vitest';
import { findToolConfig } from '@/handlers/tools/registry.js';
import { getAllPromptsV1 } from '@/prompts/v1/index.js';
import { PromptMessage, TextContent } from '@/prompts/v1/types.js';

const SAMPLE_ARGS_BY_PROMPT: Record<string, Record<string, unknown>> = {
  'people_search.v1': {
    query: 'Account Executives in fintech',
  },
  'company_search.v1': {
    query: 'SaaS companies over 100 employees',
  },
  'deal_search.v1': {
    query: 'deals over 50000 closing this quarter',
  },
  'meeting_prep.v1': {
    target: 'search:Acme Corp',
  },
  'pipeline_health.v1': {
    owner: '@me',
    timeframe: '30d',
    segment: 'enterprise',
  },
  'log_activity.v1': {
    target: 'search:Acme Corp',
    type: 'call',
    summary: 'Discussed Q1 pricing',
    create_follow_up: true,
  },
  'create_task.v1': {
    title: 'Follow up',
    content: 'Send pricing recap',
    target: 'search:Acme Corp',
    due_date: 'tomorrow',
  },
  'advance_deal.v1': {
    deal: 'search:Acme enterprise deal',
    target_stage: 'Proposal Sent',
    create_task: true,
  },
  'add_to_list.v1': {
    records: 'search:AI companies in SF',
    list: 'Q1 Outreach',
  },
  'qualify_lead.v1': {
    target: 'search:Acme Corp',
    icp_preset: 'SaaS mid-market NA',
  },
};

const NON_TOOL_TOKENS = new Set(['target', 'search:']);

const TOOL_TOKEN_PATTERN = /^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*$/;
const STALE_TOOL_TOKEN_PATTERN =
  /\b(?:records_query|tasks\.create|records\.update|records\.search|records\.discover_attributes|web\.search|web\.fetch|notes\.create|deals\.list|get-lists|add-record-to-list)\b/g;

function textFromMessages(messages: PromptMessage[]): string {
  return messages
    .map((message) =>
      message.content.type === 'text'
        ? (message.content as TextContent).text
        : ''
    )
    .join('\n');
}

function extractBacktickedTokens(text: string): string[] {
  return Array.from(text.matchAll(/`([^`]+)`/g), (match) => match[1]).filter(
    (token) => TOOL_TOKEN_PATTERN.test(token)
  );
}

function extractStaleToolTokens(text: string): string[] {
  return Array.from(
    text.matchAll(STALE_TOOL_TOKEN_PATTERN),
    (match) => match[0]
  );
}

function resolveTokens(tokens: string[]): Map<string, boolean> {
  return new Map(
    Array.from(new Set(tokens), (token) => [
      token,
      Boolean(findToolConfig(token)),
    ])
  );
}

describe('v1 prompt tool-name catalog', () => {
  it('only references resolvable tool names in generated prompt instructions', () => {
    const unresolved: Array<{ prompt: string; token: string }> = [];

    for (const prompt of getAllPromptsV1()) {
      const sampleArgs = SAMPLE_ARGS_BY_PROMPT[prompt.metadata.name];
      expect(
        sampleArgs,
        `Missing sample args for ${prompt.metadata.name}`
      ).toBeDefined();

      const text = textFromMessages(prompt.buildMessages(sampleArgs));
      const tokens = extractBacktickedTokens(text);
      const toolTokens = tokens.filter((token) => !NON_TOOL_TOKENS.has(token));
      const resolvedTokens = resolveTokens(toolTokens);

      for (const token of extractStaleToolTokens(text)) {
        unresolved.push({ prompt: prompt.metadata.name, token });
      }

      for (const token of toolTokens) {
        if (!resolvedTokens.get(token)) {
          unresolved.push({ prompt: prompt.metadata.name, token });
        }
      }
    }

    expect(unresolved).toEqual([]);
  });
});
