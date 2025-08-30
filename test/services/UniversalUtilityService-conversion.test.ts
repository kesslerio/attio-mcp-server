/**
 * Split: UniversalUtilityService conversion helpers
 */
import { describe, it, expect } from 'vitest';

import { AttioTask } from '../../src/types/attio.js';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';

describe('UniversalUtilityService', () => {
  describe('convertTaskToRecord', () => {
    it('should convert task with task_id structure', () => {
      const task: AttioTask = {
        id: {
          task_id: 'task_123',
          workspace_id: 'ws_456',
        },
        content: 'Test task content',
        status: 'pending',
        assignee: {
          id: 'user_789',
          type: 'person',
        },
        due_date: '2024-01-15',
        linked_records: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      } as any;

      expect(result).toEqual({
        id: {
          record_id: 'task_123',
          task_id: 'task_123',
          object_id: 'tasks',
          workspace_id: 'ws_456',
        },
        values: {
          content: 'Test task content',
          status: 'pending',
          assignee: 'user_789',
          due_date: '2024-01-15',
          linked_records: [],
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        content: 'Test task content',
        status: 'pending',
        due_date: '2024-01-15',
        assignee_id: 'user_789',
        assignee: 'user_789',
      });
    });

    it('should convert task with id structure', () => {
      const task: AttioTask = {
        id: {
          task_id: 'task_abc',
          workspace_id: 'ws_def',
        },
        content: 'Another task',
        status: 'completed',
        assignee: null,
        due_date: null,
        linked_records: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      } as any;

      expect(result).toEqual({
        id: {
          record_id: 'task_abc',
          task_id: 'task_abc',
          object_id: 'tasks',
          workspace_id: 'ws_def',
        },
        values: {
          content: 'Another task',
          status: 'completed',
          assignee: undefined,
          due_date: null,
          linked_records: undefined,
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        content: 'Another task',
        status: 'completed',
        due_date: null,
        assignee_id: undefined,
      });
    });

    it('should convert task with string ID', () => {
      const task: AttioTask = {
        id: { task_id: 'simple_task_id' } as any,
        content: 'Simple task',
        status: 'in_progress',
        assignee: { id: 'user_xyz', type: 'person' } as any,
        due_date: '2024-02-01' as any,
        linked_records: [{ type: 'company', id: 'comp_123' }] as any,
        created_at: '2024-01-01T00:00:00Z' as any,
        updated_at: '2024-01-03T00:00:00Z' as any,
      } as any;

      expect(result).toEqual({
        id: {
          record_id: 'simple_task_id',
          task_id: 'simple_task_id',
          object_id: 'tasks',
          workspace_id: '',
        },
        values: {
          content: 'Simple task',
          status: 'in_progress',
          assignee: 'user_xyz',
          due_date: '2024-02-01',
          linked_records: [{ type: 'company', id: 'comp_123' }],
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
        content: 'Simple task',
        status: 'in_progress',
        due_date: '2024-02-01',
        assignee_id: 'user_xyz',
        assignee: 'user_xyz',
      });
    });

    it('should handle task with empty workspace_id', () => {
      const task: AttioTask = {
        id: { task_id: 'task_no_workspace' } as any,
        content: 'Task without workspace',
        status: 'pending',
        assignee: null as any,
        due_date: null as any,
        linked_records: null as any,
        created_at: '2024-01-01T00:00:00Z' as any,
        updated_at: '2024-01-01T00:00:00Z' as any,
      } as any;

      expect(result.id.workspace_id).toBe('');
    });

    it('should throw error for unrecognized ID structure', () => {
      const task: unknown = {
        id: { unknown_field: 'some_value' },
        content: 'Invalid task',
        status: 'pending',
        assignee: null,
        due_date: null,
        linked_records: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(() => {
        UniversalUtilityService.convertTaskToRecord(task as AttioTask);
      }).toThrow();
    });

    it('should handle missing id in task', () => {
      const task: Partial<AttioTask> = {
        content: 'Task without ID',
        status: 'pending',
        assignee: null,
        due_date: null,
        linked_records: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(() => {
        UniversalUtilityService.convertTaskToRecord(task as AttioTask);
      }).toThrow('Task missing id property');
    });
  });
});
