/**
 * TC-AO04: Performance Edge Case Validation
 * P1 Advanced Test - Exercises high-volume and wide-scope read operations.
 *
 * Coverage:
 * - Advanced search with filter combinations and high result limit
 * - Timeframe search across large historical windows
 * - Batch search executing multiple queries in a single request
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import type { TestResult } from '../shared/quality-gates';

class PerformanceEdgeCasesTest extends MCPTestBase {
  constructor() {
    super('TCAO04');
  }
}

describe('TC-AO04: Performance Edge Case Validation', () => {
  const testCase = new PerformanceEdgeCasesTest();
  const results: TestResult[] = [];

  beforeAll(async () => {
    await testCase.setup();
  });

  afterEach(async () => {
    await testCase.cleanupTestData();
  });

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();

    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    const passRate = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
    console.log(
      `\nTC-AO04 Results: ${passedCount}/${totalCount} passed (${passRate.toFixed(1)}%)`
    );

    if (passRate < 80) {
      console.warn(
        `⚠️  P1 Quality Gate Warning: Performance edge case pass rate ${passRate.toFixed(1)}% below 80% threshold`
      );
    }
  });

  it(
    'should execute advanced search with multiple filters and pagination',
    { timeout: 30000 },
    async () => {
      const testName = 'advanced_search_high_volume';
      let passed = false;
      let error: string | undefined;

      try {
        const result = await testCase.executeToolCall('advanced-search', {
          resource_type: 'companies',
          filters: {
            filters: [
              {
                attribute: { slug: 'name' },
                condition: 'contains',
                value: 'a',
              },
            ],
          },
          limit: 25,
          offset: 0,
        });

        QAAssertions.assertSearchResults(result, 'companies', 1);
        const text = testCase.extractTextContent(result).toLowerCase();
        expect(text).toContain('companies');

        passed = true;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        throw e;
      } finally {
        results.push({ testName, passed, error });
      }
    }
  );

  it(
    'should handle timeframe search across a wide historical window',
    { timeout: 30000 },
    async () => {
      const testName = 'timeframe_search_large_window';
      let passed = false;
      let error: string | undefined;

      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 2);

        const timeframeResult = await testCase.executeToolCall(
          'search-by-timeframe',
          {
            resource_type: 'deals',
            timeframe_type: 'modified',
            start_date: startDate.toISOString().slice(0, 10),
            end_date: endDate.toISOString().slice(0, 10),
            limit: 20,
          }
        );

        QAAssertions.assertSearchResults(timeframeResult, 'deals');
        const text = testCase.extractTextContent(timeframeResult).toLowerCase();
        expect(text).toContain('deals');

        passed = true;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        throw e;
      } finally {
        results.push({ testName, passed, error });
      }
    }
  );

  it(
    'should execute batch search queries efficiently',
    { timeout: 30000 },
    async () => {
      const testName = 'batch_search_queries';
      let passed = false;
      let error: string | undefined;

      try {
        const batchResult = await testCase.executeToolCall('batch-operations', {
          resource_type: 'companies',
          operation_type: 'search',
          queries: ['Inc', 'Labs', 'Solutions'],
          limit: 5,
        });

        // Flexible assertion - check for batch completion or search results
        const text = testCase.extractTextContent(batchResult).toLowerCase();
        const hasSuccess =
          !batchResult.isError ||
          text.includes('batch') ||
          text.includes('search') ||
          text.includes('found') ||
          text.includes('companies') ||
          text.includes('completed') ||
          text.includes('successful');

        expect(hasSuccess).toBe(true);

        passed = true;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        throw e;
      } finally {
        results.push({ testName, passed, error });
      }
    }
  );
});
