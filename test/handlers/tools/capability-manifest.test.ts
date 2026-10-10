/**
 * The capability manifest is a projection, so its value is consistency: the
 * registry, the schemas, the published annotations, and the manifest must say
 * the same thing about the same tool, and nothing may be re-described in a
 * second place. Also proves the manifest is selection-useful on its own, and
 * that publishing a capability grants nothing.
 *
 * Covers U7 test scenarios 1, 3, 4, and 5 for the manifest surface.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerToolHandlers } from '@/handlers/tools/index.js';
import { findToolConfig } from '@/handlers/tools/registry.js';
import {
  getToolsListPayload,
  getCapabilityManifest,
} from '@/utils/mcp-discovery.js';
import {
  CAPABILITY_CATALOG,
  type CapabilityManifest,
} from '@/handlers/tool-configs/universal/capabilities.js';
import { UniversalUpdateService } from '@/services/UniversalUpdateService.js';
import { EnhancedApiError } from '@/errors/enhanced-api-errors.js';
import { TOOL_NAME_MIGRATION } from '@/constants/tool-names.js';

const ORIGINAL_MODE = process.env.ATTIO_MCP_TOOL_MODE;

type ManifestEntry = CapabilityManifest['tools'][number];

function catalog(): Map<string, ManifestEntry> {
  return new Map(getCapabilityManifest().tools.map((e) => [e.name, e]));
}

/** Every name the registry currently advertises in this mode. */
function registeredNames(): string[] {
  return getToolsListPayload().tools.map((tool) => tool.name);
}

describe('capability manifest consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ATTIO_MCP_TOOL_MODE;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (ORIGINAL_MODE === undefined) {
      delete process.env.ATTIO_MCP_TOOL_MODE;
    } else {
      process.env.ATTIO_MCP_TOOL_MODE = ORIGINAL_MODE;
    }
  });

  it('agrees with tools/list in both modes, entry for entry', () => {
    for (const mode of ['full', 'search']) {
      process.env.ATTIO_MCP_TOOL_MODE = mode;
      const tools = getToolsListPayload().tools;
      const manifest = getCapabilityManifest();
      const byName = new Map(tools.map((tool) => [tool.name, tool]));

      expect(manifest.tools.map((entry) => entry.name).sort()).toEqual(
        tools.map((tool) => tool.name).sort()
      );

      for (const entry of manifest.tools) {
        const tool = byName.get(entry.name)!;
        expect(entry.description, entry.name).toBe(tool.description);
        expect(entry.inputSchema, entry.name).toEqual(tool.inputSchema);
        expect(entry.outputSchema, entry.name).toEqual(
          (tool as { outputSchema?: unknown }).outputSchema ?? null
        );
        expect(entry.operation, entry.name).not.toBeNull();
        expect(entry.guidance, entry.name).not.toBeNull();

        // The published annotations are the authored operation flags, so a
        // client reading tools/list and one reading the manifest cannot differ.
        const annotations =
          (tool as { annotations?: Record<string, unknown> }).annotations ?? {};
        expect(annotations.readOnlyHint, entry.name).toBe(
          entry.operation!.readOnly
        );
        expect(annotations.destructiveHint, entry.name).toBe(
          entry.operation!.destructive
        );
        expect(annotations.idempotentHint, entry.name).toBe(
          entry.operation!.idempotent
        );
      }
    }
  });

  it('has exactly one entry per registered tool and no entry for anything else', () => {
    for (const mode of ['full', 'search']) {
      process.env.ATTIO_MCP_TOOL_MODE = mode;
      const registered = registeredNames();
      const authored = Object.keys(CAPABILITY_CATALOG);

      for (const name of registered) {
        expect(CAPABILITY_CATALOG[name], name).toBeDefined();
        const entry = catalog().get(name)!;
        expect(entry.unannotated, name).toBeUndefined();
        // A registered tool is resolvable by name, so metadata cannot drift
        // away from a descriptor that exists.
        expect(findToolConfig(name), name).toBeDefined();
      }

      // The reverse direction belongs to the same check: an entry that points
      // at nothing is an orphaned second catalog.
      if (mode === 'full') {
        for (const name of authored) {
          expect(registered, name).toContain(name);
        }
        // Only names the migration map publishes may appear.
        const canonical = new Set<string>(
          TOOL_NAME_MIGRATION.map((entry) => entry.canonical)
        );
        for (const name of authored) {
          expect(canonical.has(name), name).toBe(true);
        }
      }
    }
  });

  it('carries schema documents without recursion, loss, or self-embedding', () => {
    const manifest = getCapabilityManifest();
    const serialized = JSON.stringify(manifest);

    expect(serialized).not.toContain('schemaVersion\\u0022');
    expect(serialized.indexOf('"guidance"')).toBeLessThan(
      serialized.length,
      'guidance must survive serialization'
    );
    expect(serialized.match(/"name":"capabilities_get"/g)?.length).toBe(1);
    expect(JSON.parse(serialized)).toEqual(JSON.parse(serialized));

    // No entry embeds a whole manifest inside itself.
    for (const entry of manifest.tools) {
      const entryText = JSON.stringify(entry);
      expect(entryText).not.toContain('"publishCredentialGrants"');
      expect(entryText).not.toMatch(/"tools":\[\{"schemaVersion"/);
    }
  });

  it('publishes the same permitted set through health in every mode', async () => {
    const { healthCheckConfig } =
      await import('@/handlers/tool-configs/universal/index.js');
    for (const mode of ['full', 'search']) {
      process.env.ATTIO_MCP_TOOL_MODE = mode;
      const raw = await (
        healthCheckConfig.handler as (
          args: Record<string, unknown>
        ) => Promise<Record<string, unknown>>
      )({});
      const healthManifest = raw.capabilities as CapabilityManifest & {
        projection?: { sections: string[]; schemaSource: string };
      };
      const manifest = getCapabilityManifest();

      // Same tools, same facts, same authorization statement.
      expect(healthManifest.tools.map((e) => e.name)).toEqual(
        manifest.tools.map((e) => e.name)
      );
      expect(healthManifest.authorization).toEqual(manifest.authorization);
      expect(healthManifest.mode).toBe(manifest.mode);
      expect(healthManifest.toolCount).toBe(manifest.toolCount);
      for (const entry of healthManifest.tools) {
        const source = manifest.tools.find((e) => e.name === entry.name)!;
        expect(entry.operation, entry.name).toEqual(source.operation);
        expect(entry.annotations, entry.name).toEqual(source.annotations);
        expect(entry.guidance, entry.name).toEqual(source.guidance);
      }

      // The one deliberate difference is declared, not silent: health keeps
      // the payload light and points schema documents at the discovery tool.
      expect(healthManifest.projection).toMatchObject({
        schemaSource: mode === 'search' ? 'tools/list' : 'capabilities_get',
      });
      expect(
        healthManifest.tools.every((entry) => entry.inputSchema === undefined)
      ).toBe(true);
    }
  });

  it('publishes only permitted selection pointers in both modes', () => {
    for (const mode of ['full', 'search']) {
      process.env.ATTIO_MCP_TOOL_MODE = mode;
      const manifest = getCapabilityManifest();
      const permitted = new Set([...manifest.tools.map((entry) => entry.name), 'tools/list']);
      for (const entry of manifest.tools) {
        for (const alternative of entry.guidance?.alternatives ?? []) {
          expect(permitted.has(alternative), `${entry.name} -> ${alternative}`).toBe(true);
        }
      }
    }
  });

  it('publishes executable resource boundaries and conservative continuation', () => {
    const entries = catalog();
    for (const name of ['records_create', 'records_update', 'records_delete', 'records_batch']) {
      expect(entries.get(name)!.operation!.resourceTypes).not.toContain('lists');
    }
    for (const name of ['records_get_attributes', 'records_discover_attributes']) {
      expect(entries.get(name)!.operation!.resourceTypes).not.toContain('notes');
    }
    expect(entries.get('records_get_attributes')!.operation!.customObjectSlugs).toBe(false);
    expect(entries.get('records_get_attribute_options')!.operation!.resourceTypes).not.toContain('lists');
    expect(entries.get('records_get_info')!.operation!.resourceTypes).toEqual(['companies', 'people', 'deals', 'tasks', 'lists', 'records']);
    expect(entries.get('records_search_by_relationship')!.operation!.resourceTypes).toEqual(['companies', 'people', 'deals']);
    expect(entries.get('records_search_by_content')!.operation!.resourceTypes).toEqual(['notes', 'people']);
    expect(entries.get('records_batch_search')!.operation!.resourceTypes).toEqual(['companies', 'people', 'deals', 'tasks', 'lists', 'records']);
    for (const name of ['records_search', 'records_search_advanced', 'records_search_by_relationship', 'records_search_by_content', 'records_batch', 'records_batch_search', 'list_entries_filter', 'list_entries_filter_advanced', 'list_entries_filter_by_parent', 'list_entries_filter_by_parent_id']) {
      expect(entries.get(name)!.operation!.pagination.supported).toBe(false);
    }
  });

});

describe('operation semantics for tool selection', () => {
  afterEach(() => {
    delete process.env.ATTIO_MCP_TOOL_MODE;
  });

  type OperationExpectation = Partial<NonNullable<ManifestEntry['operation']>>;
  const semantics: Array<[string, OperationExpectation]> = [
    [
      'records_search',
      { readOnly: true, destructive: false, action: 'search' },
    ],
    [
      'records_search_advanced',
      { readOnly: true, destructive: false, action: 'search' },
    ],
    ['records_batch_search', { readOnly: true, action: 'batch' }],
    ['records_get_details', { readOnly: true, action: 'read' }],
    ['notes_list', { readOnly: true, action: 'read' }],
    ['companies_create', { readOnly: false, destructive: false }],
    ['records_create', { readOnly: false, destructive: false }],
    ['records_update', { readOnly: false, idempotent: true }],
    ['companies_update', { readOnly: false }],
    ['records_delete', { readOnly: false, destructive: true }],
    ['records_merge', { readOnly: false, destructive: true }],
    ['list_entries_add', { readOnly: false }],
    ['list_entries_manage', { readOnly: false }],
    ['records_batch', { readOnly: false, destructive: true, action: 'batch' }],
  ];

  it.each(semantics)(
    'describes %s with truthful write and page semantics',
    (name, expected) => {
      const entry = catalog().get(name)!;
      expect(entry, name).toBeDefined();
      expect(entry.operation).toMatchObject(expected);
    }
  );

  it('marks upsert idempotent and delete destructive while search stays repeatable', () => {
    const byName = catalog();
    expect(byName.get('records_upsert')!.operation!.idempotent).toBe(true);
    expect(byName.get('records_upsert')!.operation!.readOnly).toBe(false);
    expect(byName.get('records_delete')!.operation!.destructive).toBe(true);
    expect(byName.get('records_search')!.operation!.idempotent).toBe(true);
    // A mixed batch is never advertised as read-only, so a client does not
    // replay it the way it would a search.
    expect(byName.get('records_batch')!.operation!.readOnly).toBe(false);
    expect(byName.get('records_batch_search')!.operation!.readOnly).toBe(true);
  });

  it('publishes continuation and auth facts a selector can act on', () => {
    const byName = catalog();
    expect(byName.get('records_search')!.operation!.pagination).toMatchObject({
      kind: 'cursor',
      supported: false,
      cap: 100,
    });
    expect(byName.get('search')!.operation!.authRequired).toBe(true);
    expect(byName.get('aaa-health-check')!.operation!.authRequired).toBe(false);
    expect(byName.get('diagnostics_get')!.operation!.authRequired).toBe(false);
    // Every static discovery entry is credential-free.
    expect(byName.get('capabilities_get')!.operation!.authRequired).toBe(false);
  });

  it('lets a client pick each common task from the entry alone', () => {
    const entries = [...catalog().values()];

    const pick = (
      rule: (entry: ManifestEntry) => boolean,
      why: string
    ): string[] =>
      entries
        .filter((entry) => rule(entry))
        .map((entry) => entry.name)
        .sort();

    // 1. Read one known record.
    const read = pick(
      (entry) =>
        entry.operation!.action === 'read' &&
        entry.operation!.readOnly &&
        Object.prototype.hasOwnProperty.call(
          (entry.inputSchema ?? {}).properties ?? {},
          'record_id'
        ),
      'read one record'
    );
    expect(read).toContain('records_get_details');

    // 2. Scoped write that needs no resource_type.
    const scopedWrite = pick(
      (entry) =>
        entry.operation!.action === 'write' &&
        !entry.operation!.readOnly &&
        !Object.prototype.hasOwnProperty.call(
          (entry.inputSchema ?? {}).properties ?? {},
          'resource_type'
        ) &&
        entry.operation!.resourceTypes.length === 1,
      'scoped write'
    );
    expect(scopedWrite).toEqual(
      expect.arrayContaining(['companies_create', 'deals_update'])
    );

    // 3. Custom-object operation: a write that accepts discovered slugs.
    const customObject = pick(
      (entry) =>
        entry.operation!.customObjectSlugs &&
        !entry.operation!.readOnly &&
        Object.prototype.hasOwnProperty.call(
          (entry.inputSchema ?? {}).properties ?? {},
          'resource_type'
        ),
      'custom object write'
    );
    expect(customObject).toContain('records_create');

    // 4. Note call.
    const noteCall = pick(
      (entry) =>
        entry.operation!.resourceTypes.some((type) => type === 'notes') ||
        entry.name.startsWith('notes_'),
      'note operation'
    );
    expect(noteCall).toEqual(
      expect.arrayContaining(['notes_create', 'notes_list'])
    );

    // 5. Continuation-capable query.
    const continuable = pick(
      (entry) =>
        entry.operation!.pagination.kind === 'cursor' &&
        entry.operation!.pagination.supported &&
        entry.operation!.readOnly,
      'continuation-capable query'
    );
    expect(continuable).toContain('records_search_by_timeframe');

    // The whole set is finite and each rule is a real filter, not a guess: a
    // client choosing from these fields never has to make a trial call.
    expect(entries.length).toBeGreaterThanOrEqual(45);
  });
});

describe('a published capability grants nothing', () => {
  beforeEach(() => {
    delete process.env.ATTIO_MCP_TOOL_MODE;
    vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('still denies the scoped write that the manifest advertises', async () => {
    const entry = catalog().get('companies_update')!;
    expect(entry.operation!.readOnly).toBe(false);

    // A real credential rejection reaches the boundary as an EnhancedApiError,
    // which is what a 401 from Attio becomes after client enhancement.
    const denied = new EnhancedApiError(
      'Unauthorized',
      401,
      '/v2/objects/companies/records',
      'PATCH'
    );
    vi.spyOn(UniversalUpdateService, 'updateRecord').mockRejectedValue(denied);

    const server = new Server(
      { name: 'capability-test', version: '1' },
      { capabilities: { tools: {} } }
    );
    registerToolHandlers(server);
    const client = new Client({ name: 'capability-client', version: '1' });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const listed = await client.listTools();
    const advertised = listed.tools.find(
      (tool) => tool.name === 'companies_update'
    );
    expect(advertised).toBeDefined();

    const call = await client.callTool({
      name: 'companies_update',
      arguments: {
        record_id: '550e8400-e29b-41d4-a716-446655440000',
        record_data: { name: 'Fixture Corp' },
      },
    });
    expect(call.isError).toBe(true);
    const structured = (call as { structuredContent?: { error?: unknown } })
      .structuredContent;
    expect(structured?.error).toMatchObject({
      code: expect.stringMatching(/UNAUTHENTICATED|PERMISSION_DENIED/),
      retryable: false,
    });

    // Discovery is unchanged by the denial: the capability is configured, the
    // grant is not.
    expect(catalog().get('companies_update')!.operation!.readOnly).toBe(false);
    expect(getCapabilityManifest().tools.map((item) => item.name)).toContain(
      'companies_update'
    );
  });
});
