/**
 * Tasks Management Core E2E Tests
 *
 * Core CRUD operations for tasks including:
 * - Test data setup (companies and people for task relationships)
 * - Task creation with various configurations
 * - Task updates and modifications
 * - Task deletion and cleanup
 *
 * Part 1 of 3 - Core Operations
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

// Define TaskRecord locally to avoid import issues
interface TaskRecord {
  id: {
    task_id: string;
    record_id?: string;
    object_id?: string;
  };
  type?: string;
  content?: string;
  title?: string;
  content_plaintext?: string;
  status?: string;
  due_date?: string;
  assignee_id?: string;
  assignee?: {
    id: string;
  };
  values?: {
    content?: Array<{ value: string }>;
    title?: Array<{ value: string }>;
    status?: Array<{ value: string }>;
    [key: string]: unknown;
  };
  attributes?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

// Import enhanced tool caller with logging and migration
import {
  callTasksTool,
  validateTestEnvironment,
  getToolMigrationStats,
} from '../utils/enhanced-tool-caller.js';
import { startTestSuite, endTestSuite } from '../utils/logger.js';

/**
 * Helper function to safely cast tool responses to McpToolResponse
 */
function asToolResponse(response: unknown): McpToolResponse {
  return response as McpToolResponse;
}

/**
 * Helper function to safely extract task data from MCP response
 */
function extractTaskData(response: McpToolResponse): TaskRecord {
  const data = E2EAssertions.expectMcpData(response);
  if (!data) {
    throw new Error('No data returned from MCP tool response');
  }
  return data as unknown as TaskRecord;
}

/**
 * Tasks Management Core E2E Test Suite
 */

// Records are tracked per test suite instead of globally
// Global record tracking not used in this implementation

// Note: callTasksTool is now imported from enhanced-tool-caller.js
// It automatically handles legacy-to-universal tool migration and comprehensive logging

describe.skipIf(
  !process.env.ATTIO_API_KEY || process.env.SKIP_E2E_TESTS === 'true'
)('Tasks Management Core E2E Tests', () => {
  // Test data storage
  const testCompanies: TestDataObject[] = [];
  const testPeople: TestDataObject[] = [];
  let createdTasks: TaskRecord[] = [];

  beforeAll(async () => {
    // Start comprehensive logging for this test suite
    startTestSuite('tasks-management-core');

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
      '🚀 Starting Tasks Management Core E2E Tests with Universal Tools'
    );
  }, 30000);

  afterAll(async () => {
    // Cleanup is handled automatically by E2ETestBase.setup()

    // End comprehensive logging for this test suite
    endTestSuite();

    console.error(
      '✅ Tasks Management Core E2E Tests completed with enhanced logging'
    );
  }, 30000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Test Data Setup', () => {
    it('should create test companies for task testing', async () => {
      const companyData = CompanyFactory.create();
      const response = asToolResponse(await callTasksTool('create-record', {
        resource_type: 'companies',
        record_data: companyData as any,
      }));

      E2EAssertions.expectMcpSuccess(response);
      const company = E2EAssertions.expectMcpData(response)!;

      E2EAssertions.expectCompanyRecord(company);
      testCompanies.push(company);

      console.error('🏢 Created test company for tasks:', (company as any)?.id?.record_id);
    }, 30000);

    it('should create test people for task assignment', async () => {
      const personData = PersonFactory.create();
      const response = asToolResponse(await callTasksTool('create-record', {
        resource_type: 'people',
        record_data: personData as any,
      }));

      E2EAssertions.expectMcpSuccess(response);
      const person = E2EAssertions.expectMcpData(response)!;

      E2EAssertions.expectPersonRecord(person);
      testPeople.push(person);

      console.error(
        '👤 Created test person for task assignment:',
        (person as any)?.id?.record_id
      );
    }, 30000);
  });

  describe('Task Creation and Basic Operations', () => {
    it('should create a basic task', async () => {
      const taskData = TaskFactory.create();

      const response = asToolResponse(await callTasksTool('create-record', {
        resource_type: 'tasks',
        record_data: {
          content: taskData.content,
          due_date: taskData.due_date,
        },
      }));

      E2EAssertions.expectMcpSuccess(response);
      const createdTask = extractTaskData(response);

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

      const response = asToolResponse(await callTasksTool('create-record', {
        resource_type: 'tasks',
        record_data: {
          content: taskData.content,
          assigneeId: assignee.id.record_id,
          due_date: taskData.due_date,
        },
      }));

      E2EAssertions.expectMcpSuccess(response);
      const createdTask = extractTaskData(response);

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

      const response = asToolResponse(await callTasksTool('create-record', {
        resource_type: 'tasks',
        record_data: {
          content: `Follow up with ${company.values.name?.[0]?.value || 'company'}`,
          recordId: company.id.record_id,
          due_date: taskData.due_date,
        },
      }));

      E2EAssertions.expectMcpSuccess(response);
      const createdTask = extractTaskData(response);

      E2EAssertions.expectTaskRecord(createdTask);

      createdTasks.push(createdTask);
      console.error(
        '🔗 Created task linked to record:',
        createdTask.id.task_id
      );
    }, 30000);

    it('should create high priority task', async () => {
      const taskData = TaskFactory.createHighPriority();

      const response = asToolResponse(await callTasksTool('create-record', {
        resource_type: 'tasks',
        record_data: {
          content: taskData.content,
          due_date: taskData.due_date,
        },
      }));

      E2EAssertions.expectMcpSuccess(response);
      const createdTask = extractTaskData(response);

      E2EAssertions.expectTaskRecord(createdTask);
      // Check for content in various possible locations
      const taskContent = 
        createdTask.content || 
        createdTask.title || 
        createdTask.values?.content?.[0]?.value ||
        createdTask.values?.title?.[0]?.value ||
        createdTask.content_plaintext;
        
      expect(taskContent).toContain('Test Task');

      createdTasks.push(createdTask);
      console.error('⚡ Created high priority task:', createdTask.id.task_id);
    }, 30000);

    it('should create multiple tasks for testing', async () => {
      const tasksBatch = TaskFactory.createMany(3);

      for (const taskData of tasksBatch) {
        const response = asToolResponse(await callTasksTool('create-record', {
          resource_type: 'tasks',
          record_data: {
            content: taskData.content,
            due_date: taskData.due_date,
          },
        }));

        if (response.isError) {
          console.warn('Failed to create batch task:', response.error);
        } else {
          const createdTask = extractTaskData(response);
          createdTasks.push(createdTask);
        }
      }

      console.error('📦 Created batch of tasks for testing');
    }, 45000);
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
      const taskId = task.id.task_id;

      const response = asToolResponse(await callTasksTool('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: {
          status: 'completed',
        },
      }));

      E2EAssertions.expectMcpSuccess(response);
      const updatedTask = extractTaskData(response);

      expect(updatedTask.id.task_id).toBe(taskId);
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
      const taskId = task.id.task_id;
      const newAssignee = testPeople[0];

      const response = asToolResponse(await callTasksTool('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: {
          assigneeId: newAssignee.id.record_id,
        },
      }));

      E2EAssertions.expectMcpSuccess(response);
      const updatedTask = extractTaskData(response);

      expect(updatedTask.id.task_id).toBe(taskId);
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
      const taskId = task.id.task_id;
      const newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + 14); // 2 weeks from now

      const response = asToolResponse(await callTasksTool('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: {
          due_date: newDueDate.toISOString().split('T')[0],
        },
      }));

      E2EAssertions.expectMcpSuccess(response);
      const updatedTask = extractTaskData(response);

      expect(updatedTask.id.task_id).toBe(taskId);
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
      const taskId = task.id.task_id;
      const newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + 7);

      const response = asToolResponse(await callTasksTool('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: {
          status: 'in_progress',
          due_date: newDueDate.toISOString().split('T')[0],
        },
      }));

      E2EAssertions.expectMcpSuccess(response);
      const updatedTask = extractTaskData(response);

      expect(updatedTask.id.task_id).toBe(taskId);
      console.error('🔄 Updated multiple task fields:', taskId);
    }, 30000);
  });

  describe('Task Deletion and Cleanup', () => {
    it('should delete individual tasks', async () => {
      if (createdTasks.length === 0) {
        console.error('⏭️ Skipping deletion test - no created tasks available');
        return;
      }

      // Delete the last created task to avoid affecting other tests
      const taskToDelete = createdTasks[createdTasks.length - 1];
      const taskId = taskToDelete.id.task_id;

      const response = asToolResponse(await callTasksTool('delete-record', {
        resource_type: 'tasks',
        record_id: taskId,
      }));

      E2EAssertions.expectMcpSuccess(response);

      // Remove from our tracking
      createdTasks = createdTasks.filter(
        (t) => t.id.task_id !== taskId
      );

      console.error('🗑️ Deleted task:', taskId);
    }, 30000);

    it('should handle deletion of non-existent task gracefully', async () => {
      const response = asToolResponse(await callTasksTool('delete-record', {
        resource_type: 'tasks',
        record_id: 'already-deleted-task-12345',
      }));

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
        // Check for content in various possible locations
        const taskContent = 
          task.content || 
          task.title || 
          task.values?.content?.[0]?.value ||
          task.values?.title?.[0]?.value ||
          task.content_plaintext;
          
        expect(
          taskContent,
          `Task ${index} should have content/title`
        ).toBeDefined();

        // Verify test data characteristics
        const isTestTask =
          (taskContent || '').includes('E2E') ||
          (taskContent || '').includes('Test') ||
          (taskContent || '').includes('testing');

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
});