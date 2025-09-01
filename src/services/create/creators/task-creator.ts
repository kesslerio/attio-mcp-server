/**
 * TaskCreator - Strategy implementation for task resource creation
 * 
 * Handles task-specific creation logic by delegating to the existing tasks
 * object and converting the result to AttioRecord format.
 */

import type { AttioRecord } from '../../../types/attio.js';
import type { ResourceCreatorContext } from './types.js';
import { BaseCreator } from './base-creator.js';
import { convertTaskToAttioRecord } from '../data-normalizers.js';

/**
 * Task-specific resource creator
 * Implements Strategy Pattern for task creation via delegation
 */
export class TaskCreator extends BaseCreator {
  readonly resourceType = 'tasks';
  readonly endpoint = '/objects/tasks/records';

  /**
   * Creates a task record via delegation to tasks object
   * 
   * @param input - Task data including content, assigneeId, dueDate, recordId, etc.
   * @param context - Shared context with client and utilities
   * @returns Promise<AttioRecord> - Created task record in AttioRecord format
   */
  async create(
    input: Record<string, unknown>,
    context: ResourceCreatorContext
  ): Promise<AttioRecord> {
    context.debug(this.constructor.name, '🔍 Task creation input', {
      content: input.content,
      assigneeId: input.assigneeId,
      dueDate: input.dueDate,
      recordId: input.recordId,
    });

    try {
      // Delegate to the tasks object for now, this will be refactored later
      const { createTask } = await import('../../../objects/tasks.js');
      
      const createdTask = await createTask(input.content as string, {
        assigneeId: input.assigneeId as string,
        dueDate: input.dueDate as string,
        recordId: input.recordId as string,
      });

      context.debug(this.constructor.name, 'Task creation response', {
        hasTask: !!createdTask,
        taskId: createdTask?.id,
        taskKeys: createdTask ? Object.keys(createdTask) : [],
      });

      // Convert task to AttioRecord format
      const record = convertTaskToAttioRecord(createdTask, input);

      context.debug(this.constructor.name, 'Converted task record', {
        recordId: (record as any)?.id?.record_id,
        resourceType: record.resource_type,
      });

      return record;
    } catch (err: any) {
      context.logError(this.constructor.name, 'Task creation error', {
        error: err?.message,
        input,
      });

      this.handleApiError(err, context, input);
    }
  }

  /**
   * Tasks don't require input normalization beyond what's in the input
   */
  protected normalizeInput(input: Record<string, unknown>): Record<string, unknown> {
    return input;
  }

  /**
   * Tasks use delegation, so no direct recovery needed
   * The tasks object handles its own error cases
   */
  protected getRecoveryOptions(): null {
    return null;
  }

  /**
   * Override attemptRecovery to handle delegation approach
   */
  protected async attemptRecovery(context: ResourceCreatorContext): Promise<any> {
    // Tasks are handled via delegation, so no direct recovery needed
    throw this.createEnhancedError(
      new Error('Task creation failed via delegation - no recovery available'),
      context,
      500
    );
  }
}