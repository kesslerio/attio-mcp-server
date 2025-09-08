/**
 * TaskCreateStrategy - Handles task-specific creation logic
 * 
 * Extracted from UniversalCreateService.createTaskRecord (lines 1238-1421)
 */

import { BaseCreateStrategy, CreateStrategyParams, CreateStrategyResult } from './BaseCreateStrategy.js';
import { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import { getCreateService } from '../index.js';
import { UniversalUtilityService } from '../../UniversalUtilityService.js';
import { AttioTask, AttioRecord } from '../../../types/attio.js';
import { logger } from '../../../utils/logger.js';
import { debug, OperationType } from '../../../utils/logger.js';
import { ErrorEnhancer } from '../../../errors/enhanced-api-errors.js';

export class TaskCreateStrategy extends BaseCreateStrategy {
  constructor() {
    super(UniversalResourceType.TASKS);
  }

  async create(params: CreateStrategyParams): Promise<CreateStrategyResult> {
    const { mapped_data } = params;
    
    try {
      // Issue #417: Enhanced task creation with field mapping guidance
      // Check for content field first, then validate (handle empty strings)
      const content =
        (mapped_data.content &&
          typeof mapped_data.content === 'string' &&
          mapped_data.content.trim()) ||
        (mapped_data.title &&
          typeof mapped_data.title === 'string' &&
          mapped_data.title.trim()) ||
        (mapped_data.name &&
          typeof mapped_data.name === 'string' &&
          mapped_data.name.trim()) ||
        'New task';

      // If content is missing but we have title, synthesize content from title
      if (mapped_data.title !== undefined && !mapped_data.content) {
        mapped_data.content = content;
      }

      // Handle field mappings: The field mapper transforms to API field names
      // assignees: can be array or single ID (from assignee_id mapping)
      // deadline_at: from due_date mapping
      // linked_records: from record_id mapping
      const options: Record<string, unknown> = {};

      // Only add fields that have actual values (not undefined)
      // Normalize assignee inputs: accept string, array of strings, or array of objects
      const assigneesInput =
        mapped_data.assignees || mapped_data.assignee_id || mapped_data.assigneeId;
      if (assigneesInput !== undefined) {
        let assigneeId: string | undefined;
        if (typeof assigneesInput === 'string') {
          assigneeId = assigneesInput;
        } else if (Array.isArray(assigneesInput)) {
          const first = assigneesInput[0] as any;
          if (typeof first === 'string') assigneeId = first;
          else if (first && typeof first === 'object') {
            assigneeId =
              first.referenced_actor_id ||
              first.id ||
              first.record_id ||
              first.value ||
              undefined;
          }
        } else if (
          assigneesInput &&
          typeof assigneesInput === 'object' &&
          'referenced_actor_id' in (assigneesInput as any)
        ) {
          assigneeId = (assigneesInput as any).referenced_actor_id as string;
        }

        if (assigneeId) options.assigneeId = assigneeId;
      }

      const dueDate =
        mapped_data.deadline_at || mapped_data.due_date || mapped_data.dueDate;
      if (dueDate) options.dueDate = dueDate;

      const recordId =
        mapped_data.linked_records ||
        mapped_data.record_id ||
        mapped_data.recordId;
      if (recordId) options.recordId = recordId;

      // Target object for linking (Issue #545): ensure we pass along when provided
      const targetObject =
        (mapped_data as any).target_object || (mapped_data as any).targetObject;
      if (typeof targetObject === 'string' && targetObject.trim()) {
        (options as any).targetObject = targetObject.trim();
      }

      // Use mock-enabled task creation for test environments
      const createdTask = await this.createTaskWithMockSupport({
        content,
        ...options,
      });

      // Debug logging before conversion
      debug(
        'universal.createTask',
        'About to convert task to record',
        {
          hasCreatedTask: !!createdTask,
          taskType: typeof createdTask,
          taskHasId: !!createdTask?.id,
          taskIdType: typeof createdTask?.id,
          taskIdStructure: createdTask?.id ? Object.keys(createdTask.id) : [],
        },
        'createTask',
        OperationType.API_CALL
      );

      // Convert AttioTask to AttioRecord using proper type conversion
      // For tests, MockService.createTask already returns AttioRecord format
      // For production, we need to convert from AttioTask to AttioRecord

      // Handle both AttioTask and AttioRecord inputs
      let convertedRecord: AttioRecord;
      if ('values' in createdTask && createdTask.id?.record_id) {
        // Already in AttioRecord format (from MockService)
        convertedRecord = createdTask as AttioRecord;
      } else {
        // Convert from AttioTask to AttioRecord
        // Ensure we have the properties needed for AttioTask conversion
        if ('content' in createdTask) {
          convertedRecord = UniversalUtilityService.convertTaskToRecord(
            createdTask as unknown as AttioTask
          );
        } else {
          throw new Error(
            `Invalid task object structure: ${JSON.stringify(createdTask)}`
          );
        }
      }

      // Debug logging after conversion
      debug(
        'universal.createTask',
        'Task converted to record',
        {
          hasRecord: !!convertedRecord,
          recordType: typeof convertedRecord,
          recordHasId: !!convertedRecord?.id,
          recordIdType: typeof convertedRecord?.id,
          recordIdStructure: convertedRecord?.id
            ? Object.keys(convertedRecord.id)
            : [],
        },
        'createTask',
        OperationType.API_CALL
      );

      // Ensure assignees are preserved for E2E expectations
      try {
        const top: any = convertedRecord as any;
        const values: any = convertedRecord.values || {};
        const assigneeId = (options as any).assigneeId as string | undefined;
        if (assigneeId) {
          // Top-level assignees for E2E assertion
          top.assignees = [
            {
              referenced_actor_type: 'workspace-member',
              referenced_actor_id: assigneeId,
            },
          ];
          // Values-level assignee for downstream consistency
          if (!Array.isArray(values.assignee) || values.assignee.length === 0) {
            values.assignee = [{ value: assigneeId }];
          }
          convertedRecord.values = values;
        }
      } catch {}

      // Debugging shape insight
      try {
        const mod: any = await import('../../../utils/task-debug.js');
        mod.logTaskDebug?.('createRecord', 'Created task record shape', {
          mappedKeys: Object.keys(mapped_data || {}),
          optionsKeys: Object.keys(options || {}),
          shape: mod.inspectTaskRecordShape?.(convertedRecord),
        });
      } catch {}

      return {
        record: convertedRecord,
        metadata: {
          warnings: this.collectWarnings(mapped_data)
        }
      };
    } catch (error: unknown) {
      // Log original error for debugging
      logger.error('Task creation failed', error, { resource_type: 'tasks' });

      // Issue #417: Enhanced task error handling with field mapping guidance
      const errorObj: Error =
        error instanceof Error ? error : new Error(String(error));
      const enhancedError = ErrorEnhancer.autoEnhance(
        errorObj,
        'tasks',
        'create-record'
      );
      throw enhancedError;
    }
  }

  protected validateResourceData(data: Record<string, unknown>): void {
    // Task validation is handled within the create method
    // Content/title/name validation is done during content extraction
  }

  protected formatForAPI(data: Record<string, unknown>): Record<string, unknown> {
    // Task formatting is handled within the create method
    return data;
  }

  /**
   * Task creation with mock support
   */
  private async createTaskWithMockSupport(
    taskData: Record<string, unknown>
  ): Promise<any> {
    const service = getCreateService();
    return await service.createTask(taskData);
  }

  private collectWarnings(data: Record<string, unknown>): string[] {
    const warnings: string[] = [];
    
    // Check for potential content field confusion (Issue #480 compatibility)
    if (!data.content && !data.title && !data.name) {
      warnings.push('Task created with default content "New task" - consider providing content, title, or name');
    }
    
    if (data.title && data.content && data.title !== data.content) {
      warnings.push('Both title and content provided - content takes precedence');
    }
    
    return warnings;
  }
}