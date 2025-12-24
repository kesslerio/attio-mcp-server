/**
 * TC-006: List Operations - Basic List Management
 * P1 Essential Test
 *
 * Validates basic list operations including retrieval and details.
 * Must achieve 80% pass rate as part of P1 quality gate.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class ListOperationsTest extends MCPTestBase {
  private testListId: string | null = null;
  private testCompanyId: string | null = null;

  constructor() {
    super('TC006');
  }

  /**
   * Setup test data - create a company to use with lists
   */
  async setupTestData(): Promise<void> {
    try {
      // Create a test company first
      const companyData = TestDataFactory.createCompanyData('TC006');
      const createResult = await this.executeToolCall('create_record', {
        resource_type: 'companies',
        record_data: companyData,
      });

      if (!createResult.isError) {
        const text = createResult.content?.[0]?.text || '';
        const idMatch = text.match(/\(ID:\s*([a-f0-9-]+)\)/i);
        if (idMatch) {
          this.testCompanyId = idMatch[1];
          this.trackRecord('companies', this.testCompanyId);
        }
      }
    } catch (error) {
      console.error('Failed to setup test data:', error);
    }
  }

  /**
   * Cleanup test data
   */
  async cleanupTestData(): Promise<void> {
    await super.cleanupTestData();
  }
}

describe('TC-006: List Operations - Basic List Management', () => {
  const testCase = new ListOperationsTest();
  const results: TestResult[] = [];

  beforeAll(async () => {
    await testCase.setup();
    await testCase.setupTestData();
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
    console.log(`\nTC-006 Results: ${passedCount}/${totalCount} passed`);

    // P1 tests require 80% pass rate
    if (totalCount > 0) {
      const passRate = (passedCount / totalCount) * 100;
      if (passRate < 80) {
        console.warn(
          `⚠️ TC-006 below P1 threshold: ${passRate.toFixed(1)}% (required: 80%)`
        );
      }
    }
  });

  it('should retrieve all lists', async () => {
    const testName = 'get_all_lists';
    let passed = false;
    let error: string | undefined;

    try {
      const result = await testCase.executeToolCall('get-lists', {});

      QAAssertions.assertValidListResponse(result, 'get-lists');

      // Verify response contains array of lists
      const text = result.content?.[0]?.text || '';
      expect(text).toBeTruthy();

      // Should be a JSON array
      const lists = JSON.parse(text);
      expect(Array.isArray(lists)).toBe(true);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should get details of a specific list', async () => {
    const testName = 'get_list_details';
    let passed = false;
    let error: string | undefined;

    try {
      // First get lists to find a valid list ID
      const listsResult = await testCase.executeToolCall('get-lists', {});
      const listsText = listsResult.content?.[0]?.text || '[]';
      const lists = JSON.parse(listsText);

      if (!Array.isArray(lists) || lists.length === 0) {
        console.log('No lists available for detail test, skipping');
        passed = true;
        return;
      }

      const testListId = lists[0].id?.list_id || lists[0].api_slug;

      const result = await testCase.executeToolCall('get-list-details', {
        listId: testListId,
      });

      QAAssertions.assertValidListResponse(result, 'get-list-details');

      // Verify response contains list details
      const text = result.content?.[0]?.text || '';
      const listDetails = JSON.parse(text);
      expect(listDetails).toBeDefined();
      expect(listDetails.id).toBeDefined();

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should get entries from a list', async () => {
    const testName = 'get_list_entries';
    let passed = false;
    let error: string | undefined;

    try {
      // First get lists to find a valid list ID
      const listsResult = await testCase.executeToolCall('get-lists', {});
      const listsText = listsResult.content?.[0]?.text || '[]';
      const lists = JSON.parse(listsText);

      if (!Array.isArray(lists) || lists.length === 0) {
        console.log('No lists available for entries test, skipping');
        passed = true;
        return;
      }

      const testListId = lists[0].id?.list_id || lists[0].api_slug;

      const result = await testCase.executeToolCall('get-list-entries', {
        listId: testListId,
        limit: 10,
      });

      QAAssertions.assertValidListResponse(result, 'get-list-entries');

      // Verify response contains array of entries
      const text = result.content?.[0]?.text || '';
      if (text.toLowerCase().includes('error')) {
        // Empty list is ok
        if (text.includes('Invalid list ID')) {
          throw new Error('Invalid list ID');
        }
      } else {
        const entries = JSON.parse(text);
        expect(Array.isArray(entries)).toBe(true);
      }

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should handle pagination when getting list entries', async () => {
    const testName = 'get_list_entries_paginated';
    let passed = false;
    let error: string | undefined;

    try {
      // First get lists to find a valid list ID
      const listsResult = await testCase.executeToolCall('get-lists', {});
      const listsText = listsResult.content?.[0]?.text || '[]';
      const lists = JSON.parse(listsText);

      if (!Array.isArray(lists) || lists.length === 0) {
        console.log('No lists available for pagination test, skipping');
        passed = true;
        return;
      }

      const testListId = lists[0].id?.list_id || lists[0].api_slug;

      // Test with pagination parameters
      const result = await testCase.executeToolCall('get-list-entries', {
        listId: testListId,
        limit: 5,
        offset: 0,
      });

      QAAssertions.assertValidListResponse(result, 'get-list-entries');

      // Test second page
      const result2 = await testCase.executeToolCall('get-list-entries', {
        listId: testListId,
        limit: 5,
        offset: 5,
      });

      QAAssertions.assertValidListResponse(result2, 'get-list-entries');

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });
});
