/**
 * Test suite for UniversalDeleteService
 *
 * Tests universal record deletion functionality extracted from shared-handlers.ts
 * as part of Issue #489 Phase 3.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UniversalDeleteService } from '../../src/services/UniversalDeleteService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';

// Mock the dependencies
vi.mock('../../src/objects/companies/index.js', () => ({
  deleteCompany: vi.fn(),
}));

vi.mock('../../src/objects/people-write.js', () => ({
  deletePerson: vi.fn(),
}));

vi.mock('../../src/objects/lists.js', () => ({
  deleteList: vi.fn(),
}));

vi.mock('../../src/objects/records/index.js', () => ({
  deleteObjectRecord: vi.fn(),
}));

vi.mock('../../src/objects/tasks.js', () => ({
  deleteTask: vi.fn(),
}));

vi.mock('../../src/utils/validation.js', () => ({
  isValidId: vi.fn(),
}));

import { deleteCompany } from '../../src/objects/companies/index.js';
import { deletePerson } from '../../src/objects/people-write.js';
import { deleteList } from '../../src/objects/lists.js';
import { deleteObjectRecord } from '../../src/objects/records/index.js';
import { deleteTask } from '../../src/objects/tasks.js';
import { isValidId } from '../../src/utils/validation.js';

describe('UniversalDeleteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variables
    delete process.env.E2E_MODE;
    delete process.env.USE_MOCK_DATA;
    delete process.env.VITEST;
    delete process.env.NODE_ENV;
    delete process.env.SKIP_INTEGRATION_TESTS;
  });

  describe('deleteRecord', () => {
    it('should delete a company record', async () => {
      vi.mocked(deleteCompany).mockResolvedValue(undefined);

      const result = await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
      });

      expect(deleteCompany).toHaveBeenCalledWith('comp_123');
      expect(result).toEqual({ success: true, record_id: 'comp_123' });
    });

    it('should delete a person record', async () => {
      vi.mocked(deletePerson).mockResolvedValue(undefined);

      const result = await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: 'person_456',
      });

      expect(deletePerson).toHaveBeenCalledWith('person_456');
      expect(result).toEqual({ success: true, record_id: 'person_456' });
    });

    it('should delete a list record', async () => {
      vi.mocked(deleteList).mockResolvedValue(undefined);

      const result = await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.LISTS,
        record_id: 'list_789',
      });

      expect(deleteList).toHaveBeenCalledWith('list_789');
      expect(result).toEqual({ success: true, record_id: 'list_789' });
    });

    it('should delete a records object record', async () => {
      vi.mocked(deleteObjectRecord).mockResolvedValue(undefined);

      const result = await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.RECORDS,
        record_id: 'record_abc',
      });

      expect(deleteObjectRecord).toHaveBeenCalledWith('records', 'record_abc');
      expect(result).toEqual({ success: true, record_id: 'record_abc' });
    });

    it('should delete a deals object record', async () => {
      vi.mocked(deleteObjectRecord).mockResolvedValue(undefined);

      const result = await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.DEALS,
        record_id: 'deal_def',
      });

      expect(deleteObjectRecord).toHaveBeenCalledWith('deals', 'deal_def');
      expect(result).toEqual({ success: true, record_id: 'deal_def' });
    });

    it('should delete a task record in normal mode', async () => {
      vi.mocked(deleteTask).mockResolvedValue(true);
      process.env.NODE_ENV = 'production';

      const result = await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_ghi',
      });

      expect(deleteTask).toHaveBeenCalledWith('task_ghi');
      expect(result).toEqual({ success: true, record_id: 'task_ghi' });
    });

    it('should handle task deletion with mock data in E2E mode', async () => {
      process.env.E2E_MODE = 'true';
      vi.mocked(isValidId).mockReturnValue(true);

      const result = await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_mock',
      });

      expect(isValidId).toHaveBeenCalledWith('task_mock');
      expect(deleteTask).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, record_id: 'task_mock' });
    });

    it('should handle task deletion with mock data when USE_MOCK_DATA is true', async () => {
      process.env.USE_MOCK_DATA = 'true';
      vi.mocked(isValidId).mockReturnValue(true);

      const result = await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_mock2',
      });

      expect(isValidId).toHaveBeenCalledWith('task_mock2');
      expect(deleteTask).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, record_id: 'task_mock2' });
    });

    it('should handle task deletion with mock data in test mode', async () => {
      process.env.NODE_ENV = 'test';
      process.env.SKIP_INTEGRATION_TESTS = 'false';
      vi.mocked(isValidId).mockReturnValue(true);

      const result = await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_test',
      });

      expect(isValidId).toHaveBeenCalledWith('task_test');
      expect(deleteTask).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, record_id: 'task_test' });
    });

    it('should bypass mock data when VITEST is set', async () => {
      process.env.NODE_ENV = 'test';
      process.env.VITEST = 'true';
      vi.mocked(deleteTask).mockResolvedValue(true);

      const result = await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_vitest',
      });

      expect(deleteTask).toHaveBeenCalledWith('task_vitest');
      expect(isValidId).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, record_id: 'task_vitest' });
    });

    it('should throw error for invalid task ID in mock mode', async () => {
      process.env.E2E_MODE = 'true';
      vi.mocked(isValidId).mockReturnValue(false);

      await expect(
        UniversalDeleteService.deleteRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'invalid_task',
        })
      ).rejects.toThrow('Task not found: invalid_task');

      expect(isValidId).toHaveBeenCalledWith('invalid_task');
      expect(deleteTask).not.toHaveBeenCalled();
    });

    it('should log mock injection in development mode', async () => {
      process.env.E2E_MODE = 'true';
      process.env.NODE_ENV = 'development';
      vi.mocked(isValidId).mockReturnValue(true);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_dev',
      });

      expect(console.error).toHaveBeenCalledWith(
        '[MockInjection] Using mock data for task deletion'
      );

      consoleSpy.mockRestore();
    });

    it('should log mock injection when VERBOSE_TESTS is true', async () => {
      process.env.USE_MOCK_DATA = 'true';
      process.env.VERBOSE_TESTS = 'true';
      vi.mocked(isValidId).mockReturnValue(true);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_verbose',
      });

      expect(console.error).toHaveBeenCalledWith(
        '[MockInjection] Using mock data for task deletion'
      );

      consoleSpy.mockRestore();
    });

    it('should throw error for unsupported resource type', async () => {
      await expect(
        UniversalDeleteService.deleteRecord({
          resource_type: 'unsupported' as any,
          record_id: 'test_id',
        })
      ).rejects.toThrow('Unsupported resource type for delete: unsupported');
    });

    it('should propagate errors from underlying delete functions', async () => {
      const error = new Error('Delete failed');
      vi.mocked(deleteCompany).mockRejectedValue(error);

      await expect(
        UniversalDeleteService.deleteRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'comp_error',
        })
      ).rejects.toThrow('Delete failed');

      expect(deleteCompany).toHaveBeenCalledWith('comp_error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty record IDs', async () => {
      vi.mocked(deleteCompany).mockResolvedValue(undefined);

      const result = await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: '',
      });

      expect(deleteCompany).toHaveBeenCalledWith('');
      expect(result).toEqual({ success: true, record_id: '' });
    });

    it('should handle null-like record IDs gracefully', async () => {
      vi.mocked(deleteList).mockResolvedValue(undefined);

      const result = await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.LISTS,
        record_id: 'null',
      });

      expect(deleteList).toHaveBeenCalledWith('null');
      expect(result).toEqual({ success: true, record_id: 'null' });
    });

    it('should handle very long record IDs', async () => {
      const longId = 'a'.repeat(1000);
      vi.mocked(deletePerson).mockResolvedValue(undefined);

      const result = await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: longId,
      });

      expect(deletePerson).toHaveBeenCalledWith(longId);
      expect(result).toEqual({ success: true, record_id: longId });
    });
  });

  describe('Environment Detection Logic', () => {
    it('should not use mock data in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.E2E_MODE = 'false';
      process.env.USE_MOCK_DATA = 'false';
      vi.mocked(deleteTask).mockResolvedValue(true);

      await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_prod',
      });

      expect(deleteTask).toHaveBeenCalledWith('task_prod');
      expect(isValidId).not.toHaveBeenCalled();
    });

    it('should not use mock data when SKIP_INTEGRATION_TESTS is true', async () => {
      process.env.NODE_ENV = 'test';
      process.env.SKIP_INTEGRATION_TESTS = 'true';
      vi.mocked(deleteTask).mockResolvedValue(true);

      await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_skip',
      });

      expect(deleteTask).toHaveBeenCalledWith('task_skip');
      expect(isValidId).not.toHaveBeenCalled();
    });

    it('should use mock data with complex environment conditions', async () => {
      process.env.NODE_ENV = 'test';
      process.env.SKIP_INTEGRATION_TESTS = 'false';
      delete process.env.VITEST;
      vi.mocked(isValidId).mockReturnValue(true);

      await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_complex',
      });

      expect(isValidId).toHaveBeenCalledWith('task_complex');
      expect(deleteTask).not.toHaveBeenCalled();
    });
  });
});
