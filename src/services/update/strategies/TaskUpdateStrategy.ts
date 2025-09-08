/**
 * TaskUpdateStrategy - Handles task-specific update logic
 * 
 * CRITICAL: Maintains mock support compatibility (Issue #480)
 * Extracted from UniversalUpdateService lines ~400-700
 */

import { BaseUpdateStrategy, UpdateStrategyParams, UpdateStrategyResult } from './BaseUpdateStrategy.js';
import { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import { AttioTask, AttioRecord } from '../../../types/attio.js';
import { shouldUseMockData, getCreateService } from '../../create/index.js';
import { mapTaskFields } from '../../../handlers/tool-configs/universal/field-mapper.js';
import { getTask } from '../../../objects/tasks.js';
import { FilterValidationError } from '../../../errors/api-errors.js';
import { UniversalUtilityService } from '../../UniversalUtilityService.js';
import { debug } from '../../../utils/logger.js';

export class TaskUpdateStrategy extends BaseUpdateStrategy {
  constructor() {
    super(UniversalResourceType.TASKS);
  }

  async update(params: UpdateStrategyParams): Promise<UpdateStrategyResult> {
    const { record_id, mapped_data, persist_unlisted_fields } = params;
    
    // Early input validation - check for forbidden content fields BEFORE existence check
    this.validateNoForbiddenContent(mapped_data);
    
    // Fetch existing task if field persistence is needed or for validation
    const existingTask = await this.fetchExistingRecord(record_id);
    
    // Validate update permissions (task existence and immutability)
    await this.validateUpdatePermissions(record_id, mapped_data);
    
    // Apply task-specific field mapping and formatting
    const taskData = this.formatForAPI(mapped_data, existingTask);
    
    // Merge with existing fields if needed
    const finalData = await this.mergeWithExistingFields(
      taskData,
      existingTask,
      persist_unlisted_fields || false
    );
    
    // Execute update using mock-aware update function
    const updatedTask = await this.updateTaskWithMockSupport(record_id, finalData);
    
    debug('Task updated successfully', {
      task_id: record_id,
      updated_fields: Object.keys(finalData)
    });

    return {
      record: updatedTask,
      metadata: {
        updated_fields: this.identifyUpdatedFields(
          existingTask || {},
          updatedTask
        )
      }
    };
  }

  protected async fetchExistingRecord(record_id: string): Promise<AttioRecord | null> {
    try {
      if (shouldUseMockData()) {
        // In mock mode, simulate task existence
        return null; // Let mock service handle it
      }
      
      const task = await getTask(record_id);
      return UniversalUtilityService.convertTaskToRecord(task);
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  protected async validateUpdatePermissions(
    record_id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // Check task existence only in non-mock mode
    if (!shouldUseMockData()) {
      const exists = await this.fetchExistingRecord(record_id);
      if (!exists) {
        throw {
          status: 404,
          body: {
            code: 'not_found',
            message: `Task record with ID "${record_id}" not found.`
          }
        };
      }
    }
    
    // Check for immutable content fields - this applies regardless of mock mode
    if (this.hasForbiddenContent(data)) {
      throw new FilterValidationError(
        'Task content cannot be updated after creation. Content is immutable in the Attio API.'
      );
    }
  }

  protected formatForAPI(
    data: Record<string, unknown>,
    existingRecord?: AttioRecord | null
  ): Record<string, unknown> {
    // Transform mapped fields for task update
    const taskUpdateData: Record<string, unknown> = {};
    
    // Handle status field - updateTask function expects 'status' field, not 'is_completed'
    if (data.is_completed !== undefined) {
      taskUpdateData.status = data.is_completed ? 'completed' : 'pending';
    } else if (data.status !== undefined) {
      taskUpdateData.status = data.status;
    }
    
    // Handle assignee field
    if (data.assignees !== undefined) {
      const value = data.assignees as any;
      let assigneeId: string | undefined;
      
      if (Array.isArray(value)) {
        const first = value[0];
        if (typeof first === 'string') {
          assigneeId = first;
        } else if (first && typeof first === 'object') {
          assigneeId = (first as any).referenced_actor_id ||
                      (first as any).id ||
                      (first as any).record_id ||
                      (first as any).value;
        }
      } else if (typeof value === 'string') {
        assigneeId = value;
      } else if (value && typeof value === 'object') {
        assigneeId = (value as any).referenced_actor_id ||
                    (value as any).id ||
                    (value as any).record_id ||
                    (value as any).value;
      }
      
      if (assigneeId) {
        taskUpdateData.assignee_id = assigneeId;
      }
    }
    
    // Handle deadline field
    if (data.deadline_at !== undefined) {
      taskUpdateData.deadline_at = data.deadline_at;
    }
    
    // Handle due_date field (alternative to deadline_at)
    if (data.due_date !== undefined) {
      taskUpdateData.due_date = data.due_date;
    }
    
    // Handle priority field
    if (data.priority !== undefined) {
      taskUpdateData.priority = data.priority;
    }
    
    // Pass through other valid fields
    const validFields = ['title', 'description', 'notes'];
    validFields.forEach(field => {
      if (data[field] !== undefined) {
        taskUpdateData[field] = data[field];
      }
    });
    
    return taskUpdateData;
  }

  /**
   * Task update with mock support - uses production MockService
   * Moved from UniversalUpdateService to maintain mock compatibility
   */
  private async updateTaskWithMockSupport(
    taskId: string,
    updateData: Record<string, unknown>
  ): Promise<AttioRecord> {
    // Prefer mock path whenever mock/offline data is enabled
    if (
      shouldUseMockData() ||
      process.env.VITEST === 'true' ||
      process.env.NODE_ENV === 'test'
    ) {
      const { MockService } = await import('../../MockService.js');
      return await MockService.updateTask(taskId, updateData);
    }
    
    // Otherwise, use the real service
    const service = getCreateService();
    return await service.updateTask(taskId, updateData);
  }

  /**
   * Check if data contains forbidden content fields (immutable)
   */
  private hasForbiddenContent(values: Record<string, unknown>): boolean {
    if (!values || typeof values !== 'object') {
      return false;
    }
    const forbidden = ['content', 'content_markdown', 'content_plaintext'];
    return forbidden.some((field) => field in values);
  }

  /**
   * Validate no forbidden content fields in input
   */
  private validateNoForbiddenContent(data: Record<string, unknown>): void {
    if (this.hasForbiddenContent(data)) {
      throw new FilterValidationError(
        'Task content cannot be updated after creation. Content is immutable in the Attio API.'
      );
    }
  }
}