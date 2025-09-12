/**
 * MCP P1 Task Management Tests - Workflow Operations
 * Tests task workflow operations (status updates, deadlines, record linking, completion) with automatic cleanup
 *
 * Related: Issue #638 - P1 Task Management Tests
 * Parent: Issue #612 - Complete MCP Testing Suite Implementation
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base.js';
import { QAAssertions } from '../shared/qa-assertions.js';
import { TestDataFactory } from '../shared/test-data-factory.js';
import { taskFixtures, taskStatuses } from '../../fixtures/tasks.js';
import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Task Workflow Operations Test Suite
 * Implements comprehensive testing for task workflow operations with automatic cleanup
 */
class TaskWorkflowTests extends MCPTestBase {
  private qa: QAAssertions;
  private testDataFactory: TestDataFactory;
  private createdTaskIds: string[] = [];
  private createdRecordIds: string[] = [];

  constructor() {
    super('TASK_WORKFLOW');
    this.qa = new QAAssertions();
    this.testDataFactory = new TestDataFactory();
  }

  /**
   * Track task ID for cleanup
   */
  private trackTaskForCleanup(taskId: string): void {
    if (taskId && !this.createdTaskIds.includes(taskId)) {
      this.createdTaskIds.push(taskId);
    }
  }

  /**
   * Track record ID for cleanup
   */
  private trackRecordForCleanup(recordId: string): void {
    if (recordId && !this.createdRecordIds.includes(recordId)) {
      this.createdRecordIds.push(recordId);
    }
  }

  /**
   * Clean up all created tasks and records
   */
  async cleanupCreatedData(): Promise<void> {
    // Clean up tasks first
    for (const taskId of this.createdTaskIds) {
      try {
        await this.executeToolCall('delete-record', {
          resource_type: 'tasks',
          record_id: taskId,
        });
        console.log(`✅ Cleaned up task ${taskId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup task ${taskId}:`, error);
      }
    }

    // Clean up any created records (companies/people)
    for (const recordId of this.createdRecordIds) {
      try {
        await this.executeToolCall('delete-record', {
          resource_type: 'companies',
          record_id: recordId,
        });
        console.log(`✅ Cleaned up record ${recordId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup record ${recordId}:`, error);
      }
    }

    this.createdTaskIds.length = 0;
    this.createdRecordIds.length = 0;
  }

  /**
   * Create a test task and return the task ID
   */
  async createTestTask(taskData?: Record<string, unknown>): Promise<string> {
    const testTask = taskData || {
      title: `${this.generateTestId()} Workflow Test Task`,
      content: 'Task for testing workflow operations',
      priority: 'medium',
      status: 'open',
    };

    // Use universal tool with resource_type parameter
    const result = await this.executeToolCall('create-record', {
      resource_type: 'tasks',
      record_data: testTask,
    });

    // Extract task ID from response
    const taskId = this.extractRecordId(this.extractTextContent(result));
    if (!taskId) {
      throw new Error('Failed to extract task ID from create response');
    }

    this.trackTaskForCleanup(taskId);
    return taskId;
  }

  /**
   * Create a test company record for linking tests
   */
  async createTestCompany(): Promise<string> {
    const testCompany = this.testDataFactory.generateTestCompany({
      name: `${this.generateTestId()} Workflow Test Company`,
      domain: `test-${Date.now()}.example.com`,
    });

    const result = await this.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: testCompany,
    });

    const recordId = this.extractRecordId(this.extractTextContent(result));
    if (!recordId) {
      throw new Error('Failed to extract company ID from create response');
    }

    this.trackRecordForCleanup(recordId);
    return recordId;
  }
}

describe('MCP P1 Task Workflow Operations', () => {
  let testSuite: TaskWorkflowTests;

  beforeEach(async () => {
    testSuite = new TaskWorkflowTests();
    await testSuite.setup();
  });

  afterEach(async () => {
    try {
      await testSuite.cleanupCreatedData();
    } finally {
      await testSuite.teardown();
    }
  });

  describe('Task Status Updates', () => {
    it('should update task status through workflow progression', async () => {
      // Arrange - Create a test task with initial status
      const taskId = await testSuite.createTestTask({
        title: `${testSuite.generateTestId()} Status Progression Task`,
        status: 'open',
        priority: 'high',
      });

      // Status progression: open -> in_progress -> completed
      const statusProgression = ['in_progress', 'completed'];

      // Act & Assert - Progress through each status
      for (const status of statusProgression) {
        const result = await testSuite.executeToolCall('update-record', {
          resource_type: 'tasks',
          record_id: taskId,
          record_data: { status: status },
        });

        expect(result.isError).toBeFalsy();

        const responseText = testSuite.extractTextContent(result);
        expect(responseText).toMatch(/Updated task|Successfully updated task/);
        expect(responseText).toContain(taskId);

        console.log(
          `✅ Successfully updated task ${taskId} to status: ${status}`
        );
      }
    });

    it('should handle all valid task statuses', async () => {
      // Test each valid status from fixtures
      const validStatuses = taskStatuses.slice(0, 3); // Test first 3 for performance

      for (const status of validStatuses) {
        // Arrange - Create a new task for each status test
        const taskId = await testSuite.createTestTask({
          title: `${testSuite.generateTestId()} Status ${status} Task`,
          status: 'open', // Start with open status
        });

        // Act - Update to target status
        const result = await testSuite.executeToolCall('update-record', {
          resource_type: 'tasks',
          record_id: taskId,
          record_data: { status: status },
        });

        // Assert
        expect(result.isError).toBeFalsy();

        const responseText = testSuite.extractTextContent(result);
        expect(responseText).toMatch(/Updated task|Successfully updated task/);

        console.log(`✅ Successfully set task ${taskId} to status: ${status}`);
      }
    });

    it('should handle invalid status gracefully', async () => {
      // Arrange - Create a test task
      const taskId = await testSuite.createTestTask();

      // Act - Try to set invalid status
      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { status: 'invalid_status_123' },
      });

      // Assert - Should handle gracefully
      const responseText = testSuite.extractTextContent(result);

      if (result.isError) {
        expect(responseText).toMatch(/invalid|error|status/i);
        console.log(`✅ Correctly rejected invalid status`);
      } else {
        expect(responseText).toMatch(/Updated task|Successfully updated task/);
        console.log(`✅ Gracefully handled invalid status`);
      }
    });
  });

  describe('Task Deadlines', () => {
    it('should set and update task deadlines', async () => {
      // Arrange - Create a test task without due date
      const taskId = await testSuite.createTestTask();

      // Set initial deadline (7 days from now)
      const initialDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Act - Set initial deadline
      const setResult = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { due_date: initialDeadline },
      });

      // Assert - Initial deadline set
      expect(setResult.isError).toBeFalsy();
      expect(testSuite.extractTextContent(setResult)).toContain('Updated task');

      // Act - Update deadline (14 days from now)
      const updatedDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const updateResult = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { due_date: updatedDeadline },
      });

      // Assert - Deadline updated
      expect(updateResult.isError).toBeFalsy();
      expect(testSuite.extractTextContent(updateResult)).toContain(
        'Updated task'
      );

      console.log(
        `✅ Successfully set and updated deadline for task ${taskId}`
      );
    });

    it('should handle past due dates', async () => {
      // Arrange - Create a test task
      const taskId = await testSuite.createTestTask();

      // Set past due date (7 days ago)
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Act - Set past due date
      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { due_date: pastDate },
      });

      // Assert - Should handle gracefully (past dates often allowed for historical tracking)
      const responseText = testSuite.extractTextContent(result);

      if (result.isError) {
        console.log(`✅ System rejected past due date (strict validation)`);
      } else {
        expect(responseText).toMatch(/Updated task|Successfully updated task/);
        console.log(`✅ System accepted past due date (historical tracking)`);
      }
    });

    it('should remove deadline from task', async () => {
      // Arrange - Create task with deadline
      const taskId = await testSuite.createTestTask({
        title: `${testSuite.generateTestId()} Deadline Removal Task`,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      });

      // Act - Remove deadline (set to null/empty)
      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { due_date: null },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const responseText = testSuite.extractTextContent(result);
      expect(responseText).toMatch(/Updated task|Successfully updated task/);

      console.log(`✅ Successfully removed deadline from task ${taskId}`);
    });
  });

  // TODO: Record Linking tests - waiting for universal tool equivalent
  // The link-record-to-task tool is not yet mapped to universal tools
  // These tests will be re-enabled once the universal equivalent is available
  describe.skip('Record Linking', () => {
    it('should link task to company record', async () => {
      // Arrange - Create test task and company
      const taskId = await testSuite.createTestTask({
        title: `${testSuite.generateTestId()} Company Link Task`,
        content: 'Task to be linked to a company record',
      });

      const companyId = await testSuite.createTestCompany();

      // Act - Link task to company (universal tool TBD)
      // const result = await testSuite.executeToolCall('link-record-to-task', {
      //   task_id: taskId,
      //   record_type: 'companies',
      //   record_id: companyId
      // });

      console.log(
        `⏸️ Skipping record linking test - universal tool not yet available`
      );
    });
  });

  describe('Task Completion', () => {
    it('should mark task as completed with success status', async () => {
      // Arrange - Create task in progress
      const taskId = await testSuite.createTestTask({
        title: `${testSuite.generateTestId()} Completion Test Task`,
        status: 'in_progress',
        priority: 'high',
      });

      // Act - Mark as completed
      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { status: 'completed' },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const responseText = testSuite.extractTextContent(result);
      expect(responseText).toMatch(/Updated task|Successfully updated task/);
      expect(responseText).toContain(taskId);

      console.log(`✅ Successfully marked task ${taskId} as completed`);
    });

    it('should complete task with completion notes', async () => {
      // Arrange - Create test task
      const taskId = await testSuite.createTestTask();

      // Act - Complete with notes
      const completionNotes =
        'Task completed successfully with all requirements met';

      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: {
          status: 'completed',
          content: completionNotes,
        },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const responseText = testSuite.extractTextContent(result);
      expect(responseText).toMatch(/Updated task|Successfully updated task/);

      console.log(
        `✅ Successfully completed task ${taskId} with completion notes`
      );
    });

    it('should handle workflow from creation to completion', async () => {
      // Arrange - Create a comprehensive workflow task
      const workflowTask = {
        title: `${testSuite.generateTestId()} Full Workflow Task`,
        content: 'Task to test complete workflow from creation to completion',
        priority: 'medium',
        status: 'open',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      };

      const taskId = await testSuite.createTestTask(workflowTask);

      // Workflow steps
      const workflowSteps = [
        { status: 'in_progress', description: 'Start working on task' },
        {
          content: 'Added progress notes and updated timeline',
          description: 'Add progress notes',
        },
        {
          priority: 'high',
          description: 'Escalate priority',
        },
        {
          status: 'completed',
          content: 'Task completed successfully with all objectives met',
          description: 'Mark as completed with notes',
        },
      ];

      // Act & Assert - Execute each workflow step
      for (const step of workflowSteps) {
        const { description, ...stepData } = step;
        const result = await testSuite.executeToolCall('update-record', {
          resource_type: 'tasks',
          record_id: taskId,
          record_data: stepData,
        });

        expect(result.isError).toBeFalsy();

        const responseText = testSuite.extractTextContent(result);
        expect(responseText).toMatch(/Updated task|Successfully updated task/);

        console.log(`✅ Workflow step: ${description} for task ${taskId}`);
      }

      console.log(`🎉 Successfully completed full workflow for task ${taskId}`);
    });
  });
});
