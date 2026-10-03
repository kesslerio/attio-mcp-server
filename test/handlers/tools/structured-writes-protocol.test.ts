import { ResponseNormalizer } from '@/services/update/ResponseNormalizer.js';
import { UniversalUpdateService } from '@/services/UniversalUpdateService.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import { registerToolHandlers } from '@/handlers/tools/index.js';
import { coreOperationsToolConfigs } from '@/handlers/tool-configs/universal/core/index.js';
import { buildDealMergePlan } from '@/services/merge/deal-merge-planner.js';
import { createErrorResult } from '@/utils/error-handler.js';
import { CompanyMockFactory } from '@test/utils/mock-factories/index.js';

const record = CompanyMockFactory.create();
const other = CompanyMockFactory.create();
const plan = buildDealMergePlan(record, other);
const note = {
  id: { note_id: record.id.record_id },
  title: 'Follow-up',
  content: 'Body',
};
const upsert = {
  action: 'created',
  resource_type: 'companies',
  record_id: record.id.record_id,
  matched_on: { attribute: 'domains', value: 'example.test' },
  changed_fields: ['name'],
  message: 'Created',
};
const cases = [
  ['create_record', record],
  ['update_record', record],
  ['delete_record', { success: true, record_id: record.id.record_id }],
  ['create_company', record],
  ['update_company', record],
  ['create_deal', record],
  ['update_deal', record],
  ['upsert_record', upsert],
  ['merge_records', { mode: 'dry_run', plan, message: 'Preview' }],
  ['create_note', note],
  ['list_notes', [note]],
] as const;

describe('core writes over serialized MCP transport', () => {
  let client: Client;
  let server: Server;
  beforeEach(async () => {
    vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');
    server = new Server(
      { name: 'writes', version: '1' },
      { capabilities: { tools: {} } }
    );
    registerToolHandlers(server);
    client = new Client({ name: 'client', version: '1' });
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
    '%s publishes matching schemas, JSON, default prose, and opt-out',
    async (name, raw) => {
      const config = coreOperationsToolConfigs[name];
      const handler = vi
        .spyOn(config, 'handler')
        .mockResolvedValue(raw as never);
      const { tools } = await client.listTools();
      const schema = tools.find((tool) => tool.name === name)!.outputSchema!;
      expect(schema).toBeDefined();
      const validate = new AjvJsonSchemaValidator().getValidator(schema);
      const result = await client.callTool({
        name,
        arguments: { resource_type: 'companies' },
      });
      expect(result.isError).toBe(false);
      expect(validate(result.structuredContent).valid).toBe(true);
      expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(
        result.structuredContent
      );
      expect(result.content).toHaveLength(2);
      expect(handler).toHaveBeenCalledOnce();
      vi.stubEnv('MCP_TEXT_RESULTS', 'false');
      const silent = await client.callTool({
        name,
        arguments: { resource_type: 'companies' },
      });
      expect(silent.content).toHaveLength(1);
      expect(silent.structuredContent).toEqual(result.structuredContent);
    }
  );

  it.each(cases)(
    '%s serializes uncertain failures envelope-first without replay',
    async (name) => {
      const config = coreOperationsToolConfigs[name];
      const handler = vi
        .spyOn(config, 'handler')
        .mockRejectedValue(
          Object.assign(new Error('Response lost'), { code: 'ECONNRESET' })
        );
      const { tools } = await client.listTools();
      const result = await client.callTool({ name, arguments: {} });
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({
        error: {
          code: 'UPSTREAM_UNAVAILABLE',
          retryable: name === 'list_notes',
        },
      });
      expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(
        result.structuredContent
      );
      expect(
        new AjvJsonSchemaValidator().getValidator(
          tools.find((tool) => tool.name === name)!.outputSchema!
        )(result.structuredContent).valid
      ).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    }
  );

  it.each(['companies', 'people', 'deals', 'tasks'])(
    'serializes native %s update normalization and rejects mode-denied writes',
    async (resource_type) => {
      const sparse = {
        ...record,
        values: { name: [{ value: 'Sparse record' }] },
      };
      const normalized = ResponseNormalizer.normalizeResponseFormat(
        resource_type,
        sparse
      );
      const write = vi
        .spyOn(UniversalUpdateService, 'updateRecord')
        .mockResolvedValue(normalized);
      const enhancedWrite = vi
        .spyOn(UniversalUpdateService, 'updateRecordWithValidation')
        .mockResolvedValue({
          record: normalized,
          validation: { warnings: [], suggestions: [], actualValues: {} },
        });
      const args = {
        resource_type,
        record_id: record.id.record_id,
        record_data: { name: 'Updated' },
      };
      const result = await client.callTool({
        name: 'update_record',
        arguments: args,
      });
      expect(result).toMatchObject({
        isError: false,
        structuredContent: { id: { record_id: record.id.record_id } },
      });
      expect(write.mock.calls.length + enhancedWrite.mock.calls.length).toBe(1);
      vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'search');
      const denied = await client.callTool({
        name: 'update_record',
        arguments: args,
      });
      expect(denied).toMatchObject({
        isError: true,
        structuredContent: {
          error: { code: 'PERMISSION_DENIED', retryable: false },
        },
      });
      expect(write.mock.calls.length + enhancedWrite.mock.calls.length).toBe(1);
    }
  );

  it('serializes an upsert preview without inventing a missing record identifier', async () => {
    vi.spyOn(
      coreOperationsToolConfigs.upsert_record,
      'handler'
    ).mockResolvedValue({
      action: 'dry_run',
      planned_action: 'created',
      resource_type: 'companies',
      matched_on: upsert.matched_on,
      changed_fields: ['name'],
      message: 'Preview',
    });
    const result = await client.callTool({
      name: 'upsert_record',
      arguments: {},
    });
    expect(result).toMatchObject({
      isError: false,
      structuredContent: { action: 'dry_run', planned_action: 'created' },
    });
    expect(result.structuredContent).not.toHaveProperty('record_id');
  });

  it('serializes a sparse merge plan with fills and linked mismatches', async () => {
    const sparsePlan = buildDealMergePlan(
      {
        ...record,
        values: {
          associated_company: [{ target_record_id: other.id.record_id }],
        },
      },
      {
        ...other,
        values: {
          name: [{ value: 'Fill' }],
          stage: [{ status: { title: 'Demo' } }],
          associated_company: [{ target_record_id: record.id.record_id }],
        },
      }
    );
    expect(sparsePlan.fills.length).toBeGreaterThan(0);
    expect(sparsePlan.dangerous_fills.length).toBeGreaterThan(0);
    expect(sparsePlan.linked_mismatches.length).toBeGreaterThan(0);
    vi.spyOn(
      coreOperationsToolConfigs.merge_records,
      'handler'
    ).mockResolvedValue({
      mode: 'dry_run',
      plan: sparsePlan,
      message: 'Review fills',
    });
    const result = await client.callTool({
      name: 'merge_records',
      arguments: {},
    });
    expect(result).toMatchObject({
      isError: false,
      structuredContent: {
        plan: {
          fingerprint: sparsePlan.fingerprint,
          fills: sparsePlan.fills,
          requires_linked_mismatch_override: true,
        },
      },
    });
    expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(
      result.structuredContent
    );
  });

  it('never falls back to another deal update after an enhanced-write failure', async () => {
    const standard = vi.spyOn(UniversalUpdateService, 'updateRecord');
    const enhanced = vi
      .spyOn(UniversalUpdateService, 'updateRecordWithValidation')
      .mockRejectedValue(
        Object.assign(new Error('Response lost'), { code: 'ECONNRESET' })
      );
    const result = await client.callTool({
      name: 'update_deal',
      arguments: {
        record_id: record.id.record_id,
        record_data: { name: 'Updated' },
      },
    });
    expect(result).toMatchObject({
      isError: true,
      structuredContent: { error: { retryable: false } },
    });
    expect(enhanced).toHaveBeenCalledOnce();
    expect(standard).not.toHaveBeenCalled();
  });

  it('preserves upsert actions and merge completion controls', async () => {
    for (const action of ['created', 'updated', 'noop', 'dry_run'] as const) {
      vi.spyOn(
        coreOperationsToolConfigs.upsert_record,
        'handler'
      ).mockResolvedValue({
        ...upsert,
        action,
        planned_action: 'updated',
      } as never);
      const result = await client.callTool({
        name: 'upsert_record',
        arguments: {},
      });
      expect(result.structuredContent).toMatchObject({
        action,
        record_id: record.id.record_id,
        planned_action: 'updated',
      });
    }
    for (const mode of ['complete', 'wait'] as const) {
      vi.spyOn(
        coreOperationsToolConfigs.merge_records,
        'handler'
      ).mockResolvedValue({
        mode,
        status: mode === 'wait' ? 202 : 200,
        new_record_id: record.id.record_id,
        original_record_ids: [record.id.record_id, other.id.record_id],
        plan,
        warning: 'Keep IDs',
      });
      const result = await client.callTool({
        name: 'merge_records',
        arguments: {},
      });
      expect(result.isError).toBe(false);
      expect(result.structuredContent).toMatchObject({
        mode,
        new_record_id: record.id.record_id,
        plan: { fingerprint: plan.fingerprint },
      });
    }
  });

  it('rejects malformed successful writes and failed-delete projections', async () => {
    for (const [name, raw] of [
      ['create_record', { values: {} }],
      ['upsert_record', { ...upsert, record_id: undefined }],
      ['delete_record', { success: false, record_id: record.id.record_id }],
      ['merge_records', { mode: 'complete', plan }],
    ] as const) {
      const handler = vi
        .spyOn(coreOperationsToolConfigs[name], 'handler')
        .mockResolvedValue(raw as never);
      const result = await client.callTool({ name, arguments: {} });
      expect(result).toMatchObject({
        isError: true,
        structuredContent: {
          error: { code: 'RESULT_ENCODING_FAILED', retryable: false },
        },
      });
      expect(handler).toHaveBeenCalledOnce();
    }
  });

  it('puts native details validation and returned legacy failures first', async () => {
    const invalid = await client.callTool({
      name: 'get_record_details',
      arguments: { resource_type: 'companies' },
    });
    expect(invalid.isError).toBe(true);
    expect(JSON.parse((invalid.content[0] as { text: string }).text)).toEqual(
      invalid.structuredContent
    );
    const failure = createErrorResult(
      new Error('Invalid input'),
      '/companies',
      'POST',
      { status: 400 }
    );
    vi.spyOn(
      coreOperationsToolConfigs.create_record,
      'handler'
    ).mockResolvedValue(failure as never);
    const returned = await client.callTool({
      name: 'create_record',
      arguments: {},
    });
    expect(returned.isError).toBe(true);
    expect(JSON.parse((returned.content[0] as { text: string }).text)).toEqual(
      returned.structuredContent
    );
    expect(
      JSON.parse(
        (failure as { content: Array<{ text: string }> }).content[0].text
      )
    ).toHaveProperty('error');
  });
});
