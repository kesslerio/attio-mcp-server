/**
 * Test suite for UniversalUpdateService
 *
 * Tests universal record update operations extracted from shared-handlers.ts
 * as part of Issue #489 Phase 3.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UniversalUpdateService } from '../../src/services/UniversalUpdateService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../src/types/attio.js';

// Mock the dependencies
vi.mock('../../src/objects/companies/index.js', () => ({
  updateCompany: vi.fn(),
}));

vi.mock('../../src/objects/lists.js', () => ({
  updateList: vi.fn(),
}));

vi.mock('../../src/objects/people-write.js', () => ({
  updatePerson: vi.fn(),
}));

vi.mock('../../src/objects/records/index.js', () => ({
  updateObjectRecord: vi.fn(),
}));

vi.mock('../../src/config/deal-defaults.js', () => ({
  applyDealDefaultsWithValidation: vi.fn(),
}));

vi.mock('../../src/objects/tasks.js', () => ({
  getTask: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock('../../src/handlers/tool-configs/universal/field-mapper.js', () => ({
  mapRecordFields: vi.fn(),
  mapTaskFields: vi.fn((operation, input) => input), // Return input unchanged for tests
  validateResourceType: vi.fn(),
  getFieldSuggestions: vi.fn(),
  validateFields: vi.fn(),
  getValidResourceTypes: vi.fn(
    () => 'companies, people, lists, records, deals, tasks'
  ),
}));

vi.mock('../../src/utils/validation-utils.js', () => ({
  validateRecordFields: vi.fn(),
}));

vi.mock('../../src/services/ValidationService.js', () => ({
  ValidationService: {
    truncateSuggestions: vi.fn((suggestions) => suggestions),
    validateEmailAddresses: vi.fn(),
  },
}));

vi.mock('../../src/services/MockService.js', () => ({
  MockService: {
    updateTask: vi.fn(),
  },
}));

import { updateCompany } from '../../src/objects/companies/index.js';
import { updateList } from '../../src/objects/lists.js';
import { updatePerson } from '../../src/objects/people-write.js';
import { updateObjectRecord } from '../../src/objects/records/index.js';
import { applyDealDefaultsWithValidation } from '../../src/config/deal-defaults.js';
import {
  mapRecordFields,
  validateResourceType,
  getFieldSuggestions,
  validateFields,
} from '../../src/handlers/tool-configs/universal/field-mapper.js';
import { validateRecordFields } from '../../src/utils/validation-utils.js';
import { ValidationService } from '../../src/services/ValidationService.js';
import { MockService } from '../../src/services/MockService.js';
import * as tasks from '../../src/objects/tasks.js';

describe('UniversalUpdateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variables
    delete process.env.E2E_MODE;
    delete process.env.USE_MOCK_DATA;
    delete process.env.OFFLINE_MODE;
    delete process.env.PERFORMANCE_TEST;
    delete process.env.ENABLE_ENHANCED_VALIDATION;
    // Disable field verification for unit tests
    process.env.SKIP_FIELD_VERIFICATION = 'true';
  });

  describe('updateRecord', () => {
    const mockFieldValidation = {
      warnings: [],
      suggestions: [],
    };

    const mockMappingResult = {
      mapped: { name: 'Test Company' },
      warnings: [],
      errors: [],
    };

    beforeEach(() => {
      vi.mocked(validateFields).mockReturnValue(mockFieldValidation);
      vi.mocked(mapRecordFields).mockReturnValue(mockMappingResult);
    });

    it('should update a company record', async () => {
      const mockCompany: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Updated Company' },
      };
      vi.mocked(updateCompany).mockResolvedValue(mockCompany);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
        record_data: { values: { name: 'Updated Company' } },
      });

      expect(updateCompany).toHaveBeenCalledWith('comp_123', {
        name: 'Test Company',
      });

      // Expect normalized response format with additional fields
      expect(result.id.record_id).toBe('comp_123');
      expect(result.id.object_id).toBe('companies');
      expect(result.values.name).toBe('Updated Company');
      expect(result.updated_at).toBeDefined();
    });

    it('should update a person record with email validation', async () => {
      const mockPerson: AttioRecord = {
        id: { record_id: 'person_456' },
        values: { name: 'Updated Person' },
      };
      vi.mocked(updatePerson).mockResolvedValue(mockPerson);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: 'person_456',
        record_data: { values: { name: 'Updated Person' } },
      });

      expect(ValidationService.validateEmailAddresses).toHaveBeenCalledWith({
        name: 'Test Company',
      });
      expect(updatePerson).toHaveBeenCalledWith('person_456', {
        name: 'Test Company',
      });

      // Expect normalized response format with additional fields
      expect(result.id.record_id).toBe('person_456');
      expect(result.id.object_id).toBe('people');
      expect(result.values.name).toBe('Updated Person');
      expect(result.updated_at).toBeDefined();
    });

    it('should update a list record and convert format', async () => {
      const mockList = {
        id: { list_id: 'list_789' },
        name: 'Updated List',
        description: 'Updated description',
        object_slug: 'companies',
        api_slug: 'updated-list',
        workspace_id: 'ws_123',
        workspace_member_access: 'read',
        created_at: '2024-01-01T00:00:00Z',
      };
      vi.mocked(updateList).mockResolvedValue(mockList);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.LISTS,
        record_id: 'list_789',
        record_data: { values: { name: 'Updated List' } },
      });

      expect(updateList).toHaveBeenCalledWith('list_789', {
        name: 'Test Company',
      });

      // Expect normalized response format with additional fields
      expect(result.id.record_id).toBe('list_789');
      expect(result.id.list_id).toBe('list_789');
      expect(result.id.object_id).toBe('lists');
      expect(result.values.name).toBe('Updated List');
      expect(result.values.description).toBe('Updated description');
      expect(result.values.parent_object).toBe('companies');
      expect(result.values.api_slug).toBe('updated-list');
      expect(result.values.workspace_id).toBe('ws_123');
      expect(result.values.workspace_member_access).toBe('read');
      expect(result.values.created_at).toBe('2024-01-01T00:00:00Z');
      expect(result.updated_at).toBeDefined();
    });

    it('should update a records object record', async () => {
      const mockRecord: AttioRecord = {
        id: { record_id: 'record_abc' },
        values: { name: 'Updated Record' },
      };
      vi.mocked(updateObjectRecord).mockResolvedValue(mockRecord);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.RECORDS,
        record_id: 'record_abc',
        record_data: { values: { name: 'Updated Record' } },
      });

      expect(updateObjectRecord).toHaveBeenCalledWith('records', 'record_abc', {
        values: {
          name: 'Test Company',
        },
      });

      // Expect normalized response format with additional fields
      expect(result.id.record_id).toBe('record_abc');
      expect(result.id.object_id).toBe('records');
      expect(result.values.name).toBe('Updated Record');
      expect(result.updated_at).toBeDefined();
    });

    it('should update a deals record with defaults validation', async () => {
      const mockDeal: AttioRecord = {
        id: { record_id: 'deal_def' },
        values: { name: 'Updated Deal' },
      };
      const mockDealData = { name: 'Deal with defaults', stage: 'qualified' };

      vi.mocked(applyDealDefaultsWithValidation).mockResolvedValue(
        mockDealData
      );
      vi.mocked(updateObjectRecord).mockResolvedValue(mockDeal);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.DEALS,
        record_id: 'deal_def',
        record_data: { values: { name: 'Updated Deal' } },
      });

      expect(applyDealDefaultsWithValidation).toHaveBeenCalledWith(
        { name: 'Test Company' },
        false
      );
      expect(updateObjectRecord).toHaveBeenCalledWith('deals', 'deal_def', {
        values: mockDealData,
      });

      // Expect normalized response format with additional fields
      expect(result.id.record_id).toBe('deal_def');
      expect(result.id.object_id).toBe('deals');
      expect(result.values.name).toBe('Updated Deal');
      expect(result.updated_at).toBeDefined();
    });

    it('should update a task record with field transformation (excluding immutable content)', async () => {
      // Set E2E mode to get mock data directly without conversion
      process.env.E2E_MODE = 'true';

      const mockTaskRecord: AttioRecord = {
        id: { record_id: 'task_ghi', task_id: 'task_ghi' },
        values: { title: 'Updated Task Status' },
      };
      vi.mocked(MockService.updateTask).mockResolvedValue(mockTaskRecord);

      // Mock field mapping for tasks (without content)
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: {
          status: 'completed',
          assignee_id: 'user_123',
          due_date: '2024-02-01',
          linked_records: [{ record_id: 'comp_123' }],
        },
        warnings: [],
        errors: [],
      });

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_ghi',
        record_data: {
          values: {
            status: 'completed',
            assignee_id: 'user_123',
            due_date: '2024-02-01',
            linked_records: [{ record_id: 'comp_123' }],
          },
        },
      });

      expect(MockService.updateTask).toHaveBeenCalledWith('task_ghi', {
        status: 'completed',
        assigneeId: 'user_123',
        dueDate: '2024-02-01',
        recordIds: ['comp_123'],
      });

      // Expect normalized response format with additional fields for tasks
      expect(result.id.record_id).toBe('task_ghi');
      expect(result.id.task_id).toBe('task_ghi');
      expect(result.id.object_id).toBe('tasks');
      expect(result.updated_at).toBeDefined();
    });

    it('should reject task content updates with helpful error message', async () => {
      // Mock field mapping that includes content (which should trigger validation error)
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: {
          content: 'This should fail',
          status: 'completed',
        },
        warnings: [],
        errors: [],
      });

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'task_123',
          record_data: {
            values: {
              content: 'This should fail',
              status: 'completed',
            },
          },
        })
      ).rejects.toThrow(
        'Task content cannot be updated after creation. Content is immutable in the Attio API.'
      );

      // Ensure MockService.updateTask was never called since validation failed
      expect(MockService.updateTask).not.toHaveBeenCalled();
    });

    it('should handle field validation warnings and suggestions', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      vi.mocked(validateFields).mockReturnValue({
        warnings: ['Field warning 1', 'Field warning 2'],
        suggestions: ['Suggestion 1', 'Suggestion 2'],
      });

      const mockCompany: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Test Company' },
      };
      vi.mocked(updateCompany).mockResolvedValue(mockCompany);

      await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
        record_data: { values: { name: 'Test Company' } },
      });

      expect(console.error).toHaveBeenCalledWith(
        'Field validation warnings:',
        'Field warning 1\nField warning 2'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Field suggestions:',
        'Suggestion 1\nSuggestion 2'
      );

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle field mapping errors', async () => {
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: {},
        warnings: [],
        errors: ['Mapping error 1', 'Mapping error 2'],
      });

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
      });

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'comp_123',
          record_data: { values: { name: 'Test Company' } },
        })
      ).rejects.toThrow('Validation failed: invalid field');
    });

    it('should handle attribute not found errors with suggestions', async () => {
      const error = new Error(
        'Cannot find attribute with slug/ID "invalid_field"'
      );
      vi.mocked(updateCompany).mockRejectedValue(error);
      vi.mocked(getFieldSuggestions).mockReturnValue('Did you mean "name"?');

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'comp_123',
          record_data: { values: { name: 'Test Company' } },
        })
      ).rejects.toThrow('Cannot find attribute with slug/ID "invalid_field"');

      expect(getFieldSuggestions).toHaveBeenCalledWith(
        UniversalResourceType.COMPANIES,
        'invalid_field'
      );
    });

    it('should handle unsupported resource type with correction', async () => {
      vi.mocked(validateResourceType).mockReturnValue({
        corrected: UniversalResourceType.COMPANIES,
        suggestion: 'Did you mean "companies"?',
      });

      const mockCompany: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Test Company' },
      };
      vi.mocked(updateCompany).mockResolvedValue(mockCompany);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: 'company' as any,
        record_id: 'comp_123',
        record_data: { values: { name: 'Test Company' } },
      });

      // Expect normalized response format with additional fields
      expect(result.id.record_id).toBe('comp_123');
      expect(result.id.object_id).toBe('companies');
      expect(result.values.name).toBe('Test Company');
      expect(result.updated_at).toBeDefined();
    });

    it('should handle unsupported resource type without correction', async () => {
      vi.mocked(validateResourceType).mockReturnValue({
        corrected: null,
        suggestion: 'Valid resource types are: companies, people, lists',
      });

      await expect(
        UniversalUpdateService.updateRecord({
          resource_type: 'invalid' as any,
          record_id: 'test_123',
          record_data: { values: { name: 'Test' } },
        })
      ).rejects.toThrow('Unsupported resource type: invalid');
    });
  });

  describe('Task field transformation', () => {
    beforeEach(() => {
      vi.mocked(validateFields).mockReturnValue({
        warnings: [],
        suggestions: [],
      });
      vi.mocked(MockService.updateTask).mockResolvedValue({
        id: { record_id: 'task_123', task_id: 'task_123' },
        values: { content: 'Test Task' },
      });
    });

    it('should transform is_completed to status', async () => {
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { is_completed: true },
        warnings: [],
        errors: [],
      });

      await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_123',
        record_data: { values: { is_completed: true } },
      });

      expect(MockService.updateTask).toHaveBeenCalledWith('task_123', {
        status: 'completed',
      });
    });

    it('should transform assignees to assigneeId', async () => {
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { assignees: 'user_456' },
        warnings: [],
        errors: [],
      });

      await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_123',
        record_data: { values: { assignees: 'user_456' } },
      });

      expect(MockService.updateTask).toHaveBeenCalledWith('task_123', {
        assigneeId: 'user_456',
      });
    });

    it('should transform deadline_at to dueDate', async () => {
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { deadline_at: '2024-02-01' },
        warnings: [],
        errors: [],
      });

      await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_123',
        record_data: { values: { deadline_at: '2024-02-01' } },
      });

      expect(MockService.updateTask).toHaveBeenCalledWith('task_123', {
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
      });

      await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_123',
        record_data: { values: { linked_records: [] } },
      });

      expect(MockService.updateTask).toHaveBeenCalledWith('task_123', {
        recordIds: ['comp_123', 'comp_456', 'comp_789'],
      });
    });
  });

  describe('Mock data handling', () => {
    beforeEach(() => {
      vi.mocked(validateFields).mockReturnValue({
        warnings: [],
        suggestions: [],
      });
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { status: 'completed' },
        warnings: [],
        errors: [],
      });
    });

    it('should use mock data in E2E mode', async () => {
      process.env.E2E_MODE = 'true';

      const mockTaskRecord: AttioRecord = {
        id: { record_id: 'task_123', task_id: 'task_123' },
        values: { title: 'Mock Task', status: 'completed' },
      };
      vi.mocked(MockService.updateTask).mockResolvedValue(mockTaskRecord);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_123',
        record_data: { values: { status: 'completed' } },
      });

      // Expect normalized response format with additional fields for E2E mode tasks
      expect(result.id.record_id).toBe('task_123');
      expect(result.id.task_id).toBe('task_123');
      expect(result.id.object_id).toBe('tasks');
      expect(result.values.title).toBe('Mock Task'); // Issue #480 compatibility
      expect(result.updated_at).toBeDefined();
    });

    it('should convert task to record in normal mode', async () => {
      const mockTask = {
        id: { task_id: 'task_123' },
        content: 'Real Task',
        status: 'completed',
        assignee: null,
        due_date: null,
        linked_records: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      vi.mocked(MockService.updateTask).mockResolvedValue(mockTask as any);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_123',
        record_data: { values: { status: 'completed' } },
      });

      // Should convert using UniversalUtilityService.convertTaskToRecord and then normalize
      expect(result.id.record_id).toBe('task_123');
      expect(result.id.task_id).toBe('task_123');
      expect(result.id.object_id).toBe('tasks');
      expect(result.values.content).toBeDefined();
      expect(result.values.title).toBeDefined(); // Issue #480 compatibility
      expect(result.created_at).toBe('2024-01-01T00:00:00Z');
      expect(result.updated_at).toBeDefined(); // May be original or normalized timestamp
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
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
            record_data: { content: 'New content' },
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
        vi.mocked(tasks.getTask).mockRejectedValue(
          new Error('Network timeout')
        );

        await expect(
          UniversalUpdateService.updateRecord({
            resource_type: UniversalResourceType.TASKS,
            record_id: 'network-error-task',
            record_data: { content: 'New content' },
          })
        ).rejects.toMatchObject({
          status: 404,
          body: {
            code: 'not_found',
            message: 'Task record with ID "network-error-task" not found.',
          },
        });
      });

      it('should validate immutability for existing task updates with new content', async () => {
        vi.mocked(validateFields).mockReturnValue({
          warnings: [],
          suggestions: [],
        });

        // Ensure mapRecordFields returns content unchanged
        vi.mocked(mapRecordFields).mockReturnValue({
          mapped: { content: 'Updated content' },
          warnings: [],
          errors: [],
        });

        // Mock getTask to return existing task (this should succeed)
        vi.mocked(tasks.getTask).mockResolvedValue({
          id: { task_id: 'existing-task' },
          content: 'Original content',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
        });

        // Mock updateTask to succeed (this should NOT be called)
        vi.mocked(tasks.updateTask).mockResolvedValue({
          id: { task_id: 'existing-task' },
          content: 'Updated content',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        });

        // The service should throw an immutability error for content updates
        await expect(
          UniversalUpdateService.updateRecord({
            resource_type: UniversalResourceType.TASKS,
            record_id: 'existing-task',
            record_data: { content: 'Updated content' },
          })
        ).rejects.toThrow(
          /Task content cannot be updated|Content is immutable/
        );

        // Verify that getTask was called to check existence
        expect(tasks.getTask).toHaveBeenCalledWith('existing-task');

        // updateTask should NOT be called because immutability check fails
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
          message: expect.stringMatching(
            /unsupported.{0,20}resource.{0,20}type/i
          ),
          httpStatusCode: 400,
          errorType: 'USER_ERROR',
        });
      });

      it('should handle empty record data', async () => {
        vi.mocked(validateFields).mockReturnValue({
          warnings: [],
          suggestions: [],
        });
        // Mock successful update with empty data (service allows this)
        const result = await UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'test-company',
          record_data: {},
        });

        // Should still return a valid result even with empty data
        expect(result).toBeDefined();
        expect(result.id).toMatchObject({
          record_id: 'comp_123',
        });
      });
    });
  });
});
