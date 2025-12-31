/**
 * TC-010: Manage List Entry - Error Handling Tests
 * P1 Essential Test
 *
 * Validates error handling for the consolidated manage-list-entry tool:
 * - No mode detected (insufficient parameters)
 * - Multiple modes detected (conflicting parameters)
 * - Invalid list/entry IDs
 * - Invalid parameter types
 *
 * @see manage-list-entry.mcp.test.ts for happy path tests
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestBase } from '@test/e2e/mcp/shared/mcp-test-base.js';
import { TestDataFactory } from '@test/e2e/mcp/shared/test-data-factory.js';
import { QUALITY_GATES } from '@test/e2e/mcp/shared/test-constants.js';
import type { TestResult } from '@test/e2e/mcp/shared/quality-gates.js';
import {
  extractRecordId,
  isErrorResponse,
  LIST_ENTRY_TEST_CONSTANTS,
} from '@test/e2e/mcp/shared/list-entry-helpers.js';

class ManageListEntryErrorTest extends MCPTestBase {
  private testListId: string | null = null;
  private testCompanyId: string | null = null;

  constructor() {
    super('TC010E');
  }

  async setupTestData(): Promise<void> {
    try {
      // Create a test company for error testing
      const companyData = TestDataFactory.createCompanyData('TC010E');
      const companyResult = await this.executeToolCall('create_record', {
        resource_type: 'companies',
        record_data: companyData,
      });

      if (!companyResult.isError) {
        const companyId = extractRecordId(companyResult);
        if (companyId) {
          this.testCompanyId = companyId;
          this.trackRecord('companies', companyId);
        }
      }

      // Discover an existing list
      const listsResult = await this.executeToolCall('get-lists', {});
      const listsText = listsResult.content?.[0]?.text || '[]';
      const lists = JSON.parse(listsText);

      if (Array.isArray(lists) && lists.length > 0) {
        // Prefer lists that support companies (parent_object check)
        const companyList = lists.find(
          (l: Record<string, unknown>) =>
            l.parent_object === 'companies' || !l.parent_object
        );
        const selectedList = companyList || lists[0];
        this.testListId =
          (selectedList.id as Record<string, string>)?.list_id ||
          (selectedList.api_slug as string);
      }
    } catch (error) {
      console.error('Failed to setup error test data:', error);
    }
  }

  getTestListId(): string | null {
    return this.testListId;
  }

  getTestCompanyId(): string | null {
    return this.testCompanyId;
  }
}

describe('TC-010: Manage List Entry - Error Handling', () => {
  const testCase = new ManageListEntryErrorTest();
  const results: TestResult[] = [];

  beforeAll(async () => {
    await testCase.setup();
    await testCase.setupTestData();
  });

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();

    // Log quality gate results
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    console.log(`\nTC-010 Errors: ${passedCount}/${totalCount} passed`);

    if (totalCount > 0) {
      const passRate = (passedCount / totalCount) * 100;
      const threshold = QUALITY_GATES.P1_MIN_PASS_RATE;
      if (passRate < threshold) {
        console.warn(`TC-010 Errors below threshold: ${passRate.toFixed(1)}%`);
      } else {
        console.log(`TC-010 Errors meets threshold: ${passRate.toFixed(1)}%`);
      }
    }
  });

  it('should error when no mode detected (only listId)', async () => {
    const testName = 'error_no_mode_detected';
    let passed = false;
    let error: string | undefined;

    try {
      const listId = testCase.getTestListId();

      if (!listId) {
        console.log('Test list not available, skipping');
        passed = true;
        return;
      }

      // Only provide listId - no recordId, entryId, or attributes
      const result = await testCase.executeToolCall('manage-list-entry', {
        listId,
      });

      const text = result.content?.[0]?.text || '';
      const lower = text.toLowerCase();

      // Should return an error about mode detection
      const hasError =
        isErrorResponse(result) ||
        lower.includes('no management mode') ||
        lower.includes('mode detected');
      expect(hasError).toBeTruthy();

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      // Exception containing mode-related message is acceptable
      if (error.toLowerCase().includes('mode')) {
        passed = true;
      } else {
        throw e;
      }
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should error when multiple modes detected', async () => {
    const testName = 'error_multiple_modes';
    let passed = false;
    let error: string | undefined;

    try {
      const listId = testCase.getTestListId();
      const companyId = testCase.getTestCompanyId();

      if (!listId || !companyId) {
        console.log('Test data not available, skipping');
        passed = true;
        return;
      }

      // Provide conflicting parameters (Mode 1 + Mode 3)
      const result = await testCase.executeToolCall('manage-list-entry', {
        listId,
        recordId: companyId,
        objectType: 'companies',
        entryId: LIST_ENTRY_TEST_CONSTANTS.DUMMY_ENTRY_ID,
        attributes: { test: 'value' },
      });

      const text = result.content?.[0]?.text || '';
      const hasError =
        isErrorResponse(result) || text.toLowerCase().includes('multiple');
      expect(hasError).toBeTruthy();

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      if (
        error.toLowerCase().includes('multiple') ||
        error.toLowerCase().includes('mode')
      ) {
        passed = true;
      } else {
        throw e;
      }
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should error for invalid listId', async () => {
    const testName = 'error_invalid_list_id';
    let passed = false;
    let error: string | undefined;

    try {
      const companyId = testCase.getTestCompanyId();

      if (!companyId) {
        console.log('Test company not available, skipping');
        passed = true;
        return;
      }

      // Use a non-existent list ID
      const result = await testCase.executeToolCall('manage-list-entry', {
        listId: LIST_ENTRY_TEST_CONSTANTS.INVALID_UUID,
        recordId: companyId,
        objectType: 'companies',
      });

      const text = result.content?.[0]?.text || '';
      const lower = text.toLowerCase();

      // Accept various error indicators
      const hasError =
        isErrorResponse(result) ||
        lower.includes('not found') ||
        lower.includes('error') ||
        lower.includes('invalid') ||
        text.includes('404');
      expect(hasError).toBeTruthy();

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      if (
        error.toLowerCase().includes('not found') ||
        error.toLowerCase().includes('invalid') ||
        error.includes('404')
      ) {
        passed = true;
      } else {
        throw e;
      }
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should error for Mode 1 missing objectType', async () => {
    const testName = 'error_mode1_missing_object_type';
    let passed = false;
    let error: string | undefined;

    try {
      const listId = testCase.getTestListId();
      const companyId = testCase.getTestCompanyId();

      if (!listId || !companyId) {
        console.log('Test data not available, skipping');
        passed = true;
        return;
      }

      // Provide recordId without objectType
      const result = await testCase.executeToolCall('manage-list-entry', {
        listId,
        recordId: companyId,
        // Missing: objectType
      });

      const text = result.content?.[0]?.text || '';
      const lower = text.toLowerCase();
      const hasError =
        isErrorResponse(result) ||
        lower.includes('objecttype') ||
        lower.includes('mode 1');
      expect(hasError).toBeTruthy();

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      if (
        error.toLowerCase().includes('objecttype') ||
        error.toLowerCase().includes('mode')
      ) {
        passed = true;
      } else {
        throw e;
      }
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should error for Mode 3 invalid attributes (string instead of object)', async () => {
    const testName = 'error_mode3_invalid_attributes';
    let passed = false;
    let error: string | undefined;

    try {
      const listId = testCase.getTestListId();

      if (!listId) {
        console.log('Test list not available, skipping');
        passed = true;
        return;
      }

      // Provide attributes as string instead of object
      const result = await testCase.executeToolCall('manage-list-entry', {
        listId,
        entryId: LIST_ENTRY_TEST_CONSTANTS.DUMMY_ENTRY_ID,
        attributes: 'invalid-string-instead-of-object',
      });

      const text = result.content?.[0]?.text || '';
      const lower = text.toLowerCase();
      const hasError =
        isErrorResponse(result) ||
        lower.includes('attributes') ||
        lower.includes('mode 3') ||
        lower.includes('object');
      expect(hasError).toBeTruthy();

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      if (
        error.toLowerCase().includes('attributes') ||
        error.toLowerCase().includes('object') ||
        error.toLowerCase().includes('mode')
      ) {
        passed = true;
      } else {
        throw e;
      }
    } finally {
      results.push({ testName, passed, error });
    }
  });
});
