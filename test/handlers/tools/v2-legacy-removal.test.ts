/**
 * U8 - the legacy unstructured tool surface is gone.
 *
 * These scenarios lock the removal boundaries the v2 program promised:
 *   1. the retired `DISABLE_UNIVERSAL_TOOLS` flag cannot change the catalogue,
 *   2. legacy-only names are neither advertised nor invocable,
 *   3. every surviving capability still resolves under its v2 name,
 *   4. nothing in the shipped source depends on a deleted legacy module,
 *   5. active setup guidance names v2 canonical tools only.
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
import { readFileSync, readdirSync, statSync } from 'node:fs';
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
      expect(findToolConfig(name), name).toBeUndefined();
      // Even with the mode filter off there is no registration left to reach.
      expect(
        findToolConfig(name, { enforceMode: false }),
        name
      ).toBeUndefined();
    }
  });

  it('fails a legacy-only call at the protocol boundary', async () => {
    for (const name of [
      'create-company',
      'create-task',
      'link-person-to-company',
    ]) {
      // A removed name is a missing tool, not a handler that runs and errors.
      await expect(client.callTool({ name, arguments: {} })).rejects.toThrow(
        /Tool not found/i
      );
    }
  });

  it('keeps supported prior-default names call-only and mode-bound (KTD7)', async () => {
    for (const [alias, canonical] of SUPPORTED_ALIASES) {
      expect(resolveToolName(alias).name, alias).toBe(canonical);
      expect(findToolConfig(alias), alias).toBeDefined();
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

  it('leaves no live source dependency on a deleted legacy module', () => {
    const deleted = [
      'tool-configs/companies/',
      'tool-configs/people/',
      'tool-configs/deals/',
      'tool-configs/records/',
      'tool-configs/general/',
      'tool-configs/tasks.js',
      'tool-configs/resource-specific-tools',
      'handlers/tools.ts.old',
      'handlers/tools.ts.fix',
    ];
    const root = process.cwd();
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (full === join(root, 'node_modules')) {
          continue;
        }
        const stats = statSync(full);
        if (stats.isDirectory()) {
          if (!['dist', 'coverage', '.git'].includes(entry)) {
            walk(full);
          }
          continue;
        }
        if (!/\.(ts|tsx|js|mjs|cjs)$/.test(entry)) {
          continue;
        }
        const text = readFileSync(full, 'utf8');
        for (const needle of deleted) {
          if (text.includes(needle)) {
            offenders.push(`${full.replace(root, '.')} -> ${needle}`);
          }
        }
      }
    };

    walk(join(root, 'src'));
    expect(offenders).toEqual([]);
  });

  it('keeps active setup docs naming v2 canonical tools only', () => {
    // Historical mentions of the retired flag are allowed; an instruction that
    // turns the legacy surface back on is not.
    const setupCommands = [
      'DISABLE_UNIVERSAL_TOOLS=true npm',
      'DISABLE_UNIVERSAL_TOOLS=true npx',
      'ENABLE_LEGACY_TOOLS',
    ];
    for (const doc of ['README.md', 'docs/MIGRATION-GUIDE.md']) {
      const text = readFileSync(join(process.cwd(), doc), 'utf8');
      for (const command of setupCommands) {
        expect(text.includes(command), `${doc}: ${command}`).toBe(false);
      }
      expect(
        /##\s+Enable Legacy Tools/i.test(text),
        `${doc}: legacy enable section`
      ).toBe(false);
      expect(/Enables legacy tools/i.test(text), doc).toBe(false);
    }
  });
});
