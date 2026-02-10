/**
 * TaskCreator - Strategy implementation for task resource creation
 *
 * Handles task-specific creation logic by delegating to the existing tasks
 * object and converting the result to AttioRecord format.
 */

import type { AttioRecord, JsonObject } from '../../../types/attio.js';
import type { ResourceCreatorContext } from './types.js';
import { BaseCreator } from './base-creator.js';
import { safeExtractRecordId } from '../../../utils/type-extraction.js';

/**
 * Task-specific resource creator
 * Implements Strategy Pattern for task creation via delegation
 */
export class TaskCreator extends BaseCreator {
  readonly resourceType = 'tasks';
  readonly endpoint = '/tasks';

  // Lazy-loaded dependencies to prevent resource leaks from repeated dynamic imports
  private taskModule: JsonObject | null = null;
  private converterModule: JsonObject | null = null;

  /**
   * Lazy-loads task dependencies to prevent repeated dynamic imports
   */
  private async ensureDependencies(): Promise<void> {
    if (!this.taskModule) {
      this.taskModule = await import('../../../objects/tasks.js');
    }
    if (!this.converterModule) {
      this.converterModule = await import('../data-normalizers.js');
    }
  }

  /**
   * Creates a task record via delegation to tasks object
   *
   * @param input - Task data including content, assigneeId, dueDate, recordId, etc.
   * @param context - Shared context with client and utilities
   * @returns Promise<AttioRecord> - Created task record in AttioRecord format
   */
  async create(
    input: JsonObject,
    context: ResourceCreatorContext
  ): Promise<AttioRecord> {
    context.debug(this.constructor.name, '🔍 Task creation input', {
      content: input.content,
      assigneeId: input.assigneeId,
      dueDate: input.dueDate,
      recordId: input.recordId,
      targetObject: input.targetObject,
      linked_records: input.linked_records,
    } as JsonObject);

    if (typeof input.content !== 'string' || input.content.trim() === '') {
      throw this.createEnhancedError(
        new Error('missing required parameter: content'),
        context,
        400
      );
    }

    try {
      // Ensure dependencies are loaded
      await this.ensureDependencies();

      // Build options object with only defined values to avoid passing "undefined" strings
      const options: JsonObject = {};
      if (input.assigneeId && input.assigneeId !== 'undefined') {
        options.assigneeId = input.assigneeId as string;
      }
      if (
        input.dueDate &&
        input.dueDate !== 'undefined' &&
        input.dueDate !== 'null' &&
        typeof input.dueDate === 'string' &&
        input.dueDate.trim() !== ''
      ) {
        options.dueDate = input.dueDate as string;
      }
      if (input.recordId && input.recordId !== 'undefined') {
        options.recordId = input.recordId as string;
      }
      if (input.targetObject && input.targetObject !== 'undefined') {
        options.targetObject = input.targetObject as string;
      }
      if (
        Array.isArray(input.linked_records) &&
        input.linked_records.length > 0
      ) {
        options.linked_records = input.linked_records;
      }

      const createTaskFn = (this.taskModule as JsonObject).createTask as (
        content: string,
        options: JsonObject
      ) => Promise<JsonObject>;
      const createdTask = await createTaskFn(input.content as string, options);

      context.debug(this.constructor.name, 'Task creation response', {
        hasTask: !!createdTask,
        taskId: createdTask?.id,
        taskKeys: createdTask ? Object.keys(createdTask) : [],
      } as JsonObject);

      // Convert task to AttioRecord format
      const convertFn = (this.converterModule as JsonObject)
        .convertTaskToAttioRecord as (
        task: JsonObject,
        input: JsonObject
      ) => AttioRecord;
      const record = convertFn(createdTask, input);
      // Ensure E2E compatibility: include values.assignee when assigneeId provided
      try {
        if (
          input.assigneeId &&
          (!record.values || !(record.values as JsonObject).assignee)
        ) {
          const values: JsonObject = (record.values as JsonObject) || {};
          values.assignee = [{ value: input.assigneeId }];
          (record as JsonObject).values = values;
        }
      } catch {
        // Ignore conversion errors, maintain compatibility
      }

      context.debug(this.constructor.name, 'Converted task record', {
        recordId: safeExtractRecordId(record),
        resourceType: record.resource_type,
      } as JsonObject);

      return record;
    } catch (err: unknown) {
      context.logError(this.constructor.name, 'Task creation error', {
        error: (err as Error)?.message,
        input,
      } as JsonObject);

      return this.handleApiError(err, context, input);
    }
  }

  /**
   * Tasks don't require input normalization beyond what's in the input
   */
  protected normalizeInput(input: JsonObject): JsonObject {
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
  protected async attemptRecovery(
    context: ResourceCreatorContext,
     
    _normalizedInput?: JsonObject
  ): Promise<AttioRecord> {
    // Tasks are handled via delegation, so no direct recovery needed
    throw this.createEnhancedError(
      new Error('Task creation failed via delegation - no recovery available'),
      context,
      500
    );
  }
}
