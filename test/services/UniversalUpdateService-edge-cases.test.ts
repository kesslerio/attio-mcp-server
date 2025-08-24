/**
 * Tests for UniversalUpdateService edge cases and error scenarios
 * Addresses PR feedback about missing edge case coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UniversalUpdateService } from '../../src/services/UniversalUpdateService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import * as tasks from '../../src/objects/tasks.js';
import { FilterValidationError } from '../../src/errors/api-errors.js';

// Mock external dependencies
vi.mock('../../src/objects/tasks.js');

describe('UniversalUpdateService - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task Content Immutability Edge Cases', () => {
    it('should defer immutability check and return 404 for non-existent task', async () => {
      // Mock getTask to throw 404 error
      vi.mocked(tasks.getTask).mockRejectedValue({
        status: 404,
        body: { code: 'not_found', message: 'Task not found' },
      });

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'non-existent-task',
          data: { content: 'New content' },
        })
      ).rejects.toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'Task record with ID "non-existent-task" not found.',
        },
      });

      // Verify existence check was performed
      expect(tasks.getTask).toHaveBeenCalledWith('non-existent-task');
    });

    it('should return 404 when task existence check fails with generic error', async () => {
      // Mock getTask to throw generic error (simulating network issues)
      vi.mocked(tasks.getTask).mockRejectedValue(new Error('Network timeout'));

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'network-error-task',
          data: { content: 'New content' },
        })
      ).rejects.toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'Task record with ID "network-error-task" not found.',
        },
      });
    });

    it('should throw immutability error when task exists but content is being modified', async () => {
      // Mock getTask to return existing task
      vi.mocked(tasks.getTask).mockResolvedValue({
        id: { task_id: 'existing-task' },
        content: [{ value: 'Original content' }],
        status: [{ value: 'pending' }],
      });

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'existing-task',
          data: { content: 'Modified content' },
        })
      ).rejects.toThrow(FilterValidationError);
    });

    it('should handle multiple forbidden content fields', async () => {
      // Mock getTask to return existing task
      vi.mocked(tasks.getTask).mockResolvedValue({
        id: { task_id: 'existing-task' },
        content: [{ value: 'Original content' }],
        status: [{ value: 'pending' }],
      });

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'existing-task',
          data: {
            content: 'Modified content',
            content_markdown: '**Modified** content',
            content_plaintext: 'Modified content',
          },
        })
      ).rejects.toThrow(FilterValidationError);

      // Should still perform existence check
      expect(tasks.getTask).toHaveBeenCalledWith('existing-task');
    });

    it('should handle edge case with null record data', async () => {
      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'test-task',
          data: null as any,
        })
      ).rejects.toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'Task record with ID "test-task" not found.',
        },
      });

      // Should not call getTask for null data
      expect(tasks.getTask).not.toHaveBeenCalled();
    });

    it('should handle edge case with undefined record data', async () => {
      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'test-task',
          data: undefined as any,
        })
      ).rejects.toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'Task record with ID "test-task" not found.',
        },
      });

      // Should not call getTask for undefined data
      expect(tasks.getTask).not.toHaveBeenCalled();
    });

    it('should handle edge case with non-object record data', async () => {
      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'test-task',
          data: 'string-data' as any,
        })
      ).rejects.toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'Task record with ID "test-task" not found.',
        },
      });

      // Should not call getTask for non-object data
      expect(tasks.getTask).not.toHaveBeenCalled();
    });

    it('should allow updates with non-forbidden fields when task exists', async () => {
      const mockTask = {
        id: { task_id: 'existing-task' },
        content: [{ value: 'Original content' }],
        status: [{ value: 'pending' }],
      };

      const mockUpdatedTask = {
        ...mockTask,
        status: [{ value: 'completed' }],
      };

      // Mock successful existence check and update
      vi.mocked(tasks.getTask).mockResolvedValue(mockTask);
      vi.mocked(tasks.updateTask).mockResolvedValue(mockUpdatedTask);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'existing-task',
        data: { status: 'completed' },
      });

      expect(result).toBeTruthy();
      expect(tasks.getTask).toHaveBeenCalledWith('existing-task');
      expect(tasks.updateTask).toHaveBeenCalled();
    });
  });

  describe('Task Update Error Scenarios', () => {
    it('should handle task update API errors gracefully', async () => {
      const mockTask = {
        id: { task_id: 'existing-task' },
        content: [{ value: 'Original content' }],
        status: [{ value: 'pending' }],
      };

      vi.mocked(tasks.getTask).mockResolvedValue(mockTask);
      vi.mocked(tasks.updateTask).mockRejectedValue({
        status: 400,
        body: { code: 'validation_error', message: 'Invalid status value' },
      });

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'existing-task',
          data: { status: 'invalid-status' },
        })
      ).rejects.toMatchObject({
        status: 400,
        body: { code: 'validation_error' },
      });
    });

    it('should handle task update with network errors', async () => {
      const mockTask = {
        id: { task_id: 'existing-task' },
        content: [{ value: 'Original content' }],
        status: [{ value: 'pending' }],
      };

      vi.mocked(tasks.getTask).mockResolvedValue(mockTask);
      vi.mocked(tasks.updateTask).mockRejectedValue(
        new Error('ECONNRESET: Connection reset by peer')
      );

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'existing-task',
          data: { status: 'completed' },
        })
      ).rejects.toThrow('ECONNRESET');
    });
  });

  describe('Order of Operations Edge Cases', () => {
    it('should prioritize 404 over immutability error when task does not exist', async () => {
      // This test verifies the fix for the order-of-operations bug
      vi.mocked(tasks.getTask).mockRejectedValue(new Error('Task not found'));

      const error = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'non-existent-task',
        data: { content: 'Should be blocked by immutability' },
      }).catch((e) => e);

      expect(error).toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'Task record with ID "non-existent-task" not found.',
        },
      });

      // The key assertion: we should NOT get an immutability error
      expect(error.message).not.toContain('immutable');
    });

    it('should return immutability error when task exists and content is modified', async () => {
      // Mock task exists
      vi.mocked(tasks.getTask).mockResolvedValue({
        id: { task_id: 'existing-task' },
        content: [{ value: 'Original content' }],
        status: [{ value: 'pending' }],
      });

      const error = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'existing-task',
        data: { content: 'Modified content' },
      }).catch((e) => e);

      expect(error).toBeInstanceOf(FilterValidationError);
      expect(error.message).toContain('immutable');
    });

    it('should handle race condition where task is deleted between checks', async () => {
      // Mock task exists during immutability check but is deleted before update
      vi.mocked(tasks.getTask).mockResolvedValueOnce({
        id: { task_id: 'existing-task' },
        content: [{ value: 'Original content' }],
        status: [{ value: 'pending' }],
      });

      vi.mocked(tasks.updateTask).mockRejectedValue({
        status: 404,
        body: { code: 'not_found', message: 'Task was deleted' },
      });

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'existing-task',
          data: { status: 'completed' },
        })
      ).rejects.toMatchObject({
        status: 404,
        body: { code: 'not_found' },
      });
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('should handle deeply nested forbidden fields', async () => {
      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'test-task',
          data: {
            nested: {
              content: 'Hidden content update',
            },
          },
        })
      ).rejects.toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'Task record with ID "test-task" not found.',
        },
      });
    });

    it('should handle array data with forbidden fields', async () => {
      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'test-task',
          data: {
            updates: ['content', 'content_markdown'],
          },
        })
      ).rejects.toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'Task record with ID "test-task" not found.',
        },
      });
    });
  });
});
