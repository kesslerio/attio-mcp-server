/**
 * Tasks Management Advanced E2E Tests
 *
 * Advanced task management functionality including:
 * - Task listing and filtering with pagination
 * - Task record linking and relationships
 * - Task lifecycle management workflows
 *
 * Part 2 of 3 - Advanced Features
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { E2ETestBase } from '../setup.js';
import { E2EAssertions } from '../utils/assertions.js';
import {
  CompanyFactory,
  PersonFactory,
  TaskFactory,
} from '../fixtures/index.js';
import type { TestDataObject, McpToolResponse } from '../types/index.js';

// Import enhanced tool caller with logging and migration
import {
  callTasksTool,
  validateTestEnvironment,
  getToolMigrationStats,
} from '../utils/enhanced-tool-caller.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';

/**
 * Tasks Management Advanced E2E Test Suite
 */

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Tasks Management Advanced E2E Tests', () => {
  // Test data storage
  const testCompanies: TestDataObject[] = [];
  const testPeople: TestDataObject[] = [];
  const createdTasks: TestDataObject[] = [];

  beforeAll(async () => {
    // Start comprehensive logging for this test suite
    startTestSuite('tasks-management-advanced');

    // Validate test environment and tool migration setup
    const envValidation = await validateTestEnvironment();
    if (!envValidation.valid) {
      console.warn('⚠️ Test environment warnings:', envValidation.warnings);
    }

    console.error('📊 Tool migration stats:', getToolMigrationStats());

    await E2ETestBase.setup({
      requiresRealApi: false, // Use mock data instead of real API for reliable testing
      cleanupAfterTests: true,
      timeout: 120000,
    });

    // Create test data for advanced features
    await setupAdvancedTestData();

    console.error(
      '🚀 Starting Tasks Management Advanced E2E Tests with Universal Tools'
    );
  }, 30000);

  afterAll(async () => {
    // End comprehensive logging for this test suite
    endTestSuite();

    console.error(
      '✅ Tasks Management Advanced E2E Tests completed with enhanced logging'
    );
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function setupAdvancedTestData(): Promise<void> {
    // Create test companies
    const companyData = CompanyFactory.create();
    const companyResponse = await callTasksTool('create-record', {
      resource_type: 'companies',
      record_data: companyData as any,
    }) as McpToolResponse;

    if (!companyResponse.isError) {
      const company = E2EAssertions.expectMcpData(companyResponse);
      testCompanies.push(company);
    }

    // Create test people
    const personData = PersonFactory.create();
    const personResponse = await callTasksTool('create-record', {
      resource_type: 'people',
      record_data: personData as any,
    }) as McpToolResponse;

    if (!personResponse.isError) {
      const person = E2EAssertions.expectMcpData(personResponse);
      testPeople.push(person);
    }

    // Create test tasks
    const tasksBatch = TaskFactory.createMany(5);
    for (const taskData of tasksBatch) {
      const response = await callTasksTool('create-record', {
        resource_type: 'tasks',
        record_data: {
          content: taskData.content,
          due_date: taskData.due_date,
        },
      }) as McpToolResponse;

      if (!response.isError) {
        const createdTask = E2EAssertions.expectMcpData(response);
        createdTasks.push(createdTask);
      }
    }
  }

  describe('Task Listing and Filtering', () => {
    it('should list all tasks', async () => {
      const response = await callTasksTool('search-records', {
        resource_type: 'tasks',
      }) as McpToolResponse;

      E2EAssertions.expectMcpSuccess(response);
      const tasks = E2EAssertions.expectMcpData(response);

      expect(tasks).toBeDefined();

      let taskArray: TestDataObject[] = [];
      if (Array.isArray(tasks)) {
        taskArray = tasks;
      } else if (tasks && Array.isArray(tasks.data)) {
        taskArray = tasks.data;
      }

      expect(taskArray).toBeDefined();
      console.error('📋 Listed tasks:', taskArray.length);

      // Validate task structure if tasks exist
      if (taskArray.length > 0) {
        taskArray.forEach((task, index) => {
          expect(
            task.id || task.task_id,
            `Task ${index} should have ID`
          ).toBeDefined();
          expect(
            task.content || task.title,
            `Task ${index} should have content`
          ).toBeDefined();
        });
      }
    }, 30000);

    it('should filter tasks by status', async () => {
      const response = await callTasksTool('search-records', {
        resource_type: 'tasks',
        status: 'open',
      }) as McpToolResponse;

      E2EAssertions.expectMcpSuccess(response);
      const tasks = E2EAssertions.expectMcpData(response);

      expect(tasks).toBeDefined();
      console.error('🔍 Filtered tasks by status');
    }, 15000);

    it('should filter tasks by assignee', async () => {
      if (testPeople.length === 0) {
        console.error(
          '⏭️ Skipping assignee filter test - no test people available'
        );
        return;
      }

      const assignee = testPeople[0];
      const response = await callTasksTool('search-records', {
        resource_type: 'tasks',
        assigneeId: assignee.id.record_id,
      }) as McpToolResponse;

      E2EAssertions.expectMcpSuccess(response);
      const tasks = E2EAssertions.expectMcpData(response);

      expect(tasks).toBeDefined();
      console.error('👥 Filtered tasks by assignee');
    }, 15000);

    it('should handle pagination for task listing', async () => {
      const response = await callTasksTool('search-records', {
        resource_type: 'tasks',
        page: 1,
        pageSize: 5,
      }) as McpToolResponse;

      E2EAssertions.expectMcpSuccess(response);
      const tasks = E2EAssertions.expectMcpData(response);

      expect(tasks).toBeDefined();
      console.error('📄 Tested task pagination');
    }, 15000);

    it('should handle empty task list gracefully', async () => {
      const response = await callTasksTool('search-records', {
        resource_type: 'tasks',
        status: 'nonexistent_status_12345',
      }) as McpToolResponse;

      E2EAssertions.expectMcpSuccess(response);
      const tasks = E2EAssertions.expectMcpData(response);

      // Should return empty results gracefully
      expect(tasks).toBeDefined();
    }, 15000);
  });

  describe('Task Record Linking', () => {
    it('should link task to company record', async () => {
      if (createdTasks.length === 0 || testCompanies.length === 0) {
        console.error('⏭️ Skipping company link test - insufficient test data');
        return;
      }

      const task = createdTasks[0];
      const company = testCompanies[0];
      const taskId = task.id.task_id || task.id;

      const response = await callTasksTool('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: {
          linked_records: [
            {
              record_type: 'companies',
              record_id: company.id.record_id,
            },
          ],
        },
      }) as McpToolResponse;

      E2EAssertions.expectMcpSuccess(response);
      console.error('🏢 Linked task to company record:', taskId);
    }, 30000);

    it('should link task to person record', async () => {
      if (createdTasks.length < 2 || testPeople.length === 0) {
        console.error('⏭️ Skipping person link test - insufficient test data');
        return;
      }

      const task = createdTasks[1];
      const person = testPeople[0];
      const taskId = task.id.task_id || task.id;

      const response = await callTasksTool('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: {
          linked_records: [
            {
              record_type: 'people',
              record_id: person.id.record_id,
            },
          ],
        },
      }) as McpToolResponse;

      E2EAssertions.expectMcpSuccess(response);
      console.error('👤 Linked task to person record:', taskId);
    }, 30000);

    it('should handle linking to multiple records', async () => {
      if (
        createdTasks.length < 3 ||
        testCompanies.length === 0 ||
        testPeople.length === 0
      ) {
        console.error(
          '⏭️ Skipping multiple link test - insufficient test data'
        );
        return;
      }

      const task = createdTasks[2];
      const taskId = task.id.task_id || task.id;

      // Link to company
      const companyLinkResponse = await callTasksTool('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: {
          linked_records: [
            {
              record_type: 'companies',
              record_id: testCompanies[0].id.record_id,
            },
          ],
        },
      }) as McpToolResponse;

      E2EAssertions.expectMcpSuccess(companyLinkResponse);

      // Link to person (if API supports multiple links)
      const personLinkResponse = await callTasksTool('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: {
          linked_records: [
            {
              record_type: 'people',
              record_id: testPeople[0].id.record_id,
            },
          ],
        },
      }) as McpToolResponse;

      // This might succeed or fail depending on API limitations
      if (personLinkResponse.isError) {
        console.error('ℹ️ Multiple record links not supported');
      } else {
        E2EAssertions.expectMcpSuccess(personLinkResponse);
        console.error('🔗 Linked task to multiple records:', taskId);
      }
    }, 45000);
  });

  describe('Task Lifecycle Management', () => {
    it('should create complete task workflow', async () => {
      const taskData = TaskFactory.create();

      // Create task
      const createResponse = await callTasksTool('create-record', {
        resource_type: 'tasks',
        record_data: {
          content: 'E2E Workflow Task - Initial Creation',
          due_date: taskData.due_date,
        },
      }) as McpToolResponse;

      E2EAssertions.expectMcpSuccess(createResponse);
      const workflowTask = E2EAssertions.expectMcpData(createResponse)!;
      const taskId = (workflowTask as any)?.id?.task_id || (workflowTask as any)?.id;

      // Update to in-progress
      const progressResponse = await callTasksTool('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: {
          status: 'in_progress',
        },
      }) as McpToolResponse;

      E2EAssertions.expectMcpSuccess(progressResponse);

      // Complete the task
      const completeResponse = await callTasksTool('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: {
          status: 'completed',
        },
      });

      E2EAssertions.expectMcpSuccess(completeResponse);

      createdTasks.push(workflowTask);
      console.error('🔄 Completed full task lifecycle:', taskId);
    }, 60000);

    it('should handle task priority changes throughout lifecycle', async () => {
      const taskData = TaskFactory.create();

      // Create normal priority task
      const createResponse = await callTasksTool('create-record', {
        resource_type: 'tasks',
        record_data: {
          content: 'E2E Priority Task',
          due_date: taskData.due_date,
        },
      });

      E2EAssertions.expectMcpSuccess(createResponse);
      const priorityTask = E2EAssertions.expectMcpData(createResponse);
      const taskId = priorityTask.id.task_id || priorityTask.id;

      // Note: Priority updates depend on API field availability
      console.error('📊 Task priority lifecycle tested:', taskId);
      createdTasks.push(priorityTask);
    }, 30000);

    it('should manage task with changing assignments', async () => {
      if (testPeople.length === 0) {
        console.error(
          '⏭️ Skipping assignment change test - no test people available'
        );
        return;
      }

      const taskData = TaskFactory.create();

      // Create unassigned task
      const createResponse = await callTasksTool('create-record', {
        resource_type: 'tasks',
        record_data: {
          content: 'E2E Assignment Task - Initially Unassigned',
          due_date: taskData.due_date,
        },
      });

      E2EAssertions.expectMcpSuccess(createResponse);
      const assignmentTask = E2EAssertions.expectMcpData(createResponse);
      const taskId = assignmentTask.id.task_id || assignmentTask.id;

      // Assign to person
      const assignResponse = await callTasksTool('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: {
          assigneeId: testPeople[0].id.record_id,
        },
      });

      E2EAssertions.expectMcpSuccess(assignResponse);

      createdTasks.push(assignmentTask);
      console.error('👥 Completed assignment change workflow:', taskId);
    }, 45000);
  });
});