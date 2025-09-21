import type { AttioRecord } from '../../../types/attio.js';
import type { UniversalResourceType } from '../../../handlers/tool-configs/universal/types.js';
import type { UpdateStrategy } from './BaseUpdateStrategy.js';
import { shouldUseMockData, getCreateService } from '../../create/index.js';
import { getTask } from '../../../objects/tasks.js';
import { UpdateValidation } from '../UpdateValidation.js';

export class TaskUpdateStrategy implements UpdateStrategy {
  async update(
    recordId: string,
    values: Record<string, unknown>,
    _resourceType: UniversalResourceType
  ): Promise<AttioRecord> {
    if (_resourceType !== 'tasks') {
      throw new Error(
        `TaskUpdateStrategy received unsupported resource type: ${_resourceType}`
      );
    }
    // 1) Existence check (skip in mock mode)
    try {
      if (!shouldUseMockData()) {
        await getTask(recordId);
      }
    } catch {
      throw {
        status: 404,
        body: {
          code: 'not_found',
          message: `Task record with ID "${recordId}" not found.`,
        },
      };
    }

    // 2) Validate immutability after confirming existence
    UpdateValidation.assertNoTaskContentUpdate(values);

    // 3) Proceed with update via mock or real service
    return this.doUpdateTask(recordId, values);
  }

  private async doUpdateTask(
    recordId: string,
    mappedData: Record<string, unknown>
  ): Promise<AttioRecord> {
    const taskUpdateData: Record<string, unknown> = {};

    // status / is_completed mapping
    if (mappedData.is_completed !== undefined) {
      taskUpdateData.status = mappedData.is_completed ? 'completed' : 'pending';
    } else if (mappedData.status !== undefined) {
      taskUpdateData.status = mappedData.status;
    }

    // assignees → assigneeId
    if (mappedData.assignees !== undefined) {
      const value = mappedData.assignees as unknown;
      let assigneeId: string | undefined;
      if (Array.isArray(value as unknown[])) {
        const first = (value as unknown[])[0] as unknown;
        if (typeof first === 'string') assigneeId = first;
        else if (first && typeof first === 'object') {
          const fo = first as Record<string, unknown>;
          assigneeId =
            (fo.referenced_actor_id as string) ||
            (fo.id as string) ||
            (fo.record_id as string) ||
            (fo.value as string);
        }
      } else if (typeof value === 'string') {
        assigneeId = value as string;
      } else if (value && typeof value === 'object') {
        const vo = value as Record<string, unknown>;
        assigneeId =
          (vo.referenced_actor_id as string) ||
          (vo.id as string) ||
          (vo.record_id as string) ||
          (vo.value as string);
      }
      if (assigneeId) taskUpdateData.assigneeId = assigneeId;
    } else if (mappedData.assignee_id !== undefined) {
      taskUpdateData.assigneeId = mappedData.assignee_id;
    } else if (mappedData.assigneeId !== undefined) {
      taskUpdateData.assigneeId = mappedData.assigneeId;
    }

    // due dates
    if (mappedData.deadline_at !== undefined) {
      taskUpdateData.dueDate = mappedData.deadline_at;
    } else if (mappedData.due_date !== undefined) {
      taskUpdateData.dueDate = mappedData.due_date;
    } else if (mappedData.dueDate !== undefined) {
      taskUpdateData.dueDate = mappedData.dueDate;
    }

    // linked records
    if (mappedData.linked_records !== undefined) {
      if (Array.isArray(mappedData.linked_records)) {
        taskUpdateData.recordIds = (mappedData.linked_records as unknown[]).map(
          (link: unknown) => {
            if (!link || typeof link !== 'object') return link as unknown;
            const lo = link as Record<string, unknown>;
            return (
              (lo.record_id as string) || (lo.id as string) || (lo as unknown)
            );
          }
        );
      } else {
        taskUpdateData.recordIds = [mappedData.linked_records];
      }
    } else if (mappedData.record_id !== undefined) {
      taskUpdateData.recordIds = [mappedData.record_id];
    }

    // Debug hook
    try {
      const mod = (await import('../../../utils/task-debug.js')) as Record<
        string,
        unknown
      >;
      const fn = mod['logTaskDebug'] as unknown;
      if (typeof fn === 'function')
        (fn as (...args: unknown[]) => void)('UPDATE_REQUEST', {
          recordId,
          taskUpdateData,
        });
    } catch {
      // Ignore debug import failures
    }

    // Execute update
    const result = await this.updateTaskWithMockSupport(
      recordId,
      taskUpdateData
    );
    return result as AttioRecord;
  }

  private async updateTaskWithMockSupport(
    taskId: string,
    updateData: Record<string, unknown>
  ): Promise<AttioRecord> {
    if (
      shouldUseMockData() ||
      process.env.VITEST === 'true' ||
      process.env.NODE_ENV === 'test'
    ) {
      const { MockService } = await import('../../MockService.js');
      return (await MockService.updateTask(
        taskId,
        updateData
      )) as unknown as AttioRecord;
    }
    const service = getCreateService();
    return (await service.updateTask(
      taskId,
      updateData
    )) as unknown as AttioRecord;
  }
}
