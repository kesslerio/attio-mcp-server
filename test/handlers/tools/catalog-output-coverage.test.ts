import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { registerToolHandlers } from '@/handlers/tools/index.js';
import { findToolConfig } from '@/handlers/tools/registry.js';
import { getToolsListPayload } from '@/utils/mcp-discovery.js';
import { buildStructuredToolResult } from '@/handlers/tools/result-contract.js';
import { healthCheckConfig } from '@/handlers/tool-configs/universal/index.js';
import { smitheryDiagnosticsConfig } from '@/handlers/tool-configs/universal/smithery-diagnostics.js';

/**
 * The default-registered surface as inventoried for the v2 program: 28
 * universal tools, 14 list tools, and 3 workspace-member tools.
 *
 * Coverage is asserted in both directions from this ledger, but the count is a
 * floor rather than a fixed expectation so later additions stay possible.
 */
const UNIVERSAL_SURFACE = [
  'aaa-health-check',
  'diagnostics_get',
  'search',
  'fetch',
  'records_search',
  'records_get_details',
  'records_create',
  'records_update',
  'records_upsert',
  'records_delete',
  'records_merge',
  'companies_create',
  'companies_update',
  'deals_create',
  'deals_update',
  'records_get_attributes',
  'records_discover_attributes',
  'records_get_attribute_options',
  'records_get_info',
  'records_get_interactions',
  'notes_create',
  'notes_list',
  'records_search_advanced',
  'records_search_by_relationship',
  'records_search_by_content',
  'records_search_by_timeframe',
  'records_batch',
  'records_batch_search',
];

const LIST_SURFACE = [
  'lists_list',
  'records_get_list_memberships',
  'lists_get',
  'list_entries_list',
  'list_entries_filter',
  'list_entries_filter_advanced',
  'list_entries_add',
  'list_entries_remove',
  'list_entries_update',
  'list_entries_manage',
  'list_entries_filter_by_parent',
  'list_entries_filter_by_parent_id',
  'lists_create',
  'lists_update_configuration',
];

const MEMBER_SURFACE = [
  'workspace_members_list',
  'workspace_members_search',
  'workspace_members_get',
];

const INVENTORY = [...UNIVERSAL_SURFACE, ...LIST_SURFACE, ...MEMBER_SURFACE];

const STATIC_SURFACE = ['aaa-health-check', 'diagnostics_get'];

describe('registered tool surface output-contract coverage', () => {
  let client: Client;
  let server: Server;

  beforeEach(async () => {
    vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');
    server = new Server(
      { name: 'coverage', version: '1' },
      { capabilities: { tools: {} } }
    );
    registerToolHandlers(server);
    client = new Client({ name: 'coverage-client', version: '1' });
    const pair = InMemoryTransport.createLinkedPair();
    for (const transport of pair) {
      const send = transport.send.bind(transport);
      vi.spyOn(transport, 'send').mockImplementation((message, options) =>
        send(JSON.parse(JSON.stringify(message)), options)
      );
    }
    await server.connect(pair[1]);
    await client.connect(pair[0]);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('discovers the inventoried surface and never advertises an unmigrated tool', async () => {
    const { tools } = await client.listTools();
    const advertised = tools.map((tool) => tool.name);

    // Coverage gate: every discovered definition carries an adapter and schema.
    const unmigrated = advertised.filter((name) => {
      const config = findToolConfig(name, { enforceMode: false })?.toolConfig;
      return !config?.resultSchema || !config?.structuredOutput;
    });
    expect(unmigrated).toEqual([]);
    expect(
      tools.filter((tool) => !tool.outputSchema).map((tool) => tool.name)
    ).toEqual([]);

    // Parity ledger against the inventoried surface, without a fixed total that
    // would block later legitimate additions.
    const missing = INVENTORY.filter((name) => !advertised.includes(name));
    expect(missing).toEqual([]);
    expect(advertised.length).toBeGreaterThanOrEqual(45);
    expect(advertised).toEqual(expect.arrayContaining(INVENTORY));
  });

  it('advertises one object-rooted envelope with an exclusive error branch per tool', async () => {
    const { tools } = await client.listTools();
    const validator = new AjvJsonSchemaValidator();
    for (const tool of tools) {
      const schema = tool.outputSchema as Tool['outputSchema'] & {
        type?: string;
        properties?: Record<string, unknown>;
        if?: { required: string[] };
      };
      expect(schema, tool.name).toBeDefined();
      expect(schema.type, tool.name).toBe('object');
      expect(schema.properties?.error, tool.name).toBeDefined();
      // Success and failure never travel together in one result.
      expect(schema.if?.required, tool.name).toEqual(['error']);
      const validate = validator.getValidator(tool.outputSchema!);
      expect(
        validate({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the arguments',
            retryable: false,
          },
        }).valid,
        tool.name
      ).toBe(true);
    }
  });

  it('keeps every inventoried definition resolvable with its own contract', () => {
    for (const name of INVENTORY) {
      const found = findToolConfig(name, { enforceMode: false });
      expect(found, name).toBeDefined();
      expect(found?.toolConfig.name, name).toBe(name);
      expect(found?.toolConfig.resultSchema, name).toBeDefined();
      expect(typeof found?.toolConfig.structuredOutput, name).toBe('function');
      expect(found?.toolConfig.outputSchema, name).toBeDefined();
    }
  });

  it.each(STATIC_SURFACE)(
    'publishes %s without Attio credentials and without secrets',
    async (name) => {
      vi.stubEnv('ATTIO_API_KEY', '');
      vi.stubEnv('ATTIO_ACCESS_TOKEN', '');
      const config =
        name === 'aaa-health-check'
          ? healthCheckConfig
          : smitheryDiagnosticsConfig;
      const raw = await (config.handler as (args: unknown) => unknown)({});
      const result = buildStructuredToolResult(
        config,
        typeof raw === 'object' && raw !== null && 'data' in raw
          ? (raw as Record<string, unknown>)
          : raw,
        {}
      );

      expect(result.isError).toBe(false);
      const tool = (await client.listTools()).tools.find(
        (item) => item.name === name
      )!;
      expect(
        new AjvJsonSchemaValidator().getValidator(tool.outputSchema!)(
          result.structuredContent
        ).valid
      ).toBe(true);
      expect(JSON.parse(result.content[0].text as string)).toEqual(
        result.structuredContent
      );
      const serialized = JSON.stringify(result);
      for (const leak of ['ATTIO_API_KEY', 'Bearer ', 'token']) {
        expect(serialized).not.toContain(leak);
      }
    }
  );

  it('reports health data that a credential-free client can act on', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const raw = await (healthCheckConfig.handler as (args: unknown) => unknown)(
      { echo: 'ping' }
    );
    const result = buildStructuredToolResult(
      healthCheckConfig,
      raw,
      {}
    ) as ReturnType<typeof buildStructuredToolResult> & {
      structuredContent: { data: Record<string, unknown> };
    };

    expect(result.structuredContent.data).toMatchObject({
      ok: true,
      name: 'attio-mcp',
      environment: 'production',
      needs_api_key: true,
      echo: 'ping',
    });
  });

  it('lists the U4 families through tools/list with their declared schemas', async () => {
    const { tools } = await client.listTools();
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    for (const name of [...LIST_SURFACE, ...MEMBER_SURFACE]) {
      const tool = byName.get(name)!;
      expect(tool, name).toBeDefined();
      expect(tool.outputSchema, name).toMatchObject({ type: 'object' });
    }
    // Read-only hints stay truthful so mode filters keep working off discovery.
    for (const name of [
      'lists_list',
      'lists_get',
      'list_entries_list',
      'list_entries_filter',
      'records_get_list_memberships',
      'workspace_members_list',
      'workspace_members_search',
      'workspace_members_get',
    ]) {
      expect(
        (byName.get(name)!.annotations as { readOnlyHint?: boolean })
          ?.readOnlyHint,
        name
      ).toBe(true);
    }
    for (const name of [
      'list_entries_add',
      'list_entries_remove',
      'list_entries_update',
      'list_entries_manage',
      'lists_create',
      'lists_update_configuration',
    ]) {
      expect(
        (byName.get(name)!.annotations as { readOnlyHint?: boolean })
          ?.readOnlyHint,
        name
      ).toBe(false);
    }
  });

  it('keeps the discovery projection identical to the wire catalog', () => {
    const projected = getToolsListPayload().tools.map((tool) => tool.name);
    expect(projected.length).toBeGreaterThanOrEqual(45);
    expect(projected).toEqual(expect.arrayContaining(INVENTORY));
  });
});
