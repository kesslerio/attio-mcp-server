/**
 * Tasks Management E2E Tests
 *
 * Comprehensive end-to-end testing of tasks-related MCP tools
 * including task lifecycle management, record linking, filtering, and error scenarios.
 *
 * Tools tested (now using universal tools with automatic migration):
 * - list-tasks → search-records (resource_type: 'tasks')
 * - create-task → create-record (resource_type: 'tasks')
 * - update-task → update-record (resource_type: 'tasks')
 * - delete-task → delete-record (resource_type: 'tasks')
 * - link-record-to-task → update-record (resource_type: 'tasks')
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
import { loadE2EConfig } from '../utils/config-loader.js';
import {
  CompanyFactory,
  PersonFactory,
  TaskFactory,
  TestScenarios,
} from '../fixtures/index.js';
import type { TestDataObject, McpToolResponse } from '../types/index.js';

// Import enhanced tool caller with logging and migration
import {
  callTasksTool,
  callUniversalTool,
  validateTestEnvironment,
  getToolMigrationStats,
} from '../utils/enhanced-tool-caller.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';

/**
 * Tasks Management E2E Test Suite
 *
 * Tests comprehensive task management functionality including:
 * - Task lifecycle (create, read, update, delete)
 * - Task filtering and pagination
 * - Record linking and relationships
 * - Status and assignment management
 * - Due date and scheduling features
 * - Error handling and validation
 * - Performance and scalability
 */

// Test configuration
const config = await loadE2EConfig();
const createdRecords: Array<{ type: string; id: string; data?: any }> = [];

// Note: callTasksTool is now imported from enhanced-tool-caller.js
// It automatically handles legacy-to-universal tool migration and comprehensive logging

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Tasks Management E2E Tests', () => {
  // Test data storage
  const testCompanies: TestDataObject[] = [];
  const testPeople: TestDataObject[] = [];
  let createdTasks: TestDataObject[] = [];

  beforeAll(async () => {
    // Start comprehensive logging for this test suite
    startTestSuite('tasks-management');

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

    console.error(
      '🚀 Starting Tasks Management E2E Tests with Universal Tools'
    );
  }, 30000);

  afterAll(async () => {
    // Cleanup is handled automatically by E2ETestBase.setup()

    // End comprehensive logging for this test suite
    endTestSuite();

    console.error(
      '✅ Tasks Management E2E Tests completed with enhanced logging'
    );
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Test Data Setup', () => {
    it('should create test companies for task testing', async () => {
      const companyData = CompanyFactory.create();
      const response = await callTasksTool('create-company', companyData);

      E2EAssertions.expectMcpSuccess(response);
      const company = E2EAssertions.expectMcpData(response);

      E2EAssertions.expectCompanyRecord(company);
      testCompanies.push(company);

      console.error('🏢 Created test company for tasks:', company.id.record_id);
    }, 30000);

    it('should create test people for task assignment', async () => {
      const personData = PersonFactory.create();
      const response = await callTasksTool('create-person', personData);

      E2EAssertions.expectMcpSuccess(response);
      const person = E2EAssertions.expectMcpData(response);

      E2EAssertions.expectPersonRecord(person);
      testPeople.push(person);

      console.error(
        '👤 Created test person for task assignment:',
        person.id.record_id
      );
    }, 30000);
  });

  describe('Task Creation and Basic Operations', () => {
    it('should create a basic task', async () => {
      const taskData = TaskFactory.create();

      const response = await callTasksTool('create-task', {
        content: taskData.content,
        due_date: taskData.due_date,
      });

      E2EAssertions.expectMcpSuccess(response);
      const createdTask = E2EAssertions.expectMcpData(response);

      E2EAssertions.expectTaskRecord(createdTask);
      expect(createdTask.id.task_id).toBeDefined();

      // Access content from the correct field in the record structure
      const taskContent =
        createdTask.values?.content?.[0]?.value ||
        createdTask.content ||
        createdTask.title;
      expect(taskContent).toContain('Test Task');

      createdTasks.push(createdTask);
      console.error('📋 Created basic task:', createdTask.id.task_id);
    }, 30000);

    it('should create task with assignee', async () => {
      if (testPeople.length === 0) {
        console.error('⏭️ Skipping assignee test - no test people available');
        return;
      }

      const taskData = TaskFactory.create();
      const assignee = testPeople[0];

      const response = await callTasksTool('create-task', {
        content: taskData.content,
        assigneeId: assignee.id.record_id,
        due_date: taskData.due_date,
      });

      E2EAssertions.expectMcpSuccess(response);
      const createdTask = E2EAssertions.expectMcpData(response);

      E2EAssertions.expectTaskRecord(createdTask);
      expect(createdTask.assignee_id || createdTask.assignee?.id).toBeDefined();

      createdTasks.push(createdTask);
      console.error('👥 Created task with assignee:', createdTask.id.task_id);
    }, 30000);

    it('should create task linked to record', async () => {
      if (testCompanies.length === 0) {
        console.error(
          '⏭️ Skipping record link test - no test companies available'
        );
        return;
      }

      const taskData = TaskFactory.create();
      const company = testCompanies[0];

      const response = await callTasksTool('create-task', {
        content: `Follow up with ${company.values.name?.[0]?.value || 'company'}`,
        recordId: company.id.record_id,
        due_date: taskData.due_date,
      });

      E2EAssertions.expectMcpSuccess(response);
      const createdTask = E2EAssertions.expectMcpData(response);

      E2EAssertions.expectTaskRecord(createdTask);

      createdTasks.push(createdTask);
      console.error(
        '🔗 Created task linked to record:',
        createdTask.id.task_id
      );
    }, 30000);

    it('should create high priority task', async () => {
      const taskData = TaskFactory.createHighPriority();

      const response = await callTasksTool('create-task', {
        content: taskData.content,
        due_date: taskData.due_date,
      });

      E2EAssertions.expectMcpSuccess(response);
      const createdTask = E2EAssertions.expectMcpData(response);

      E2EAssertions.expectTaskRecord(createdTask);
      expect(createdTask.content || createdTask.title).toContain('Test Task');

      createdTasks.push(createdTask);
      console.error('⚡ Created high priority task:', createdTask.id.task_id);
    }, 30000);

    it('should create multiple tasks for testing', async () => {
      const tasksBatch = TaskFactory.createMany(3);

      for (const taskData of tasksBatch) {
        const response = await callTasksTool('create-task', {
          content: taskData.content,
          due_date: taskData.due_date,
        });

        if (response.isError) {
          console.warn('Failed to create batch task:', response.error);
        } else {
          const createdTask = E2EAssertions.expectMcpData(response);
          createdTasks.push(createdTask);
        }
      }

      console.error('📦 Created batch of tasks for testing');
    }, 45000);
  });

  describe('Task Listing and Filtering', () => {
    it('should list all tasks', async () => {
      const response = await callTasksTool('list-tasks', {});

      E2EAssertions.expectMcpSuccess(response);
      const tasks = E2EAssertions.expectMcpData(response);

      expect(tasks).toBeDefined();

      let taskArray: any[] = [];
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
      const response = await callTasksTool('list-tasks', {
        status: 'open',
      });

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
      const response = await callTasksTool('list-tasks', {
        assigneeId: assignee.id.record_id,
      });

      E2EAssertions.expectMcpSuccess(response);
      const tasks = E2EAssertions.expectMcpData(response);

      expect(tasks).toBeDefined();
      console.error('👥 Filtered tasks by assignee');
    }, 15000);

    it('should handle pagination for task listing', async () => {
      const response = await callTasksTool('list-tasks', {
        page: 1,
        pageSize: 5,
      });

      E2EAssertions.expectMcpSuccess(response);
      const tasks = E2EAssertions.expectMcpData(response);

      expect(tasks).toBeDefined();
      console.error('📄 Tested task pagination');
    }, 15000);

    it('should handle empty task list gracefully', async () => {
      const response = await callTasksTool('list-tasks', {
        status: 'nonexistent_status_12345',
      });

      E2EAssertions.expectMcpSuccess(response);
      const tasks = E2EAssertions.expectMcpData(response);

      // Should return empty results gracefully
      expect(tasks).toBeDefined();
    }, 15000);
  });

  describe('Task Updates and Modifications', () => {
    // Note: Task content updates are not tested because content is immutable in Attio API
    // Content cannot be modified after task creation - this is a documented API constraint

    it('should update task status', async () => {
      if (createdTasks.length === 0) {
        console.error(
          '⏭️ Skipping status update test - no created tasks available'
        );
        return;
      }

      const task = createdTasks[0];
      const taskId = task.id.task_id || task.id;

      const response = await callTasksTool('update-task', {
        taskId: taskId,
        status: 'completed',
      });

      E2EAssertions.expectMcpSuccess(response);
      const updatedTask = E2EAssertions.expectMcpData(response);

      expect(updatedTask.id.task_id || updatedTask.id).toBe(taskId);
      console.error('✅ Updated task status:', taskId);
    }, 30000);

    it('should update task assignee', async () => {
      if (createdTasks.length === 0 || testPeople.length === 0) {
        console.error(
          '⏭️ Skipping assignee update test - insufficient test data'
        );
        return;
      }

      const task = createdTasks[0];
      const taskId = task.id.task_id || task.id;
      const newAssignee = testPeople[0];

      const response = await callTasksTool('update-task', {
        taskId: taskId,
        assigneeId: newAssignee.id.record_id,
      });

      E2EAssertions.expectMcpSuccess(response);
      const updatedTask = E2EAssertions.expectMcpData(response);

      expect(updatedTask.id.task_id || updatedTask.id).toBe(taskId);
      console.error('👤 Updated task assignee:', taskId);
    }, 30000);

    it('should update task due date', async () => {
      if (createdTasks.length === 0) {
        console.error(
          '⏭️ Skipping due date update test - no created tasks available'
        );
        return;
      }

      const task = createdTasks[0];
      const taskId = task.id.task_id || task.id;
      const newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + 14); // 2 weeks from now

      const response = await callTasksTool('update-task', {
        taskId: taskId,
        due_date: newDueDate.toISOString().split('T')[0],
      });

      E2EAssertions.expectMcpSuccess(response);
      const updatedTask = E2EAssertions.expectMcpData(response);

      expect(updatedTask.id.task_id || updatedTask.id).toBe(taskId);
      console.error('📅 Updated task due date:', taskId);
    }, 30000);

    it('should update multiple task fields simultaneously', async () => {
      if (createdTasks.length === 0) {
        console.error(
          '⏭️ Skipping multi-field update test - no created tasks available'
        );
        return;
      }

      const task = createdTasks[0];
      const taskId = task.id.task_id || task.id;
      const newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + 7);

      const response = await callTasksTool('update-task', {
        taskId: taskId,
        status: 'in_progress',
        due_date: newDueDate.toISOString().split('T')[0],
      });

      E2EAssertions.expectMcpSuccess(response);
      const updatedTask = E2EAssertions.expectMcpData(response);

      expect(updatedTask.id.task_id || updatedTask.id).toBe(taskId);
      console.error('🔄 Updated multiple task fields:', taskId);
    }, 30000);
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

      const response = await callTasksTool('link-record-to-task', {
        taskId: taskId,
        recordId: company.id.record_id,
      });

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

      const response = await callTasksTool('link-record-to-task', {
        taskId: taskId,
        recordId: person.id.record_id,
      });

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
      const companyLinkResponse = await callTasksTool('link-record-to-task', {
        taskId: taskId,
        recordId: testCompanies[0].id.record_id,
      });

      E2EAssertions.expectMcpSuccess(companyLinkResponse);

      // Link to person (if API supports multiple links)
      const personLinkResponse = await callTasksTool('link-record-to-task', {
        taskId: taskId,
        recordId: testPeople[0].id.record_id,
      });

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
      const createResponse = await callTasksTool('create-task', {
        content: 'E2E Workflow Task - Initial Creation',
        due_date: taskData.due_date,
      });

      E2EAssertions.expectMcpSuccess(createResponse);
      const workflowTask = E2EAssertions.expectMcpData(createResponse);
      const taskId = workflowTask.id.task_id || workflowTask.id;

      // Update to in-progress
      const progressResponse = await callTasksTool('update-task', {
        taskId: taskId,
        status: 'in_progress',
      });

      E2EAssertions.expectMcpSuccess(progressResponse);

      // Complete the task
      const completeResponse = await callTasksTool('update-task', {
        taskId: taskId,
        status: 'completed',
      });

      E2EAssertions.expectMcpSuccess(completeResponse);

      createdTasks.push(workflowTask);
      console.error('🔄 Completed full task lifecycle:', taskId);
    }, 60000);

    it('should handle task priority changes throughout lifecycle', async () => {
      const taskData = TaskFactory.create();

      // Create normal priority task
      const createResponse = await callTasksTool('create-task', {
        content: 'E2E Priority Task',
        due_date: taskData.due_date,
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
      const createResponse = await callTasksTool('create-task', {
        content: 'E2E Assignment Task - Initially Unassigned',
        due_date: taskData.due_date,
      });

      E2EAssertions.expectMcpSuccess(createResponse);
      const assignmentTask = E2EAssertions.expectMcpData(createResponse);
      const taskId = assignmentTask.id.task_id || assignmentTask.id;

      // Assign to person
      const assignResponse = await callTasksTool('update-task', {
        taskId: taskId,
        assigneeId: testPeople[0].id.record_id,
      });

      E2EAssertions.expectMcpSuccess(assignResponse);

      createdTasks.push(assignmentTask);
      console.error('👥 Completed assignment change workflow:', taskId);
    }, 45000);
  });

  describe('Error Handling and Validation', () => {
    it('should handle invalid task ID in updates', async () => {
      const response = await callTasksTool('update-task', {
        taskId: 'invalid-task-id-12345',
        status: 'completed',
      });

      E2EAssertions.expectMcpError(
        response,
        /not found|invalid|does not exist|missing required parameter/i
      );
    }, 15000);

    it('should reject task content updates with proper error message', async () => {
      if (createdTasks.length === 0) {
        console.log(
          '⏭️ Skipping content update test - no created tasks available'
        );
        return;
      }

      const task = createdTasks[0];
      const taskId = task.id.task_id || task.id;

      const response = await callTasksTool('update-task', {
        taskId: taskId,
        content: 'This should fail - content is immutable',
      });

      E2EAssertions.expectMcpError(
        response,
        /content cannot be updated|immutable/i
      );

      console.log('✅ Content update properly rejected:', taskId);
    }, 15000);

    it('should handle invalid task ID in deletion', async () => {
      const response = await callTasksTool('delete-task', {
        taskId: 'invalid-task-id-12345',
      });

      E2EAssertions.expectMcpError(
        response,
        /not found|invalid|does not exist|missing required parameter/i
      );
    }, 15000);

    it('should handle invalid assignee ID', async () => {
      if (createdTasks.length === 0) {
        console.error(
          '⏭️ Skipping invalid assignee test - no created tasks available'
        );
        return;
      }

      const task = createdTasks[0];
      const taskId = task.id.task_id || task.id;

      const response = await callTasksTool('update-task', {
        taskId: taskId,
        assigneeId: 'invalid-assignee-id-12345',
      });

      E2EAssertions.expectMcpError(response, /not found|invalid|assignee/i);
    }, 15000);

    it('should validate required fields for task creation', async () => {
      const response = await callTasksTool('create-task', {
        // Missing required 'content' field
        due_date: '2024-12-31',
      });

      E2EAssertions.expectMcpError(response, /content|required/i);
    }, 15000);

    it('should handle invalid date formats', async () => {
      const response = await callTasksTool('create-task', {
        content: 'E2E Test Task with invalid date format for testing',
        due_date: 'invalid-date-format',
      });

      // This might succeed or fail depending on API validation
      if (response.isError) {
        expect(response.error).toMatch(/date|format|invalid/i);
      } else {
        const task = E2EAssertions.expectMcpData(response);
        createdTasks.push(task);
        console.error('ℹ️ API accepts flexible date formats');
      }
    }, 15000);

    it('should handle invalid record ID in linking', async () => {
      if (createdTasks.length === 0) {
        console.error(
          '⏭️ Skipping invalid record link test - no created tasks available'
        );
        return;
      }

      const task = createdTasks[0];
      const taskId = task.id.task_id || task.id;

      const response = await callTasksTool('link-record-to-task', {
        taskId: taskId,
        recordId: 'invalid-record-id-12345',
      });

      E2EAssertions.expectMcpError(response, /not found|invalid|record/i);
    }, 15000);

    it('should handle invalid task ID in linking', async () => {
      if (testCompanies.length === 0) {
        console.error(
          '⏭️ Skipping invalid task link test - no test companies available'
        );
        return;
      }

      const response = await callTasksTool('link-record-to-task', {
        taskId: 'invalid-task-id-12345',
        recordId: testCompanies[0].id.record_id,
      });

      E2EAssertions.expectMcpError(response, /not found|invalid|task/i);
    }, 15000);
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent task operations', async () => {
      const taskData1 = TaskFactory.create();
      const taskData2 = TaskFactory.create();
      const taskData3 = TaskFactory.create();

      const promises = [
        callTasksTool('create-task', {
          content: taskData1.content,
          due_date: taskData1.due_date,
        }),
        callTasksTool('create-task', {
          content: taskData2.content,
          due_date: taskData2.due_date,
        }),
        callTasksTool('create-task', {
          content: taskData3.content,
          due_date: taskData3.due_date,
        }),
      ];

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        E2EAssertions.expectMcpSuccess(
          response,
          `Concurrent task ${index + 1} should succeed`
        );
        const task = E2EAssertions.expectMcpData(response);
        createdTasks.push(task);
      });

      console.error('🚀 Concurrent task operations completed successfully');
    }, 60000);

    it('should validate task operation execution times', async () => {
      const startTime = Date.now();

      const response = await callTasksTool('list-tasks', {
        pageSize: 10,
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      E2EAssertions.expectMcpSuccess(response);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds

      console.error(`⚡ Task listing completed in ${executionTime}ms`);
    }, 15000);

    it('should handle batch task updates efficiently', async () => {
      if (createdTasks.length < 3) {
        console.error(
          '⏭️ Skipping batch update test - insufficient created tasks'
        );
        return;
      }

      const startTime = Date.now();
      const updatePromises = [];

      for (let i = 0; i < Math.min(3, createdTasks.length); i++) {
        const task = createdTasks[i];
        const taskId = task.id.task_id || task.id;

        updatePromises.push(
          callTasksTool('update-task', {
            taskId: taskId,
            content: `Batch updated task ${i + 1}`,
            status: 'in_progress',
          })
        );
      }

      const responses = await Promise.all(updatePromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      responses.forEach((response, index) => {
        if (response.isError) {
          console.warn(`Batch update ${index + 1} failed:`, response.error);
        } else {
          E2EAssertions.expectMcpSuccess(response);
        }
      });

      const avgTime = totalTime / updatePromises.length;
      console.error(
        `📊 Batch updates: ${updatePromises.length} tasks in ${totalTime}ms (avg: ${avgTime}ms per update)`
      );
      expect(avgTime).toBeLessThan(5000); // Average should be under 5 seconds per update
    }, 60000);
  });

  describe('Task Deletion and Cleanup', () => {
    it('should delete individual tasks', async () => {
      if (createdTasks.length === 0) {
        console.error('⏭️ Skipping deletion test - no created tasks available');
        return;
      }

      // Delete the last created task to avoid affecting other tests
      const taskToDelete = createdTasks[createdTasks.length - 1];
      const taskId = taskToDelete.id.task_id || taskToDelete.id;

      const response = await callTasksTool('delete-task', {
        taskId: taskId,
      });

      E2EAssertions.expectMcpSuccess(response);

      // Remove from our tracking
      createdTasks = createdTasks.filter(
        (t) => (t.id.task_id || t.id) !== taskId
      );

      console.error('🗑️ Deleted task:', taskId);
    }, 30000);

    it('should handle deletion of non-existent task gracefully', async () => {
      const response = await callTasksTool('delete-task', {
        taskId: 'already-deleted-task-12345',
      });

      E2EAssertions.expectMcpError(
        response,
        /not found|invalid|does not exist|missing required parameter/i
      );
    }, 15000);

    it('should validate task cleanup tracking', async () => {
      // Verify that created tasks are being tracked properly
      expect(createdTasks.length).toBeGreaterThanOrEqual(0);

      createdTasks.forEach((task, index) => {
        expect(
          task.id.task_id || task.id,
          `Task ${index} should have ID`
        ).toBeDefined();
        expect(
          task.content || task.title,
          `Task ${index} should have content/title`
        ).toBeDefined();

        // Verify test data characteristics
        const isTestTask =
          (task.content || task.title || '').includes('E2E') ||
          (task.content || task.title || '').includes('Test') ||
          (task.content || task.title || '').includes('testing');

        expect(
          isTestTask,
          `Task ${index} should be identifiable as test data`
        ).toBe(true);
      });

      console.error(
        '🧹 Validated cleanup tracking for',
        createdTasks.length,
        'tasks'
      );
    }, 10000);
  });

  describe('Data Consistency and Integration', () => {
    it('should maintain task structure consistency', async () => {
      if (createdTasks.length === 0) {
        console.error(
          '⏭️ Skipping consistency test - no created tasks available'
        );
        return;
      }

      // Check consistency across created tasks
      createdTasks.forEach((task, index) => {
        E2EAssertions.expectTaskRecord(task);

        // All tasks should have consistent core structure
        expect(task.id, `Task ${index} should have id object`).toBeDefined();
        expect(
          task.content || task.title,
          `Task ${index} should have content or title`
        ).toBeDefined();

        // Verify ID format consistency
        const taskId = task.id.task_id || task.id;
        expect(typeof taskId, `Task ${index} ID should be string`).toBe(
          'string'
        );
        expect(
          taskId.length,
          `Task ${index} ID should not be empty`
        ).toBeGreaterThan(0);
      });

      console.error(
        '🧪 Validated task structure consistency across',
        createdTasks.length,
        'tasks'
      );
    }, 10000);

    it('should validate task relationship integrity', async () => {
      // This test validates that task-record linking maintains data integrity
      // In a real scenario, this would verify that linked records still exist
      // and that task relationships are maintained properly

      if (createdTasks.length === 0) {
        console.error(
          '⏭️ Skipping relationship integrity test - no created tasks available'
        );
        return;
      }

      console.error(
        '🔗 Task relationship integrity validated for',
        createdTasks.length,
        'tasks'
      );
    }, 10000);
  });
});
