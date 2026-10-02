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
import * as companyOperations from '@/objects/companies/index.js';
import * as listOperations from '@/objects/lists.js';
import * as listBase from '@/objects/lists/base.js';
import { listsToolConfigs } from '@/handlers/tool-configs/lists.js';
import { ListConfigurationValidator } from '@/services/lists/ListConfigurationValidator.js';
import { OpenAiCompatibilityService } from '@/services/OpenAiCompatibilityService.js';
import * as noteOperations from '@/objects/notes.js';
import * as lazyClient from '@/api/lazy-client.js';
import { StrategyFactory } from '@/services/search/StrategyFactory.js';
import { TaskSearchStrategy } from '@/services/search-strategies/TaskSearchStrategy.js';
import { NoteSearchStrategy } from '@/services/search-strategies/NoteSearchStrategy.js';
import { UniversalSearchService } from '@/services/UniversalSearchService.js';
import { UniversalRetrievalService } from '@/services/UniversalRetrievalService.js';
import { EnhancedApiError } from '@/errors/enhanced-api-errors.js';
import type { AttioNote, UniversalRecordResult } from '@/types/attio.js';

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

  it('serializes field-filtered details without an optional updated timestamp', async () => {
    const record = CompanyMockFactory.create();
    delete record.updated_at;
    vi.spyOn(companyOperations, 'getCompanyDetails').mockResolvedValue(record);
    const result = await client.callTool({ name: 'get_record_details', arguments: {
      resource_type: 'companies', record_id: record.id.record_id, fields: ['name'],
    } });
    expect(result).toMatchObject({ isError: false, structuredContent: { data: { id: record.id, values: { name: expect.anything() } } } });
    expect(result.structuredContent?.data).not.toHaveProperty('updated_at');
  });

  it('rejects unsupported resource types before the handler', async () => {
    const handler = vi.spyOn(searchRecordsConfig, 'handler');
    const result = await client.callTool({ name: 'search_records', arguments: { resource_type: 'unsupported-resource' } });
    expect(result).toMatchObject({ isError: true, structuredContent: { error: { code: 'VALIDATION_ERROR', retryable: false } } });
    expect(handler).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'VALIDATION_ERROR', false], [401, 'UNAUTHENTICATED', false],
    [403, 'PERMISSION_DENIED', false], [404, 'NOT_FOUND', false],
    [429, 'RATE_LIMITED', true], [503, 'UPSTREAM_UNAVAILABLE', true],
  ] as const)('preserves original status %s through connector and list wrappers', async (status, code, retryable) => {
    const error = new EnhancedApiError('Upstream call failed', status, '/lists', 'GET');
    vi.spyOn(OpenAiCompatibilityService, 'search').mockRejectedValue(error);
    vi.spyOn(OpenAiCompatibilityService, 'fetch').mockRejectedValue(error);
    vi.spyOn(listOperations, 'getListEntries').mockRejectedValue(error);
    const id = CompanyMockFactory.create().id.record_id;
    for (const [name, args] of [
      ['search', { query: 'company' }], ['fetch', { id: `companies:${id}` }], ['get-list-entries', { listId: id }],
    ] as const) {
      const result = await client.callTool({ name, arguments: args });
      expect(result).toMatchObject({ isError: true, structuredContent: { error: { code, retryable } } });
    }
  });

  it.each([['search', { query: '' }], ['fetch', { id: '' }]] as const)(
    'keeps connector %s input errors classified as validation', async (name, args) => {
      const search = vi.spyOn(OpenAiCompatibilityService, 'search');
      const fetch = vi.spyOn(OpenAiCompatibilityService, 'fetch');
      const result = await client.callTool({ name, arguments: args });
      expect(result).toMatchObject({ isError: true, structuredContent: { error: { code: 'VALIDATION_ERROR', retryable: false } } });
      expect(search).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it.each([400, 403, 429, 503])('preserves status %s through list configuration error categorization', async (status) => {
    vi.spyOn(ListConfigurationValidator, 'validateParentObject').mockResolvedValue(undefined);
    vi.spyOn(listBase, 'createList').mockRejectedValue(new EnhancedApiError('List creation failed', status, '/lists', 'POST'));
    const result = await client.callTool({ name: 'create-list', arguments: { name: 'Test list', parent_object: 'companies' } });
    const code = { 400: 'VALIDATION_ERROR', 403: 'PERMISSION_DENIED', 429: 'RATE_LIMITED', 503: 'UPSTREAM_UNAVAILABLE' }[status];
    expect(result).toMatchObject({ isError: true, structuredContent: { error: { code, retryable: false } } });
  });

  it.each(['get-list-entries', 'add-record-to-list', 'remove-record-from-list'])(
    'rejects invalid list IDs in %s without formatting or mutation', async (name) => {
      const read = vi.spyOn(listOperations, 'getListEntries');
      const add = vi.spyOn(listOperations, 'addRecordToList');
      const remove = vi.spyOn(listOperations, 'removeRecordFromList');
      const entriesFormatter = vi.spyOn(listsToolConfigs.getListEntries, 'formatResult');
      const addFormatter = vi.spyOn(listsToolConfigs.addRecordToList, 'formatResult');
      const result = await client.callTool({ name, arguments: { listId: 'not-a-uuid', recordId: 'record-id', entryId: 'entry-id', objectType: 'companies' } });
      expect(result).toMatchObject({ isError: true, structuredContent: { error: { code: 'VALIDATION_ERROR', retryable: false } } });
      for (const spy of [read, add, remove, entriesFormatter, addFormatter]) expect(spy).not.toHaveBeenCalled();
    }
  );

  it.each(['true', 'false'])('preserves valid list and connector successes under prose setting %s', async (setting) => {
    vi.stubEnv('MCP_TEXT_RESULTS', setting);
    const record = CompanyMockFactory.create();
    const id = record.id.record_id;
    vi.spyOn(listOperations, 'getListEntries').mockResolvedValue([]);
    vi.spyOn(listOperations, 'addRecordToList').mockResolvedValue({ id: { entry_id: id } } as never);
    const remove = vi.spyOn(listOperations, 'removeRecordFromList').mockResolvedValue(true);
    vi.spyOn(OpenAiCompatibilityService, 'search').mockResolvedValue([]);
    vi.spyOn(OpenAiCompatibilityService, 'fetch').mockResolvedValue({ id: `companies:${id}`, title: 'Company', text: 'Content', url: 'https://app.attio.com' } as never);
    for (const [name, args] of [
      ['get-list-entries', { listId: id }], ['add-record-to-list', { listId: id, recordId: id, objectType: 'companies' }],
      ['remove-record-from-list', { listId: id, entryId: id }], ['search', { query: 'company' }], ['fetch', { id: `companies:${id}` }],
    ] as const) {
      const result = await client.callTool({ name, arguments: args });
      expect(result.isError).toBe(false);
      expect(result.content.length).toBeGreaterThan(0);
      if (name === 'search') expect(JSON.parse(result.content[0].text as string)).toEqual({ results: [] });
      if (name === 'fetch') expect(JSON.parse(result.content[0].text as string)).toMatchObject({ id: `companies:${id}` });
    }
    expect(remove).toHaveBeenCalledOnce();
  });

  it('serializes filtered notes without inventing a top-level timestamp', async () => {
    const id = CompanyMockFactory.create().id.record_id;
    vi.spyOn(noteOperations, 'getNote').mockResolvedValue({
      data: { id, title: 'Note title', content: 'CRM content' } as AttioNote,
    });
    const result = await client.callTool({
      name: 'get_record_details',
      arguments: { resource_type: 'notes', record_id: id, fields: ['title'] },
    });
    expect(result).toMatchObject({
      isError: false,
      structuredContent: { data: { id: { record_id: id }, values: { title: 'Note title' } } },
    });
    expect(result.structuredContent?.data).not.toHaveProperty('created_at');
  });

  it.each([false, true])('serializes searched notes with optional actor present=%s', async (withActor) => {
    const id = CompanyMockFactory.create().id.record_id;
    const actor = { id: 'actor-id', type: 'workspace-member' };
    const strategy = new NoteSearchStrategy({ noteFunction: vi.fn().mockResolvedValue({
      data: [{ id, title: 'Note title', content: 'CRM content', ...(withActor ? { created_by_actor: actor } : {}) }],
    }) });
    vi.spyOn(StrategyFactory, 'getStrategy').mockResolvedValue(strategy);
    const result = await client.callTool({ name: 'search_records', arguments: { resource_type: 'notes' } });
    expect(result).toMatchObject({
      isError: false,
      structuredContent: { data: [{ id: { note_id: id }, values: { content_markdown: 'CRM content' } }], count: 1, next_cursor: null },
    });
    const record = (result.structuredContent?.data as Array<{ values: Record<string, unknown> }>)[0];
    if (withActor) expect(record.values.created_by_actor).toEqual(actor);
    else expect(record.values).not.toHaveProperty('created_by_actor');
  });

  it.each(['tasks', 'notes'] as const)('propagates %s search failures and preserves genuine empty pages', async (resourceType) => {
    const upstream = vi.fn();
    const strategy = resourceType === 'tasks'
      ? new TaskSearchStrategy({ taskFunction: upstream })
      : new NoteSearchStrategy({ noteFunction: upstream });
    vi.spyOn(StrategyFactory, 'getStrategy').mockResolvedValue(strategy);
    for (const [status, code, retryable] of [[403, 'PERMISSION_DENIED', false], [503, 'UPSTREAM_UNAVAILABLE', true]] as const) {
      upstream.mockRejectedValueOnce(new EnhancedApiError('Search failed', status, `/${resourceType}`, 'GET'));
      const result = await client.callTool({ name: 'search_records', arguments: { resource_type: resourceType } });
      expect(result).toMatchObject({ isError: true, structuredContent: { error: { code, retryable } } });
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.structuredContent).not.toHaveProperty('data');
    }
    upstream.mockResolvedValueOnce(resourceType === 'tasks' ? [] : { data: [] });
    const empty = await client.callTool({ name: 'search_records', arguments: { resource_type: resourceType } });
    expect(empty).toMatchObject({ isError: false, structuredContent: { data: [], count: 0, next_cursor: null } });
    expect(upstream).toHaveBeenCalledTimes(3);
  });

  it.each(['tasks', 'notes'] as const)('rejects malformed %s search responses', async (resourceType) => {
    const upstream = vi.fn().mockResolvedValue(resourceType === 'tasks' ? {} : { data: {} });
    const strategy = resourceType === 'tasks'
      ? new TaskSearchStrategy({ taskFunction: upstream })
      : new NoteSearchStrategy({ noteFunction: upstream });
    vi.spyOn(StrategyFactory, 'getStrategy').mockResolvedValue(strategy);
    const result = await client.callTool({ name: 'search_records', arguments: { resource_type: resourceType } });
    expect(result).toMatchObject({ isError: true, structuredContent: { error: { code: 'RESULT_ENCODING_FAILED', retryable: false } } });
    expect(upstream).toHaveBeenCalledOnce();
  });

  it('classifies actual missing credentials through the details enhancement path', async () => {
    const actual = await vi.importActual<typeof import('@/api/attio-client.js')>('@/api/attio-client.js');
    const id = CompanyMockFactory.create().id.record_id;
    vi.spyOn(lazyClient, 'getLazyAttioClient').mockImplementation(() => actual.createAttioClient({ apiKey: '' }));
    const result = await client.callTool({ name: 'get_record_details', arguments: { resource_type: 'companies', record_id: id } });
    expect(result).toMatchObject({ isError: true, structuredContent: { error: { code: 'UNAUTHENTICATED', retryable: false } } });
  });

  it.each([
    ['fetch', { id: 'companies' }], ['fetch', { id: 'companies:' }],
    ['fetch', { id: 'unsupported:record-id' }], ['search', { query: ' ' }],
  ] as const)('rejects semantic connector input for %s before a domain call', async (name, args) => {
    const search = vi.spyOn(UniversalSearchService, 'searchRecords');
    const details = vi.spyOn(UniversalRetrievalService, 'getRecordDetails');
    const result = await client.callTool({ name, arguments: args });
    expect(result).toMatchObject({ isError: true, structuredContent: { error: { code: 'VALIDATION_ERROR', retryable: false } } });
    expect(search).not.toHaveBeenCalled();
    expect(details).not.toHaveBeenCalled();
  });

  it.each([
    ['add-record-to-list', { recordId: 42, objectType: 'companies' }],
    ['add-record-to-list', { recordId: 'record-id', objectType: 'unsupported' }],
    ['update-list-entry', { entryId: 42, attributes: {} }],
    ['update-list-entry', { entryId: 'entry-id', attributes: [] }],
    ['remove-record-from-list', { entryId: 42 }],
    ['manage-list-entry', { listId: 42, recordId: 'record-id', objectType: 'companies' }],
    ['manage-list-entry', { recordId: 'record-id', objectType: 'unsupported' }],
    ['manage-list-entry', { entryId: 42, attributes: {} }],
    ['manage-list-entry', { entryId: 'entry-id', attributes: [] }],
    ['manage-list-entry', { entryId: 42 }],
    ['manage-list-entry', { recordId: 'record-id' }],
  ] as const)('rejects semantic list input for %s before any request', async (name, args) => {
    const api = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() };
    vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
    const result = await client.callTool({ name, arguments: { listId: CompanyMockFactory.create().id.record_id, ...args } });
    expect(result).toMatchObject({ isError: true, structuredContent: { error: { code: 'VALIDATION_ERROR', retryable: false } } });
    for (const method of Object.values(api)) expect(method).not.toHaveBeenCalled();
  });

  it('keeps valid list add, update, and remove paths successful', async () => {
    const id = CompanyMockFactory.create().id.record_id;
    const entry = { id: { entry_id: id, list_id: id } };
    const api = {
      post: vi.fn().mockResolvedValue({ data: { data: entry } }),
      patch: vi.fn().mockResolvedValue({ data: { data: entry } }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
    };
    vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
    for (const [name, args] of [
      ['add-record-to-list', { recordId: id, objectType: 'companies' }],
      ['update-list-entry', { entryId: id, attributes: { stage: 'New' } }],
      ['remove-record-from-list', { entryId: id }],
      ['manage-list-entry', { recordId: id, objectType: 'companies' }],
      ['manage-list-entry', { entryId: id, attributes: { stage: 'New' } }],
      ['manage-list-entry', { entryId: id }],
    ] as const) {
      const result = await client.callTool({ name, arguments: { listId: id, ...args } });
      expect(result.isError).toBe(false);
    }
    for (const method of Object.values(api)) expect(method).toHaveBeenCalledTimes(2);
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
