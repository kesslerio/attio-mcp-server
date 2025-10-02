/**
 * TC-EC06: Validation Error Handling Edge Cases
 * P2 Edge Cases Test - Validation Error Coverage
 * Issue #814: Validation Error Handling Tests
 *
 * Validates that universal MCP tools surface actionable validation feedback
 * for invalid inputs across core CRM objects. Focus areas include:
 * - Select option suggestions for mistyped values
 * - Required field enforcement and error messaging
 * - Protection against read-only field modifications
 * - Format validation for email, phone, and domain inputs
 *
 * Resources covered: companies, people, tasks, and notes
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  EdgeCaseTestBase,
  type EdgeCaseTestResult,
} from '../shared/edge-case-test-base';
import { TestDataFactory } from '../shared/test-data-factory';

class ValidationErrorsTest extends EdgeCaseTestBase {
  private baselineCompanyId: string | null = null;
  private baselinePersonId: string | null = null;
  private baselineTaskId: string | null = null;

  constructor() {
    super('TC_EC06');
  }

  /**
   * Create baseline records used by validation scenarios that require existing data
   */
  async setupBaselineRecords(): Promise<void> {
    try {
      const companyData = TestDataFactory.createCompanyData('TC_EC06_BASE');
      const companyResult = await this.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      });

      this.baselineCompanyId = this.extractRecordId(
        this.extractTextContent(companyResult)
      );
      this.trackRecord('companies', this.baselineCompanyId);
    } catch (error) {
      console.error('Failed to create baseline company for TC-EC06:', error);
    }

    try {
      const personData = TestDataFactory.createPersonData('TC_EC06_BASE');
      const personResult = await this.executeToolCall('create-record', {
        resource_type: 'people',
        record_data: personData,
      });

      this.baselinePersonId = this.extractRecordId(
        this.extractTextContent(personResult)
      );
      this.trackRecord('people', this.baselinePersonId);
    } catch (error) {
      console.error('Failed to create baseline person for TC-EC06:', error);
    }

    try {
      const taskData = TestDataFactory.createTaskData('TC_EC06_BASE');
      const taskResult = await this.executeToolCall('create-record', {
        resource_type: 'tasks',
        record_data: taskData,
      });

      this.baselineTaskId = this.extractRecordId(
        this.extractTextContent(taskResult)
      );
      this.trackRecord('tasks', this.baselineTaskId);
    } catch (error) {
      console.error('Failed to create baseline task for TC-EC06:', error);
    }
  }

  getCompanyIdOrThrow(): string {
    if (!this.baselineCompanyId) {
      throw new Error('Baseline company ID unavailable for TC-EC06 tests');
    }
    return this.baselineCompanyId;
  }

  getTaskIdOrThrow(): string {
    if (!this.baselineTaskId) {
      throw new Error('Baseline task ID unavailable for TC-EC06 tests');
    }
    return this.baselineTaskId;
  }
}

describe('TC-EC06: Validation Error Handling Edge Cases', () => {
  const testCase = new ValidationErrorsTest();
  let testResults: EdgeCaseTestResult[] = [];

  beforeAll(async () => {
    await testCase.setup();
    await testCase.setupBaselineRecords();
  }, 60000);

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();

    testCase.logDetailedResults();
    const summary = testCase.getResultsSummary();

    console.log(
      `\nTC-EC06 Validation Error Results: ${summary.passed}/${summary.total} passed (${summary.passRate.toFixed(1)}%)`
    );

    if (summary.total > 0) {
      const passRate = summary.passRate;
      if (passRate < 75) {
        console.warn(
          `⚠️ TC-EC06 below P2 threshold: ${passRate.toFixed(1)}% (required: 75%)`
        );
      } else {
        console.log(
          `✅ TC-EC06 meets P2 quality gate: ${passRate.toFixed(1)}% (required: 75%)`
        );
      }
    }
  }, 60000);

  it('should provide select option suggestions for invalid company categories', async () => {
    const result = await testCase.executeExpectedFailureTest(
      'invalid_company_category_select',
      'create-record',
      {
        resource_type: 'companies',
        record_data: {
          name: `TC-EC06 Invalid Category ${Date.now()}`,
          categories: ['Tecnology'],
        },
      },
      'validation_failure',
      ['invalid category', 'did you mean', 'valid category options']
    );

    testResults.push(result);
    expect(result.passed).toBe(true);
  });

  it('should enforce required fields when creating people records', async () => {
    const result = await testCase.executeExpectedFailureTest(
      'person_missing_required_fields',
      'create-record',
      {
        resource_type: 'people',
        record_data: {
          name: '',
          email_addresses: [],
        },
      },
      'validation_failure',
      ['required', 'name', 'email']
    );

    testResults.push(result);
    expect(result.passed).toBe(true);
  });

  it('should prevent read-only field updates on task records', async () => {
    const taskId = testCase.getTaskIdOrThrow();

    const result = await testCase.executeExpectedFailureTest(
      'task_read_only_field_update',
      'update-record',
      {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: {
          created_at: new Date().toISOString(),
        },
      },
      'error',
      ['read-only', 'cannot be modified']
    );

    testResults.push(result);
    expect(result.passed).toBe(true);
  });

  it('should validate email formats for people records', async () => {
    const result = await testCase.executeExpectedFailureTest(
      'person_invalid_email_format',
      'create-record',
      {
        resource_type: 'people',
        record_data: {
          name: `TC-EC06 Invalid Email ${Date.now()}`,
          email_addresses: ['not-an-email-address'],
          job_title: 'Validation Tester',
        },
      },
      'validation_failure',
      ['email', 'invalid', 'format']
    );

    testResults.push(result);
    expect(result.passed).toBe(true);
  });

  it('should validate phone number formats for people records', async () => {
    const result = await testCase.executeExpectedFailureTest(
      'person_invalid_phone_format',
      'create-record',
      {
        resource_type: 'people',
        record_data: {
          name: `TC-EC06 Invalid Phone ${Date.now()}`,
          email_addresses: ['tc-ec06.phone@example.com'],
          phone_numbers: ['12345'],
        },
      },
      'validation_failure',
      ['phone', 'invalid', 'format']
    );

    testResults.push(result);
    expect(result.passed).toBe(true);
  });

  it('should validate domain formats for company records', async () => {
    const result = await testCase.executeExpectedFailureTest(
      'company_invalid_domain_format',
      'create-record',
      {
        resource_type: 'companies',
        record_data: {
          name: `TC-EC06 Invalid Domain ${Date.now()}`,
          domains: ['invalid domain.com'],
        },
      },
      'validation_failure',
      ['domain', 'invalid', 'format']
    );

    testResults.push(result);
    expect(result.passed).toBe(true);
  });

  it('should enforce required fields when creating notes', async () => {
    const companyId = testCase.getCompanyIdOrThrow();

    const result = await testCase.executeExpectedFailureTest(
      'note_missing_required_fields',
      'create-note',
      {
        resource_type: 'companies',
        record_id: companyId,
        title: '',
        content: '',
      },
      'validation_failure',
      ['required', 'title', 'content']
    );

    testResults.push(result);
    expect(result.passed).toBe(true);
  });
});
