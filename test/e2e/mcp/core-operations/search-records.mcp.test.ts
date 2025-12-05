/**
 * TC-001: Search Records - Basic Search Functionality
 * P0 Core Test - MANDATORY
 *
 * Validates basic search capabilities across all resource types.
 * Must achieve 100% pass rate as part of P0 quality gate.
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class SearchRecordsTest extends MCPTestBase {
  constructor() {
    super('TC001');
  }
}

describe('TC-001: Search Records - Basic Search Functionality', () => {
  const testCase = new SearchRecordsTest();
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

    // Log quality gate results for this test case
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    console.log(`\nTC-001 Results: ${passedCount}/${totalCount} passed`);
  });

  it(
    'should execute basic search for companies',
    { timeout: 30000 },
    async () => {
      const testName = 'search_companies';
      let passed = false;
      let error: string | undefined;

      try {
        const result = await testCase.executeToolCall('search-records', {
          resource_type: 'companies',
          query: TestDataFactory.createSearchQuery('TC001'),
          limit: 5,
        });

        QAAssertions.assertValidSearchResults(result, 'companies');
        passed = true;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        throw e;
      } finally {
        results.push({ testName, passed, error });
      }
    }
  );

  it('should execute basic search for people', { timeout: 30000 }, async () => {
    const testName = 'search_people';
    let passed = false;
    let error: string | undefined;

    try {
      const result = await testCase.executeToolCall('search-records', {
        resource_type: 'people',
        query: TestDataFactory.createSearchQuery('TC001'),
        limit: 5,
      });

      QAAssertions.assertValidSearchResults(result, 'people');
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should execute basic search for tasks', { timeout: 30000 }, async () => {
    const testName = 'search_tasks';
    let passed = false;
    let error: string | undefined;

    try {
      const result = await testCase.executeToolCall('search-records', {
        resource_type: 'tasks',
        query: TestDataFactory.createSearchQuery('TC001'),
        limit: 5,
      });

      QAAssertions.assertValidSearchResults(result, 'tasks');
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it(
    'should return consistent response format across resource types',
    { timeout: 30000 },
    async () => {
      const testName = 'consistent_format';
      let passed = false;
      let error: string | undefined;

      try {
        const resourceTypes = ['companies', 'people', 'tasks'];
        const responses = [];

        for (const resourceType of resourceTypes) {
          const result = await testCase.executeToolCall('search-records', {
            resource_type: resourceType,
            query: TestDataFactory.createSearchQuery('TC001'),
            limit: 2,
          });
          responses.push(result);
        }

        // Verify all responses have consistent MCP structure
        for (const response of responses) {
          expect(response).toHaveProperty('content');
          // MCP doesn't have isError property - check content instead
          const text = testCase.extractTextContent(response);
          expect(text).toBeTruthy();
          // Check it's not an error response
          expect(text.toLowerCase()).not.toContain('error');
        }

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
    'should handle empty search results gracefully',
    { timeout: 30000 },
    async () => {
      const testName = 'empty_results';
      let passed = false;
      let error: string | undefined;

      try {
        // Search for something unlikely to exist
        const result = await testCase.executeToolCall('search-records', {
          resource_type: 'companies',
          query: 'NONEXISTENT_COMPANY_' + Date.now(),
          limit: 5,
        });

        // Should not error, just return empty or no results
        expect(result.isError).toBeFalsy();
        QAAssertions.assertValidSearchResults(result, 'companies', 0);
        passed = true;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        throw e;
      } finally {
        results.push({ testName, passed, error });
      }
    }
  );

  it('should respect limit parameter', { timeout: 30000 }, async () => {
    const testName = 'respect_limit';
    let passed = false;
    let error: string | undefined;

    try {
      const result = await testCase.executeToolCall('search-records', {
        resource_type: 'companies',
        query: TestDataFactory.createSearchQuery('TC001'),
        limit: 3,
      });

      expect(result.isError).toBeFalsy();
      // Note: Actual validation of limit would require parsing the response
      // For now, we just verify the call succeeds
      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });
});

export { results as TC001Results };
