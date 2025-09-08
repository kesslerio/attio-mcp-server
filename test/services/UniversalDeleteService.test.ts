/**
 * Test suite for UniversalDeleteService
 *
 * Tests universal record deletion functionality extracted from shared-handlers.ts
 * as part of Issue #489 Phase 3.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { deleteCompany } from '../../src/objects/companies/index.js';
import { deleteList } from '../../src/objects/lists.js';
import { deleteObjectRecord } from '../../src/objects/records/index.js';
import { deletePerson } from '../../src/objects/people-write.js';
import { deleteTask } from '../../src/objects/tasks.js';
import { isValidId } from '../../src/utils/validation.js';
import { shouldUseMockData } from '../../src/services/create/index.js';
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

vi.mock('../../src/services/create/index.js', () => ({
  shouldUseMockData: vi.fn(),
}));

import { deleteCompany } from '../../src/objects/companies/index.js';
import { deletePerson } from '../../src/objects/people-write.js';
import { deleteList } from '../../src/objects/lists.js';
import { deleteObjectRecord } from '../../src/objects/records/index.js';
import { deleteTask } from '../../src/objects/tasks.js';
import { isValidId } from '../../src/utils/validation.js';
import { shouldUseMockData } from '../../src/services/create/index.js';

describe('UniversalDeleteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock behavior for most tests
    vi.mocked(shouldUseMockData).mockReturnValue(true);
    // Clear environment variables
    delete process.env.E2E_MODE;
    delete process.env.USE_MOCK_DATA;
    delete process.env.OFFLINE_MODE;
    delete process.env.VITEST;
    delete process.env.NODE_ENV;
    delete process.env.SKIP_INTEGRATION_TESTS;
    delete process.env.VERBOSE_TESTS;
  });

  describe('deleteRecord', () => {
    it('should delete a company record', async () => {
      vi.mocked(deleteCompany).mockResolvedValue(undefined);

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
      });

      expect(deleteCompany).toHaveBeenCalledWith('comp_123');
      expect(result).toEqual({ success: true, record_id: 'comp_123' });
    });

    it('should delete a person record', async () => {
      vi.mocked(deletePerson).mockResolvedValue(undefined);

        resource_type: UniversalResourceType.PEOPLE,
        record_id: 'person_456',
      });

      expect(deletePerson).toHaveBeenCalledWith('person_456');
      expect(result).toEqual({ success: true, record_id: 'person_456' });
    });

    it('should delete a list record', async () => {
      vi.mocked(deleteList).mockResolvedValue(undefined);

        resource_type: UniversalResourceType.LISTS,
        record_id: 'list_789',
      });

      expect(deleteList).toHaveBeenCalledWith('list_789');
      expect(result).toEqual({ success: true, record_id: 'list_789' });
    });

    it('should delete a records object record', async () => {
      vi.mocked(deleteObjectRecord).mockResolvedValue(undefined);

        resource_type: UniversalResourceType.RECORDS,
        record_id: 'record_abc',
      });

      expect(deleteObjectRecord).toHaveBeenCalledWith('records', 'record_abc');
      expect(result).toEqual({ success: true, record_id: 'record_abc' });
    });

    it('should delete a deals object record', async () => {
      vi.mocked(deleteObjectRecord).mockResolvedValue(undefined);

        resource_type: UniversalResourceType.DEALS,
        record_id: 'deal_def',
      });

      expect(deleteObjectRecord).toHaveBeenCalledWith('deals', 'deal_def');
      expect(result).toEqual({ success: true, record_id: 'deal_def' });
    });

    it('should delete a task record in normal mode', async () => {
      vi.mocked(shouldUseMockData).mockReturnValue(false);
      vi.mocked(deleteTask).mockResolvedValue(true);
      process.env.NODE_ENV = 'production';

        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_ghi',
      });

      expect(deleteTask).toHaveBeenCalledWith('task_ghi');
      expect(result).toEqual({ success: true, record_id: 'task_ghi' });
    });

    it('should handle task deletion with mock data when USE_MOCK_DATA is true', async () => {
      process.env.USE_MOCK_DATA = 'true';
      vi.mocked(shouldUseMockData).mockReturnValue(true);
      vi.mocked(isValidId).mockReturnValue(true);

        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_mock',
      });

      expect(isValidId).toHaveBeenCalledWith('task_mock');
      expect(deleteTask).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, record_id: 'task_mock' });
    });

    it('should handle task deletion with mock data when OFFLINE_MODE is true', async () => {
      process.env.OFFLINE_MODE = 'true';
      vi.mocked(shouldUseMockData).mockReturnValue(true);
      vi.mocked(isValidId).mockReturnValue(true);

        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_offline',
      });

      expect(isValidId).toHaveBeenCalledWith('task_offline');
      expect(deleteTask).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, record_id: 'task_offline' });
    });

    it('should use real API when neither USE_MOCK_DATA nor OFFLINE_MODE is true', async () => {
      process.env.NODE_ENV = 'test';
      process.env.E2E_MODE = 'true';
      // Neither USE_MOCK_DATA nor OFFLINE_MODE is set to 'true'
      vi.mocked(shouldUseMockData).mockReturnValue(false);
      vi.mocked(deleteTask).mockResolvedValue(true);

        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_real_api',
      });

      expect(deleteTask).toHaveBeenCalledWith('task_real_api');
      expect(isValidId).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, record_id: 'task_real_api' });
    });

    it('should use real API when VITEST is set and USE_MOCK_DATA is not true', async () => {
      process.env.NODE_ENV = 'test';
      process.env.VITEST = 'true';
      // USE_MOCK_DATA is not set to 'true'
      vi.mocked(shouldUseMockData).mockReturnValue(false);
      vi.mocked(deleteTask).mockResolvedValue(true);

        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_vitest',
      });

      expect(deleteTask).toHaveBeenCalledWith('task_vitest');
      expect(isValidId).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, record_id: 'task_vitest' });
    });

    it('should throw error for invalid task ID in mock mode', async () => {
      process.env.USE_MOCK_DATA = 'true';
      vi.mocked(shouldUseMockData).mockReturnValue(true);
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
      process.env.USE_MOCK_DATA = 'true';
      process.env.NODE_ENV = 'development';
      vi.mocked(isValidId).mockReturnValue(true);

        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_dev',
      });

      // Logger outputs JSON format, check that it contains the expected message
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(loggedMessage).toContain(
        '[MockInjection] Using mock data for task deletion'
      );

      consoleSpy.mockRestore();
    });

    it('should log mock injection when VERBOSE_TESTS is true', async () => {
      process.env.USE_MOCK_DATA = 'true';
      process.env.VERBOSE_TESTS = 'true';
      vi.mocked(isValidId).mockReturnValue(true);

        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_verbose',
      });

      // Logger outputs JSON format, check that it contains the expected message
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(loggedMessage).toContain(
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

        resource_type: UniversalResourceType.COMPANIES,
        record_id: '',
      });

      expect(deleteCompany).toHaveBeenCalledWith('');
      expect(result).toEqual({ success: true, record_id: '' });
    });

    it('should handle null-like record IDs gracefully', async () => {
      vi.mocked(deleteList).mockResolvedValue(undefined);

        resource_type: UniversalResourceType.LISTS,
        record_id: 'null',
      });

      expect(deleteList).toHaveBeenCalledWith('null');
      expect(result).toEqual({ success: true, record_id: 'null' });
    });

    it('should handle very long record IDs', async () => {
      vi.mocked(deletePerson).mockResolvedValue(undefined);

        resource_type: UniversalResourceType.PEOPLE,
        record_id: longId,
      });

      expect(deletePerson).toHaveBeenCalledWith(longId);
      expect(result).toEqual({ success: true, record_id: longId });
    });
  });

  describe('Environment Detection Logic', () => {
    it('should not use mock data when USE_MOCK_DATA and OFFLINE_MODE are not set', async () => {
      process.env.NODE_ENV = 'production';
      process.env.E2E_MODE = 'false';
      process.env.USE_MOCK_DATA = 'false';
      process.env.OFFLINE_MODE = 'false';
      vi.mocked(shouldUseMockData).mockReturnValue(false);
      vi.mocked(deleteTask).mockResolvedValue(true);

      await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_prod',
      });

      expect(deleteTask).toHaveBeenCalledWith('task_prod');
      expect(isValidId).not.toHaveBeenCalled();
    });

    it('should not use mock data when flags are explicitly false', async () => {
      process.env.NODE_ENV = 'test';
      process.env.USE_MOCK_DATA = 'false';
      process.env.OFFLINE_MODE = 'false';
      vi.mocked(shouldUseMockData).mockReturnValue(false);
      vi.mocked(deleteTask).mockResolvedValue(true);

      await UniversalDeleteService.deleteRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_skip',
      });

      expect(deleteTask).toHaveBeenCalledWith('task_skip');
      expect(isValidId).not.toHaveBeenCalled();
    });

    it('should use mock data when USE_MOCK_DATA is explicitly true', async () => {
      process.env.NODE_ENV = 'test';
      process.env.USE_MOCK_DATA = 'true';
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
