import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import {
  CallToolResultSchema,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { registerToolHandlers } from '@/handlers/tools/index.js';
import { getRecordDetailsConfig } from '@/handlers/tool-configs/universal/core/record-details-operations.js';
import { searchRecordsConfig } from '@/handlers/tool-configs/universal/core/search-operations.js';
import { createRecordConfig } from '@/handlers/tool-configs/universal/core/crud-operations.js';
import { getGlobalContext } from '@/api/lazy-client.js';
import { getLogContext } from '@/utils/logger.js';
import { CompanyMockFactory } from '@test/utils/mock-factories/index.js';
import type { UniversalRecordResult } from '@/types/attio.js';

describe('structured tool protocol', () => {
  let client: Client;
  let server: Server;

  beforeEach(async () => {
    vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');
    server = new Server(
      { name: 'contract-test', version: '1' },
      { capabilities: { tools: {} } }
    );
    registerToolHandlers(server);
    client = new Client({ name: 'contract-client', version: '1' });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    // Exercise JSON wire semantics, rather than sharing object references.
    for (const transport of [clientTransport, serverTransport]) {
      const send = transport.send.bind(transport);
      vi.spyOn(transport, 'send').mockImplementation((message, options) =>
        send(JSON.parse(JSON.stringify(message)), options)
      );
    }
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('lists a schema and composes search identifiers into details over tools/call', async () => {
    const record = CompanyMockFactory.create({ name: 'Contract Company' });
    vi.spyOn(searchRecordsConfig, 'handler').mockResolvedValue([record]);
    vi.spyOn(getRecordDetailsConfig, 'handler').mockResolvedValue(record);
    const { tools } = await client.listTools();
    const validator = new AjvJsonSchemaValidator();
    const searchTool = tools.find((tool) => tool.name === 'search_records')!;
    const detailsTool = tools.find(
      (tool) => tool.name === 'get_record_details'
    )!;
    expect(searchTool.outputSchema).toBeDefined();
    expect(detailsTool.outputSchema).toBeDefined();
    const search = await client.callTool({
      name: searchTool.name,
      arguments: { resource_type: 'companies' },
    });
    expect(
      validator.getValidator(searchTool.outputSchema!)(search.structuredContent)
        .valid
    ).toBe(true);
    expect(search.structuredContent).toMatchObject({
      data: [{ id: record.id }],
      count: 1,
      next_cursor: null,
    });
    const details = await client.callTool({
      name: detailsTool.name,
      arguments: { resource_type: 'companies', record_id: record.id.record_id },
    });
    expect(
      validator.getValidator(detailsTool.outputSchema!)(
        details.structuredContent
      ).valid
    ).toBe(true);
    expect(details.structuredContent).toMatchObject({
      data: { id: record.id },
    });
    expect(details.content).toHaveLength(3);
    expect(JSON.parse(details.content[0].text as string)).toEqual(
      details.structuredContent?.data
    );
    expect(JSON.parse(search.content[0].text as string)).toEqual({
      data: search.structuredContent?.data,
      count: 1,
    });
    expect(JSON.parse(details.content[2].text as string)).toEqual(
      details.structuredContent
    );
  });

  it('keeps unknown tools and malformed requests as protocol errors', async () => {
    await expect(
      client.callTool({ name: 'unknown-tool' })
    ).rejects.toMatchObject({ code: ErrorCode.InvalidParams });
    await expect(
      client.request(
        { method: 'tools/call', params: { name: 42 } },
        CallToolResultSchema
      )
    ).rejects.toMatchObject({ code: ErrorCode.InternalError });
  });

  it('denies hidden writes before executing their handler and preserves schema-valid errors', async () => {
    vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'search');
    const handler = vi.spyOn(createRecordConfig, 'handler');
    const tools = (await client.listTools()).tools;
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'aaa-health-check',
      'fetch',
      'search',
    ]);
    const result = await client.callTool({
      name: 'create_record',
      arguments: {
        resource_type: 'companies',
        record_data: { name: 'Denied' },
      },
    });
    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        error: { code: 'PERMISSION_DENIED', retryable: false },
      },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns execution validation errors before a domain call, including normalization failures', async () => {
    const result = await client.callTool({
      name: 'get_record_details',
      arguments: { resource_type: 'companies' },
    });
    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        error: { code: 'VALIDATION_ERROR', retryable: false },
      },
    });
    const handler = vi.spyOn(searchRecordsConfig, 'handler');
    const oversized = await client.callTool({
      name: 'search_records',
      arguments: {
        resource_type: 'companies',
        query: 'x'.repeat(1024 * 1024 + 1),
      },
    });
    expect(oversized).toMatchObject({
      isError: true,
      structuredContent: {
        error: { code: 'VALIDATION_ERROR', retryable: false },
      },
    });
    expect(handler).not.toHaveBeenCalled();
    const { tools } = await client.listTools();
    const schema = tools.find(
      (tool) => tool.name === 'get_record_details'
    )!.outputSchema!;
    expect(
      new AjvJsonSchemaValidator().getValidator(schema)(
        result.structuredContent
      ).valid
    ).toBe(true);
  });

  it('completes a handler once even when its companion formatter throws', async () => {
    const record = CompanyMockFactory.create();
    const handler = vi
      .spyOn(getRecordDetailsConfig, 'handler')
      .mockResolvedValue(record);
    vi.spyOn(getRecordDetailsConfig, 'formatResult').mockImplementation(() => {
      throw new Error('Formatting failed');
    });
    const result = await client.callTool({
      name: 'get_record_details',
      arguments: { resource_type: 'companies', record_id: record.id.record_id },
    });
    expect(result).toMatchObject({
      isError: false,
      structuredContent: { data: { id: record.id } },
    });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('prevents prebuilt MCP results from bypassing the representative contract', async () => {
    const handler = vi.spyOn(getRecordDetailsConfig, 'handler');
    handler.mockResolvedValueOnce({
      content: [],
      isError: true,
      error: { code: 403, message: 'Denied' },
    } as unknown as UniversalRecordResult);
    handler.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'invalid success' }],
      isError: false,
    } as unknown as UniversalRecordResult);
    for (const code of ['PERMISSION_DENIED', 'RESULT_ENCODING_FAILED']) {
      const result = await client.callTool({
        name: 'get_record_details',
        arguments: { resource_type: 'companies', record_id: 'test-id' },
      });
      expect(result).toMatchObject({
        isError: true,
        structuredContent: { error: { code, retryable: false } },
      });
    }
  });

  it('keeps a completed legacy write successful when its prose fails, and never replays an encoding failure', async () => {
    const record = CompanyMockFactory.create();
    const handler = vi
      .spyOn(createRecordConfig, 'handler')
      .mockResolvedValue(record);
    vi.spyOn(createRecordConfig, 'formatResult').mockImplementation(() => {
      throw new Error('post-write prose failed');
    });
    const args = {
      resource_type: 'companies',
      record_data: { name: 'Contract Company' },
    };
    const completed = await client.callTool({
      name: 'create_record',
      arguments: args,
    });
    expect(completed.isError).toBe(false);
    expect(handler).toHaveBeenCalledOnce();
    vi.spyOn(createRecordConfig, 'structuredOutput').mockImplementation(() => {
      throw new Error('post-write encoding failed');
    });
    const failedEncoding = await client.callTool({
      name: 'create_record',
      arguments: args,
    });
    expect(failedEncoding).toMatchObject({
      isError: true,
      structuredContent: {
        error: {
          code: 'RESULT_ENCODING_FAILED',
          retryable: false,
          message: expect.stringContaining('Read back'),
        },
      },
    });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('keeps concurrent tenant and error contexts separate without mutating caller arguments', async () => {
    const tenantA = { getApiKey: () => 'test-tenant-a' };
    const tenantB = { getApiKey: () => 'test-tenant-b' };
    registerToolHandlers(server, tenantA);
    const otherServer = new Server(
      { name: 'other-tenant', version: '1' },
      { capabilities: { tools: {} } }
    );
    registerToolHandlers(otherServer, tenantB);
    const otherClient = new Client({ name: 'other-client', version: '1' });
    const [otherClientTransport, otherServerTransport] =
      InMemoryTransport.createLinkedPair();
    await otherServer.connect(otherServerTransport);
    await otherClient.connect(otherClientTransport);
    const observed: Array<{ tenant: unknown; correlationId?: string }> = [];
    let releaseA!: () => void;
    let enteredA!: () => void;
    const entered = new Promise<void>((resolve) => {
      enteredA = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    vi.spyOn(searchRecordsConfig, 'handler').mockImplementation(
      async (args) => {
        const tenant = getGlobalContext()?.getApiKey as () => string;
        const before = getLogContext();
        if (args.query === 'A') {
          enteredA();
          await release;
        }
        observed.push({
          tenant: tenant(),
          correlationId: getLogContext().correlationId,
        });
        expect(getLogContext().correlationId).toBe(before.correlationId);
        expect(getGlobalContext()?.getApiKey).toBe(tenant);
        throw Object.assign(new Error('Denied'), { status: 403 });
      }
    );
    const argsA = { resource_type: 'companies', query: 'A' };
    try {
      const pendingA = client.callTool({
        name: 'search_records',
        arguments: argsA,
      });
      await entered;
      const resultB = await otherClient.callTool({
        name: 'search_records',
        arguments: { resource_type: 'companies', query: 'B' },
      });
      releaseA();
      const resultA = await pendingA;
      expect(argsA).toEqual({ resource_type: 'companies', query: 'A' });
      expect(observed.map((item) => item.tenant)).toEqual([
        'test-tenant-b',
        'test-tenant-a',
      ]);
      expect(observed[0].correlationId).not.toBe(observed[1].correlationId);
      expect(resultA.structuredContent?.error).toMatchObject({
        message: expect.stringContaining(observed[1].correlationId!),
      });
      expect(resultB.structuredContent?.error).toMatchObject({
        message: expect.stringContaining(observed[0].correlationId!),
      });
    } finally {
      releaseA();
      await otherClient.close();
      await otherServer.close();
    }
  });
});
