import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UniversalSearchService } from '@/services/UniversalSearchService.js';
import { SearchCoordinator } from '@/services/search/SearchCoordinator.js';
import { StrategyFactory } from '@/services/search/StrategyFactory.js';
import { QueryApiService } from '@/services/search/QueryApiService.js';
import {
  UniversalResourceType as R,
  SearchType,
  SortType,
} from '@/handlers/tool-configs/universal/types.js';
import type { UniversalSearchParams } from '@/handlers/tool-configs/universal/types.js';
import { advancedSearchConfig } from '@/handlers/tool-configs/universal/operations/advanced-search.js';
import { searchRecordsConfig } from '@/handlers/tool-configs/universal/core/search-operations.js';
import { createSecureToolErrorResult } from '@/utils/secure-error-handler.js';

import { CompanySearchStrategy } from '@/services/search-strategies/CompanySearchStrategy.js';
import { CompanyMockFactory } from '@test/utils/mock-factories/CompanyMockFactory.js';
import { PersonMockFactory } from '@test/utils/mock-factories/PersonMockFactory.js';
import { ListMockFactory } from '@test/utils/mock-factories/ListMockFactory.js';
import {
  getCapabilityManifest,
  getToolsListPayload,
} from '@/utils/mcp-discovery.js';
import { OpenAiCompatibilityService } from '@/services/OpenAiCompatibilityService.js';
import { universalBatchSearch } from '@/api/operations/batch.js';
import { executeToolRequest } from '@/handlers/tools/dispatcher/core.js';

const filters = {
  filters: [
    { attribute: { slug: 'name' }, condition: 'equals', value: 'Acme' },
  ],
};

beforeEach(() => {
  vi.spyOn(StrategyFactory, 'getStrategy').mockResolvedValue(undefined);
  vi.spyOn(QueryApiService, 'searchByTimeframe').mockResolvedValue({
    data: [],
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('search arguments are honored or rejected before upstream work', () => {
  it.each([
    { resource_type: R.COMPANIES, sort_by: 'name' },
    { resource_type: R.PEOPLE, sort_order: 'asc' },
    { resource_type: R.DEALS, sort: SortType.NAME },
    { resource_type: R.COMPANIES, query: 'Acme', filters },
    { resource_type: R.TASKS, query: 'Acme' },
    { resource_type: R.RECORDS, query: 'Acme' },
    { resource_type: R.LISTS, filters },
    { resource_type: R.TASKS, filters },
    { resource_type: R.NOTES, filters },
    { resource_type: R.NOTES, query: 'Acme' },
    {
      resource_type: R.PEOPLE,
      query: 'Acme',
      created_after: '2025-01-01T00:00:00Z',
    },
    {
      resource_type: R.PEOPLE,
      filters,
      search_type: SearchType.TIMEFRAME,
      timeframe_attribute: 'created_at',
      start_date: '2025-01-01',
    },
  ] satisfies UniversalSearchParams[])(
    'rejects $resource_type unsupported arguments: %j',
    async (params) => {
      await expect(
        UniversalSearchService.searchRecords(params)
      ).rejects.toMatchObject({ name: 'UniversalValidationError' });
      expect(StrategyFactory.getStrategy).not.toHaveBeenCalled();
      expect(QueryApiService.searchByTimeframe).not.toHaveBeenCalled();
    }
  );

  it('rejects unsupported explicit order through the advanced wrapper with a nonretryable error', async () => {
    try {
      await advancedSearchConfig.handler({
        resource_type: R.PEOPLE,
        sort_order: 'desc',
      });
      expect.fail('Expected rejection');
    } catch (error) {
      expect(
        createSecureToolErrorResult(error).structuredContent?.error
      ).toMatchObject({ code: 'VALIDATION_ERROR', retryable: false });
    }
    expect(StrategyFactory.getStrategy).not.toHaveBeenCalled();
  });

  it('allows omitted sorting through both wrappers', async () => {
    vi.mocked(StrategyFactory.getStrategy).mockResolvedValue({
      search: vi.fn().mockResolvedValue([]),
      getResourceType: () => 'people',
      supportsAdvancedFiltering: () => true,
      supportsQuerySearch: () => true,
    });
    await expect(
      advancedSearchConfig.handler({ resource_type: R.PEOPLE })
    ).resolves.toMatchObject({ data: [] });
    await expect(
      searchRecordsConfig.handler({ resource_type: R.PEOPLE })
    ).resolves.toMatchObject({ data: [] });
  });

  it('also enforces the invariant at the direct coordinator entry', async () => {
    await expect(
      SearchCoordinator.executeSearch({
        resource_type: R.COMPANIES,
        query: 'Acme',
        filters,
      })
    ).rejects.toMatchObject({ name: 'UniversalValidationError' });
    expect(StrategyFactory.getStrategy).not.toHaveBeenCalled();
  });
  it('changes accepted content queries and filters at the strategy request boundary', async () => {
    const acme = CompanyMockFactory.create({ name: 'Acme' });
    const globex = CompanyMockFactory.create({ name: 'Globex' });
    const upstream = vi.fn(async (input) =>
      input.filters[0].value === 'Acme' ? [acme] : [globex]
    );
    vi.mocked(StrategyFactory.getStrategy).mockResolvedValue(
      new CompanySearchStrategy({ advancedSearchFunction: upstream })
    );
    for (const [query, expected] of [
      ['Acme', acme],
      ['Globex', globex],
    ] as const) {
      const result = await searchRecordsConfig.handler({
        resource_type: R.COMPANIES,
        search_type: SearchType.CONTENT,
        fields: ['name'],
        query,
      });
      expect(result).toMatchObject({
        data: [expected],
        pagination: { supported: false },
      });
      expect(upstream).toHaveBeenLastCalledWith(
        {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: 'contains',
              value: query,
            },
          ],
          matchAny: true,
        },
        undefined,
        undefined
      );
      const filtered = await advancedSearchConfig.handler({
        resource_type: R.COMPANIES,
        filters: {
          filters: [
            { attribute: { slug: 'name' }, condition: 'equals', value: query },
          ],
        },
      });
      expect(filtered).toMatchObject({ data: [expected] });
    }
  });

  it('preserves duplicate batch failures without calling a strategy', async () => {
    const result = await universalBatchSearch(R.TASKS, ['Acme', 'Acme']);
    expect(result).toHaveLength(2);
    for (const item of result)
      expect(item).toMatchObject({
        query: 'Acme',
        success: false,
        error_details: { code: 'VALIDATION_ERROR', retryable: false },
      });
    expect(StrategyFactory.getStrategy).not.toHaveBeenCalled();
  });

  it.each(['records_search', 'search_records'])(
    'cannot bypass validation through %s',
    async (name) => {
      vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');
      const result = await executeToolRequest({
        method: 'tools/call',
        params: { name, arguments: { resource_type: 'tasks', query: 'Acme' } },
      });
      expect(result).toMatchObject({
        isError: true,
        structuredContent: {
          error: { code: 'VALIDATION_ERROR', retryable: false },
        },
      });
      expect(StrategyFactory.getStrategy).not.toHaveBeenCalled();
      vi.unstubAllEnvs();
    }
  );

  it.each(['records_search_by_content', 'search_records_by_content'])(
    'returns stable nonretryable content denial through %s',
    async (name) => {
      vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');
      const result = await executeToolRequest({
        method: 'tools/call',
        params: {
          name,
          arguments: {
            resource_type: 'notes',
            content_type: 'notes',
            search_query: 'Acme',
          },
        },
      });
      expect(result).toMatchObject({
        isError: true,
        structuredContent: {
          error: { code: 'VALIDATION_ERROR', retryable: false },
        },
      });
      expect(StrategyFactory.getStrategy).not.toHaveBeenCalled();
    }
  );

  it.each([
    'records_batch_search',
    'records_batch',
    'records_search_by_timeframe',
    'records_search_by_relationship',
  ])(
    'rejects extra batch sort controls before execution through %s',
    async (name) => {
      vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');
      const result = await executeToolRequest({
        method: 'tools/call',
        params: {
          name,
          arguments: {
            resource_type: 'companies',
            operation_type: 'search',
            queries: ['Acme'],
            sort_order: 'asc',
          },
        },
      });
      expect(result).toMatchObject({
        isError: true,
        structuredContent: {
          error: { code: 'VALIDATION_ERROR', retryable: false },
        },
      });
      expect(StrategyFactory.getStrategy).not.toHaveBeenCalled();
    }
  );
  it.each(['full', 'search'])(
    'preserves connector defaults and discovery/runtime parity in %s mode',
    async (mode) => {
      vi.stubEnv('ATTIO_MCP_TOOL_MODE', mode);
      const records = {
        companies: CompanyMockFactory.create({ name: 'Acme Company' }),
        people: PersonMockFactory.create({ name: 'Acme Person' }),
        lists: ListMockFactory.create({ name: 'Acme List' }),
      };
      const searches = {
        companies: vi.fn().mockResolvedValue([records.companies]),
        people: vi.fn().mockResolvedValue([records.people]),
        lists: vi.fn().mockResolvedValue([records.lists]),
      };
      vi.mocked(StrategyFactory.getStrategy).mockImplementation(
        async (resource) => ({
          search: searches[resource as keyof typeof searches],
          getResourceType: () => resource,
          supportsAdvancedFiltering: () => resource !== R.LISTS,
          supportsQuerySearch: () => true,
        })
      );
      const manifest = getCapabilityManifest();
      const listed = getToolsListPayload().tools;
      for (const entry of manifest.tools) {
        const tool = listed.find((item) => item.name === entry.name)!;
        expect(entry.description).toBe(tool.description);
        expect(entry.inputSchema).toEqual(tool.inputSchema);
        expect(entry.guidance?.summary).toBe(tool.description);
      }
      const search = manifest.tools.find((entry) => entry.name === 'search')!;
      expect(search.operation?.resourceTypes).toEqual(Object.keys(records));
      expect(search.guidance?.constraints).toContain(
        'Omitted type/all searches companies/people/lists'
      );
      for (const type of [undefined, 'all', ...Object.keys(records)]) {
        vi.mocked(StrategyFactory.getStrategy).mockClear();
        const result = await executeToolRequest({
          method: 'tools/call',
          params: {
            name: 'search',
            arguments: { query: 'Acme', ...(type ? { type } : {}) },
          },
        });
        const resources =
          !type || type === 'all' ? Object.keys(records) : [type];
        expect(result.isError).toBe(false);
        expect(
          vi
            .mocked(StrategyFactory.getStrategy)
            .mock.calls.map(([resource]) => resource)
        ).toEqual(resources);
        const data = resources.map((resource) => {
          const record = records[resource as keyof typeof records];
          const id =
            'list_id' in record.id ? record.id.list_id : record.id.record_id;
          expect(
            searches[resource as keyof typeof searches]
          ).toHaveBeenLastCalledWith(
            expect.objectContaining({ query: 'Acme' })
          );
          return expect.objectContaining({
            id: `${resource}:${id}`,
            metadata: { resource_type: resource },
          });
        });
        expect(result.structuredContent).toMatchObject({
          data,
          count: resources.length,
          next_cursor: null,
          pagination: { supported: false },
        });
        const text = result.content[0];
        expect(text.type).toBe('text');
        if (text.type === 'text') {
          expect(JSON.parse(text.text).results).toEqual(
            result.structuredContent?.data
          );
        }
      }
    }
  );

  it('publishes executable batch and interaction guidance in both discovery views', async () => {
    vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');
    const manifest = getCapabilityManifest();
    const batch = manifest.tools.find(
      (entry) => entry.name === 'records_batch_search'
    )!;
    expect(batch.guidance?.constraints).toContain(
      'Nonempty records/tasks queries fail per item before upstream.'
    );
    expect(batch.guidance?.constraints).toContain(
      'Filter/sort controls rejected.'
    );
    for (const resource_type of ['records', 'tasks']) {
      for (const name of ['records_batch_search', 'records_batch']) {
        const result = await executeToolRequest({
          method: 'tools/call',
          params: {
            name,
            arguments: {
              resource_type,
              ...(name === 'records_batch' ? { operation_type: 'search' } : {}),
              queries: ['Acme'],
            },
          },
        });
        expect(result.structuredContent).toMatchObject({
          data: [
            {
              query: 'Acme',
              success: false,
              error: { code: 'VALIDATION_ERROR', retryable: false },
            },
          ],
        });
      }
    }
    const interaction = manifest.tools.find(
      (entry) => entry.name === 'records_get_interactions'
    )!;
    expect(interaction.guidance?.recovery).toBe(
      'Confirm the record exists with records_get_details; activity body search is unsupported.'
    );
    expect(interaction.guidance?.alternatives).toEqual(['records_get_details']);
    const content = await executeToolRequest({
      method: 'tools/call',
      params: {
        name: 'records_search_by_content',
        arguments: {
          resource_type: 'people',
          content_type: 'activity',
          search_query: 'Acme',
        },
      },
    });
    expect(content).toMatchObject({
      isError: true,
      structuredContent: {
        error: { code: 'VALIDATION_ERROR', retryable: false },
      },
    });
    for (const entry of [batch, interaction]) {
      expect(
        getToolsListPayload().tools.find((tool) => tool.name === entry.name)
          ?.description
      ).toBe(entry.guidance?.summary);
    }
    expect(StrategyFactory.getStrategy).not.toHaveBeenCalled();
  });

  it('rejects unknown direct connector types instead of defaulting silently', async () => {
    await expect(
      OpenAiCompatibilityService.search({
        query: 'Acme',
        type: 'unknown' as 'all',
      })
    ).rejects.toThrow('Unsupported search type');
    expect(StrategyFactory.getStrategy).not.toHaveBeenCalled();
  });

  it.each(['tasks', 'unknown'])(
    'rejects unsupported connector fan-out %s before any strategy',
    async (type) => {
      vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'search');
      const result = await executeToolRequest({
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: { query: 'Acme', ...(type ? { type } : {}) },
        },
      });
      expect(result).toMatchObject({
        isError: true,
        structuredContent: {
          error: { code: 'VALIDATION_ERROR', retryable: false },
        },
      });
      expect(StrategyFactory.getStrategy).not.toHaveBeenCalled();
    }
  );
});
