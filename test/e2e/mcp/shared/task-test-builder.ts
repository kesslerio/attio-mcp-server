/**
 * TaskTestBuilder - Utility for consistent task creation in tests
 * Provides a fluent interface for building test tasks with proper defaults and validation
 */

import {
  TASK_CONSTRAINTS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TEST_CONFIG,
  type TaskPriority,
  type TaskStatus,
} from './constants.js';

export interface TestTaskData {
  title: string;
  content: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string;
  assignees?: Array<{
    user_id: string;
    name: string;
    email?: string;
  }>;
  [key: string]: unknown;
}

export class TaskTestBuilder {
  private taskData: TestTaskData;
  private testIdGenerator: () => string;

  constructor(testIdGenerator: () => string) {
    this.testIdGenerator = testIdGenerator;
    this.taskData = {
      title: '',
      content: '',
    };
  }

  /**
   * Set task title with automatic test ID prefix if not provided
   */
  withTitle(title: string): this {
    this.taskData.title = title.includes(TEST_CONFIG.TEST_ID_PREFIX)
      ? title
      : `${this.testIdGenerator()} ${title}`;
    return this;
  }

  /**
   * Set task content/description
   */
  withContent(content: string): this {
    this.taskData.content = content;
    return this;
  }

  /**
   * Set task priority with validation
   */
  withPriority(priority: TaskPriority): this {
    if (!TASK_PRIORITIES.includes(priority)) {
      throw new Error(
        `Invalid priority: ${priority}. Must be one of: ${TASK_PRIORITIES.join(', ')}`
      );
    }
    this.taskData.priority = priority;
    return this;
  }

  /**
   * Set task status with validation
   */
  withStatus(status: TaskStatus): this {
    if (!TASK_STATUSES.includes(status)) {
      throw new Error(
        `Invalid status: ${status}. Must be one of: ${TASK_STATUSES.join(', ')}`
      );
    }
    this.taskData.status = status;
    return this;
  }

  /**
   * Set due date (accepts Date object or ISO string)
   */
  withDueDate(date: Date | string): this {
    this.taskData.due_date =
      date instanceof Date ? date.toISOString().split('T')[0] : date;
    return this;
  }

  /**
   * Set due date relative to today
   */
  withDueDateInDays(days: number): this {
    this.taskData.due_date =
      days > 0
        ? TEST_CONFIG.DAYS_IN_FUTURE(days)
        : TEST_CONFIG.DAYS_IN_PAST(Math.abs(days));
    return this;
  }

  /**
   * Add a single assignee
   */
  withAssignee(user_id: string, name: string, email?: string): this {
    if (!this.taskData.assignees) {
      this.taskData.assignees = [];
    }
    this.taskData.assignees.push({ user_id, name, email });
    return this;
  }

  /**
   * Add multiple assignees
   */
  withAssignees(
    assignees: Array<{ user_id: string; name: string; email?: string }>
  ): this {
    this.taskData.assignees = assignees;
    return this;
  }

  /**
   * Add custom field (for testing edge cases)
   */
  withCustomField(key: string, value: unknown): this {
    this.taskData[key] = value;
    return this;
  }

  /**
   * Build the final task data object
   */
  build(): TestTaskData {
    // Validate required fields
    if (!this.taskData.title) {
      throw new Error('Task title is required');
    }
    if (!this.taskData.content) {
      throw new Error('Task content is required');
    }

    return { ...this.taskData };
  }

  /**
   * Static factory methods for common task types
   */

  /**
   * Create a minimal valid task
   */
  static minimal(testIdGenerator: () => string): TaskTestBuilder {
    return new TaskTestBuilder(testIdGenerator)
      .withTitle('Minimal Test Task')
      .withContent('Basic task for testing minimal requirements');
  }

  /**
   * Create a sales task
   */
  static sales(testIdGenerator: () => string): TaskTestBuilder {
    return new TaskTestBuilder(testIdGenerator)
      .withTitle('Sales Follow-up Task')
      .withContent('Follow up with prospect about the proposal')
      .withPriority('high')
      .withStatus('open');
  }

  /**
   * Create a development task
   */
  static development(testIdGenerator: () => string): TaskTestBuilder {
    return new TaskTestBuilder(testIdGenerator)
      .withTitle('Fix Critical Bug')
      .withContent('Investigate and resolve critical system issue')
      .withPriority('critical')
      .withStatus('in_progress');
  }

  /**
   * Create a marketing task
   */
  static marketing(testIdGenerator: () => string): TaskTestBuilder {
    return new TaskTestBuilder(testIdGenerator)
      .withTitle('Launch Email Campaign')
      .withContent('Create and launch Q4 email marketing campaign')
      .withPriority('medium')
      .withStatus('scheduled');
  }

  /**
   * Create a task with edge case data
   */
  static edgeCase(testIdGenerator: () => string): TaskTestBuilder {
    return new TaskTestBuilder(testIdGenerator)
      .withTitle('Edge Case™ Task "Special" #123')
      .withContent('Task with special characters: áéíóú ñ çß 🚀 测试')
      .withPriority('low')
      .withStatus('open');
  }

  /**
   * Create a workflow test task
   */
  static workflow(testIdGenerator: () => string): TaskTestBuilder {
    return new TaskTestBuilder(testIdGenerator)
      .withTitle('Workflow Test Task')
      .withContent(
        'Task for testing workflow operations and status transitions'
      )
      .withPriority('medium')
      .withStatus('open')
      .withDueDateInDays(7);
  }

  /**
   * Create an assignment test task
   */
  static assignment(testIdGenerator: () => string): TaskTestBuilder {
    return new TaskTestBuilder(testIdGenerator)
      .withTitle('Assignment Test Task')
      .withContent('Task for testing user assignment operations')
      .withPriority('medium')
      .withStatus('open');
  }
}

/**
 * Convenience function for creating task builders
 */
export function createTaskBuilder(
  testIdGenerator: () => string
): TaskTestBuilder {
  return new TaskTestBuilder(testIdGenerator);
}

/**
 * Type guard to check if task data has required fields
 */
export function isValidTaskData(data: unknown): data is TestTaskData {
  if (!data || typeof data !== 'object') return false;

  const task = data as Record<string, unknown>;
  return (
    typeof task.title === 'string' &&
    typeof task.content === 'string' &&
    task.title.length > 0 &&
    task.content.length > 0
  );
}
