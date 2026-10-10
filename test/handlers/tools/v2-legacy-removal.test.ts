/**
 * U8 - the legacy unstructured tool surface is gone.
 *
 * These scenarios lock the removal boundaries the v2 program promised:
 *   1. the retired `DISABLE_UNIVERSAL_TOOLS` flag cannot change the catalogue,
 *   2. legacy-only names are neither advertised nor invocable,
 *   3. every surviving capability still resolves under its v2 name,
 *   4. the clean build ships no deleted legacy tool-config module.
 */
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { registerToolHandlers } from '@/handlers/tools/index.js';
import { TOOL_CONFIGS, findToolConfig } from '@/handlers/tools/registry.js';
import { resolveToolName } from '@/config/tool-aliases.js';
import { canonicalToolNames } from '@/constants/tool-names.js';

/** Names that only ever existed in the legacy resource-specific configs. */
const LEGACY_ONLY_NAMES = [
  'create-company',
  'update-company',
  'delete-company',
  'search-companies',
  'search-companies-by-domain',
  'advanced-search-companies',
  'get-company-details',
  'get-company-basic-info',
  'get-company-contact-info',
  'get-company-attributes',
  'get-company-notes',
  'get-company-team',
  'create-company-note',
  'batch-create-companies',
  'batch-update-companies',
  'batch-delete-companies',
  'search-people',
  'create-person',
  'get-person-details',
  'get-person-companies',
  'get-person-notes',
  'search-people-by-email',
  'link-person-to-company',
  'unlink-person-from-company',
  'create-task',
  'update-task',
  'delete-task',
  'list-tasks',
  'link-record-to-task',
  'create-record',
  'list-records',
  'create-deal-note',
  'get-deal-notes',
];

/**
 * Supported prior-default names. They resolve through the call-only alias map
 * and never become their own tools/list entries (KTD7).
 */
const SUPPORTED_ALIASES: ReadonlyArray<readonly [string, string]> = [
  ['create_record', 'records_create'],
  ['update_record', 'records_update'],
  ['merge_records', 'records_merge'],
  ['create_company', 'companies_create'],
  ['get-lists', 'lists_list'],
  ['create-list', 'lists_create'],
  ['add-record-to-list', 'list_entries_add'],
  ['list-workspace-members', 'workspace_members_list'],
  ['smithery_debug_config', 'diagnostics_get'],
];

/** Pre-v2 names that were dropped rather than aliased; calling one fails. */
const REMOVED_PRE_V2_NAMES = [
  'search-records',
  'get-record-details',
  'advanced-search',
  'batch-operations',
  'create-note',
  'list-notes',
  'smithery-debug-config',
];

const envDefaults = {
  DISABLE_UNIVERSAL_TOOLS: process.env.DISABLE_UNIVERSAL_TOOLS,
  ATTIO_MCP_TOOL_MODE: process.env.ATTIO_MCP_TOOL_MODE,
  MCP_DISABLE_TOOL_ALIASES: process.env.MCP_DISABLE_TOOL_ALIASES,
  NODE_ENV: process.env.NODE_ENV,
};

describe('v2 legacy surface removal', () => {
  let client: Client;
  let server: Server;

  beforeEach(async () => {
    vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');
    server = new Server(
      { name: 'v2-legacy-removal', version: '1' },
      { capabilities: { tools: {} } }
    );
    registerToolHandlers(server);
    client = new Client({ name: 'removal-client', version: '1' });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(envDefaults)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function listToolNames(): Promise<string[]> {
    const { tools } = await client.listTools();
    return tools.map((tool) => tool.name);
  }

  async function advertisedCatalogue(
    flag: string | undefined
  ): Promise<string[]> {
    // The registry reads the flag at module load, so reload the module graph.
    vi.resetModules();
    if (flag === undefined) {
      delete process.env.DISABLE_UNIVERSAL_TOOLS;
    } else {
      vi.stubEnv('DISABLE_UNIVERSAL_TOOLS', flag);
    }
    const { getToolsListPayload } = await import('@/utils/mcp-discovery.js');
    return getToolsListPayload()
      .tools.map((tool) => tool.name)
      .sort();
  }

  it('keeps one catalogue for absent, false, and true legacy flags (AE6)', async () => {
    const baseline = await advertisedCatalogue(undefined);
    expect(baseline.length).toBeGreaterThan(0);

    for (const flag of ['false', 'true']) {
      const catalogue = await advertisedCatalogue(flag);
      expect(catalogue, `DISABLE_UNIVERSAL_TOOLS=${flag}`).toEqual(baseline);
    }
  });

  it('produces only the documented warning when the obsolete flag is true', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DISABLE_UNIVERSAL_TOOLS', 'true');
    vi.resetModules();
    await import('@/handlers/tools/registry.js');
    const mentionsFlag = (calls: unknown[][]) =>
      calls.some((call) =>
        call.some((arg) =>
          typeof arg === 'string'
            ? arg.includes('DISABLE_UNIVERSAL_TOOLS')
            : JSON.stringify(arg).includes('DISABLE_UNIVERSAL_TOOLS')
        )
      );
    expect(mentionsFlag(warn.mock.calls)).toBe(true);

    warn.mockClear();
    vi.stubEnv('DISABLE_UNIVERSAL_TOOLS', 'false');
    vi.resetModules();
    await import('@/handlers/tools/registry.js');
    expect(mentionsFlag(warn.mock.calls)).toBe(false);
  });

  it('omits legacy-only names from discovery and refuses to resolve them', async () => {
    const names = await listToolNames();
    for (const name of [...LEGACY_ONLY_NAMES, ...REMOVED_PRE_V2_NAMES]) {
      expect(names, name).not.toContain(name);
      expect(
        Object.values(TOOL_CONFIGS).flatMap((configs) =>
          Object.values(configs).map((config) => config.name)
        ),
        name
      ).not.toContain(name);
      expect(findToolConfig(name), name).toBeUndefined();
      // Even with the mode filter off there is no registration left to reach.
      expect(
        findToolConfig(name, { enforceMode: false }),
        name
      ).toBeUndefined();
    }
  });

  it('fails a legacy-only call at the protocol boundary', async () => {
    for (const name of [...LEGACY_ONLY_NAMES, ...REMOVED_PRE_V2_NAMES]) {
      // A removed name is a missing tool, not a handler that runs and errors.
      await expect(client.callTool({ name, arguments: {} })).rejects.toThrow(
        /Tool not found/i
      );
    }
  });

  it('keeps supported prior-default names call-only and mode-bound (KTD7)', async () => {
    for (const [alias, canonical] of SUPPORTED_ALIASES) {
      expect(resolveToolName(alias).name, alias).toBe(canonical);
      expect(findToolConfig(alias)?.toolConfig, alias).toBe(
        findToolConfig(canonical)?.toolConfig
      );
    }

    const names = await listToolNames();
    for (const [alias] of SUPPORTED_ALIASES) {
      expect(names, alias).not.toContain(alias);
    }

    // The compatibility control disables aliases without touching the catalogue.
    vi.stubEnv('MCP_DISABLE_TOOL_ALIASES', 'true');
    for (const [alias] of SUPPORTED_ALIASES) {
      expect(resolveToolName(alias).name, alias).toBe(alias);
      expect(findToolConfig(alias), alias).toBeUndefined();
      await expect(
        client.callTool({ name: alias, arguments: {} })
      ).rejects.toThrow(/Tool not found/i);
    }
    vi.stubEnv('MCP_DISABLE_TOOL_ALIASES', 'false');
    for (const [alias, canonical] of SUPPORTED_ALIASES) {
      expect(resolveToolName(alias).name, alias).toBe(canonical);
    }
  });

  it('keeps surviving capabilities advertised and resolvable (AE6, AE8)', () => {
    const groups: ReadonlyArray<readonly [string, string[]]> = [
      [
        'list routes',
        [
          'lists_list',
          'lists_get',
          'lists_create',
          'list_entries_add',
          'list_entries_filter',
        ],
      ],
      [
        'member routes',
        [
          'workspace_members_list',
          'workspace_members_search',
          'workspace_members_get',
        ],
      ],
      ['record membership routes', ['records_get_list_memberships']],
      [
        'task routes',
        [
          'records_create',
          'records_update',
          'records_delete',
          'records_search',
        ],
      ],
      [
        'custom-object routes',
        ['records_search', 'records_get_details', 'records_upsert'],
      ],
      [
        'focused company/deal writes',
        [
          'companies_create',
          'companies_update',
          'deals_create',
          'deals_update',
        ],
      ],
      ['scoped note writes', ['notes_create', 'notes_list']],
      ['connector search/fetch', ['search', 'fetch']],
      ['safe merge', ['records_merge']],
      [
        'static discovery',
        ['capabilities_get', 'diagnostics_get', 'aaa-health-check'],
      ],
    ];

    for (const [, names] of groups) {
      for (const name of names) {
        const found = findToolConfig(name);
        expect(found, name).toBeDefined();
        expect(typeof found?.toolConfig.handler, name).toBe('function');
      }
    }

    // The v2 registration surface is exactly the three surviving groups.
    expect(Object.keys(TOOL_CONFIGS).sort()).toEqual([
      'UNIVERSAL',
      'lists',
      'workspace_members',
    ]);
  });

  it('advertises only canonical names', async () => {
    const canonical = new Set(canonicalToolNames());
    for (const name of await listToolNames()) {
      expect(canonical.has(name), name).toBe(true);
    }
  });

  it('resolves every advertised name to its registered handler', async () => {
    const registered = Object.values(TOOL_CONFIGS).flatMap(Object.values);
    for (const name of await listToolNames()) {
      const configs = registered.filter((config) => config.name === name);
      expect(configs, name).toHaveLength(1);
      expect(findToolConfig(name)?.toolConfig.handler, name).toBe(
        configs[0].handler
      );
      expect(typeof configs[0].handler, name).toBe('function');
    }
  });

  it('emits no legacy tool-config module in a clean build', () => {
    const output = mkdtempSync(join(process.cwd(), '.u8-build-'));
    try {
      for (const command of ['tsc', 'tsc-alias']) {
        execFileSync(
          'timeout',
          ['-k', '5s', '90s', 'bun', 'run', command, '--outDir', output],
          { cwd: process.cwd(), stdio: 'pipe' }
        );
      }
      expect(existsSync(join(output, 'handlers/tools/registry.js'))).toBe(true);
      for (const module of [
        'companies',
        'people',
        'deals',
        'records',
        'general',
        'tasks.js',
        'resource-specific-tools.js',
      ]) {
        expect(existsSync(join(output, 'handlers/tool-configs', module)), module)
          .toBe(false);
      }
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  }, 200000);
});
