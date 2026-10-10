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
  it.each(['tasks', 'all', undefined])(
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
