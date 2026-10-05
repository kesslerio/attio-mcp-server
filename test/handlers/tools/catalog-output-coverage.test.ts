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
  'smithery_debug_config',
  'search',
  'fetch',
  'search_records',
  'get_record_details',
  'create_record',
  'update_record',
  'upsert_record',
  'delete_record',
  'merge_records',
  'create_company',
  'update_company',
  'create_deal',
  'update_deal',
  'get_record_attributes',
  'discover_record_attributes',
  'get_record_attribute_options',
  'get_record_info',
  'get_record_interactions',
  'create_note',
  'list_notes',
  'search_records_advanced',
  'search_records_by_relationship',
  'search_records_by_content',
  'search_records_by_timeframe',
  'batch_records',
  'batch_search_records',
];

const LIST_SURFACE = [
  'get-lists',
  'get-record-list-memberships',
  'get-list-details',
  'get-list-entries',
  'filter-list-entries',
  'advanced-filter-list-entries',
  'add-record-to-list',
  'remove-record-from-list',
  'update-list-entry',
  'manage-list-entry',
  'filter-list-entries-by-parent',
  'filter-list-entries-by-parent-id',
  'create-list',
  'update-list-configuration',
];

const MEMBER_SURFACE = [
  'list-workspace-members',
  'search-workspace-members',
  'get-workspace-member',
];

const INVENTORY = [...UNIVERSAL_SURFACE, ...LIST_SURFACE, ...MEMBER_SURFACE];

const STATIC_SURFACE = ['aaa-health-check', 'smithery_debug_config'];

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
      'get-lists',
      'get-list-details',
      'get-list-entries',
      'filter-list-entries',
      'get-record-list-memberships',
      'list-workspace-members',
      'search-workspace-members',
      'get-workspace-member',
    ]) {
      expect(
        (byName.get(name)!.annotations as { readOnlyHint?: boolean })
          ?.readOnlyHint,
        name
      ).toBe(true);
    }
    for (const name of [
      'add-record-to-list',
      'remove-record-from-list',
      'update-list-entry',
      'manage-list-entry',
      'create-list',
      'update-list-configuration',
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
