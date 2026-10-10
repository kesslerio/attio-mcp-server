import { afterEach, describe, expect, it } from 'vitest';
import {
  getToolAliasRegistry,
  resolveToolName,
} from '@/config/tool-aliases.js';
import { filterAllowedTools, isToolAllowed } from '@/config/tool-mode.js';
import { listAdvertisedToolNames } from '@/cli/tool-catalog.js';
import {
  REMOVED_PRE_V2_TOOL_ALIASES,
  SEARCH_ONLY_CANONICAL_TOOL_NAMES,
  TOOL_NAMES,
  canonicalToolNames,
  findAdvertisedNameViolations,
  migrationAliasMap,
} from '@/constants/tool-names.js';
import { findToolConfig } from '@/handlers/tools/registry.js';
import { validateUniversalToolParams } from '@/handlers/tool-configs/universal/schemas.js';
import { getToolsListPayload } from '@/utils/mcp-discovery.js';
import { getAllPromptsV1 } from '@/prompts/v1/index.js';
import { PromptMessage, TextContent } from '@/prompts/v1/types.js';

const ORIGINAL_MODE = process.env.ATTIO_MCP_TOOL_MODE;
const ORIGINAL_ALIAS_FLAG = process.env.MCP_DISABLE_TOOL_ALIASES;

const SAMPLE_ARGS_BY_PROMPT: Record<string, Record<string, unknown>> = {
  'people_search.v1': { query: 'Account Executives in fintech' },
  'company_search.v1': { query: 'SaaS companies over 100 employees' },
  'deal_search.v1': { query: 'deals over 50000 closing this quarter' },
  'meeting_prep.v1': { target: 'search:Acme Corp' },
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

function restoreEnv(): void {
  if (ORIGINAL_MODE === undefined) {
    delete process.env.ATTIO_MCP_TOOL_MODE;
  } else {
    process.env.ATTIO_MCP_TOOL_MODE = ORIGINAL_MODE;
  }
  if (ORIGINAL_ALIAS_FLAG === undefined) {
    delete process.env.MCP_DISABLE_TOOL_ALIASES;
  } else {
    process.env.MCP_DISABLE_TOOL_ALIASES = ORIGINAL_ALIAS_FLAG;
  }
}

function textFromMessages(messages: PromptMessage[]): string {
  return messages
    .map((message) =>
      message.content.type === 'text'
        ? (message.content as TextContent).text
        : ''
    )
    .join('\n');
}

function tokenPattern(token: string): RegExp {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`);
}

afterEach(() => {
  restoreEnv();
});

describe('v2 tool name migration', () => {
  it('keeps canonical names unique and resolves each previous name once', () => {
    const canonical = canonicalToolNames();
    expect(new Set(canonical).size).toBe(canonical.length);
    // 45 migrated tools plus the static discovery tool added by U7.
    expect(canonical).toHaveLength(46);

    const aliases = migrationAliasMap();
    expect(aliases.size).toBe(42);
    expect(Object.keys(getToolAliasRegistry())).toEqual([...aliases.keys()]);

    for (const [previous, target] of aliases) {
      expect(previous).not.toBe(target);
      expect(canonical).not.toContain(previous);
      expect(canonical).toContain(target);
      expect(aliases.has(target)).toBe(false);

      const first = resolveToolName(previous);
      expect(first.name).toBe(target);
      expect(first.alias?.alias).toBe(previous);
      expect(first.alias?.definition.target).toBe(target);
      expect(first.alias?.definition.removal).toBe('v3.0.0');
      expect(first.alias?.definition.since).toBe('2026-10-05');
      expect(first.alias?.definition.reason ?? '').not.toContain('#1039');

      const second = resolveToolName(first.name);
      expect(second.name).toBe(target);
      expect(second.alias).toBeUndefined();
    }
  });

  it('fails removed pre-v2 names instead of aliasing them', () => {
    expect(REMOVED_PRE_V2_TOOL_ALIASES).toContain('records_search_batch');
    expect(REMOVED_PRE_V2_TOOL_ALIASES).toContain('search-records');
    expect(REMOVED_PRE_V2_TOOL_ALIASES).toContain('create-record');

    for (const removed of REMOVED_PRE_V2_TOOL_ALIASES) {
      const resolution = resolveToolName(removed);
      expect(resolution.name).toBe(removed);
      expect(resolution.alias).toBeUndefined();
      expect(getToolAliasRegistry()[removed]).toBeUndefined();
      expect(findToolConfig(removed)).toBeUndefined();
    }
  });

  it('keeps every TOOL_NAMES value on the canonical catalog', () => {
    for (const name of Object.values(TOOL_NAMES)) {
      expect(canonicalToolNames()).toContain(name);
    }
  });

  it('rejects previous names when aliases are disabled and still serves canonical names', () => {
    process.env.MCP_DISABLE_TOOL_ALIASES = 'true';
    delete process.env.ATTIO_MCP_TOOL_MODE;

    expect(resolveToolName('search_records').alias).toBeUndefined();
    expect(resolveToolName('search_records').name).toBe('search_records');
    expect(findToolConfig('search_records')).toBeUndefined();
    expect(findToolConfig('get-lists')).toBeUndefined();
    expect(findToolConfig('create_record')).toBeUndefined();

    expect(resolveToolName('records_search').name).toBe('records_search');
    expect(findToolConfig('records_search')?.toolConfig.name).toBe(
      'records_search'
    );
    expect(findToolConfig('records_create')?.toolConfig.name).toBe(
      'records_create'
    );
    expect(findToolConfig('lists_list')?.toolType).toBe('getLists');
    for (const name of SEARCH_ONLY_CANONICAL_TOOL_NAMES) {
      expect(findToolConfig(name)?.toolConfig.name).toBe(name);
    }
  });

  it('does not let prior-name aliases reach a hidden write in search-only mode', () => {
    process.env.ATTIO_MCP_TOOL_MODE = 'search';

    expect(isToolAllowed('search')).toBe(true);
    expect(isToolAllowed('records_create')).toBe(false);
    expect(isToolAllowed('create_record')).toBe(false);
    expect(isToolAllowed('lists_create')).toBe(false);
    expect(isToolAllowed('get-lists')).toBe(false);

    expect(
      filterAllowedTools([
        { name: 'search' },
        { name: 'create_record' },
        { name: 'records_create' },
        { name: 'fetch' },
        { name: 'get-lists' },
      ]).map((tool) => tool.name)
    ).toEqual(['search', 'fetch']);

    expect(listAdvertisedToolNames().sort()).toEqual(
      [...SEARCH_ONLY_CANONICAL_TOOL_NAMES].sort()
    );
    expect(findToolConfig('create_record')).toBeUndefined();
    expect(findToolConfig('records_create')).toBeUndefined();
    expect(findToolConfig('get-lists')).toBeUndefined();
    expect(findToolConfig('lists_create')).toBeUndefined();
    expect(findToolConfig('search')?.toolConfig.name).toBe('search');
    expect(findToolConfig('fetch')?.toolConfig.name).toBe('fetch');
    expect(findToolConfig('aaa-health-check')?.toolConfig.name).toBe(
      'aaa-health-check'
    );
  });

  it('routes canonical names and prior names to the same handler branch', () => {
    delete process.env.ATTIO_MCP_TOOL_MODE;
    delete process.env.MCP_DISABLE_TOOL_ALIASES;

    const pairs: Array<{
      canonical: string;
      previous: string;
      toolType: string;
    }> = [
      {
        canonical: 'records_search',
        previous: 'search_records',
        toolType: 'records_search',
      },
      {
        canonical: 'records_create',
        previous: 'create_record',
        toolType: 'records_create',
      },
      {
        canonical: 'companies_create',
        previous: 'create_company',
        toolType: 'companies_create',
      },
      {
        canonical: 'records_merge',
        previous: 'merge_records',
        toolType: 'records_merge',
      },
      {
        canonical: 'lists_list',
        previous: 'get-lists',
        toolType: 'getLists',
      },
      {
        canonical: 'list_entries_manage',
        previous: 'manage-list-entry',
        toolType: 'manageListEntry',
      },
      {
        canonical: 'workspace_members_get',
        previous: 'get-workspace-member',
        toolType: 'getWorkspaceMember',
      },
    ];

    for (const pair of pairs) {
      const canonical = findToolConfig(pair.canonical);
      const previous = findToolConfig(pair.previous);
      expect(canonical?.toolType).toBe(pair.toolType);
      expect(previous?.toolType).toBe(pair.toolType);
      expect(previous?.toolConfig).toBe(canonical?.toolConfig);
      expect(previous?.toolConfig.name).toBe(pair.canonical);
      expect(previous?.toolConfig.handler).toBe(canonical?.toolConfig.handler);
    }
  });

  it('validates an alias with the canonical validator and does not rewrite the payload', () => {
    const payload = { resource_type: 'companies', query: 'acme' };
    const viaAlias = validateUniversalToolParams('search_records', {
      ...payload,
    });
    const viaCanonical = validateUniversalToolParams('records_search', {
      ...payload,
    });
    expect(viaAlias.resource_type).toBe('companies');
    expect(viaCanonical.resource_type).toBe('companies');
    expect(viaAlias.query).toBe(viaCanonical.query);

    expect(() => validateUniversalToolParams('search_records', {})).toThrow(
      /resource_type/
    );
    expect(() => validateUniversalToolParams('records_search', {})).toThrow(
      /resource_type/
    );

    process.env.MCP_DISABLE_TOOL_ALIASES = 'true';
    const unresolved = validateUniversalToolParams('search_records', {});
    expect(unresolved.resource_type).toBeUndefined();
  });

  it('makes prompts, CLI discovery, the schema linter, and tools/list agree', () => {
    delete process.env.ATTIO_MCP_TOOL_MODE;
    delete process.env.MCP_DISABLE_TOOL_ALIASES;

    const payload = getToolsListPayload();
    const advertised = listAdvertisedToolNames();
    expect(advertised).toEqual(payload.tools.map((tool) => tool.name));
    expect([...advertised].sort()).toEqual([...canonicalToolNames()].sort());
    expect(findAdvertisedNameViolations(payload.tools)).toEqual([]);

    const forbidden = [
      ...migrationAliasMap().keys(),
      ...REMOVED_PRE_V2_TOOL_ALIASES,
    ];
    const hits: string[] = [];
    for (const prompt of getAllPromptsV1()) {
      const text = textFromMessages(
        prompt.buildMessages(SAMPLE_ARGS_BY_PROMPT[prompt.metadata.name])
      );
      for (const token of forbidden) {
        if (tokenPattern(token).test(text)) {
          hits.push(`${prompt.metadata.name}:${token}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
