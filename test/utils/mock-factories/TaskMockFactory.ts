/**
 * Task Mock Factory
 *
 * Generates mock AttioTask data for testing purposes.
 *
 * This factory handles the specific requirements for Issue #480:
 * - Provides both content and title fields for E2E test compatibility
 * - Ensures task_id is preserved in the ID structure
 * - Generates realistic task data matching API response format
 *
 * Replaces the hardcoded mock data previously embedded in production handlers.
 */

import type { AttioTask } from '../../../src/types/attio.js';
import { TestEnvironment } from './test-environment.js';
import { UUIDMockGenerator } from './uuid-mock-generator.js';

/**
 * Interface for mock task factory options
 */
export interface MockTaskOptions {
  content?: string;
  title?: string;
  status?: string;
  is_completed?: boolean;
  deadline_at?: string | null;
  due_date?: string | null;
  assignee_id?: string | null;
  assignees?: string[]; // plural variant used in some tests
  priority?: string; // allow priority in tests
  assignee?: AttioTask['assignee'];
  linked_record?: AttioTask['linked_records'];
  linked_records?: AttioTask['linked_records'];
  record_id?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

/**
 * Base mock factory interface that all resource mock factories implement
 */
export interface MockFactory<T> {
  create(overrides?: Partial<T>): T;
  createMultiple(count: number, overrides?: Partial<T>): T[];
  generateMockId(): string;
}

/**
 * TaskMockFactory - Generates mock AttioTask data for testing
 *
 * This factory provides Issue #480 compatibility by ensuring both
 * content and title fields are available, and task_id is properly preserved.
 *
 * @example
 * ```typescript
 * // Basic task
 * const task = TaskMockFactory.create();
 *
 * // Task with custom content
 * const customTask = TaskMockFactory.create({
 *   content: 'Custom task content',
 *   status: 'completed'
 * });
 *
 * // Multiple tasks
 * const tasks = TaskMockFactory.createMultiple(5);
 * ```
 */
export class TaskMockFactory implements MockFactory<AttioTask> {
  /**
   * Generates a unique mock task ID in UUID format
   *
   * Uses deterministic UUID generation for consistent performance testing
   * while satisfying UUID validation requirements (addresses PR #483).
   */
  static generateMockId(): string {
    // Use random UUID generation for unique IDs
    return UUIDMockGenerator.generateTaskUUID();
  }

  /**
   * Creates a mock AttioTask with a specific ID
   *
   * @param identifier - Unique identifier for deterministic UUID generation
   * @param overrides - Optional overrides for specific fields
   * @returns Mock AttioTask matching API response format
   */
  static createWithId(
    identifier: string,
    overrides: MockTaskOptions = {}
  ): AttioTask {
    const taskId = UUIDMockGenerator.generateTaskUUID(identifier);
    const now = new Date().toISOString();
    const content = overrides.content || overrides.title || 'Mock Task Content';

    // Issue #480: Generate both content and title for test compatibility
    // This ensures E2E tests that expect either field will work
    const baseTask: AttioTask = {
      id: {
        record_id: taskId,
        task_id: taskId, // Issue #480: Preserve task_id for E2E test compatibility
        workspace_id: 'mock-workspace-id',
      },
      content,
      status:
        overrides.status || (overrides.is_completed ? 'completed' : 'pending'),
      created_at: overrides.created_at || now,
      updated_at: overrides.updated_at || now,
    };

    // Handle optional fields
    if (overrides.deadline_at || overrides.due_date) {
      baseTask.deadline_at = overrides.deadline_at || overrides.due_date;
    }

    if (overrides.assignee_id || overrides.assignees) {
      // Handle both single assignee and array format
      if (overrides.assignees && Array.isArray(overrides.assignees)) {
        baseTask.assignees = overrides.assignees;
      } else if (overrides.assignee_id) {
        baseTask.assignees = [overrides.assignee_id as string];
      }
    }

    if (overrides.linked_records && Array.isArray(overrides.linked_records)) {
      baseTask.linked_records = overrides.linked_records;
    }

    TestEnvironment.log(`Created mock task: ${taskId}`, {
      content,
      status: baseTask.status,
      assignees: baseTask.assignees,
    });

    return baseTask;
  }

  /**
   * Creates a mock AttioTask with realistic data
   *
   * @param overrides - Optional overrides for specific fields
   * @returns Mock AttioTask matching API response format
   */
  static create(overrides: MockTaskOptions = {}): AttioTask {
    const taskId = this.generateMockId();
    const now = new Date().toISOString();
    const content = overrides.content || overrides.title || 'Mock Task Content';

    // Issue #480: Generate both content and title for test compatibility
    // This ensures E2E tests that expect either field will work
    const baseTask: AttioTask = {
      id: {
        record_id: taskId,
        task_id: taskId, // Issue #480: Preserve task_id for E2E test compatibility
        workspace_id: 'mock-workspace-id',
      },
      content,
      status:
        overrides.status || (overrides.is_completed ? 'completed' : 'pending'),
      created_at: overrides.created_at || now,
      updated_at: overrides.updated_at || now,
    };

    // Handle optional fields
    if (overrides.deadline_at || overrides.due_date) {
      const d = overrides.deadline_at || overrides.due_date || undefined;
      if (d !== undefined && d !== null) {
        baseTask.due_date = d as string;
      }
    }

    if (overrides.assignee_id || overrides.assignee) {
      if (overrides.assignee) {
        baseTask.assignee = overrides.assignee;
      } else if (overrides.assignee_id) {
        baseTask.assignee = {
          id: overrides.assignee_id,
          type: 'workspace_member',
          name: 'Mock Assignee',
          email: 'mock-assignee@example.com',
        };
      }
    }

    if (
      overrides.linked_records ||
      overrides.linked_record ||
      overrides.record_id
    ) {
      if (overrides.linked_records) {
        baseTask.linked_records = overrides.linked_records;
      } else if (overrides.linked_record) {
        baseTask.linked_records = overrides.linked_record;
      } else if (overrides.record_id) {
        baseTask.linked_records = [
          {
            id: overrides.record_id,
            object_id: 'mock-object',
            object_slug: 'companies',
            title: 'Mock Linked Record',
          },
        ];
      }
    }

    // Log mock creation in development/test environments
    TestEnvironment.log(`Created mock task: ${taskId}`, {
      content: baseTask.content,
      status: baseTask.status,
      hasAssignee: !!baseTask.assignee,
      hasLinkedRecords: !!baseTask.linked_records,
      dueDate: baseTask.due_date,
    });

    return baseTask;
  }

  /**
   * Creates multiple mock tasks
   *
   * @param count - Number of tasks to create
   * @param overrides - Optional overrides applied to all tasks
   * @returns Array of mock AttioTask objects
   */
  static createMultiple(
    count: number,
    overrides: MockTaskOptions = {}
  ): AttioTask[] {
    return Array.from({ length: count }, (_, index) => {
      const taskNumber = index + 1;
      return this.create({
        ...overrides,
        content: overrides.content || `Mock Task ${taskNumber}`,
        // Stagger due dates if not specified
        due_date:
          overrides.due_date ||
          overrides.deadline_at ||
          this.generateFutureDueDate(index),
      });
    });
  }

  /**
   * Creates a high priority task mock
   */
  static createHighPriority(overrides: MockTaskOptions = {}): AttioTask {
    return this.create({
      ...overrides,
      content: overrides.content || 'High Priority Mock Task',
      status: overrides.status || 'pending',
    });
  }

  /**
   * Creates a completed task mock
   */
  static createCompleted(overrides: MockTaskOptions = {}): AttioTask {
    return this.create({
      ...overrides,
      status: 'completed',
      is_completed: true,
    });
  }

  /**
   * Creates a task with assignee
   */
  static createWithAssignee(
    assigneeId: string,
    overrides: MockTaskOptions = {}
  ): AttioTask {
    return this.create({
      ...overrides,
      assignee_id: assigneeId,
      assignee: {
        id: assigneeId,
        type: 'workspace_member',
        name: `Mock Assignee ${assigneeId.slice(-4)}`,
        email: `assignee-${assigneeId.slice(-4)}@example.com`,
      },
    });
  }

  /**
   * Creates a task with linked records
   */
  static createWithLinkedRecords(
    recordIds: string[],
    overrides: MockTaskOptions = {}
  ): AttioTask {
    const linkedRecords = recordIds.map((recordId, index) => ({
      id: recordId,
      object_id: 'mock-object',
      object_slug: index % 2 === 0 ? 'companies' : 'people',
      title: `Mock Linked Record ${index + 1}`,
    }));

    return this.create({
      ...overrides,
      linked_records: linkedRecords,
    });
  }

  /**
   * Creates a task with due date in the past (overdue)
   */
  static createOverdue(overrides: MockTaskOptions = {}): AttioTask {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

    return this.create({
      ...overrides,
      due_date: pastDate.toISOString().split('T')[0],
      status: overrides.status || 'pending',
    });
  }

  /**
   * Creates minimal task for edge case testing
   */
  static createMinimal(overrides: MockTaskOptions = {}): AttioTask {
    return this.create({
      content: 'Minimal Mock Task',
      ...overrides,
    });
  }

  /**
   * Implementation of MockFactory interface
   */
  create(overrides: MockTaskOptions = {}): AttioTask {
    return TaskMockFactory.create(overrides);
  }

  createMultiple(count: number, overrides: MockTaskOptions = {}): AttioTask[] {
    return TaskMockFactory.createMultiple(count, overrides);
  }

  generateMockId(): string {
    return TaskMockFactory.generateMockId();
  }

  /**
   * Private helper to generate future due dates
   */
  private static generateFutureDueDate(offset: number = 0): string {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + offset + 1); // Start from tomorrow
    return futureDate.toISOString().split('T')[0];
  }
}

/**
 * Convenience export for direct usage
 */
export default TaskMockFactory;
