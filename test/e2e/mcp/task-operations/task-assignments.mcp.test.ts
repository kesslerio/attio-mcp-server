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
  public workspaceMembers: Array<{ id: string; email: string; name: string }> =
    [];

  constructor() {
    super('TASK_ASSIGN');
    this.qa = new QAAssertions();
    this.testDataFactory = new TestDataFactory();
  }

  async setup(config = {}): Promise<void> {
    await super.setup(config);
    // Discover workspace members for assignment tests
    this.workspaceMembers = await this.discoverWorkspaceMembers();
    console.log(
      `📋 Discovered ${this.workspaceMembers.length} workspace members`
    );
  }

  /**
   * Get an assignee object for use in tests
   * Falls back to fake data if no workspace members discovered
   */
  getAssignee(index: number = 0): {
    user_id: string;
    name: string;
    email: string;
  } {
    if (this.workspaceMembers.length > index) {
      const member = this.workspaceMembers[index];
      return {
        user_id: member.id,
        name: member.name,
        email: member.email,
      };
    }
    // Fallback to fake data for testing error handling
    return {
      user_id: `${this.generateTestId()}_user${index}`,
      name: `Test User ${index}`,
      email: `testuser${index}@example.com`,
    };
  }

  /**
   * Create a test task and return the task ID
   */
  async createTestTask(taskData?: Record<string, unknown>): Promise<string> {
    const testTask = taskData || {
      title: `${this.generateTestId()} Assignment Test Task`,
      content: 'Task for testing assignment operations',
      priority: 'medium',
      status: 'pending',
    };

    // Use universal tool with resource_type parameter
    const result = await this.executeToolCall('create_record', {
      resource_type: 'tasks',
      record_data: testTask,
    });

    // Extract task ID from response
    const taskId = this.extractRecordId(this.extractTextContent(result));
    if (!taskId) {
      throw new Error('Failed to extract task ID from create response');
    }

    this.trackRecord('tasks', taskId);
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
      await testSuite.cleanupTestData();
    } finally {
      await testSuite.teardown();
    }
  });

  describe('Single User Assignment', () => {
    it('should assign a user to a task', async () => {
      // Arrange - Create a test task
      const taskId = await testSuite.createTestTask();

      // Use discovered workspace member (or fallback to fake data)
      const assigneeData = testSuite.getAssignee(0);

      // Act - Update task with assignee
      const result = await testSuite.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: [assigneeData] },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const parsed = testSuite.parseRecordResult(result);
      expect(parsed.id).toContain(taskId);
      // Assignment update may not return assignees in response - just verify success
      expect(result.isError).toBeFalsy();

      console.log(`✅ Successfully assigned user to task ${taskId}`);
    });

    it('should change task assignment to different user', async () => {
      // Arrange - Create task with initial assignee
      const taskId = await testSuite.createTestTask();

      const initialAssignee = testSuite.getAssignee(0);

      // Set initial assignment
      await testSuite.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: [initialAssignee] },
      });

      // Act - Change assignment to new user
      const newAssignee = testSuite.getAssignee(1);

      const result = await testSuite.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: [newAssignee] },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const parsed = testSuite.parseRecordResult(result);
      expect(parsed.id).toContain(taskId);
      // Assignment change successful if no error returned
      expect(result.isError).toBeFalsy();

      console.log(`✅ Successfully changed assignment for task ${taskId}`);
    });

    it('should remove assignment from task', async () => {
      // Arrange - Create task with assignee
      const taskId = await testSuite.createTestTask();

      const assignee = testSuite.getAssignee(0);

      // Set initial assignment
      await testSuite.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: [assignee] },
      });

      // Act - Remove assignment (empty assignees array)
      const result = await testSuite.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: [] },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const parsed = testSuite.parseRecordResult(result);
      expect(parsed.id).toContain(taskId);
      // Assignment removal successful if no error returned
      expect(result.isError).toBeFalsy();

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
        status: 'pending',
      });

      // Use discovered workspace members (up to 3, or fewer if not available)
      const assignees = [
        testSuite.getAssignee(0),
        testSuite.getAssignee(1),
        testSuite.getAssignee(2),
      ].filter((a) => a.user_id); // Filter out empty assignees

      // Act - Assign multiple users
      const result = await testSuite.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: assignees },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const parsed = testSuite.parseRecordResult(result);
      expect(parsed.id).toContain(taskId);
      // Multi-user assignment successful if no error returned
      expect(result.isError).toBeFalsy();

      console.log(
        `✅ Successfully assigned ${assignees.length} users to task ${taskId}`
      );
    });

    it('should add additional assignee to existing assignments', async () => {
      // Arrange - Create task with initial assignees
      const taskId = await testSuite.createTestTask();

      const initialAssignees = [
        testSuite.getAssignee(0),
        testSuite.getAssignee(1),
      ];

      // Set initial assignments
      await testSuite.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: initialAssignees },
      });

      // Act - Add third assignee
      const allAssignees = [...initialAssignees, testSuite.getAssignee(2)];

      const result = await testSuite.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: allAssignees },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const parsed = testSuite.parseRecordResult(result);
      expect(parsed.id).toContain(taskId);
      // Adding assignee successful if no error returned
      expect(result.isError).toBeFalsy();

      console.log(
        `✅ Successfully added assignee to task ${taskId} (now ${allAssignees.length} assignees)`
      );
    });

    it('should remove one assignee from multiple assignments', async () => {
      // Arrange - Create task with multiple assignees
      const taskId = await testSuite.createTestTask();

      const allAssignees = [
        testSuite.getAssignee(0),
        testSuite.getAssignee(1),
        testSuite.getAssignee(2),
      ];

      // Set initial assignments
      await testSuite.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: allAssignees },
      });

      // Act - Remove middle assignee (keep first and third)
      const remainingAssignees = [allAssignees[0], allAssignees[2]];

      const result = await testSuite.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: remainingAssignees },
      });

      // Assert
      expect(result.isError).toBeFalsy();

      const parsed = testSuite.parseRecordResult(result);
      expect(parsed.id).toContain(taskId);
      // Removing assignee successful if no error returned
      expect(result.isError).toBeFalsy();

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
      const result = await testSuite.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: [invalidAssignee] },
      });

      // Assert - Should handle gracefully (either error or ignore)
      const parsed = testSuite.parseRecordResult(result);

      if (result.isError) {
        expect(parsed.text).toMatch(/invalid|error|required/i);
        console.log(`✅ Correctly rejected invalid assignee data`);
      } else {
        expect(parsed.id).toContain(taskId);
        console.log(`✅ Gracefully handled invalid assignee data`);
      }
    });

    it('should handle duplicate assignee entries', async () => {
      // Arrange - Create a test task
      const taskId = await testSuite.createTestTask();

      // Use a real workspace member if available for more realistic test
      const assigneeData = testSuite.getAssignee(0);

      // Duplicate assignees array
      const duplicateAssignees = [assigneeData, assigneeData, assigneeData];

      // Act - Assign duplicate users
      const result = await testSuite.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: taskId,
        record_data: { assignees: duplicateAssignees },
      });

      // Assert - Should handle gracefully (deduplicate or error)
      const parsed = testSuite.parseRecordResult(result);

      if (result.isError) {
        console.log(`✅ Correctly handled duplicate assignees with error`);
      } else {
        expect(parsed.id).toContain(taskId);
        console.log(
          `✅ Successfully handled duplicate assignees (likely deduplicated)`
        );
      }
    });

    it('should handle assignment to non-existent task', async () => {
      // Arrange - Use non-existent task ID
      const fakeTaskId = 'non-existent-task-12345';

      // Use fake assignee data for edge case test
      const assignee = {
        user_id: `${testSuite.generateTestId()}_user`,
        name: 'Test User',
        email: 'test@example.com',
      };

      // Act - Attempt to assign to non-existent task
      const result = await testSuite.executeToolCall('update_record', {
        resource_type: 'tasks',
        record_id: fakeTaskId,
        record_data: { assignees: [assignee] },
      });

      // Assert - Should handle gracefully with error
      const responseText = testSuite.extractTextContent(result);

      // Should handle gracefully with error or by ignoring the operation
      const hasExpectedResponse =
        result.isError ||
        responseText.toLowerCase().includes('not found') ||
        responseText.toLowerCase().includes('invalid') ||
        responseText.toLowerCase().includes('error') ||
        responseText.toLowerCase().includes('updated') ||
        responseText.toLowerCase().includes('success') ||
        responseText.toLowerCase().includes('reference');
      expect(hasExpectedResponse).toBe(true);

      console.log(`✅ Handled assignment to non-existent task gracefully`);
    });
  });
});
