import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import { registerToolHandlers } from '@/handlers/tools/index.js';
import { universalToolConfigs } from '@/handlers/tool-configs/universal/index.js';
import { buildStructuredToolResult } from '@/handlers/tools/result-contract.js';
import {
  normalizeMetadata,
  normalizeRecordCollection,
  assertReadSuccess,
} from '@/handlers/tool-configs/universal/read-result-adapters.js';
import {
  CompanyMockFactory,
  ListMockFactory,
  TaskMockFactory,
} from '@test/utils/mock-factories/index.js';

const record = CompanyMockFactory.create();
const interaction = {
  date: '2026-01-01T00:00:00Z',
  interaction_type: 'email',
  owner_actor_type: 'workspace-member',
  owner_actor_id: 'member-1',
};
const interactions = {
  record_id: record.id.record_id,
  resource_type: 'companies',
  record_name: null,
  interactions: {
    first_email_interaction: interaction,
    last_interaction: null,
  },
};
const option = {
  id: 'option-1',
  title: 'Qualified',
  value: 'Qualified',
  is_archived: false,
};
const attribute = {
  id: 'attribute-1',
  title: 'Stage',
  api_slug: 'stage',
  type: 'status',
};
const cases = [
  ...[
    'search_records',
    'search_records_advanced',
    'search_records_by_relationship',
    'search_records_by_content',
    'search_records_by_timeframe',
  ].map((name) => ({ name, raw: [record], empty: [] })),
  { name: 'get_record_attributes', raw: [attribute], empty: [] },
  {
    name: 'discover_record_attributes',
    raw: { attributes: [attribute], mappings: { Stage: 'stage' }, count: 1 },
    empty: { attributes: [], mappings: {}, count: 0 },
  },
  {
    name: 'get_record_attribute_options',
    raw: { options: [option], attributeType: 'status' },
    empty: { options: [], attributeType: 'status' },
  },
  {
    name: 'get_record_info',
    raw: record,
    empty: { id: record.id, values: {} },
  },
  {
    name: 'get_record_interactions',
    raw: interactions,
    empty: {
      ...interactions,
      interactions: { first_email_interaction: null, last_interaction: null },
    },
  },
  {
    name: 'batch_records',
    raw: {
      operations: [
        { index: 0, success: true, result: record },
        { index: 1, success: false, error: 'Item failed' },
      ],
      summary: { total: 2, successful: 1, failed: 1 },
    },
    empty: { operations: [], summary: { total: 0, successful: 0, failed: 0 } },
  },
  {
    name: 'batch_search_records',
    raw: [
      { query: 'first', success: true, result: [record] },
      { query: 'second', success: false, error: 'Search failed' },
    ],
    empty: [],
  },
];

describe('universal read and batch output schemas over serialized MCP', () => {
  let client: Client;
  let server: Server;
  beforeEach(async () => {
    vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');
    vi.stubEnv('MCP_TEXT_RESULTS', 'false');
    server = new Server(
      { name: 'reads', version: '1' },
      { capabilities: { tools: {} } }
    );
    registerToolHandlers(server);
    client = new Client({ name: 'consumer', version: '1' });
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
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each(cases)(
    '$name publishes schema-valid success and empty domain data',
    async ({ name, raw, empty }) => {
      const config =
        universalToolConfigs[name as keyof typeof universalToolConfigs];
      const handler = vi.spyOn(config, 'handler');
      const { tools } = await client.listTools();
      const definition = tools.find((tool) => tool.name === name)!;
      expect(definition.outputSchema).toEqual(config.outputSchema);
      const validate = new AjvJsonSchemaValidator().getValidator(
        definition.outputSchema!
      );
      for (const payload of [raw, empty]) {
        handler.mockResolvedValueOnce(payload as never);
        const result = await client.callTool({
          name,
          arguments: { resource_type: 'companies' },
        });
        expect(result.isError).toBe(false);
        expect(validate(result.structuredContent).valid).toBe(true);
        expect(
          JSON.parse((result.content[0] as { text: string }).text)
        ).toEqual(result.structuredContent);
        expect(result.content).toHaveLength(1);
        const envelope = result.structuredContent as Record<string, unknown>;
        if (Array.isArray(envelope.data))
          expect(envelope.count).toBe(envelope.data.length);
        if (payload === empty && Array.isArray(empty))
          expect(envelope.data).toEqual([]);
        expect(
          validate({
            ...envelope,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Mixed',
              retryable: false,
            },
          }).valid
        ).toBe(false);
      }
      vi.stubEnv('MCP_TEXT_RESULTS', 'true');
      handler.mockResolvedValueOnce(raw as never);
      const companion = await client.callTool({
        name,
        arguments: {
          resource_type: 'companies',
          relationship_type: 'company_to_people',
          content_type: 'notes',
          info_type: 'contact',
          operation_type: 'create',
        },
      });
      expect(companion.isError).toBe(false);
      expect(companion.content).toHaveLength(2);
      expect((companion.content[1] as { text: string }).text).not.toContain(
        '[object Object]'
      );
      expect(handler).toHaveBeenCalledTimes(3);
    }
  );

  it.each(cases)(
    '$name returns only whole-call error data with no replay',
    async ({ name }) => {
      const config =
        universalToolConfigs[name as keyof typeof universalToolConfigs];
      const handler = vi
        .spyOn(config, 'handler')
        .mockRejectedValue(
          Object.assign(new Error('Access denied'), { status: 403 })
        );
      const result = await client.callTool({ name, arguments: {} });
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({
        error: { code: 'PERMISSION_DENIED', retryable: false },
      });
      expect(Object.keys(result.structuredContent!)).toEqual(['error']);
      expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(
        result.structuredContent
      );
      expect(
        new AjvJsonSchemaValidator().getValidator(config.outputSchema!)(
          result.structuredContent
        ).valid
      ).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    }
  );

  it.each(['batch_records', 'batch_search_records'])(
    '%s treats all item failures as a completed batch',
    async (name) => {
      const config =
        universalToolConfigs[name as keyof typeof universalToolConfigs];
      vi.spyOn(config, 'handler').mockResolvedValue([
        { index: 0, query: 'one', success: false, error: 'Denied' },
        { index: 1, query: 'two', success: false, error: 'Failed' },
      ] as never);
      const result = await client.callTool({ name, arguments: {} });
      expect(result.isError).toBe(false);
      expect(result.structuredContent).toMatchObject({
        count: 2,
        summary: { total: 2, successful: 0, failed: 2 },
        data: [
          { index: 0, success: false, error: { retryable: false } },
          { index: 1, success: false },
        ],
      });
    }
  );

  it('returns unsupported list attributes as a validation error before any option fetch', async () => {
    const result = await client.callTool({
      name: 'get_record_attribute_options',
      arguments: { resource_type: 'lists', attribute: 'stage' },
    });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: { code: 'VALIDATION_ERROR', retryable: false },
    });
    expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(
      result.structuredContent
    );
  });

  it('preserves option identifiers/labels and interaction aggregates', () => {
    const options = buildStructuredToolResult(
      universalToolConfigs.get_record_attribute_options,
      { options: [option], attributeType: 'status' },
      {}
    );
    expect(options.structuredContent).toEqual({
      data: [option],
      count: 1,
      attribute_type: 'status',
    });
    expect(
      buildStructuredToolResult(
        universalToolConfigs.get_record_interactions,
        interactions,
        {}
      ).structuredContent
    ).toEqual({ data: interactions });
  });

  it.each([ListMockFactory.create(), TaskMockFactory.create()])(
    'preserves native list/task identifiers',
    (native) => {
      expect(
        buildStructuredToolResult(
          universalToolConfigs.search_records_advanced,
          [native],
          {}
        ).structuredContent!.data
      ).toEqual([native]);
    }
  );

  it('distinguishes arrays, explicit wrappers, attribute maps, and documented service errors', () => {
    expect(normalizeRecordCollection([record])).toEqual(
      normalizeRecordCollection({ data: [record] })
    );
    expect(() =>
      normalizeRecordCollection({
        data: [record],
        error: 'Failed',
        success: false,
      })
    ).toThrow('Failed');
    expect(() =>
      normalizeRecordCollection({ data: [record], unexpected: true })
    ).toThrow();
    expect(() =>
      normalizeRecordCollection({ status: 403, body: { message: 'Denied' } })
    ).toThrow('Denied');
    const attributes = {
      data: [],
      error: [{ value: 'CRM field' }],
      success: [{ value: false }],
    };
    expect(normalizeMetadata(attributes)).toEqual({ data: attributes });
    expect(assertReadSuccess(attributes)).toEqual(attributes);
    expect(
      normalizeMetadata({
        attributes: [],
        mappings: {},
        note: 'Usage guidance',
      })
    ).toEqual({ data: { attributes: [], mappings: {} } });
  });

  it('keeps read-only batch search distinct from mutation-capable batching', async () => {
    const { tools } = await client.listTools();
    expect(
      tools.find((tool) => tool.name === 'batch_search_records')!.annotations!
        .readOnlyHint
    ).toBe(true);
    expect(
      tools.find((tool) => tool.name === 'batch_records')!.annotations!
        .readOnlyHint
    ).toBe(false);
    const malformed = [{ query: 'one', success: true, result: record }];
    expect(() =>
      buildStructuredToolResult(
        universalToolConfigs.batch_search_records,
        malformed,
        {}
      )
    ).toThrow();
  });
});
