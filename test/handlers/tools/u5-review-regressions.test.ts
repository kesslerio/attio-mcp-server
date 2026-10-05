import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { listWorkspaceMembers as listMemberPage, searchWorkspaceMembers } from '@/api/operations/workspace-members.js';
import * as clientResolver from '@/utils/client-resolver.js';
import { workspaceMembersToolConfigs } from '@/handlers/tool-configs/workspace-members.js';
import { UniversalSearchService } from '@/services/UniversalSearchService.js';
import { SearchCoordinator } from '@/services/search/SearchCoordinator.js';
import { RecordsSearchService } from '@/services/search/RecordsSearchService.js';
import { searchRecordsConfig } from '@/handlers/tool-configs/universal/core/search-operations.js';
import { listTasks as listTaskInventory } from '@/api/operations/tasks.js';
import { TaskSearchStrategy } from '@/services/search-strategies/TaskSearchStrategy.js';
import { StrategyFactory } from '@/services/search/StrategyFactory.js';
import { NoteSearchStrategy } from '@/services/search-strategies/NoteSearchStrategy.js';
import { handleGetListsOperation } from '@/handlers/tools/dispatcher/operations/lists.js';
import { advancedSearchConfig } from '@/handlers/tool-configs/universal/operations/advanced-search.js';
import { searchByTimeframeConfig } from '@/handlers/tool-configs/universal/operations/timeframe-search.js';
import { listNotesConfig } from '@/handlers/tool-configs/universal/core/notes-operations.js';
import { listsToolConfigs } from '@/handlers/tool-configs/lists.js';
import { normalizeListCollection, normalizeListEntryCollection, normalizeListMemberships } from '@/handlers/tool-configs/list-result-adapters.js';
import { getRecordListMemberships } from '@/objects/lists/membership.js';
import { getLists } from '@/objects/lists/base.js';
import { listNotes } from '@/objects/notes.js';
import { getObjectAttributeMetadata, clearAttributeCache } from '@/api/attribute-types.js';
import { runWithClientContext, getContextApiKey } from '@/api/client-context.js';
import { InvalidCursorError, rotateCursorServerKey, issueNextCursor } from '@/handlers/tools/result-cursor.js';
import { OpenAiCompatibilityService } from '@/services/OpenAiCompatibilityService.js';
import { openAiToolConfigs } from '@/handlers/tool-configs/openai/index.js';
import { CompanyMockFactory, ListMockFactory, TaskMockFactory } from '@test/utils/mock-factories/index.js';
import { UniversalResourceType, SearchType } from '@/handlers/tool-configs/universal/types.js';

vi.hoisted(() => vi.resetModules());
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/api/lazy-client.js', () => ({ getLazyAttioClient: () => api as unknown as AxiosInstance }));
vi.mock('@/objects/notes.js', async (importOriginal) => ({ ...await importOriginal<object>(), listNotes: vi.fn() }));
vi.unmock('@/objects/lists.js');
vi.unmock('@/objects/lists/entries.js');

beforeEach(() => {
  vi.stubEnv('ATTIO_API_KEY', 'u5-review-credential');
  vi.stubEnv('E2E_MODE', 'false');
  vi.stubEnv('USE_MOCK_DATA', 'false');
  rotateCursorServerKey();
  clearAttributeCache();
  api.get.mockReset();
  api.post.mockReset();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); clearAttributeCache(); });

const companies = UniversalResourceType.COMPANIES;
const recordId = 'd28a35f1-5788-49f9-a320-6c8c353147d8';

describe('U5 review pagination invariants', () => {
  it('composes exact emitted offsets at the public maximum page size', async () => {
    const records = Array.from({ length: 101 }, () => CompanyMockFactory.create());
    const route = vi.spyOn(SearchCoordinator, 'executeSearch').mockImplementation(async ({ limit = 10, offset = 0 }) => records.slice(offset, offset + limit));
    const first = await UniversalSearchService.searchRecordsPage({ resource_type: companies, limit: 100 });
    expect(first.data).toEqual(records.slice(0, 100));
    expect(first.next_cursor).toBeTruthy();
    expect(route.mock.calls.map(([args]) => [args.limit, args.offset])).toEqual([[100, 0], [1, 100]]);
    const second = await UniversalSearchService.searchRecordsPage({ resource_type: companies, limit: 100, cursor: first.next_cursor! });
    expect(second.data).toEqual(records.slice(100));
    expect(second.next_cursor).toBeNull();
  });

  it.each(['basic', 'advanced', 'timeframe'] as const)('preserves maximum-offset pages through %s lookahead', async (family) => {
    const records = CompanyMockFactory.createMultiple(101);
    const route = vi.spyOn(SearchCoordinator, 'executeSearch').mockImplementation(async ({ limit = 10, offset = 0 }) => records.slice(offset - 10000, offset - 10000 + limit));
    const config = family === 'basic' ? searchRecordsConfig : family === 'advanced' ? advancedSearchConfig : searchByTimeframeConfig;
    const result = await config.handler({ resource_type: companies, limit: 100, offset: 10000, ...(family === 'timeframe' ? { start_date: '2026-01-01', end_date: '2026-02-01' } : {}) });
    expect(result).toMatchObject({ data: records.slice(0, 100), next_cursor: null, pagination: { supported: true, truncated: true } });
    expect(route.mock.calls.map(([args]) => args.offset)).toEqual([10000, 10100]);
  });

  it('allows cursor advancement to the offset cap and discloses results beyond it', async () => {
    const records = CompanyMockFactory.createMultiple(201);
    vi.spyOn(SearchCoordinator, 'executeSearch').mockImplementation(async ({ limit = 10, offset = 0 }) => records.slice(offset - 9900, offset - 9900 + limit));
    const first = await UniversalSearchService.searchRecordsPage({ resource_type: companies, limit: 100, offset: 9900 });
    expect(first.next_cursor).toBeTruthy();
    const second = await UniversalSearchService.searchRecordsPage({ resource_type: companies, limit: 100, cursor: first.next_cursor! });
    expect(second).toMatchObject({ data: records.slice(100, 200), next_cursor: null, pagination: { supported: true, truncated: true } });
  });

  it('proves exhaustion at the offset cap without issuing a cursor', async () => {
    const records = CompanyMockFactory.createMultiple(100);
    vi.spyOn(SearchCoordinator, 'executeSearch').mockImplementation(async ({ offset = 0 }) => offset === 10000 ? records : []);
    expect(await UniversalSearchService.searchRecordsPage({ resource_type: companies, limit: 100, offset: 10000 })).toMatchObject({ data: records, next_cursor: null, pagination: { supported: true, truncated: false } });
  });

  it('rejects explicit and sealed offsets beyond the public cap before fetching', async () => {
    const route = vi.spyOn(SearchCoordinator, 'executeSearch');
    await expect(UniversalSearchService.searchRecords({ resource_type: companies, limit: 100, offset: 10001 })).rejects.toThrow('offset must not exceed');
    const cursor = issueNextCursor({ scope: { operation: 'records_search', resource: companies, query: { limit: 100 } }, pageSize: 100, offset: 10001, hasMore: true }).next_cursor!;
    await expect(UniversalSearchService.searchRecordsPage({ resource_type: companies, limit: 100, cursor })).rejects.toBeInstanceOf(InvalidCursorError);
    expect(route).not.toHaveBeenCalled();
  });

  it.each([
    [UniversalResourceType.COMPANIES, 20],
    [UniversalResourceType.DEALS, 20],
    [UniversalResourceType.PEOPLE, 100],
  ] as const)('preserves omitted limits across basic and advanced %s searches', async (resource_type, pageSize) => {
    const records = Array.from({ length: pageSize + 1 }, () => CompanyMockFactory.create());
    const route = vi.spyOn(SearchCoordinator, 'executeSearch').mockImplementation(async ({ limit = 10, offset = 0 }) => records.slice(offset, offset + limit));
    for (const config of [searchRecordsConfig, advancedSearchConfig]) {
      route.mockClear();
      const first = await config.handler({ resource_type }) as { data: unknown[]; next_cursor: string };
      expect(first.data).toHaveLength(pageSize);
      expect(first.next_cursor).toBeTruthy();
      expect(route.mock.calls[0][0].limit).toBe(Math.min(pageSize + 1, 100));
      const second = await config.handler({ resource_type, limit: pageSize, cursor: first.next_cursor });
      expect(second).toMatchObject({ data: records.slice(pageSize), next_cursor: null });
    }
  });

  it('preserves custom-object, generic-record, query-route, and timeframe-tool defaults', async () => {
    const route = vi.spyOn(SearchCoordinator, 'executeSearch').mockResolvedValue([]);
    await UniversalSearchService.searchRecordsPage({ resource_type: 'funds' as UniversalResourceType });
    expect(route.mock.calls.at(-1)![0].limit).toBe(21);
    await UniversalSearchService.searchRecordsPage({ resource_type: UniversalResourceType.RECORDS });
    expect(route.mock.calls.at(-1)![0].limit).toBe(11);
    await UniversalSearchService.searchRecordsPage({ resource_type: companies, search_type: SearchType.TIMEFRAME, timeframe_attribute: 'created_at', start_date: '2026-01-01' });
    expect(route.mock.calls.at(-1)![0].limit).toBe(11);
    await searchByTimeframeConfig.handler({ resource_type: companies, start_date: '2026-01-01', end_date: '2026-02-01' });
    expect(route.mock.calls.at(-1)![0].limit).toBe(21);
  });

  it.each([
    ['name', 'asc', 'name', 'desc'],
    ['name', 'desc', 'name', 'asc'],
    ['name', 'asc', 'created_at', 'asc'],
  ] as const)('rejects changed advanced sorts from %s %s to %s %s before fetching', async (sort_by, sort_order, changedBy, changedOrder) => {
    const records = Array.from({ length: 3 }, () => CompanyMockFactory.create());
    const route = vi.spyOn(SearchCoordinator, 'executeSearch').mockImplementation(async ({ limit = 10, offset = 0 }) => records.slice(offset, offset + limit));
    const params = { resource_type: companies, limit: 2, sort_by, sort_order };
    const first = await advancedSearchConfig.handler(params) as { next_cursor: string };
    expect(first.next_cursor).toBeTruthy();
    route.mockClear();
    await expect(advancedSearchConfig.handler({ ...params, sort_by: changedBy, sort_order: changedOrder, cursor: first.next_cursor })).rejects.toThrow(/cursor/i);
    expect(route).not.toHaveBeenCalled();
    expect(await advancedSearchConfig.handler({ ...params, cursor: first.next_cursor })).toMatchObject({ data: records.slice(2), next_cursor: null });
  });

  it('uses the exact offset on generic records instead of rounding to a page', async () => {
    const records = Array.from({ length: 4 }, () => CompanyMockFactory.create());
    api.post.mockImplementation(async (_path, { limit, offset = 0 }) => ({ data: { data: records.slice(offset, offset + limit) } }));
    expect(await RecordsSearchService.searchRecordsObjectType(3, 0)).toEqual(records.slice(0, 3));
    expect(await RecordsSearchService.searchRecordsObjectType(3, 2)).toEqual(records.slice(2));
    expect(api.post).toHaveBeenLastCalledWith('/objects/records/records/query', { limit: 3, offset: 2 });
  });

  it('starts advanced and timeframe continuation and denies cross-family replay', async () => {
    const records = Array.from({ length: 3 }, () => CompanyMockFactory.create());
    const route = vi.spyOn(SearchCoordinator, 'executeSearch').mockImplementation(async ({ limit = 10, offset = 0 }) => records.slice(offset, offset + limit));
    const basic = await UniversalSearchService.searchRecordsPage({ resource_type: companies, limit: 2 });
    route.mockClear();
    await expect(advancedSearchConfig.handler({ resource_type: companies, limit: 2, cursor: basic.next_cursor! })).rejects.toThrow(/cursor/i);
    expect(route).not.toHaveBeenCalled();
    const advanced = await advancedSearchConfig.handler({ resource_type: companies, limit: 2 });
    expect(advanced).toMatchObject({ data: records.slice(0, 2), next_cursor: expect.any(String) });
    const timeframe = await searchByTimeframeConfig.handler({ resource_type: companies, start_date: '2026-01-01', end_date: '2026-02-01', limit: 2 });
    expect(timeframe).toMatchObject({ data: records.slice(0, 2), next_cursor: expect.any(String) });
    const cursor = (timeframe as { next_cursor: string }).next_cursor;
    route.mockClear();
    await expect(searchByTimeframeConfig.handler({ resource_type: companies, start_date: '2026-01-01', end_date: '2026-02-01', limit: 2, cursor, offset: 0 })).rejects.toThrow(/offset/i);
    expect(route).not.toHaveBeenCalled();
    expect(await searchByTimeframeConfig.handler({ resource_type: companies, start_date: '2026-01-01', end_date: '2026-02-01', limit: 2, cursor })).toMatchObject({ data: records.slice(2), next_cursor: null });
  });

  it.each([SearchType.BASIC, SearchType.CONTENT])('discloses unsupported %s ranked searches and rejects continuation', async (search_type) => {
    const route = vi.spyOn(SearchCoordinator, 'executeSearch').mockResolvedValue([CompanyMockFactory.create()]);
    const params = { resource_type: companies, query: 'ranked', search_type, limit: 2 };
    expect(await UniversalSearchService.searchRecordsPage(params)).toMatchObject({ next_cursor: null, pagination: { supported: false, truncated: true } });
    route.mockClear();
    await expect(UniversalSearchService.searchRecordsPage({ ...params, cursor: 'opaque' })).rejects.toThrow(InvalidCursorError);
    expect(route).not.toHaveBeenCalled();
  });

  it.each([UniversalResourceType.TASKS, UniversalResourceType.LISTS, UniversalResourceType.NOTES])('denies aggregate %s continuation', async (resource_type) => {
    const route = vi.spyOn(SearchCoordinator, 'executeSearch').mockResolvedValue([]);
    expect(await UniversalSearchService.searchRecordsPage({ resource_type })).toMatchObject({ next_cursor: null, pagination: { supported: false, truncated: true } });
    route.mockClear();
    await expect(UniversalSearchService.searchRecordsPage({ resource_type, cursor: 'opaque' })).rejects.toThrow(InvalidCursorError);
    expect(route).not.toHaveBeenCalled();
  });

  it('seals native query continuation and forwards it only on authorized replay', async () => {
    const record = CompanyMockFactory.create();
    api.post.mockResolvedValueOnce({ data: { data: [record], meta: { next_cursor: 'native-query-position' } } }).mockResolvedValueOnce({ data: { data: [record] } });
    const params = { resource_type: companies, limit: 2, search_type: SearchType.TIMEFRAME, timeframe_attribute: 'created_at', start_date: '2026-01-01' };
    const first = await UniversalSearchService.searchRecordsPage(params);
    expect(first.next_cursor).toBeTruthy();
    expect(first.next_cursor).not.toContain('native-query-position');
    expect(await UniversalSearchService.searchRecordsPage({ ...params, cursor: first.next_cursor! })).toMatchObject({ next_cursor: null });
    expect(api.post).toHaveBeenLastCalledWith('/objects/companies/records/query', expect.objectContaining({ cursor: 'native-query-position' }));
    expect(api.post.mock.calls[1][1]).not.toHaveProperty('offset');
  });

  it('starts notes continuation, replays native cursors without default-offset conflicts, and stops on a full final page', async () => {
    const note = { id: { note_id: recordId }, title: 'Note', content_plaintext: 'Body', created_at: '2026-01-01T00:00:00Z' };
    vi.mocked(listNotes).mockResolvedValueOnce({ data: [note], meta: { next_cursor: 'native-next' } }).mockResolvedValueOnce({ data: [note] });
    const first = await listNotesConfig.handler({ resource_type: companies, record_id: recordId, limit: 1 });
    expect(first).toMatchObject({ data: [expect.objectContaining({ title: 'Note' })], next_cursor: expect.any(String) });
    const cursor = (first as { next_cursor: string }).next_cursor;
    expect(await listNotesConfig.handler({ resource_type: companies, record_id: recordId, limit: 1, cursor })).toMatchObject({ next_cursor: null });
    expect(listNotes).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'native-next', limit: 2 }));
    vi.mocked(listNotes).mockClear();
    await expect(listNotesConfig.handler({ resource_type: companies, record_id: recordId, limit: 1, cursor, offset: 0 })).rejects.toThrow(/offset/i);
    expect(listNotes).not.toHaveBeenCalled();
  });

  it.each([20, 50, 100])('proves notes continuation at page size %i without native metadata', async (limit) => {
    const notes = Array.from({ length: limit + 1 }, (_, index) => ({ id: { note_id: `note-${index}` }, title: `Note ${index}` }));
    vi.mocked(listNotes).mockReset().mockImplementation(async ({ limit: fetchSize = 10, offset = 0 }) => ({ data: notes.slice(offset, offset + fetchSize) }));
    const first = await listNotesConfig.handler({ resource_type: companies, record_id: recordId, limit }) as { data: Array<{ title: string }>; next_cursor: string };
    expect(first.data).toHaveLength(limit);
    expect(first.next_cursor).toBeTruthy();
    expect(vi.mocked(listNotes).mock.calls.every(([args]) => args.limit! <= 50)).toBe(true);
    if (limit >= 50) expect(listNotes).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 1, offset: limit }));
    expect(await listNotesConfig.handler({ resource_type: companies, record_id: recordId, limit, cursor: first.next_cursor })).toMatchObject({ data: [expect.objectContaining({ title: `Note ${limit}` })], next_cursor: null });
  });

  it.each([20, 50, 100])('proves final full notes pages at page size %i are exhausted', async (limit) => {
    const notes = Array.from({ length: limit }, (_, index) => ({ title: `Note ${index}` }));
    vi.mocked(listNotes).mockReset().mockImplementation(async ({ limit: fetchSize = 10, offset = 0 }) => ({ data: notes.slice(offset, offset + fetchSize) }));
    expect(await listNotesConfig.handler({ resource_type: companies, record_id: recordId, limit })).toMatchObject({ data: notes.map((note) => expect.objectContaining(note)), next_cursor: null, pagination: { supported: true, truncated: false } });
  });

  it.each([9, 10])('discloses completeness of a %i-note bounded inventory', async (count) => {
    const notes = Array.from({ length: count }, (_, index) => ({ id: { note_id: `note-${index}` }, title: `Note ${index}` }));
    const strategy = new NoteSearchStrategy({ noteFunction: vi.fn().mockResolvedValue({ data: notes }) });
    const result = await strategy.search({ limit: 20 });
    expect(result).toHaveLength(count);
    expect((result as { truncated?: boolean }).truncated).toBe(count === 10);
  });

  it.each([99, 100])('discloses completeness of a %i-entry membership page', async (count) => {
    const entries = Array.from({ length: count }, (_, index) => ({ list_id: recordId, entry_id: `entry-${index}` }));
    api.get.mockResolvedValue({ data: { data: entries } });
    const result = normalizeListMemberships(await getRecordListMemberships(recordId, 'companies'));
    expect(result.count).toBe(count);
    expect(result.pagination).toEqual({ supported: false, truncated: count === 100 });
  });

  it('ignores unadvertised directory controls and rejects directory continuation', async () => {
    api.get.mockResolvedValue({ data: { data: [] } });
    await handleGetListsOperation({ method: 'tools/call', params: { name: 'get-lists', arguments: { objectSlug: 'people', limit: 1 } } }, listsToolConfigs.getLists);
    expect(api.get).toHaveBeenCalledWith('/lists?limit=20');
    api.get.mockClear();
    await expect(listsToolConfigs.getLists.handler('unsupported-token')).rejects.toThrow(InvalidCursorError);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('preserves list-entry envelopes from initial through final pages', async () => {
    const entries = Array.from({ length: 3 }, () => ListMockFactory.createListEntry(recordId, recordId));
    api.post.mockImplementation(async (_path, { limit, offset = 0 }) => ({ data: { data: entries.slice(offset, offset + limit) } }));
    const handler = listsToolConfigs.getListEntries.handler as (...args: unknown[]) => Promise<unknown>;
    const first = normalizeListEntryCollection(await handler(recordId, 2));
    expect(first).toMatchObject({ count: 2, next_cursor: expect.any(String) });
    const second = normalizeListEntryCollection(await handler(recordId, 2, undefined, undefined, first.next_cursor));
    expect(second).toMatchObject({ count: 1, next_cursor: null });
    expect((second.data as unknown[])[0]).toMatchObject({ id: entries[2].id });
  });

  it('carries complete list inventories and failed membership evidence to adapters', async () => {
    const list = ListMockFactory.create();
    const directory = ListMockFactory.createMultiple(25);
    api.get.mockResolvedValueOnce({ data: { data: directory } });
    expect(normalizeListCollection(await getLists(undefined, 1))).toMatchObject({ count: 25, pagination: { supported: false, truncated: false } });
    api.get.mockResolvedValueOnce({ data: { data: [list] } });
    expect(normalizeListCollection(await getLists(undefined, 2)).pagination).toEqual({ supported: false, truncated: false });
    api.get.mockRejectedValueOnce(new Error('Denied'));
    expect(normalizeListMemberships(await getRecordListMemberships(recordId, 'companies')).pagination).toEqual({ supported: false, truncated: true });
    api.get.mockResolvedValueOnce({ data: { data: [] } });
    expect(normalizeListMemberships(await getRecordListMemberships(recordId, 'companies')).pagination).toEqual({ supported: false, truncated: false });
  });

  it('affirms complete member directories regardless of legacy page parameters', async () => {
    vi.spyOn(clientResolver, 'getValidatedAttioClient').mockReturnValue(api as unknown as AxiosInstance);
    const members = Array.from({ length: 25 }, () => ({ id: { workspace_member_id: recordId }, email_address: 'member@example.test' }));
    api.get.mockResolvedValue({ data: { data: members } });
    const normalize = workspaceMembersToolConfigs.listWorkspaceMembers.structuredOutput!;
    for (const page of [1, 2]) {
      expect(normalize(await listMemberPage(undefined, page, 25))).toMatchObject({ count: 25, pagination: { supported: false, truncated: false } });
    }
    expect(normalize(await searchWorkspaceMembers('member'))).toMatchObject({ count: 25, pagination: { supported: false, truncated: false } });
  });

  it('preserves completeness of task inventories and discloses subsequent search slices', async () => {
    vi.spyOn(clientResolver, 'getValidatedAttioClient').mockReturnValue(api as unknown as AxiosInstance);
    const tasks = TaskMockFactory.createMultiple(30);
    api.get.mockResolvedValue({ data: { data: tasks } });
    const strategy = new TaskSearchStrategy({ taskFunction: listTaskInventory });
    vi.spyOn(StrategyFactory, 'getStrategy').mockResolvedValue(strategy);
    const complete = await UniversalSearchService.searchRecordsPage({ resource_type: UniversalResourceType.TASKS, limit: 100 });
    expect(complete).toMatchObject({ next_cursor: null, pagination: { supported: false, truncated: false } });
    expect(complete.data).toHaveLength(30);
    const sliced = await UniversalSearchService.searchRecordsPage({ resource_type: UniversalResourceType.TASKS, limit: 10 });
    expect(sliced.data).toHaveLength(10);
    expect(sliced.pagination).toEqual({ supported: false, truncated: true });
  });

  it.each([500, 501])('probes the actual task inventory bound for %s tasks', async (count) => {
    vi.spyOn(clientResolver, 'getValidatedAttioClient').mockReturnValue(api as unknown as AxiosInstance);
    const tasks = TaskMockFactory.createMultiple(count);
    api.get.mockImplementation(async (path: string) => {
      const params = new URL(path, 'https://api.attio.test').searchParams;
      const offset = Number(params.get('offset') ?? 0);
      const limit = Number(params.get('limit') ?? 500);
      return { data: { data: tasks.slice(offset, offset + limit) } };
    });
    const result = await listTaskInventory();
    expect(result).toHaveLength(500);
    expect((result as typeof result & { truncated: boolean }).truncated).toBe(count > 500);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('reports connector aggregation slices even when each resource is complete', async () => {
    vi.spyOn(UniversalSearchService, 'searchRecordsPage').mockResolvedValue({ data: [CompanyMockFactory.create()], next_cursor: null, pagination: { supported: false, truncated: false } });
    const raw = await OpenAiCompatibilityService.search({ query: 'match', type: 'all', limit: 1 });
    const normalized = openAiToolConfigs['openai-search'].structuredOutput!(raw);
    expect(normalized).toMatchObject({ count: 1, pagination: { supported: false, truncated: true } });
  });

  it('loads and revisits distinct attribute metadata under concurrent request credentials', async () => {
    api.get.mockImplementation(async () => {
      const tenant = getContextApiKey() === 'tenant-a' ? 'a' : 'b';
      return { data: { data: [{ id: { workspace_id: tenant, object_id: 'companies', attribute_id: tenant }, api_slug: `field_${tenant}`, title: `Field ${tenant}`, type: 'text' }] } };
    });
    const read = (tenant: string) => runWithClientContext({ ATTIO_API_KEY: tenant }, () => getObjectAttributeMetadata('companies'));
    const [firstA, firstB] = await Promise.all([read('tenant-a'), read('tenant-b')]);
    const [againB, againA] = await Promise.all([read('tenant-b'), read('tenant-a')]);
    expect([...firstA.keys()]).toEqual(['field_a']);
    expect([...firstB.keys()]).toEqual(['field_b']);
    expect(againA).toBe(firstA);
    expect(againB).toBe(firstB);
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
