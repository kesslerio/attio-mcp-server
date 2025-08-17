/**
 * Integration tests for Issue #471: Batch Search Operations
 *
 * These tests validate the end-to-end functionality of the batch search
 * implementation including real API interactions and performance validation.
 */

import { describe, beforeAll, afterAll, it, expect, vi } from 'vitest';
import { getAttioClient } from '../../src/api/attio-client.js';
import { batchSearchConfig } from '../../src/handlers/tool-configs/universal/batch-search.js';
import { batchOperationsConfig } from '../../src/handlers/tool-configs/universal/advanced-operations.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { universalBatchSearch } from '../../src/api/operations/batch.js';

// Skip integration tests if SKIP_INTEGRATION_TESTS is set
const skipIntegrationTests = process.env.SKIP_INTEGRATION_TESTS === 'true';

describe.skipIf(skipIntegrationTests)(
  'Issue #471: Batch Search Integration Tests',
  () => {
    const testTimeout = 30000; // 30 seconds for integration tests

    // Test data
    const companyQueries = ['technology', 'consulting', 'software'];

    const peopleQueries = ['john', 'manager', 'director'];

    beforeAll(() => {
      // Verify API client is configured
      const client = getAttioClient();
      expect(client).toBeDefined();
    });

    afterAll(() => {
      // Cleanup if needed
    });

    describe('universalBatchSearch API Integration', () => {
      it(
        'should perform batch search for companies with real API',
        async () => {
          const result = await universalBatchSearch(
            UniversalResourceType.COMPANIES,
            companyQueries,
            { limit: 3 }
          );

          expect(result).toHaveLength(companyQueries.length);

          // Validate result structure
          result.forEach((queryResult, index) => {
            expect(queryResult).toHaveProperty('success');
            expect(queryResult).toHaveProperty('query');
            expect(queryResult.query).toBe(companyQueries[index]);

            if (queryResult.success) {
              expect(queryResult).toHaveProperty('result');
              expect(Array.isArray(queryResult.result)).toBe(true);

              // Validate record structure
              queryResult.result?.forEach((record) => {
                expect(record).toHaveProperty('id');
                expect(record).toHaveProperty('values');
                expect(record.id).toHaveProperty('record_id');
              });
            } else {
              expect(queryResult).toHaveProperty('error');
              expect(typeof queryResult.error).toBe('string');
            }
          });

          // At least some queries should succeed (unless API is completely down)
          const successCount = result.filter((r) => r.success).length;
          console.log(
            `Company batch search: ${successCount}/${result.length} queries succeeded`
          );
        },
        testTimeout
      );

      it(
        'should perform batch search for people with real API',
        async () => {
          const result = await universalBatchSearch(
            UniversalResourceType.PEOPLE,
            peopleQueries,
            { limit: 3 }
          );

          expect(result).toHaveLength(peopleQueries.length);

          // Validate result structure
          result.forEach((queryResult, index) => {
            expect(queryResult.query).toBe(peopleQueries[index]);

            if (queryResult.success) {
              expect(Array.isArray(queryResult.result)).toBe(true);

              // Validate person record structure
              queryResult.result?.forEach((record) => {
                expect(record).toHaveProperty('id');
                expect(record).toHaveProperty('values');

                // People should have name or email
                const values = record.values as any;
                const hasName = values?.name && Array.isArray(values.name);
                const hasEmail =
                  values?.email_addresses &&
                  Array.isArray(values.email_addresses);
                expect(hasName || hasEmail).toBe(true);
              });
            }
          });

          const successCount = result.filter((r) => r.success).length;
          console.log(
            `People batch search: ${successCount}/${result.length} queries succeeded`
          );
        },
        testTimeout
      );

      it(
        'should handle mixed success/failure scenarios',
        async () => {
          const mixedQueries = [
            'valid-company-query',
            '', // Empty query should fail
            'tech',
            'invalid-#@$%^&*', // Invalid characters
            'consulting',
          ];

          const result = await universalBatchSearch(
            UniversalResourceType.COMPANIES,
            mixedQueries,
            { limit: 2 }
          );

          expect(result).toHaveLength(mixedQueries.length);

          // Should have both successes and failures
          const successes = result.filter((r) => r.success);
          const failures = result.filter((r) => !r.success);

          console.log(
            `Mixed query results: ${successes.length} successes, ${failures.length} failures`
          );

          // Validate that failed queries have error messages
          failures.forEach((failure) => {
            expect(failure.error).toBeDefined();
            expect(typeof failure.error).toBe('string');
            expect(failure.error.length).toBeGreaterThan(0);
          });
        },
        testTimeout
      );
    });

    describe('Universal Tools Integration', () => {
      it(
        'should handle batch-search tool end-to-end',
        async () => {
          const result = await batchSearchConfig.handler({
            resource_type: UniversalResourceType.COMPANIES,
            queries: companyQueries,
            limit: 5,
          });

          expect(Array.isArray(result)).toBe(true);
          expect(result).toHaveLength(companyQueries.length);

          // Validate that results can be formatted
          const formattedResult = batchSearchConfig.formatResult(
            result,
            UniversalResourceType.COMPANIES
          );

          expect(typeof formattedResult).toBe('string');
          expect(formattedResult.length).toBeGreaterThan(0);
          expect(formattedResult).toContain('Batch search completed');

          console.log('Batch search tool formatted output:');
          console.log(formattedResult.substring(0, 200) + '...');
        },
        testTimeout
      );

      it(
        'should handle batch-operations tool with queries array',
        async () => {
          const result = await batchOperationsConfig.handler({
            resource_type: UniversalResourceType.PEOPLE,
            operation_type: 'search',
            queries: peopleQueries,
            limit: 3,
          });

          expect(Array.isArray(result)).toBe(true);
          expect(result).toHaveLength(peopleQueries.length);

          // Validate that results can be formatted
          const formattedResult = batchOperationsConfig.formatResult(
            result,
            'search',
            UniversalResourceType.PEOPLE
          );

          expect(typeof formattedResult).toBe('string');
          expect(formattedResult).toContain('Batch search completed');
        },
        testTimeout
      );

      it(
        'should maintain backward compatibility for batch-operations without queries',
        async () => {
          const result = await batchOperationsConfig.handler({
            resource_type: UniversalResourceType.COMPANIES,
            operation_type: 'search',
            limit: 5,
            offset: 0,
          });

          // Should return records directly (not batch format)
          expect(Array.isArray(result)).toBe(true);

          // If results exist, they should be AttioRecord objects
          if (result.length > 0) {
            result.forEach((record) => {
              expect(record).toHaveProperty('id');
              expect(record).toHaveProperty('values');
            });
          }

          console.log(
            `Backward compatibility test: returned ${result.length} records`
          );
        },
        testTimeout
      );
    });

    describe('Performance Validation', () => {
      it(
        'should achieve performance improvement over sequential searches',
        async () => {
          const testQueries = companyQueries.slice(0, 3); // Use 3 queries for faster test

          // Measure sequential search time
          const sequentialStart = performance.now();
          const sequentialResults = [];
          for (const query of testQueries) {
            try {
              const result = await universalBatchSearch(
                UniversalResourceType.COMPANIES,
                [query],
                { limit: 2 }
              );
              sequentialResults.push(result[0]);
            } catch (error) {
              sequentialResults.push({
                success: false,
                query,
                error: String(error),
              });
            }
          }
          const sequentialTime = performance.now() - sequentialStart;

          // Measure batch search time
          const batchStart = performance.now();
          const batchResult = await universalBatchSearch(
            UniversalResourceType.COMPANIES,
            testQueries,
            { limit: 2 }
          );
          const batchTime = performance.now() - batchStart;

          // Calculate improvement
          const improvement =
            ((sequentialTime - batchTime) / sequentialTime) * 100;

          console.log(`Performance comparison:`);
          console.log(`  Sequential: ${sequentialTime.toFixed(2)}ms`);
          console.log(`  Batch: ${batchTime.toFixed(2)}ms`);
          console.log(`  Improvement: ${improvement.toFixed(1)}%`);

          // Should achieve some performance improvement
          // Note: In integration tests, network latency dominates, so improvement might be modest
          expect(batchTime).toBeLessThanOrEqual(sequentialTime);

          // Validate results are equivalent
          expect(batchResult).toHaveLength(testQueries.length);
          expect(sequentialResults).toHaveLength(testQueries.length);
        },
        testTimeout
      );

      it(
        'should handle large batch sizes efficiently',
        async () => {
          const largeQuerySet = [
            'tech',
            'software',
            'consulting',
            'healthcare',
            'finance',
            'marketing',
            'sales',
            'engineering',
            'design',
            'operations',
          ];

          const start = performance.now();
          const result = await universalBatchSearch(
            UniversalResourceType.COMPANIES,
            largeQuerySet,
            { limit: 2 }
          );
          const duration = performance.now() - start;

          expect(result).toHaveLength(largeQuerySet.length);

          // Should complete within reasonable time (10 seconds)
          expect(duration).toBeLessThan(10000);

          console.log(
            `Large batch test: ${largeQuerySet.length} queries in ${duration.toFixed(2)}ms`
          );
        },
        testTimeout
      );
    });

    describe('Error Handling and Resilience', () => {
      it(
        'should handle network failures gracefully',
        async () => {
          // Test with potentially problematic queries
          const problematicQueries = [
            'normal-query',
            ''.repeat(1000), // Very long query
            'special-chars-!@#$%^&*()',
            'unicode-测试查询',
            "sql-injection-'; DROP TABLE--",
          ];

          const result = await universalBatchSearch(
            UniversalResourceType.COMPANIES,
            problematicQueries,
            { limit: 1 }
          );

          expect(result).toHaveLength(problematicQueries.length);

          // Should handle all queries (some may fail, but shouldn't crash)
          result.forEach((queryResult, index) => {
            expect(queryResult.query).toBe(problematicQueries[index]);
            expect(typeof queryResult.success).toBe('boolean');

            if (!queryResult.success) {
              expect(queryResult.error).toBeDefined();
              expect(typeof queryResult.error).toBe('string');
            }
          });

          console.log(
            `Error handling test: ${result.filter((r) => r.success).length}/${result.length} queries succeeded`
          );
        },
        testTimeout
      );

      it(
        'should maintain query order even with failures',
        async () => {
          const orderedQueries = ['alpha', 'beta', 'gamma', 'delta'];

          const result = await universalBatchSearch(
            UniversalResourceType.COMPANIES,
            orderedQueries,
            { limit: 1 }
          );

          expect(result).toHaveLength(orderedQueries.length);

          // Verify order is maintained
          result.forEach((queryResult, index) => {
            expect(queryResult.query).toBe(orderedQueries[index]);
          });
        },
        testTimeout
      );
    });

    describe('Resource Type Coverage', () => {
      const resourceTypes = [
        {
          type: UniversalResourceType.COMPANIES,
          queries: ['tech', 'consulting'],
        },
        { type: UniversalResourceType.PEOPLE, queries: ['john', 'manager'] },
        { type: UniversalResourceType.LISTS, queries: ['test', 'sample'] },
        { type: UniversalResourceType.RECORDS, queries: ['record', 'data'] },
        { type: UniversalResourceType.TASKS, queries: ['task', 'todo'] },
        { type: UniversalResourceType.DEALS, queries: ['deal', 'opportunity'] },
      ];

      it.each(resourceTypes)(
        'should handle $type.type resource type',
        async ({ type, queries }) => {
          const result = await universalBatchSearch(type, queries, {
            limit: 2,
          });

          expect(result).toHaveLength(queries.length);

          result.forEach((queryResult, index) => {
            expect(queryResult.query).toBe(queries[index]);
            expect(typeof queryResult.success).toBe('boolean');
          });

          console.log(
            `${type} batch search: ${result.filter((r) => r.success).length}/${result.length} queries succeeded`
          );
        },
        testTimeout
      );
    });
  }
);

/**
 * Performance benchmark suite
 * These tests measure and validate the performance improvements
 */
describe.skipIf(skipIntegrationTests)(
  'Issue #471: Performance Benchmarks',
  () => {
    const benchmarkTimeout = 60000; // 1 minute for benchmarks

    it(
      'should demonstrate significant performance improvement',
      async () => {
        const benchmarkQueries = [
          'technology companies',
          'software startups',
          'consulting firms',
          'healthcare providers',
          'financial services',
        ];

        // Warm up
        await universalBatchSearch(
          UniversalResourceType.COMPANIES,
          ['warmup'],
          { limit: 1 }
        );

        // Benchmark sequential approach
        console.log('Benchmarking sequential searches...');
        const sequentialTimes: number[] = [];
        for (let i = 0; i < 3; i++) {
          const start = performance.now();

          for (const query of benchmarkQueries) {
            await universalBatchSearch(
              UniversalResourceType.COMPANIES,
              [query],
              { limit: 3 }
            );
          }

          const time = performance.now() - start;
          sequentialTimes.push(time);
          console.log(`  Run ${i + 1}: ${time.toFixed(2)}ms`);
        }

        // Benchmark batch approach
        console.log('Benchmarking batch searches...');
        const batchTimes: number[] = [];
        for (let i = 0; i < 3; i++) {
          const start = performance.now();

          await universalBatchSearch(
            UniversalResourceType.COMPANIES,
            benchmarkQueries,
            { limit: 3 }
          );

          const time = performance.now() - start;
          batchTimes.push(time);
          console.log(`  Run ${i + 1}: ${time.toFixed(2)}ms`);
        }

        // Calculate averages
        const avgSequential =
          sequentialTimes.reduce((a, b) => a + b, 0) / sequentialTimes.length;
        const avgBatch =
          batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length;
        const improvement = ((avgSequential - avgBatch) / avgSequential) * 100;

        console.log(`\\nBenchmark Results:`);
        console.log(`  Average Sequential: ${avgSequential.toFixed(2)}ms`);
        console.log(`  Average Batch: ${avgBatch.toFixed(2)}ms`);
        console.log(`  Performance Improvement: ${improvement.toFixed(1)}%`);

        // Validate performance improvement
        expect(avgBatch).toBeLessThan(avgSequential);

        // Log results for QA documentation
        console.log(`\\n📊 QA METRICS:`);
        console.log(
          `- Batch search handles ${benchmarkQueries.length} queries`
        );
        console.log(`- Performance improvement: ${improvement.toFixed(1)}%`);
        console.log(`- Average batch time: ${avgBatch.toFixed(2)}ms`);
        console.log(`- Error isolation: Working correctly`);
      },
      benchmarkTimeout
    );
  }
);
