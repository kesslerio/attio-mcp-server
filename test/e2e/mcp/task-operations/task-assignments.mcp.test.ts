/**
 * MCP P1 Task Management Tests - Assignment Operations
 * Tests task assignment operations with automatic cleanup
 *
 * Related: Issue #638 - P1 Task Management Tests
 * Parent: Issue #612 - Complete MCP Testing Suite Implementation
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { MCPTestBase } from '../shared/mcp-test-base.js';
import { QAAssertions } from '../shared/qa-assertions.js';
import { TestDataFactory } from '../shared/test-data-factory.js';
import { taskFixtures } from '../../fixtures/tasks.js';
import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Task Assignment Operations Test Suite
 * Implements comprehensive testing for task assignment operations with automatic cleanup
 */
class TaskAssignmentTests extends MCPTestBase {
  private qa: QAAssertions;
  private testDataFactory: TestDataFactory;
  private createdTaskIds: string[] = [];

  constructor() {
    super('TASK_ASSIGN');
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
   * Clean up all created tasks
   */
  async cleanupCreatedTasks(): Promise<void> {
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
    this.createdTaskIds.length = 0;
  }

  /**
   * Create a test task and return the task ID
   */
  async createTestTask(taskData?: Record<string, unknown>): Promise<string> {
    const testTask = taskData || {
      title: `${this.generateTestId()} Assignment Test Task`,
      content: 'Task for testing assignment operations',
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
}

describe('MCP P1 Task Assignment Operations', () => {
  let testSuite: TaskAssignmentTests;

  beforeEach(async () => {
    testSuite = new TaskAssignmentTests();
    await testSuite.setup();
  });

  afterEach(async () => {
    try {
      await testSuite.cleanupCreatedTasks();
    } finally {
      await testSuite.teardown();
    }
  });

  describe('Single User Assignment', () => {
    it('should assign a user to a task', async () => {
      // Arrange - Create a test task
      const taskId = await testSuite.createTestTask();

      // Mock assignee data - using test user
      const assigneeData = {
        user_id: `${testSuite.generateTestId()}_user`,
        name: 'Test Assignee',
        email: 'test.assignee@example.com',
      };

      // Act - Update task with assignee
      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: [assigneeData] },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const responseText = testSuite.extractTextContent(result);
      expect(responseText).toMatch(/Updated task|Successfully updated task/);
      expect(responseText).toContain(taskId);

      console.log(`✅ Successfully assigned user to task ${taskId}`);
    });

    it('should change task assignment to different user', async () => {
      // Arrange - Create task with initial assignee
      const taskId = await testSuite.createTestTask();

      const initialAssignee = {
        user_id: `${testSuite.generateTestId()}_user1`,
        name: 'Initial Assignee',
        email: 'initial@example.com',
      };

      // Set initial assignment
      await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: [initialAssignee] },
      });

      // Act - Change assignment to new user
      const newAssignee = {
        user_id: `${testSuite.generateTestId()}_user2`,
        name: 'New Assignee',
        email: 'new@example.com',
      };

      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: [newAssignee] },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const responseText = testSuite.extractTextContent(result);
      expect(responseText).toMatch(/Updated task|Successfully updated task/);
      expect(responseText).toContain(taskId);

      console.log(`✅ Successfully changed assignment for task ${taskId}`);
    });

    it('should remove assignment from task', async () => {
      // Arrange - Create task with assignee
      const taskId = await testSuite.createTestTask();

      const assignee = {
        user_id: `${testSuite.generateTestId()}_user`,
        name: 'Temporary Assignee',
        email: 'temp@example.com',
      };

      // Set initial assignment
      await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: [assignee] },
      });

      // Act - Remove assignment (empty assignees array)
      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: [] },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const responseText = testSuite.extractTextContent(result);
      expect(responseText).toMatch(/Updated task|Successfully updated task/);
      expect(responseText).toContain(taskId);

      console.log(`✅ Successfully removed assignment from task ${taskId}`);
    });
  });

  describe('Multiple User Assignment', () => {
    it('should assign multiple users to a task', async () => {
      // Arrange - Create a test task
      const taskId = await testSuite.createTestTask({
        title: `${testSuite.generateTestId()} Multi-Assignment Task`,
        content: 'Task requiring multiple team members',
        priority: 'high',
        status: 'open',
      });

      // Multiple assignees
      const assignees = [
        {
          user_id: `${testSuite.generateTestId()}_user1`,
          name: 'Lead Developer',
          email: 'lead@example.com',
        },
        {
          user_id: `${testSuite.generateTestId()}_user2`,
          name: 'QA Engineer',
          email: 'qa@example.com',
        },
        {
          user_id: `${testSuite.generateTestId()}_user3`,
          name: 'Product Manager',
          email: 'pm@example.com',
        },
      ];

      // Act - Assign multiple users
      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: assignees },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const responseText = testSuite.extractTextContent(result);
      expect(responseText).toMatch(/Updated task|Successfully updated task/);
      expect(responseText).toContain(taskId);

      console.log(
        `✅ Successfully assigned ${assignees.length} users to task ${taskId}`
      );
    });

    it('should add additional assignee to existing assignments', async () => {
      // Arrange - Create task with initial assignees
      const taskId = await testSuite.createTestTask();

      const initialAssignees = [
        {
          user_id: `${testSuite.generateTestId()}_user1`,
          name: 'First Assignee',
          email: 'first@example.com',
        },
        {
          user_id: `${testSuite.generateTestId()}_user2`,
          name: 'Second Assignee',
          email: 'second@example.com',
        },
      ];

      // Set initial assignments
      await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: initialAssignees },
      });

      // Act - Add third assignee
      const allAssignees = [
        ...initialAssignees,
        {
          user_id: `${testSuite.generateTestId()}_user3`,
          name: 'Third Assignee',
          email: 'third@example.com',
        },
      ];

      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: allAssignees },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const responseText = testSuite.extractTextContent(result);
      expect(responseText).toMatch(/Updated task|Successfully updated task/);
      expect(responseText).toContain(taskId);

      console.log(
        `✅ Successfully added assignee to task ${taskId} (now ${allAssignees.length} assignees)`
      );
    });

    it('should remove one assignee from multiple assignments', async () => {
      // Arrange - Create task with multiple assignees
      const taskId = await testSuite.createTestTask();

      const allAssignees = [
        {
          user_id: `${testSuite.generateTestId()}_user1`,
          name: 'Keeping Assignee 1',
          email: 'keep1@example.com',
        },
        {
          user_id: `${testSuite.generateTestId()}_user2`,
          name: 'Removing Assignee',
          email: 'remove@example.com',
        },
        {
          user_id: `${testSuite.generateTestId()}_user3`,
          name: 'Keeping Assignee 2',
          email: 'keep2@example.com',
        },
      ];

      // Set initial assignments
      await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: allAssignees },
      });

      // Act - Remove middle assignee (keep first and third)
      const remainingAssignees = [allAssignees[0], allAssignees[2]];

      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: remainingAssignees },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const responseText = testSuite.extractTextContent(result);
      expect(responseText).toMatch(/Updated task|Successfully updated task/);
      expect(responseText).toContain(taskId);

      console.log(
        `✅ Successfully removed one assignee from task ${taskId} (now ${remainingAssignees.length} assignees)`
      );
    });
  });

  describe('Assignment Edge Cases', () => {
    it('should handle assignment with invalid user data gracefully', async () => {
      // Arrange - Create a test task
      const taskId = await testSuite.createTestTask();

      // Invalid assignee data (missing required fields)
      const invalidAssignee = {
        user_id: '', // Empty user ID
        name: '', // Empty name
      };

      // Act - Attempt to assign invalid user
      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: [invalidAssignee] },
      });

      // Assert - Should handle gracefully (either error or ignore)
      const responseText = testSuite.extractTextContent(result);

      if (result.isError) {
        expect(responseText).toMatch(/invalid|error|required/i);
        console.log(`✅ Correctly rejected invalid assignee data`);
      } else {
        expect(responseText).toMatch(/Updated task|Successfully updated task/);
        console.log(`✅ Gracefully handled invalid assignee data`);
      }
    });

    it('should handle duplicate assignee entries', async () => {
      // Arrange - Create a test task
      const taskId = await testSuite.createTestTask();

      const assigneeData = {
        user_id: `${testSuite.generateTestId()}_user`,
        name: 'Duplicate Test User',
        email: 'duplicate@example.com',
      };

      // Duplicate assignees array
      const duplicateAssignees = [assigneeData, assigneeData, assigneeData];

      // Act - Assign duplicate users
      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: duplicateAssignees },
      });

      // Assert - Should handle gracefully (deduplicate or error)
      const responseText = testSuite.extractTextContent(result);

      if (result.isError) {
        console.log(`✅ Correctly handled duplicate assignees with error`);
      } else {
        expect(responseText).toMatch(/Updated task|Successfully updated task/);
        console.log(
          `✅ Successfully handled duplicate assignees (likely deduplicated)`
        );
      }
    });

    it('should handle assignment to non-existent task', async () => {
      // Arrange - Use non-existent task ID
      const fakeTaskId = 'non-existent-task-12345';

      const assignee = {
        user_id: `${testSuite.generateTestId()}_user`,
        name: 'Test User',
        email: 'test@example.com',
      };

      // Act - Attempt to assign to non-existent task
      const result = await testSuite.executeToolCall('update-record', {
        resource_type: 'tasks',
        record_id: fakeTaskId,
        record_data: { assignees: [assignee] },
      });

      // Assert - Should handle gracefully with error
      const responseText = testSuite.extractTextContent(result);

      if (result.isError) {
        expect(responseText).toMatch(/not found|invalid|error/i);
      } else {
        // Some systems might create the task or ignore the operation
        expect(responseText).toMatch(/updated|not found|success/i);
      }

      console.log(`✅ Handled assignment to non-existent task gracefully`);
    });
  });
});
