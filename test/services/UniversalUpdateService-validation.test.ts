/**
 * Split: UniversalUpdateService validation & error handling
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('../../src/objects/tasks.js', () => ({
  getTask: vi.fn(),
  updateTask: vi.fn(),
}));
vi.mock('../../src/handlers/tool-configs/universal/field-mapper.js', () => ({
  mapRecordFields: vi.fn(),
  mapTaskFields: vi.fn((_: string, i: any) => i),
  validateResourceType: vi.fn(),
  getFieldSuggestions: vi.fn(),
  validateFields: vi.fn(),
}));
vi.mock('../../src/utils/validation-utils.js', () => ({
  validateRecordFields: vi.fn(),
}));
vi.mock('../../src/utils/logger.js', () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  LogLevel: {},
  OperationType: {},
  createScopedLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
  setLogContext: vi.fn(),
  getLogContext: vi.fn(),
  clearLogContext: vi.fn(),
  generateCorrelationId: vi.fn(),
  PerformanceTimer: vi.fn(),
  operationStart: vi.fn(),
  operationSuccess: vi.fn(),
  operationFailure: vi.fn(),
  fallbackStart: vi.fn(),
  withLogging: vi.fn(),
  safeMcpLog: vi.fn(),
  default: {},
}));
// Mock the create service factory to return a mock service
const mockCreateService = {
  createCompany: vi.fn(),
  createPerson: vi.fn(),
  createTask: vi.fn(),
  createList: vi.fn(),
  createNote: vi.fn(),
  createDeal: vi.fn(),
  updateTask: vi.fn(),
};

vi.mock('../../src/services/create/index.js', () => ({
  getCreateService: vi.fn(() => mockCreateService),
  shouldUseMockData: vi.fn(() => true),
}));
vi.mock('../../src/objects/companies/index.js', () => ({
  updateCompany: vi.fn(() => ({ id: { record_id: 'comp_123' }, values: {} })),
}));
vi.mock('../../src/objects/lists.js', () => ({
  updateList: vi.fn(() => ({
    id: { list_id: 'list_123' },
    title: 'Test List',
    name: 'Test List',
    object_slug: 'companies',
    workspace_id: 'ws_123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  })),
}));
vi.mock('../../src/objects/people-write.js', () => ({
  updatePerson: vi.fn(() => ({ id: { record_id: 'person_123' }, values: {} })),
}));
vi.mock('../../src/objects/records/index.js', () => ({
  updateObjectRecord: vi.fn(() => ({
    id: { record_id: 'record_123' },
    values: {},
  })),
}));
import { UniversalUpdateService } from '../../src/services/UniversalUpdateService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import {
  getFieldSuggestions,
  mapRecordFields,
  validateFields,
  validateResourceType,
} from '../../src/handlers/tool-configs/universal/field-mapper.js';
import { validateRecordFields } from '../../src/utils/validation-utils.js';
import {
  getCreateService,
  shouldUseMockData,
} from '../../src/services/create/index.js';
import * as tasks from '../../src/objects/tasks.js';
// Ensure enhanced validation is disabled for these unit tests
beforeEach(() => {
  delete process.env.ENABLE_ENHANCED_VALIDATION;
});

describe('UniversalUpdateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SKIP_FIELD_VERIFICATION = 'true';
    // Default to using mock data for most tests (offline mode)
    vi.mocked(shouldUseMockData).mockReturnValue(true);
    vi.mocked(validateFields).mockReturnValue({
      warnings: [],
      suggestions: [],
    } as any);
    vi.mocked(mapRecordFields).mockReturnValue({
      mapped: {},
      warnings: [],
      errors: [],
    } as any);
  });

  describe('Field validation & suggestions', () => {
    it('should log warnings and suggestions when present', async () => {
      vi.mocked(validateFields).mockReturnValue({
        warnings: ['Field warning 1', 'Field warning 2'],
        suggestions: ['Suggestion 1', 'Suggestion 2'],
      } as any);

      // Mock the debug logger to verify structured logging is used
      const { debug } = await import('../../src/utils/logger.js');
      const debugSpy = vi.mocked(debug);

      mockCreateService.updateTask.mockResolvedValue({
        id: { record_id: 'comp_123' },
        values: { name: 'Test Company' },
      } as any);

      await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
        record_data: { values: { name: 'Test Company' } },
      });

      // Verify structured logging was used instead of console.warn
      expect(debugSpy).toHaveBeenCalledWith(
        'UniversalUpdateService',
        'Field validation warnings',
        expect.objectContaining({
          warnings: expect.stringContaining('Field warning 1'),
        })
      );

      expect(debugSpy).toHaveBeenCalledWith(
        'UniversalUpdateService',
        'Field suggestions:',
        expect.objectContaining({
          suggestions: expect.stringContaining('Suggestion 1'),
        })
      );
    });

    it('should handle field mapping errors', async () => {
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: {},
        warnings: [],
        errors: ['Mapping error 1', 'Mapping error 2'],
      } as any);

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'comp_123',
          record_data: { values: { name: 'Test Company' } },
        })
      ).rejects.toThrow('Mapping error 1 Mapping error 2');
    });

    it('should handle enhanced validation when enabled', async () => {
      process.env.ENABLE_ENHANCED_VALIDATION = 'true';
      vi.mocked(validateRecordFields).mockResolvedValue({
        isValid: false,
        error: 'Validation failed: invalid field',
      } as any);

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'comp_123',
          record_data: { values: { name: 'Test Company' } },
        })
      ).rejects.toThrow('Validation failed: invalid field');
    });

    it('should handle attribute not found errors with suggestions', async () => {
      // Simulate downstream update error
      const { updateCompany } =
        await import('../../src/objects/companies/index.js');
      vi.mocked(updateCompany as any).mockRejectedValue(
        new Error('Cannot find attribute with slug/ID "invalid_field"')
      );
      const error = new Error(
        'Cannot find attribute with slug/ID "invalid_field"'
      );
      vi.mocked(getFieldSuggestions).mockReturnValue('Did you mean "name"?');

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'comp_123',
          record_data: { values: { name: 'Test Company' } },
        })
      ).rejects.toThrow('Cannot find attribute with slug/ID "invalid_field"');

      expect(getFieldSuggestions).toHaveBeenCalled();
    });

    // Removed: unsupported resource type validation is not part of current service behavior
  });

  describe('Task-specific validation', () => {
    beforeEach(() => {
      vi.mocked(validateFields).mockReturnValue({
        warnings: [],
        suggestions: [],
      } as any);
      mockCreateService.updateTask.mockResolvedValue({
        id: { record_id: 'task_123', task_id: 'task_123' },
        values: { content: 'Test Task' },
      } as any);
    });

    it('should transform is_completed to status', async () => {
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { is_completed: true },
        warnings: [],
        errors: [],
      } as any);

      await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_123',
        record_data: { values: { is_completed: true } },
      });

      expect(mockCreateService.updateTask).toHaveBeenCalledWith('task_123', {
        status: 'completed',
      });
    });

    it('should transform assignees to assigneeId', async () => {
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { assignees: 'user_456' },
        warnings: [],
        errors: [],
      } as any);

      await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_123',
        record_data: { values: { assignees: 'user_456' } },
      });

      expect(mockCreateService.updateTask).toHaveBeenCalledWith('task_123', {
        assigneeId: 'user_456',
      });
    });

    it('should transform deadline_at to dueDate', async () => {
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { deadline_at: '2024-02-01' },
        warnings: [],
        errors: [],
      } as any);

      await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_123',
        record_data: { values: { deadline_at: '2024-02-01' } },
      });

      expect(mockCreateService.updateTask).toHaveBeenCalledWith('task_123', {
        dueDate: '2024-02-01',
      });
    });

    it('should transform linked_records array to recordIds', async () => {
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: {
          linked_records: [
            { record_id: 'comp_123' },
            { id: 'comp_456' },
            'comp_789',
          ],
        },
        warnings: [],
        errors: [],
      } as any);

      await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_123',
        record_data: { values: { linked_records: [] } },
      });

      expect(mockCreateService.updateTask).toHaveBeenCalledWith('task_123', {
        recordIds: ['comp_123', 'comp_456', 'comp_789'],
      });
    });
  });

  describe('Mock data handling & existence checks', () => {
    beforeEach(() => {
      vi.mocked(validateFields).mockReturnValue({
        warnings: [],
        suggestions: [],
      } as any);
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { status: 'completed' },
        warnings: [],
        errors: [],
      } as any);
    });

    it('should use mock data in E2E mode', async () => {
      process.env.E2E_MODE = 'true';
      mockCreateService.updateTask.mockResolvedValue({
        id: { record_id: 'task_123', task_id: 'task_123' },
        values: { title: 'Mock Task', status: 'completed' },
      } as any);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_123',
        record_data: { values: { status: 'completed' } },
      });

      expect(result.id.task_id).toBe('task_123');
      expect(result.values.title).toBe('Mock Task');
    });

    it('should convert task to record in normal mode', async () => {
      // Only existence check needed here; transformation covered elsewhere
      vi.mocked(tasks.getTask).mockResolvedValue({
        id: { task_id: 'task_123' },
      } as any);
      mockCreateService.updateTask.mockResolvedValue({
        id: { record_id: 'task_123', task_id: 'task_123' },
        values: {},
      } as any);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_123',
        record_data: { values: { status: 'completed' } },
      });

      expect(result.id.record_id).toBe('task_123');
    });

    it('should return 404 when task not found', async () => {
      // For this test, we want to test the real API path, so disable mock mode
      vi.mocked(shouldUseMockData).mockReturnValue(false);
      vi.mocked(tasks.getTask).mockRejectedValue(
        Object.assign(new Error('Not found'), { response: { status: 404 } })
      );

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'non-existent-task',
          record_data: { content: 'New content' },
        })
      ).rejects.toMatchObject({ status: 404 });

      expect(tasks.getTask).toHaveBeenCalledWith('non-existent-task');
    });

    it('should return 404 when task existence check fails with generic error', async () => {
      // For this test, we want to test the real API path, so disable mock mode
      vi.mocked(shouldUseMockData).mockReturnValue(false);
      vi.mocked(tasks.getTask).mockRejectedValue(new Error('Network timeout'));

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'network-error-task',
          record_data: { content: 'New content' },
        })
      ).rejects.toMatchObject({ status: 404 });
    });

    it('should validate immutability for existing task content updates', async () => {
      // For this test, we want to test the real API path for immutability validation
      vi.mocked(shouldUseMockData).mockReturnValue(false);
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { content: 'Updated content' },
        warnings: [],
        errors: [],
      } as any);
      vi.mocked(tasks.getTask).mockResolvedValue({
        id: { task_id: 'existing-task' },
        content: 'Original content',
        status: 'pending',
      } as any);
      vi.mocked(tasks.updateTask).mockResolvedValue({
        id: { task_id: 'existing-task' },
        content: 'Updated content',
      } as any);

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'existing-task',
          record_data: { content: 'Updated content' },
        })
      ).rejects.toThrow(/Task content cannot be updated|Content is immutable/);

      expect(tasks.getTask).toHaveBeenCalledWith('existing-task');
      expect(tasks.updateTask).not.toHaveBeenCalled();
    });
  });

  describe('Resource Type Edge Cases', () => {
    it('should handle unsupported resource types gracefully', async () => {
      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: 'UNSUPPORTED' as UniversalResourceType,
          record_id: 'test-record',
          record_data: { name: 'Test' },
        })
      ).rejects.toMatchObject({
        name: 'UniversalValidationError',
        httpStatusCode: 400,
      });
    });

    it('should handle empty record data', async () => {
      // Reset the updateCompany mock from previous tests
      const { updateCompany } =
        await import('../../src/objects/companies/index.js');
      vi.mocked(updateCompany).mockResolvedValue({
        id: { record_id: 'comp_123' },
        values: {},
      } as any);

      vi.mocked(validateFields).mockReturnValue({
        warnings: [],
        suggestions: [],
      } as any);
      vi.mocked(mapRecordFields).mockResolvedValue({
        mapped: {},
        warnings: [],
        errors: [],
      });
      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'test-company',
        record_data: {},
      });
      expect(result).toBeDefined();
      expect(result.id).toMatchObject({ record_id: 'comp_123' });
    });
  });
});
