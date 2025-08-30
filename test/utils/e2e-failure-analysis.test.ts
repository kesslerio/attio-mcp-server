/**
 * E2E Failure Analysis Test Suite
 *
 * Comprehensive analysis of E2E test failures to identify root causes
 * and validate fixes for Issue #480 Phase 3.
 *
 * This test suite replicates the exact E2E test patterns that are failing
 * to isolate and fix the issues systematically.
 */

import { describe, it, expect, beforeAll } from 'vitest';

import { CompanyMockFactory } from './mock-factories/CompanyMockFactory.js';
import { E2ETaskFactory } from '../e2e/utils/test-data.js';
import { E2ETaskFactory } from '../e2e/utils/test-data.js';
import { ListMockFactory } from './mock-factories/ListMockFactory.js';
import { PersonMockFactory } from './mock-factories/PersonMockFactory.js';
import { TaskMockFactory } from './mock-factories/TaskMockFactory.js';
import { TestEnvironment } from './mock-factories/test-environment.js';

// Import E2E test data factories to replicate exact test scenarios
import { E2ETaskFactory } from '../e2e/utils/test-data.js';

describe('E2E Failure Analysis - Issue #480 Root Cause Investigation', () => {
  beforeAll(() => {
    // Ensure we're in test environment
    expect(TestEnvironment.isTest()).toBe(true);
    console.log('🔬 Starting E2E failure analysis in test environment');
  });

  describe('Task Creation Failure Analysis', () => {
    it('should analyze high priority task creation pattern', () => {
      console.log('🔍 Analyzing high priority task creation...');

      // Replicate the exact E2E test pattern
      console.log('E2E Task Data:', taskData);

      // Create mock task using the same pattern as E2E tests
        content: taskData.title,
        due_date: taskData.due_date,
      });

      console.log('Mock Task Created:', {
        id: mockTask.id,
        content: mockTask.content,
        title: mockTask.title || 'NOT_PROVIDED',
        hasContent: !!mockTask.content,
        hasTitle: !!mockTask.title,
        contentOrTitle: mockTask.content || mockTask.title,
      });

      // Issue #480 compatibility checks
      expect(mockTask.content || mockTask.title).toBeDefined();
      expect(mockTask.content || mockTask.title).toContain('Test Task');
      expect(mockTask.id.task_id).toBeDefined();
      expect(mockTask.id.record_id).toBeDefined();

      console.log('✅ High priority task creation pattern validated');
    });

    it('should analyze task assignee creation pattern', () => {
      console.log('🔍 Analyzing task assignee creation...');

      // Create a person first (as E2E tests do)

      // Create task with assignee
        content: taskData.title,
        due_date: taskData.due_date,
      });

      console.log('Task with Assignee:', {
        taskId: mockTask.id.task_id,
        assigneeId: mockTask.assignee?.id,
        hasAssignee: !!mockTask.assignee,
      });

      expect(mockTask.assignee).toBeDefined();
      expect(mockTask.assignee!.id).toBe(person.id.record_id);

      console.log('✅ Task assignee creation pattern validated');
    });

    it('should analyze task lifecycle workflow patterns', () => {
      console.log('🔍 Analyzing task lifecycle workflow...');


      // Step 1: Create task
      let workflowTask = TaskMockFactory.create({
        content: 'E2E Workflow Task - Initial Creation',
        due_date: taskData.due_date,
      });

      expect(workflowTask.status).toBeDefined();
      console.log('Step 1 - Created:', workflowTask.status);

      // Step 2: Update to in progress
      workflowTask = TaskMockFactory.create({
        content: 'E2E Workflow Task - Now In Progress',
        status: 'in_progress',
      });

      expect(workflowTask.status).toBe('in_progress');
      console.log('Step 2 - In Progress:', workflowTask.status);

      // Step 3: Complete task
      workflowTask = TaskMockFactory.createCompleted({
        content: 'E2E Workflow Task - Completed Successfully',
      });

      expect(workflowTask.status).toBe('completed');
      console.log('Step 3 - Completed:', workflowTask.status);

      console.log('✅ Task lifecycle workflow patterns validated');
    });

    it('should analyze concurrent task operations pattern', () => {
      console.log('🔍 Analyzing concurrent task operations...');

      // Simulate concurrent task creation (as E2E tests do)
        return Promise.resolve(
          TaskMockFactory.create({
            content: `Concurrent Task ${i + 1}: ${taskData.title}`,
            due_date: taskData.due_date,
          })
        );
      });

      return Promise.all(taskPromises).then((concurrentTasks) => {
        expect(concurrentTasks).toHaveLength(3);

        concurrentTasks.forEach((task, index) => {
          expect(task.content).toContain(`Concurrent Task ${index + 1}`);
          expect(task.id.task_id).toBeDefined();
        });

        console.log('✅ Concurrent task operations pattern validated');
      });
    });
  });

  describe('Error Message Pattern Analysis', () => {
    it('should validate "not found" error patterns match E2E expectations', () => {
      console.log('🔍 Analyzing error message patterns...');

        {
          message: StandardErrorMessages.notFound('Task', 'invalid-task-id'),
          pattern: ERROR_PATTERNS.NOT_FOUND,
        },
        {
          message: StandardErrorMessages.notFound(
            'Company',
            'invalid-company-id'
          ),
          pattern: ERROR_PATTERNS.NOT_FOUND,
        },
        {
          message: StandardErrorMessages.notFound(
            'Person',
            'invalid-person-id'
          ),
          pattern: ERROR_PATTERNS.NOT_FOUND,
        },
        {
          message: StandardErrorMessages.doesNotExist('List'),
          pattern: ERROR_PATTERNS.NOT_FOUND,
        },
        {
          message: StandardErrorMessages.invalidId('Record', 'malformed-id'),
          pattern: ERROR_PATTERNS.NOT_FOUND,
        },
      ];

      errorScenarios.forEach(({ message, pattern }) => {
        expect(isValid).toBe(true);
        console.log(`✅ Error pattern valid: "${message}"`);
      });

      console.log('✅ All error message patterns validated');
    });

    it('should validate E2E test tool error format', () => {
      console.log('🔍 Analyzing E2E tool error format...');

      // E2E tests expect errors in the format: "Error executing tool 'tool-name': <error-message>"
        ErrorPatternValidator.formatForE2ETest(
          'update-record',
          'task_not_found',
          'invalid-task-123'
        ),
        ErrorPatternValidator.formatForE2ETest(
          'delete-record',
          'list_not_found',
          'invalid-list-456'
        ),
        ErrorPatternValidator.formatForE2ETest(
          'get-record-details',
          'company_not_found',
          'invalid-company-789'
        ),
      ];

      toolErrorFormats.forEach((errorMessage) => {
        expect(isValid).toBe(true);
        console.log(`✅ Tool error format valid: "${errorMessage}"`);
      });

      console.log('✅ E2E tool error formats validated');
    });
  });

  describe('Data Structure Compatibility Analysis', () => {
    it('should validate company ID structure for notes management tests', () => {
      console.log('🔍 Analyzing company ID structure for notes...');


      // Notes management tests expect company.id to be defined
      expect(company.id).toBeDefined();
      expect(company.id.record_id).toBeDefined();
      expect(company.id.workspace_id).toBeDefined();

      console.log('Company ID Structure:', {
        hasId: !!company.id,
        hasRecordId: !!company.id?.record_id,
        hasWorkspaceId: !!company.id?.workspace_id,
      });

      console.log('✅ Company ID structure validated');
    });

    it('should validate person ID structure for notes management tests', () => {
      console.log('🔍 Analyzing person ID structure for notes...');


      // Notes management tests expect person.id to be defined
      expect(person.id).toBeDefined();
      expect(person.id.record_id).toBeDefined();
      expect(person.id.workspace_id).toBeDefined();

      console.log('Person ID Structure:', {
        hasId: !!person.id,
        hasRecordId: !!person.id?.record_id,
        hasWorkspaceId: !!person.id?.workspace_id,
      });

      console.log('✅ Person ID structure validated');
    });

    it('should validate list ID structure differences', () => {
      console.log('🔍 Analyzing list ID structure...');


      // Lists use list_id instead of record_id
      expect(list.id).toBeDefined();
      expect(list.id.list_id).toBeDefined();
      expect(list.title || list.name).toBeDefined();

      console.log('List ID Structure:', {
        hasId: !!list.id,
        hasListId: !!list.id?.list_id,
        hasTitle: !!list.title,
        hasName: !!list.name,
      });

      console.log('✅ List ID structure validated');
    });
  });

  describe('Universal Tools Integration Analysis', () => {
    it('should validate universal tool response format', () => {
      console.log('🔍 Analyzing universal tool response format...');

      // Universal tools should return data in content field
        task: TaskMockFactory.create(),
        company: CompanyMockFactory.create(),
        person: PersonMockFactory.create(),
        list: ListMockFactory.create(),
      };

      Object.entries(mockResponses).forEach(([type, data]) => {
        expect(data).toBeDefined();
        expect(typeof data).toBe('object');
        console.log(`✅ ${type} response structure valid`);
      });

      console.log('✅ Universal tool response formats validated');
    });
  });

  describe('Mock Factory Performance Analysis', () => {
    it('should validate mock factory creation speed', () => {
      console.log('🔍 Analyzing mock factory performance...');


      // Create multiple instances as E2E tests do
        CompanyMockFactory.create()
      );
        PersonMockFactory.create()
      );


      expect(tasks).toHaveLength(5);
      expect(companies).toHaveLength(5);
      expect(people).toHaveLength(5);
      expect(lists).toHaveLength(5);

      console.log('Mock Factory Performance:', {
        totalCreated: 20,
        durationMs: duration,
        averageMs: duration / 20,
      });

      // Should be fast (under 100ms for 20 items)
      expect(duration).toBeLessThan(100);

      console.log('✅ Mock factory performance validated');
    });
  });

  describe('Comprehensive E2E Scenario Simulation', () => {
    it('should simulate complete E2E test data setup workflow', () => {
      console.log('🔍 Simulating complete E2E workflow...');

      // Step 1: Create test companies (as E2E tests do)
          name: `E2E Test Company ${Date.now()}`,
          domain: `e2e-test-${Date.now()}.com`,
        };
        return CompanyMockFactory.create(companyData);
      });

      // Step 2: Create test people
          name: `E2E Test Person ${Date.now()}`,
          email_addresses: [`e2e-${Date.now()}@test.com`],
        };
        return PersonMockFactory.create(personData);
      });

      // Step 3: Create tasks with various scenarios
        content: 'E2E Basic Task',
      });

        testPeople[0].id.record_id,
        {
          content: 'E2E Assigned Task',
        }
      );

        [testCompanies[0].id.record_id],
        {
          content: 'E2E Linked Task',
        }
      );

        content: 'E2E High Priority Task',
      });

      // Validate all components
      expect(testCompanies).toHaveLength(2);
      expect(testPeople).toHaveLength(2);
      expect(basicTask.content).toContain('Basic Task');
      expect(assignedTask.assignee).toBeDefined();
      expect(linkedTask.linked_records).toBeDefined();
      expect(highPriorityTask.content).toContain('High Priority');

      console.log('E2E Workflow Simulation Results:', {
        companies: testCompanies.length,
        people: testPeople.length,
        tasks: 4,
        allValid: true,
      });

      console.log('✅ Complete E2E workflow simulation validated');
    });
  });
});
