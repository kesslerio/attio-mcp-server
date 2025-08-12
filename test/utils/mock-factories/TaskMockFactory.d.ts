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
    assignee?: AttioTask['assignee'];
    linked_record?: AttioTask['linked_records'];
    linked_records?: AttioTask['linked_records'];
    record_id?: string | null;
    created_at?: string;
    updated_at?: string;
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
export declare class TaskMockFactory implements MockFactory<AttioTask> {
    /**
     * Generates a unique mock task ID
     */
    static generateMockId(): string;
    /**
     * Creates a mock AttioTask with realistic data
     *
     * @param overrides - Optional overrides for specific fields
     * @returns Mock AttioTask matching API response format
     */
    static create(overrides?: MockTaskOptions): AttioTask;
    /**
     * Creates multiple mock tasks
     *
     * @param count - Number of tasks to create
     * @param overrides - Optional overrides applied to all tasks
     * @returns Array of mock AttioTask objects
     */
    static createMultiple(count: number, overrides?: MockTaskOptions): AttioTask[];
    /**
     * Creates a high priority task mock
     */
    static createHighPriority(overrides?: MockTaskOptions): AttioTask;
    /**
     * Creates a completed task mock
     */
    static createCompleted(overrides?: MockTaskOptions): AttioTask;
    /**
     * Creates a task with assignee
     */
    static createWithAssignee(assigneeId: string, overrides?: MockTaskOptions): AttioTask;
    /**
     * Creates a task with linked records
     */
    static createWithLinkedRecords(recordIds: string[], overrides?: MockTaskOptions): AttioTask;
    /**
     * Creates a task with due date in the past (overdue)
     */
    static createOverdue(overrides?: MockTaskOptions): AttioTask;
    /**
     * Creates minimal task for edge case testing
     */
    static createMinimal(overrides?: MockTaskOptions): AttioTask;
    /**
     * Implementation of MockFactory interface
     */
    create(overrides?: MockTaskOptions): AttioTask;
    createMultiple(count: number, overrides?: MockTaskOptions): AttioTask[];
    generateMockId(): string;
    /**
     * Private helper to generate future due dates
     */
    private static generateFutureDueDate;
}
/**
 * Convenience export for direct usage
 */
export default TaskMockFactory;
//# sourceMappingURL=TaskMockFactory.d.ts.map