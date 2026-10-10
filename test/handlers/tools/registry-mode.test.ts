import { describe, it, expect, afterEach, vi } from 'vitest';
import { findToolConfig } from '@/handlers/tools/registry.js';
import { resolveToolName } from '@/config/tool-aliases.js';
import { getToolsListPayload } from '@/utils/mcp-discovery.js';

const originalMode = process.env.ATTIO_MCP_TOOL_MODE;

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.ATTIO_MCP_TOOL_MODE;
  } else {
    process.env.ATTIO_MCP_TOOL_MODE = originalMode;
  }
});

describe('findToolConfig in search-only mode', () => {
  it('returns undefined for write tools when in search-only mode', () => {
    process.env.ATTIO_MCP_TOOL_MODE = 'search';

    expect(findToolConfig('create-record')).toBeUndefined();
    expect(findToolConfig('search')).toBeDefined();
  });

  it('omits list and workspace-member tools from discovery', () => {
    process.env.ATTIO_MCP_TOOL_MODE = 'search';
    const advertised = getToolsListPayload().tools.map((tool) => tool.name);

    for (const name of [
      'lists_list',
      'lists_get',
      'list_entries_list',
      'list_entries_filter',
      'records_get_list_memberships',
      'list_entries_add',
      'list_entries_manage',
      'lists_create',
      'lists_update_configuration',
      'workspace_members_list',
      'workspace_members_search',
      'workspace_members_get',
    ]) {
      expect(advertised, name).not.toContain(name);
      expect(findToolConfig(name), name).toBeUndefined();
    }
  });

  it('rejects omitted tools called through an accepted alias', () => {
    process.env.ATTIO_MCP_TOOL_MODE = 'search';

    // Aliases resolve to canonical names before the mode filter runs, so an
    // alias can never widen search-only mode (AE5).
    for (const name of [
      'lists_list',
      'lists_create',
      'workspace_members_list',
    ]) {
      expect(findToolConfig(name), name).toBeUndefined();
    }
    // A supported migration alias for a write resolves, then the allowlist
    // rejects the canonical write. The removed kebab name does not resolve.
    expect(resolveToolName('create_record').name).toBe('records_create');
    expect(findToolConfig('create_record')).toBeUndefined();
    expect(resolveToolName('create-record').name).toBe('create-record');
    expect(findToolConfig('create-record')).toBeUndefined();
    expect(findToolConfig('search_records')).toBeUndefined();
    expect(findToolConfig('records_search')).toBeUndefined();
    // The compatibility pair remains callable in search-only mode.
    expect(findToolConfig('search')).toBeDefined();
    expect(findToolConfig('fetch')).toBeDefined();
  });

  it('keeps the credential-free surface available in every mode', () => {
    for (const mode of ['search', 'universal', 'full']) {
      process.env.ATTIO_MCP_TOOL_MODE = mode;
      const advertised = getToolsListPayload().tools.map((tool) => tool.name);

      // The compatibility surface keeps its health probe in every mode.
      expect(advertised, `aaa-health-check in ${mode}`).toContain(
        'aaa-health-check'
      );
      // Static diagnostics are part of the full catalogue, not the search
      // allowlist, so they appear as soon as mode stops narrowing.
      expect(
        advertised.includes('diagnostics_get'),
        `diagnostics_get in ${mode}`
      ).toBe(mode !== 'search');
    }
  });

  it('exposes the full phase-1 surface only in full mode', () => {
    process.env.ATTIO_MCP_TOOL_MODE = 'full';
    expect(getToolsListPayload().tools.length).toBeGreaterThanOrEqual(45);
  });
});

describe('the retired DISABLE_UNIVERSAL_TOOLS flag', () => {
  // The legacy registration branch is gone, so the flag is inert: absent,
  // false, and true all advertise the same v2 catalogue (AE6).
  const originalFlag = process.env.DISABLE_UNIVERSAL_TOOLS;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.DISABLE_UNIVERSAL_TOOLS;
    } else {
      process.env.DISABLE_UNIVERSAL_TOOLS = originalFlag;
    }
    vi.resetModules();
  });

  it('registers one v2 catalogue for every flag value', async () => {
    const baseline = getToolsListPayload()
      .tools.map((tool) => tool.name)
      .sort();
    expect(baseline.length).toBeGreaterThanOrEqual(45);

    for (const value of ['false', 'true']) {
      process.env.DISABLE_UNIVERSAL_TOOLS = value;
      vi.resetModules();
      const { getToolsListPayload: reloaded } =
        await import('@/utils/mcp-discovery.js');
      expect(
        reloaded()
          .tools.map((tool) => tool.name)
          .sort(),
        `DISABLE_UNIVERSAL_TOOLS=${value}`
      ).toEqual(baseline);
    }
  });

  it('cannot bring back a legacy-only tool', () => {
    process.env.DISABLE_UNIVERSAL_TOOLS = 'true';
    for (const name of [
      'create-company',
      'search-people',
      'create-task',
      'get-company-team',
    ]) {
      expect(findToolConfig(name), name).toBeUndefined();
      expect(
        findToolConfig(name, { enforceMode: false }),
        name
      ).toBeUndefined();
    }
    // The surviving routes are unaffected by the flag.
    expect(findToolConfig('lists_list')).toBeDefined();
    expect(findToolConfig('records_merge')).toBeDefined();
    expect(findToolConfig('workspace_members_get')).toBeDefined();
  });
});
