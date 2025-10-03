/**
 * TC-AO02: Workflow Automation Coverage
 * P1 Advanced Test - Validates multi-step workflows that coordinate across objects.
 *
 * Scenario:
 * - Create company and person records
 * - Link person to company during onboarding
 * - Create task tied to both records to simulate automated follow-up
 * - Verify relationships through universal search tools
 */

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base';
import { QAAssertions } from '../shared/qa-assertions';
import { TestDataFactory } from '../shared/test-data-factory';
import type { TestResult } from '../shared/quality-gates';

class WorkflowAutomationTest extends MCPTestBase {
  constructor() {
    super('TCAO02');
  }
}

describe('TC-AO02: Workflow Automation Coverage', () => {
  const testCase = new WorkflowAutomationTest();
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
      `\nTC-AO02 Results: ${passedCount}/${totalCount} passed (${passRate.toFixed(1)}%)`
    );

    if (passRate < 80) {
      console.warn(
        `⚠️  P1 Quality Gate Warning: Workflow automation pass rate ${passRate.toFixed(1)}% below 80% threshold`
      );
    }
  });

  it('should orchestrate onboarding workflow across company, person, and task', async () => {
    const testName = 'company_person_task_workflow';
    let passed = false;
    let error: string | undefined;

    try {
      const companyData = TestDataFactory.createCompanyData('TCAO02_company');
      const companyResult = await testCase.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      });
      const companyId = QAAssertions.assertRecordCreated(
        companyResult,
        'companies'
      );
      testCase.trackRecord('companies', companyId);

      const personData = TestDataFactory.createPersonData('TCAO02_person');
      personData.company = companyId;
      const personResult = await testCase.executeToolCall('create-record', {
        resource_type: 'people',
        record_data: personData,
      });
      const personId = QAAssertions.assertRecordCreated(personResult, 'people');
      testCase.trackRecord('people', personId);

      const taskData = TestDataFactory.createTaskData('TCAO02_task');
      taskData.linked_records = [
        { target_object: 'companies', target_record_id: companyId },
        { target_object: 'people', target_record_id: personId },
      ];

      const taskResult = await testCase.executeToolCall('create-record', {
        resource_type: 'tasks',
        record_data: taskData,
      });
      const taskId = QAAssertions.assertRecordCreated(taskResult, 'tasks');
      testCase.trackRecord('tasks', taskId);

      const relationshipResult = await testCase.executeToolCall(
        'search-by-relationship',
        {
          relationship_type: 'company_to_people',
          source_id: companyId,
          target_resource_type: 'people',
          limit: 5,
        }
      );

      QAAssertions.assertSearchResults(relationshipResult, 'people', 1);
      const relationshipText = testCase.extractTextContent(relationshipResult);
      expect(relationshipText).toContain(personData.name.split(' ')[0]);

      const taskSearch = await testCase.executeToolCall('search-records', {
        resource_type: 'tasks',
        query: 'TCAO02_task',
        limit: 1,
      });
      QAAssertions.assertSearchResults(taskSearch, 'tasks', 1);
      const taskSearchText = testCase.extractTextContent(taskSearch);
      expect(taskSearchText).toContain('TCAO02');

      passed = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      results.push({ test: testName, passed, error });
    }
  });
});
