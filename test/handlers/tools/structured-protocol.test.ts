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
import { CompanyMockFactory, ListMockFactory, TaskMockFactory } from '@test/utils/mock-factories/index.js';
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
import { clearAllCaches, ClientCache } from '@/api/client-cache.js';
import * as attioClientModule from '@/api/attio-client.js';
import * as retryOperations from '@/api/operations/retry.js';
import { CompanySearchStrategy } from '@/services/search-strategies/CompanySearchStrategy.js';
import { DealSearchStrategy } from '@/services/search-strategies/DealSearchStrategy.js';
import { PeopleSearchStrategy } from '@/services/search-strategies/PeopleSearchStrategy.js';
import { ListSearchStrategy } from '@/services/search-strategies/ListSearchStrategy.js';
import { NoteSearchStrategy } from '@/services/search-strategies/NoteSearchStrategy.js';
import { RecordsSearchService } from '@/services/search/RecordsSearchService.js';
import { createSecureToolErrorResult } from '@/utils/secure-error-handler.js';
import * as searchOperations from '@/api/operations/search.js';
import { ResourceType } from '@/types/attio.js';
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
    clearAllCaches();
    StrategyFactory.clearStrategies();
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

  it.each(['absent', 'undefined', 0, 12] as const)(
    'serializes native list search and details with entry_count=%s',
    async (entryCount) => {
      vi.stubEnv('USE_MOCK_DATA', 'false');
      const list = ListMockFactory.create();
      delete list.entry_count;
      if (entryCount !== 'absent') {
        list.entry_count = entryCount === 'undefined' ? undefined : entryCount;
      }
      const api = {
        get: vi.fn()
          .mockResolvedValueOnce({ data: { data: [list] } })
          .mockResolvedValueOnce({ data: { data: list } }),
      };
      vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
      vi.spyOn(StrategyFactory, 'getStrategy').mockResolvedValue(
        new ListSearchStrategy({ listFunction: listOperations.searchLists })
      );
      const search = await client.callTool({
        name: 'search_records', arguments: { resource_type: 'lists' },
      });
      const details = await client.callTool({
        name: 'get_record_details',
        arguments: { resource_type: 'lists', record_id: list.id.list_id },
      });
      expect(search).toMatchObject({
        isError: false,
        structuredContent: { data: [{ id: { list_id: list.id.list_id } }], count: 1, next_cursor: null },
      });
      expect(details).toMatchObject({
        isError: false, structuredContent: { data: { id: { list_id: list.id.list_id } } },
      });
      const found = (search.structuredContent?.data as Array<Record<string, unknown>>)[0];
      for (const record of [found, details.structuredContent?.data]) {
        if (typeof entryCount === 'number') expect(record).toHaveProperty('entry_count', entryCount);
        else expect(record).not.toHaveProperty('entry_count');
      }
      expect(api.get).toHaveBeenCalledTimes(2);
    }
  );

  it.each(['tasks', 'people'] as const)(
    'preserves missing credentials through native %s reads and connectors',
    async (resourceType) => {
      const actual = await vi.importActual<typeof import('@/api/attio-client.js')>('@/api/attio-client.js');
      vi.stubEnv('USE_MOCK_DATA', 'false');
      vi.stubEnv('ATTIO_API_KEY', undefined);
      vi.stubEnv('ATTIO_ACCESS_TOKEN', undefined);
      clearAllCaches();
      StrategyFactory.clearStrategies();
      vi.spyOn(attioClientModule, 'createAttioClient').mockImplementation(actual.createAttioClient);
      vi.spyOn(attioClientModule, 'getAttioClient').mockImplementation(actual.getAttioClient);
      const id = CompanyMockFactory.create().id.record_id;
      for (const [name, args] of [
        ['search_records', { resource_type: resourceType }],
        ['get_record_details', { resource_type: resourceType, record_id: id }],
        ['search', { type: resourceType, query: 'Company' }],
        ['fetch', { id: `${resourceType}:${id}` }],
      ] as const) {
        clearAllCaches();
        expect(ClientCache.hasInstance()).toBe(false);
        const result = await client.callTool({ name, arguments: args });
        expect(result).toMatchObject({
          isError: true,
          structuredContent: { error: { code: 'UNAUTHENTICATED', retryable: false } },
        });
        expect(ClientCache.hasInstance()).toBe(false);
      }
    }
  );

  it.each(['tasks', 'people'] as const)(
    'retains native %s upstream classifications and successful empty reads',
    async (resourceType) => {
      vi.stubEnv('USE_MOCK_DATA', 'false');
      StrategyFactory.clearStrategies();
      clearAllCaches();
      const api = { defaults: {}, get: vi.fn(), post: vi.fn() };
      vi.spyOn(attioClientModule, 'createAttioClient').mockReturnValue(api as never);
      vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
      vi.spyOn(retryOperations, 'callWithRetry').mockImplementation(async (operation) => operation());
      for (const [status, code, retryable] of [
        [403, 'PERMISSION_DENIED', false], [404, 'NOT_FOUND', false],
        [429, 'RATE_LIMITED', true], [503, 'UPSTREAM_UNAVAILABLE', true],
      ] as const) {
        const id = CompanyMockFactory.create().id.record_id;
        const failure = new EnhancedApiError('Native read failed', status, `/${resourceType}`, 'GET');
        api.get.mockRejectedValue(failure);
        api.post.mockRejectedValue(failure);
        for (const [name, args] of [
          ['search_records', { resource_type: resourceType }],
          ['get_record_details', { resource_type: resourceType, record_id: id }],
          ['search', { type: resourceType, query: 'Company' }],
          ['fetch', { id: `${resourceType}:${id}` }],
        ] as const) {
          const result = await client.callTool({ name, arguments: args });
          expect(result).toMatchObject({
            isError: true, structuredContent: { error: { code, retryable } },
          });
        }
      }
      api.get.mockResolvedValue({ data: { data: [] } });
      api.post.mockResolvedValue({ data: { data: [] } });
      const empty = await client.callTool({
        name: 'search_records', arguments: { resource_type: resourceType },
      });
      expect(empty).toMatchObject({
        isError: false, structuredContent: { data: [], count: 0, next_cursor: null },
      });
      const connector = await client.callTool({
        name: 'search', arguments: { type: resourceType, query: 'Company' },
      });
      expect(connector.isError).toBe(false);
      expect(JSON.parse(connector.content[0].text as string)).toEqual({ results: [] });
    }
  );

  it.each(['companies', 'people', 'deals'] as const)(
    'propagates %s empty-filter failures and preserves empty success',
    async (resourceType) => {
      vi.stubEnv('USE_MOCK_DATA', 'false');
      const upstream = vi.fn().mockRejectedValueOnce(
        new EnhancedApiError('Read denied', 403, `/${resourceType}`, 'POST')
      );
      const strategy = resourceType === 'companies'
        ? new CompanySearchStrategy({ advancedSearchFunction: upstream })
        : resourceType === 'people'
          ? new PeopleSearchStrategy({ paginatedSearchFunction: upstream })
          : new DealSearchStrategy({ advancedSearchFunction: upstream });
      vi.spyOn(StrategyFactory, 'getStrategy').mockResolvedValue(strategy);
      const args = { resource_type: resourceType };
      const failed = await client.callTool({ name: 'search_records', arguments: args });
      expect(failed).toMatchObject({
        isError: true,
        structuredContent: { error: { code: 'PERMISSION_DENIED', retryable: false } },
      });
      upstream.mockResolvedValueOnce(resourceType === 'people' ? { results: [] } : []);
      const empty = await client.callTool({ name: 'search_records', arguments: args });
      expect(empty).toMatchObject({
        isError: false, structuredContent: { data: [], count: 0, next_cursor: null },
      });
      expect(upstream).toHaveBeenCalledTimes(2);
    }
  );

  it('serializes null assignees through native task search and details', async () => {
    vi.stubEnv('USE_MOCK_DATA', 'false');
    clearAllCaches();
    StrategyFactory.clearStrategies();
    const task = { ...TaskMockFactory.create(), assignee: null };
    const api = {
      defaults: {},
      get: vi.fn()
        .mockResolvedValueOnce({ data: { data: [task] } })
        .mockResolvedValueOnce({ data: { data: task } }),
    };
    vi.spyOn(attioClientModule, 'createAttioClient').mockReturnValue(api as never);
    vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
    const search = await client.callTool({
      name: 'search_records', arguments: { resource_type: 'tasks' },
    });
    const details = await client.callTool({
      name: 'get_record_details',
      arguments: { resource_type: 'tasks', record_id: task.id.task_id },
    });
    expect(search).toMatchObject({
      isError: false,
      structuredContent: { data: [{ id: { task_id: task.id.task_id } }], count: 1, next_cursor: null },
    });
    expect(details).toMatchObject({
      isError: false, structuredContent: { data: { id: { task_id: task.id.task_id } } },
    });
    const found = (search.structuredContent?.data as Array<Record<string, unknown>>)[0];
    for (const record of [found, details.structuredContent?.data as Record<string, unknown>]) {
      expect(record).not.toHaveProperty('assignee');
      expect(record).not.toHaveProperty('assignee_id');
      expect(record.values).not.toHaveProperty('assignee');
      expect(record.values).toHaveProperty('content', task.content);
    }
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it.each(['tasks', 'notes', 'lists', 'companies', 'people', 'deals', 'records'] as const)(
    'rejects malformed native %s collections and accepts empty data',
    async (resourceType) => {
      vi.stubEnv('USE_MOCK_DATA', 'false');
      clearAllCaches();
      StrategyFactory.clearStrategies();
      const api = { defaults: {}, get: vi.fn(), post: vi.fn() };
      vi.spyOn(attioClientModule, 'createAttioClient').mockReturnValue(api as never);
      vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
      for (const payload of [undefined, {}, { data: {} }, { data: null }, { data: false }]) {
        api.get.mockReset().mockResolvedValue({ data: payload });
        api.post.mockReset().mockResolvedValue({ data: payload });
        const result = await client.callTool({
          name: 'search_records', arguments: { resource_type: resourceType },
        });
        expect(result).toMatchObject({
          isError: true,
          structuredContent: { error: { code: 'RESULT_ENCODING_FAILED', retryable: false } },
        });
        expect(result.structuredContent).not.toHaveProperty('data');
        expect(api.get.mock.calls.length + api.post.mock.calls.length).toBe(1);
      }
      api.get.mockReset().mockResolvedValue({ data: { data: [] } });
      api.post.mockReset().mockResolvedValue({ data: { data: [] } });
      expect(await client.callTool({
        name: 'search_records', arguments: { resource_type: resourceType },
      })).toMatchObject({
        isError: false, structuredContent: { data: [], count: 0, next_cursor: null },
      });
    }
  );

  it.each(['data', 'lists', 'items', 'raw'] as const)(
    'preserves the native list collection alias %s and real identity', async (alias) => {
      vi.stubEnv('USE_MOCK_DATA', 'false');
      StrategyFactory.clearStrategies();
      const list = ListMockFactory.create();
      const api = { get: vi.fn() };
      vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
      for (const data of [[], [list]]) {
        api.get.mockResolvedValue({ data: alias === 'raw' ? data : { [alias]: data } });
        expect(await client.callTool({
          name: 'search_records', arguments: { resource_type: 'lists' },
        })).toMatchObject({
          isError: false,
          structuredContent: { data: data.length ? [{ id: { list_id: list.id.list_id } }] : [], count: data.length, next_cursor: null },
        });
      }
      expect(api.get).toHaveBeenCalledTimes(2);
    }
  );

  it.each(['lists', 'notes', 'tasks'] as const)(
    'rejects native %s details without fabricating identity', async (resourceType) => {
      vi.stubEnv('USE_MOCK_DATA', 'false');
      clearAllCaches();
      const api = { defaults: {}, get: vi.fn().mockResolvedValue({ data: { data: {} } }) };
      vi.spyOn(attioClientModule, 'createAttioClient').mockReturnValue(api as never);
      vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
      expect(await client.callTool({
        name: 'get_record_details',
        arguments: { resource_type: resourceType, record_id: CompanyMockFactory.create().id.record_id },
      })).toMatchObject({
        isError: true,
        structuredContent: { error: { code: 'RESULT_ENCODING_FAILED', retryable: false } },
      });
      expect(api.get).toHaveBeenCalledOnce();
    }
  );

  it.each(['timeframe', 'relationship', 'content'] as const)(
    'preserves credentials, failures and native response shape in %s queries', async (kind) => {
      const actual = await vi.importActual<typeof import('@/api/attio-client.js')>('@/api/attio-client.js');
      vi.stubEnv('USE_MOCK_DATA', 'false');
      vi.stubEnv('ATTIO_API_KEY', undefined);
      vi.stubEnv('ATTIO_ACCESS_TOKEN', undefined);
      clearAllCaches();
      const factory = vi.spyOn(attioClientModule, 'createAttioClient').mockImplementation(actual.createAttioClient);
      vi.spyOn(attioClientModule, 'getAttioClient').mockImplementation(actual.getAttioClient);
      const args = {
        resource_type: 'companies',
        ...(kind === 'timeframe' ? { created_after: '2026-10-01T00:00:00Z' }
          : kind === 'relationship' ? {
            search_type: 'relationship', relationship_target_type: 'people',
            relationship_target_id: CompanyMockFactory.create().id.record_id,
          } : { search_type: 'content', query: 'Company', content_fields: ['name'] }),
      };
      expect(ClientCache.hasInstance()).toBe(false);
      expect(await client.callTool({ name: 'search_records', arguments: args })).toMatchObject({
        isError: true, structuredContent: { error: { code: 'UNAUTHENTICATED', retryable: false } },
      });
      expect(ClientCache.hasInstance()).toBe(false);
      const api = { defaults: {}, post: vi.fn() };
      factory.mockReturnValue(api as never);
      vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
      for (const [status, code, retryable] of [
        [400, 'VALIDATION_ERROR', false], [403, 'PERMISSION_DENIED', false],
        [404, 'NOT_FOUND', false], [429, 'RATE_LIMITED', true], [503, 'UPSTREAM_UNAVAILABLE', true],
      ] as const) {
        api.post.mockRejectedValue({ response: { status, data: { message: 'Query rejected' } } });
        expect(await client.callTool({ name: 'search_records', arguments: args })).toMatchObject({
          isError: true, structuredContent: { error: { code, retryable } },
        });
      }
      api.post.mockReset().mockResolvedValue({ data: { data: {} } });
      expect(await client.callTool({ name: 'search_records', arguments: args })).toMatchObject({
        isError: true, structuredContent: { error: { code: 'RESULT_ENCODING_FAILED', retryable: false } },
      });
      expect(api.post).toHaveBeenCalledOnce();
      api.post.mockResolvedValue({ data: { data: [] } });
      expect(await client.callTool({ name: 'search_records', arguments: args })).toMatchObject({
        isError: false, structuredContent: { data: [], count: 0, next_cursor: null },
      });
    }
  );

  it('preserves custom-object credentials, causes, malformed results and empty success', async () => {
    const actual = await vi.importActual<typeof import('@/api/attio-client.js')>('@/api/attio-client.js');
    vi.stubEnv('ATTIO_API_KEY', undefined);
    vi.stubEnv('ATTIO_ACCESS_TOKEN', undefined);
    clearAllCaches();
    vi.spyOn(attioClientModule, 'createAttioClient').mockImplementation(actual.createAttioClient);
    vi.spyOn(attioClientModule, 'getAttioClient').mockImplementation(actual.getAttioClient);
    const credentialFailure = await RecordsSearchService.searchCustomObject('funds').catch((error: unknown) => error);
    expect(createSecureToolErrorResult(credentialFailure)).toMatchObject({
      isError: true, structuredContent: { error: { code: 'UNAUTHENTICATED', retryable: false } },
    });
    const api = { post: vi.fn() };
    vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
    for (const [status, code, retryable] of [
      [400, 'VALIDATION_ERROR', false], [403, 'PERMISSION_DENIED', false],
      [404, 'NOT_FOUND', false], [429, 'RATE_LIMITED', true], [503, 'UPSTREAM_UNAVAILABLE', true],
    ] as const) {
      const failure = { response: { status, data: { message: 'Query rejected' } } };
      api.post.mockRejectedValue(failure);
      try {
        await RecordsSearchService.searchCustomObject('funds');
        expect.fail('Expected custom-object search to reject');
      } catch (error) {
        expect(error).toHaveProperty('cause', failure);
        expect(createSecureToolErrorResult(error)).toMatchObject({
          isError: true, structuredContent: { error: { code, retryable } },
        });
      }
    }
    api.post.mockReset().mockResolvedValue({ data: {} });
    await expect(RecordsSearchService.searchCustomObject('funds')).rejects.toMatchObject({
      cause: { code: 'RESULT_ENCODING_FAILED' },
    });
    expect(api.post).toHaveBeenCalledOnce();
    api.post.mockResolvedValue({ data: { data: [] } });
    await expect(RecordsSearchService.searchCustomObject('funds')).resolves.toEqual([]);
  });

  it.each(['fast', 'primary', 'recall', 'advanced', 'list'] as const)(
    'rejects malformed record responses in the native %s path', async (path) => {
      const api = { post: vi.fn().mockResolvedValue({ data: { data: {} } }) };
      vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
      const query = path === 'fast' ? `${CompanyMockFactory.create().id.record_id}.com` : path === 'recall' ? 'Company Example' : '';
      if (path === 'recall') {
        api.post.mockResolvedValueOnce({ data: { data: [] } })
          .mockResolvedValueOnce({ data: { data: [] } })
          .mockResolvedValueOnce({ data: { data: [] } });
      }
      const operation = path === 'advanced' ? searchOperations.advancedSearchObject(ResourceType.COMPANIES)
        : path === 'list' ? searchOperations.listObjects(ResourceType.COMPANIES)
          : searchOperations.searchObject(ResourceType.COMPANIES, query);
      await expect(operation).rejects.toMatchObject({ code: 'RESULT_ENCODING_FAILED' });
      expect(api.post).toHaveBeenCalledTimes(path === 'recall' ? 4 : 1);
    }
  );

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

  it.each(['ECONNABORTED', 'EHOSTUNREACH', 'ENETUNREACH'])(
    'publishes %s as a retryable read failure through native timeframe search',
    async (code) => {
      vi.stubEnv('USE_MOCK_DATA', 'false');
      const failure = Object.assign(new Error('Transport request failed'), { code });
      const api = { post: vi.fn().mockRejectedValue(failure) };
      vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
      const result = await client.callTool({
        name: 'search_records',
        arguments: {
          resource_type: 'companies',
          created_after: '2026-10-01T00:00:00Z',
        },
      });
      expect(result).toMatchObject({
        isError: true,
        structuredContent: {
          error: { code: 'UPSTREAM_UNAVAILABLE', retryable: true },
        },
      });
      expect(api.post).toHaveBeenCalledOnce();
    }
  );

  it.each(['malformed', 'ECONNABORTED', 'EHOSTUNREACH', 'ENETUNREACH'])(
    'does not replay a native committed task POST after %s completion',
    async (outcome) => {
      vi.stubEnv('USE_MOCK_DATA', 'false');
      vi.stubEnv('ATTIO_API_KEY', 'test-api-key');
      clearAllCaches();
      const committed = [TaskMockFactory.create({ content: 'Transport commit' })];
      const writes: typeof committed = [];
      const api = {
        defaults: {},
        get: vi.fn(),
        post: vi.fn().mockImplementation(async () => {
          writes.push(committed[0]);
          if (writes.length === 1) {
            if (outcome === 'malformed') return { data: {} };
            throw Object.assign(new Error('Transport response was lost'), {
              code: outcome,
            });
          }
          return { data: { data: committed[0] } };
        }),
      };
      vi.spyOn(attioClientModule, 'createAttioClient').mockReturnValue(api as never);
      vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
      const result = await client.callTool({
        name: 'create_record',
        arguments: {
          resource_type: 'tasks',
          record_data: { content: 'Transport commit' },
        },
      });
      expect(result).toMatchObject({
        isError: true,
        structuredContent: {
          error: {
            code: outcome === 'malformed'
              ? 'RESULT_ENCODING_FAILED'
              : 'UPSTREAM_UNAVAILABLE',
            retryable: false,
            message: expect.stringContaining('Completion may be uncertain'),
          },
        },
      });
      expect(api.post).toHaveBeenCalledOnce();
      expect(api.get).not.toHaveBeenCalled();
      expect(writes).toEqual(committed);
    }
  );

  it('executes a successful native task POST once and blocks a denied task POST', async () => {
    vi.stubEnv('USE_MOCK_DATA', 'false');
    vi.stubEnv('ATTIO_API_KEY', 'test-api-key');
    clearAllCaches();
    const task = TaskMockFactory.create({ content: 'Transport success' });
    const api = {
      defaults: {},
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ data: { data: task } }),
    };
    vi.spyOn(attioClientModule, 'createAttioClient').mockReturnValue(api as never);
    vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
    const args = {
      resource_type: 'tasks',
      record_data: { content: 'Transport success' },
    };
    expect(
      await client.callTool({ name: 'create_record', arguments: args })
    ).toMatchObject({ isError: false });
    expect(api.post).toHaveBeenCalledOnce();
    api.post.mockClear();
    vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'search');
    expect(
      await client.callTool({ name: 'create_record', arguments: args })
    ).toMatchObject({
      isError: true,
      structuredContent: {
        error: { code: 'PERMISSION_DENIED', retryable: false },
      },
    });
    expect(api.post).not.toHaveBeenCalled();
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
