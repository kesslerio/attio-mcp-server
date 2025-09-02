/**
 * Split: Regression Prevention E2E – Search & Stability slice
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  callUniversalTool,
  validateTestEnvironment,
} from '../utils/enhanced-tool-caller.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';
import type { McpToolResponse } from '../utils/assertions.js';

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Regression Prevention – Search & Stability', () => {
  const T30 = 30000,
    T35 = 35000,
    T45 = 45000,
    T60 = 60000,
    T75 = 75000;
  beforeAll(async () => {
    startTestSuite('regression-prevention-search-stability');
    const validation = await validateTestEnvironment();
    if (!validation.valid)
      console.warn(
        '⚠️ Regression prevention test warnings:',
        validation.warnings
      );
  });

  afterAll(async () => {
    endTestSuite();
  });

  it(
    'handles malformed JSON-like queries gracefully',
    async () => {
      const cases = [
        { name: 'Empty query', params: { query: '', limit: 1 } },
        {
          name: 'Very long query',
          params: { query: 'A'.repeat(1000), limit: 1 },
        },
        {
          name: 'Special characters',
          params: {
            query: '{"test": "value", "special": "chars!@#$%"}',
            limit: 1,
          },
        },
      ];
      for (const c of cases) {
        const response = (await callUniversalTool('search-records', {
          resource_type: 'companies',
          ...c.params,
        } as any)) as McpToolResponse;
        expect(response).toBeDefined();
        expect(typeof response).toBe('object');
        console.error(`✅ JSON handling validated for: ${c.name}`);
      }
    },
    T45
  );

  it(
    'handles boundary value conditions for search safely',
    async () => {
      const boundary = [
        { name: 'Zero limit', params: { limit: 0 } },
        { name: 'Maximum limit', params: { limit: 1000 } },
        { name: 'Negative offset', params: { limit: 10, offset: -1 } },
      ];
      for (const b of boundary) {
        const response = (await callUniversalTool('search-records', {
          resource_type: 'companies',
          query: 'boundary-test',
          ...b.params,
        } as any)) as McpToolResponse;
        expect(response).toBeDefined();
        console.error(`✅ ${b.name} handled safely`);
      }
      console.error('✅ Boundary value protection validated');
    },
    T45
  );

  it(
    'prevents infinite loops and long-running searches',
    async () => {
      const start = Date.now();
      const response = (await callUniversalTool('search-records', {
        resource_type: 'companies',
        query: 'recursion-test',
        limit: 10,
      } as any)) as McpToolResponse;
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(30000);
      expect(response).toBeDefined();
      console.error(`✅ Infinite loop prevention validated (${duration}ms)`);
    },
    T35
  );

  it(
    'handles resource exhaustion gracefully',
    async () => {
      const tests = [
        () =>
          callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'X'.repeat(500),
            limit: 50,
          } as any),
        async () => {
          const searches = Array(8)
            .fill(null)
            .map((_, i) =>
              callUniversalTool('search-records', {
                resource_type: 'companies',
                query: `concurrent-${i}`,
                limit: 10,
              } as any)
            );
          return Promise.allSettled(searches);
        },
      ];
      for (const t of tests) {
        const start = Date.now();
        const res = await t();
        expect(res).toBeDefined();
        expect(Date.now() - start).toBeLessThan(60000);
      }
      console.error('✅ Resource exhaustion protection validated');
    },
    T75
  );

  it(
    'maintains system stability under error conditions',
    async () => {
      const ops = [
        () =>
          callUniversalTool('get-record-details', {
            resource_type: 'companies',
            record_id: 'definitely-does-not-exist',
          } as any),
        () =>
          callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'stability-test-1',
            limit: 1,
          } as any),
        () =>
          callUniversalTool('update-record', {
            resource_type: 'companies',
            record_id: 'non-existent-id',
            record_data: { name: 'Update test' },
          } as any),
        () =>
          callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'stability-test-2',
            limit: 1,
          } as any),
      ];
      for (const op of ops) {
        const response = (await op()) as McpToolResponse;
        expect(response).toBeDefined();
        expect(typeof response).toBe('object');
        expect('isError' in response).toBe(true);
        const health = (await callUniversalTool('search-records', {
          resource_type: 'companies',
          query: 'health-check',
          limit: 1,
        } as any)) as McpToolResponse;
        expect(health).toBeDefined();
      }
      console.error('✅ System stability under error conditions validated');
    },
    T60
  );

  it(
    'preserves API contract consistency (search + details)',
    async () => {
      const cases = [
        () =>
          callUniversalTool('search-records', {
            resource_type: 'companies',
            query: 'contract-test',
            limit: 1,
          } as any),
        () =>
          callUniversalTool('get-record-details', {
            resource_type: 'companies',
            record_id: 'contract-test-id',
          } as any),
      ];
      for (const test of cases) {
        const response = (await test()) as McpToolResponse;
        expect(response).toBeDefined();
        expect(typeof response).toBe('object');
        expect(response).toHaveProperty('isError');
        if (response.isError) {
          expect(response).toHaveProperty('error');
          expect(typeof response.error).toBe('string');
        } else {
          expect(response).toHaveProperty('content');
        }
      }
      console.error('✅ API contract consistency preservation validated');
    },
    T30
  );
});
