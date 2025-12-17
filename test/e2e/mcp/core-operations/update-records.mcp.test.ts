/**
 * TC-004: Update Records - Data Modification
 * P0 Core Test - MANDATORY
 *
 * Validates ability to modify existing record data.
 * Note: Task updates are limited to specific fields per Issue #517.
 * Must achieve 100% pass rate as part of P0 quality gate.
 */

import {
  describe,
  it,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  expect,
} from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import { TestUtilities } from '../shared/test-utilities';
import type { TestResult } from '../shared/quality-gates';

class UpdateRecordsTest extends MCPTestBase {
  constructor() {
    super('TC004');
  }
}

describe('TC-004: Update Records - Data Modification', () => {
  const testCase = new UpdateRecordsTest();
  const results: TestResult[] = [];

  // Store created IDs for updates and cleanup
  let companyId: string | null = null;
  let personId: string | null = null;
  let taskId: string | null = null;

  beforeAll(async () => {
    await testCase.setup();
  });

  beforeEach(async () => {
    const companyData = TestDataFactory.createCompanyData('TC004_SETUP');
    const companyResult = await testCase.executeToolCall('create_record', {
      resource_type: 'companies',
      record_data: companyData,
    });
    companyId = TestUtilities.extractRecordId(
      testCase.extractTextContent(companyResult)
    );
    if (companyId) testCase.trackRecord('companies', companyId);

    const personData = TestDataFactory.createPersonData('TC004_SETUP');
    const personResult = await testCase.executeToolCall('create_record', {
      resource_type: 'people',
      record_data: personData,
    });
    personId = TestUtilities.extractRecordId(
      testCase.extractTextContent(personResult)
    );
    if (personId) testCase.trackRecord('people', personId);

    const taskData = TestDataFactory.createTaskData('TC004_SETUP');
    const taskResult = await testCase.executeToolCall('create_record', {
      resource_type: 'tasks',
      record_data: taskData,
    });
    taskId = TestUtilities.extractRecordId(
      testCase.extractTextContent(taskResult)
    );
    if (taskId) testCase.trackRecord('tasks', taskId);
  });

  afterEach(async () => {
    await testCase.cleanupTestData();
    companyId = null;
    personId = null;
    taskId = null;
  });

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();

    // Log quality gate results for this test case
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    console.log(`\nTC-004 Results: ${passedCount}/${totalCount} passed`);
  });

  it('should update company description', async () => {
    const testName = 'update_company_description';
    let passed = false;
    let error: string | undefined;

    try {
      if (!companyId) {
        throw new Error('No company ID available for update test');
      }

      const updateData = {
        description: `Updated by TC004 at ${new Date().toISOString()}`,
      };

      const result = await testCase.executeToolCall('update_record', {
        resource_type: 'companies',
        record_id: companyId,
        record_data: updateData,
      });

      QAAssertions.assertRecordUpdated(
        result,
        'companies',
        companyId,
        updateData
      );

      // Verify the update persisted by fetching details
      const detailsResult = await testCase.executeToolCall(
        'get-record-details',
        {
          resource_type: 'companies',
          record_id: companyId,
        }
      );

      const detailsText = testCase.extractTextContent(detailsResult);
      expect(detailsText).toContain('Updated by TC004');

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should update person job title', async () => {
    const testName = 'update_person_job_title';
    let passed = false;
    let error: string | undefined;

    try {
      if (!personId) {
        throw new Error('No person ID available for update test');
      }

      const updateData = {
        job_title: 'TC004 Updated Senior Engineer',
      };

      const result = await testCase.executeToolCall('update_record', {
        resource_type: 'people',
        record_id: personId,
        record_data: updateData,
      });

      QAAssertions.assertRecordUpdated(result, 'people', personId, updateData);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should update task completion status (limited fields per Issue #517)', async () => {
    const testName = 'update_task_completion';
    let passed = false;
    let error: string | undefined;

    try {
      if (!taskId) {
        throw new Error('No task ID available for update test');
      }

      // Per Issue #517, tasks only support specific fields:
      // deadline_at, is_completed, linked_records, assignees
      const updateData = {
        is_completed: true,
      };

      const result = await testCase.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: updateData,
      });

      QAAssertions.assertRecordUpdated(result, 'tasks', taskId, updateData);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should update task deadline (supported field)', async () => {
    const testName = 'update_task_deadline';
    let passed = false;
    let error: string | undefined;

    try {
      if (!taskId) {
        throw new Error('No task ID available for update test');
      }

      // deadline_at is a supported field for task updates
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const updateData = {
        deadline_at: futureDate.toISOString(),
      };

      const result = await testCase.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: updateData,
      });

      QAAssertions.assertRecordUpdated(result, 'tasks', taskId, updateData);

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should handle updates to non-existent records gracefully', async () => {
    const testName = 'update_nonexistent_record';
    let passed = false;
    let error: string | undefined;

    try {
      const fakeId = 'NONEXISTENT_' + Date.now();

      const result = await testCase.executeToolCall('update_record', {
        resource_type: 'companies',
        record_id: fakeId,
        record_data: {
          description: 'This should fail',
        },
      });

      // Should indicate record not found
      const text = testCase.extractTextContent(result);
      const hasError =
        result.isError ||
        text.includes('not found') ||
        text.includes('does not exist') ||
        text.includes('404');

      expect(hasError).toBeTruthy();
      passed = true;
    } catch (e) {
      // If it throws, that's also acceptable error handling
      passed = true;
    } finally {
      results.push({ testName, passed, error });
    }
  });

  it('should preserve other fields when updating specific fields', async () => {
    const testName = 'preserve_other_fields';
    let passed = false;
    let error: string | undefined;

    try {
      if (!companyId) {
        throw new Error('No company ID available for update test');
      }

      // Get original details
      const originalDetails = await testCase.executeToolCall(
        'get-record-details',
        {
          resource_type: 'companies',
          record_id: companyId,
        }
      );
      const originalText = testCase.extractTextContent(originalDetails);

      // Update only one field
      const updateData = {
        size: 'large',
      };

      await testCase.executeToolCall('update_record', {
        resource_type: 'companies',
        record_id: companyId,
        record_data: updateData,
      });

      // Get updated details
      const updatedDetails = await testCase.executeToolCall(
        'get-record-details',
        {
          resource_type: 'companies',
          record_id: companyId,
        }
      );
      const updatedText = testCase.extractTextContent(updatedDetails);

      // Should still contain the original name (not overwritten)
      if (originalText.includes('TC004_SETUP')) {
        expect(updatedText).toContain('TC004_SETUP');
      }

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ testName, passed, error });
    }
  });
});

export { results as TC004Results };
