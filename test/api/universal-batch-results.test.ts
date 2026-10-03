import * as searchOperations from '@/api/operations/search.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { universalBatchSearch } from '@/api/operations/batch.js';
import { UniversalSearchService } from '@/services/UniversalSearchService.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import { normalizeBatch } from '@/handlers/tool-configs/universal/read-result-adapters.js';
import { CompanyMockFactory } from '@test/utils/mock-factories/index.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('universal batch search result ownership', () => {
  it.each(
    [UniversalResourceType.COMPANIES, UniversalResourceType.PEOPLE].flatMap(
      (resourceType) =>
        [false, true].flatMap((duplicate) =>
          [false, true].map((denied) => ({ resourceType, duplicate, denied }))
        )
    )
  )(
    '$resourceType preserves optimized query ownership (duplicate=$duplicate, denied=$denied)',
    async ({ resourceType, duplicate, denied }) => {
      vi.useFakeTimers();
      const first = CompanyMockFactory.create();
      const second = CompanyMockFactory.create();
      const queries = duplicate ? ['same', 'same'] : ['slow', 'fast'];
      const search = vi
        .spyOn(searchOperations, 'searchObject')
        .mockImplementationOnce(
          () =>
            new Promise((resolve, reject) => {
              setTimeout(() => {
                if (denied) {
                  reject(
                    Object.assign(new Error('Access denied'), { status: 403 })
                  );
                } else {
                  resolve([first]);
                }
              }, 20);
            })
        )
        .mockImplementationOnce(
          () => new Promise((resolve) => setTimeout(() => resolve([second]), 1))
        );
      const pending = universalBatchSearch(resourceType, queries, undefined, {
        retryConfig: { maxRetries: 0 },
      });
      await vi.runAllTimersAsync();
      expect(normalizeBatch(await pending, true)).toMatchObject({
        data: [
          denied
            ? {
                index: 0,
                query: queries[0],
                success: false,
                error: { code: 'PERMISSION_DENIED', retryable: false },
              }
            : { index: 0, query: queries[0], success: true, result: [first] },
          { index: 1, query: queries[1], success: true, result: [second] },
        ],
        count: 2,
        summary: {
          total: 2,
          successful: denied ? 1 : 2,
          failed: denied ? 1 : 0,
        },
      });
      expect(search).toHaveBeenCalledTimes(2);
      expect(search.mock.calls.map((call) => call[1])).toEqual(queries);
    }
  );

  it('retains separate outcomes for duplicate queries completing out of order', async () => {
    const first = CompanyMockFactory.create();
    const second = CompanyMockFactory.create();
    let completeFirst!: (records: (typeof first)[]) => void;
    vi.spyOn(UniversalSearchService, 'searchRecords')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            completeFirst = resolve;
          })
      )
      .mockImplementationOnce(async () => {
        completeFirst([first]);
        return [second];
      });
    const result = await universalBatchSearch(UniversalResourceType.DEALS, [
      'same',
      'same',
    ]);
    expect(result).toEqual([
      { success: true, query: 'same', result: [first] },
      { success: true, query: 'same', result: [second] },
    ]);
  });

  it('throws a whole-call failure instead of inventing completed query outcomes', async () => {
    const search = vi
      .spyOn(searchOperations, 'searchObject')
      .mockRejectedValue(
        Object.assign(new Error('Service unavailable'), { status: 503 })
      );
    await expect(
      universalBatchSearch(
        UniversalResourceType.COMPANIES,
        ['one'],
        undefined,
        { continueOnError: false, retryConfig: { maxRetries: 0 } }
      )
    ).rejects.toThrow('Service unavailable');
    expect(search).toHaveBeenCalledOnce();
  });

  it('preserves denied and successful query positions with stable item error codes', async () => {
    const record = CompanyMockFactory.create();
    const search = vi
      .spyOn(UniversalSearchService, 'searchRecords')
      .mockRejectedValueOnce(
        Object.assign(new Error('Access denied'), { status: 403 })
      )
      .mockResolvedValueOnce([record]);
    const result = await universalBatchSearch(UniversalResourceType.DEALS, [
      'denied',
      'allowed',
    ]);
    expect(normalizeBatch(result, true)).toMatchObject({
      data: [
        {
          index: 0,
          query: 'denied',
          success: false,
          error: { code: 'PERMISSION_DENIED', retryable: false },
        },
        { index: 1, query: 'allowed', success: true, result: [record] },
      ],
      count: 2,
      summary: { total: 2, successful: 1, failed: 1 },
    });
    expect(search).toHaveBeenCalledTimes(2);
  });
});
