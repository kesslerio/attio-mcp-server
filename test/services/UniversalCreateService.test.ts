/**
 * Test suite for UniversalCreateService
 *
 * Tests universal record creation operations extracted from shared-handlers.ts
 * as part of Issue #489 Phase 3.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UniversalCreateService } from '../../src/services/UniversalCreateService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../src/types/attio.js';

// Mock the dependencies
vi.mock('../../src/services/ValidationService.js', () => ({
  ValidationService: {
    truncateSuggestions: vi.fn((suggestions) => suggestions),
    validateEmailAddresses: vi.fn(),
  },
}));

vi.mock('../../src/services/UniversalUtilityService.js', () => ({
  UniversalUtilityService: {
    convertTaskToRecord: vi.fn(),
  },
}));

vi.mock('../../src/handlers/tool-configs/universal/field-mapper.js', () => ({
  mapRecordFields: vi.fn(),
  validateResourceType: vi.fn(),
  getFieldSuggestions: vi.fn(),
  validateFields: vi.fn(),
  getValidResourceTypes: vi.fn(
    () => 'companies, people, lists, records, deals, tasks'
  ),
  FIELD_MAPPINGS: {
    companies: { validFields: ['name', 'domain', 'employees'] },
    people: { validFields: ['name', 'email_addresses'] },
    lists: { validFields: ['name', 'description'] },
  },
}));

vi.mock('../../src/utils/validation-utils.js', () => ({
  validateRecordFields: vi.fn(),
}));

vi.mock('../../src/utils/attribute-format-helpers.js', () => ({
  convertAttributeFormats: vi.fn((type, data) => data),
  getFormatErrorHelp: vi.fn((type, field, message) => `Enhanced: ${message}`),
}));

vi.mock('../../src/config/deal-defaults.js', () => ({
  applyDealDefaultsWithValidation: vi.fn(),
  getDealDefaults: vi.fn(() => ({ stage: 'default-stage' })),
  validateDealInput: vi.fn(() => ({
    isValid: true,
    suggestions: [],
    warnings: [],
  })),
}));

vi.mock('../../src/utils/normalization/people-normalization.js', () => ({
  PeopleDataNormalizer: {
    normalizePeopleData: vi.fn((data) => data),
  },
}));

vi.mock('../../src/errors/enhanced-api-errors.js', () => ({
  ErrorTemplates: {
    TASK_FIELD_MAPPING: vi.fn(
      (tried, correct) => new Error(`Use ${correct} instead of ${tried}`)
    ),
  },
  ErrorEnhancer: {
    autoEnhance: vi.fn((error) => error),
  },
}));

vi.mock('../../src/utils/logger.js', () => ({
  debug: vi.fn(),
  OperationType: {
    API_CALL: 'api_call',
  },
}));

vi.mock('../../src/objects/companies/index.js', () => ({
  createCompany: vi.fn(),
}));

vi.mock('../../src/objects/lists.js', () => ({
  createList: vi.fn(),
}));

vi.mock('../../src/objects/people/index.js', () => ({
  createPerson: vi.fn(),
}));

vi.mock('../../src/objects/records/index.js', () => ({
  createObjectRecord: vi.fn(),
}));

vi.mock('../../src/services/MockService.js', () => ({
  MockService: {
    createCompany: vi.fn(),
    createPerson: vi.fn(),
    createTask: vi.fn(),
  },
}));

import { ValidationService } from '../../src/services/ValidationService.js';
import { UniversalUtilityService } from '../../src/services/UniversalUtilityService.js';
import {
  mapRecordFields,
  validateResourceType,
  getFieldSuggestions,
  validateFields,
  FIELD_MAPPINGS,
} from '../../src/handlers/tool-configs/universal/field-mapper.js';
import { validateRecordFields } from '../../src/utils/validation-utils.js';
import {
  convertAttributeFormats,
  getFormatErrorHelp,
} from '../../src/utils/attribute-format-helpers.js';
import {
  applyDealDefaultsWithValidation,
  getDealDefaults,
  validateDealInput,
} from '../../src/config/deal-defaults.js';
import { PeopleDataNormalizer } from '../../src/utils/normalization/people-normalization.js';
import {
  ErrorTemplates,
  ErrorEnhancer,
} from '../../src/errors/enhanced-api-errors.js';
import { createCompany } from '../../src/objects/companies/index.js';
import { createList } from '../../src/objects/lists.js';
import { createPerson } from '../../src/objects/people/index.js';
import { createObjectRecord } from '../../src/objects/records/index.js';
import { MockService } from '../../src/services/MockService.js';

describe('UniversalCreateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variables
    delete process.env.E2E_MODE;
    delete process.env.USE_MOCK_DATA;
    delete process.env.OFFLINE_MODE;
    delete process.env.PERFORMANCE_TEST;
    delete process.env.ENABLE_ENHANCED_VALIDATION;
  });

  describe('createRecord', () => {
    const mockFieldValidation = {
      valid: true,
      warnings: [],
      suggestions: [],
      errors: [],
    };

    const mockMappingResult = {
      mapped: { name: 'Test Record' },
      warnings: [],
      errors: [],
    };

    beforeEach(() => {
      vi.mocked(validateFields).mockReturnValue(mockFieldValidation);
      vi.mocked(mapRecordFields).mockReturnValue(mockMappingResult);
    });

    it('should create a company record', async () => {
      const mockCompany: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Test Company' },
      };
      vi.mocked(MockService.createCompany).mockResolvedValue(mockCompany);

      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_data: { values: { name: 'Test Company' } },
      });

      expect(convertAttributeFormats).toHaveBeenCalledWith('companies', {
        name: 'Test Record',
      });
      expect(MockService.createCompany).toHaveBeenCalled();
      expect(result).toEqual(mockCompany);
    });

    it('should create a person record with email validation', async () => {
      const mockPerson: AttioRecord = {
        id: { record_id: 'person_456' },
        values: { name: 'John Doe' },
      };
      vi.mocked(MockService.createPerson).mockResolvedValue(mockPerson);

      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.PEOPLE,
        record_data: { values: { name: 'John Doe' } },
      });

      expect(ValidationService.validateEmailAddresses).toHaveBeenCalledWith({
        name: 'Test Record',
      });
      expect(PeopleDataNormalizer.normalizePeopleData).toHaveBeenCalled();
      expect(convertAttributeFormats).toHaveBeenCalledWith('people', {
        name: 'Test Record',
      });
      expect(MockService.createPerson).toHaveBeenCalled();
      expect(result).toEqual(mockPerson);
    });

    it('should create a list record and convert format', async () => {
      const mockList = {
        id: { list_id: 'list_789' },
        name: 'Test List',
        description: 'Test description',
        object_slug: 'companies',
        api_slug: 'test-list',
        workspace_id: 'ws_123',
        workspace_member_access: 'read',
        created_at: '2024-01-01T00:00:00Z',
      };
      vi.mocked(createList).mockResolvedValue(mockList);

      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.LISTS,
        record_data: { values: { name: 'Test List' } },
      });

      expect(createList).toHaveBeenCalledWith({ name: 'Test Record' });
      expect(result).toEqual({
        id: {
          record_id: 'list_789',
          list_id: 'list_789',
        },
        values: {
          name: 'Test List',
          description: 'Test description',
          parent_object: 'companies',
          api_slug: 'test-list',
          workspace_id: 'ws_123',
          workspace_member_access: 'read',
          created_at: '2024-01-01T00:00:00Z',
        },
      });
    });

    it('should create a records object record', async () => {
      const mockRecord: AttioRecord = {
        id: { record_id: 'record_abc' },
        values: { name: 'Test Record' },
      };
      vi.mocked(createObjectRecord).mockResolvedValue(mockRecord);

      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.RECORDS,
        record_data: { values: { name: 'Test Record' } },
      });

      expect(createObjectRecord).toHaveBeenCalledWith('records', {
        name: 'Test Record',
      });
      expect(result).toEqual(mockRecord);
    });

    it('should create a deals record with defaults validation', async () => {
      const mockDeal: AttioRecord = {
        id: { record_id: 'deal_def' },
        values: { name: 'Test Deal' },
      };
      const mockDealData = { name: 'Test Deal', stage: 'qualified' };

      vi.mocked(applyDealDefaultsWithValidation).mockResolvedValue(
        mockDealData
      );
      vi.mocked(createObjectRecord).mockResolvedValue(mockDeal);

      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.DEALS,
        record_data: { values: { name: 'Test Deal' } },
      });

      expect(validateDealInput).toHaveBeenCalledWith({ name: 'Test Record' });
      expect(applyDealDefaultsWithValidation).toHaveBeenCalledWith(
        { name: 'Test Record' },
        false
      );
      expect(createObjectRecord).toHaveBeenCalledWith('deals', mockDealData);
      expect(result).toEqual(mockDeal);
    });

    it('should create a task record with field transformation', async () => {
      const mockTaskRecord: AttioRecord = {
        id: { record_id: 'task_ghi', task_id: 'task_ghi' },
        values: { content: 'Test Task' },
      };
      vi.mocked(MockService.createTask).mockResolvedValue(mockTaskRecord);

      // Mock field mapping for tasks
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: {
          content: 'Test Task',
          assignees: 'user_123',
          deadline_at: '2024-02-01',
          linked_records: 'comp_123',
        },
        warnings: [],
        errors: [],
      });

      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.TASKS,
        record_data: {
          values: {
            content: 'Test Task',
            assignees: 'user_123',
            deadline_at: '2024-02-01',
            linked_records: 'comp_123',
          },
        },
      });

      expect(MockService.createTask).toHaveBeenCalledWith({
        content: 'Test Task',
        title: 'Test Task',
        assigneeId: 'user_123',
        dueDate: '2024-02-01',
        recordId: 'comp_123',
      });
      expect(result).toEqual(mockTaskRecord);
    });

    it('should handle field validation errors', async () => {
      vi.mocked(validateFields).mockReturnValue({
        valid: false,
        warnings: [],
        suggestions: ['Try using "name" instead'],
        errors: ['Invalid field: xyz'],
      });

      await expect(
        UniversalCreateService.createRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: { values: { xyz: 'Invalid' } },
        })
      ).rejects.toThrow('Field validation failed for companies');
    });

    it('should handle field mapping errors', async () => {
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: {},
        warnings: [],
        errors: ['Mapping error: conflicting fields'],
      });

      await expect(
        UniversalCreateService.createRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: { values: { name: 'Test' } },
        })
      ).rejects.toThrow('Mapping error: conflicting fields');
    });

    it('should handle enhanced validation when enabled', async () => {
      process.env.ENABLE_ENHANCED_VALIDATION = 'true';

      vi.mocked(validateRecordFields).mockResolvedValue({
        isValid: false,
        error: 'Enhanced validation failed',
      });

      await expect(
        UniversalCreateService.createRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: { values: { name: 'Test' } },
        })
      ).rejects.toThrow('Enhanced validation failed');
    });

    it('should handle company creation with null result', async () => {
      vi.mocked(MockService.createCompany).mockResolvedValue(null as any);

      await expect(
        UniversalCreateService.createRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: { values: { name: 'Test Company' } },
        })
      ).rejects.toThrow(
        'Company creation failed: createCompany returned null/undefined'
      );
    });

    it('should handle company creation with invalid ID structure', async () => {
      vi.mocked(MockService.createCompany).mockResolvedValue({
        values: { name: 'Test Company' },
      } as any);

      await expect(
        UniversalCreateService.createRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: { values: { name: 'Test Company' } },
        })
      ).rejects.toThrow('Company creation failed: Invalid record structure');
    });

    it('should handle attribute not found errors with suggestions', async () => {
      const error = new Error(
        'Cannot find attribute with slug/ID "invalid_field"'
      );
      vi.mocked(MockService.createCompany).mockRejectedValue(error);
      vi.mocked(getFieldSuggestions).mockReturnValue('Did you mean "name"?');
      vi.mocked(getFormatErrorHelp).mockReturnValue('Enhanced error message');

      await expect(
        UniversalCreateService.createRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: { values: { name: 'Test Company' } },
        })
      ).rejects.toThrow('Enhanced error message');
    });

    it('should handle uniqueness constraint errors', async () => {
      const error = new Error(
        'uniqueness constraint violation for field "name"'
      );
      vi.mocked(MockService.createCompany).mockRejectedValue(error);

      await expect(
        UniversalCreateService.createRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: { values: { name: 'Duplicate Company' } },
        })
      ).rejects.toThrow('Uniqueness constraint violation for companies');
    });

    it('should handle deals with stage validation failure and retry', async () => {
      const originalData = { name: 'Test Deal', stage: 'invalid-stage' };
      const defaultData = { name: 'Test Deal', stage: 'default-stage' };
      const mockDeal: AttioRecord = {
        id: { record_id: 'deal_123' },
        values: { name: 'Test Deal' },
      };

      vi.mocked(applyDealDefaultsWithValidation)
        .mockResolvedValueOnce(originalData) // First call fails
        .mockResolvedValueOnce(defaultData); // Second call with defaults

      vi.mocked(createObjectRecord)
        .mockRejectedValueOnce(new Error('Cannot find Status "invalid-stage"'))
        .mockResolvedValueOnce(mockDeal);

      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.DEALS,
        record_data: { values: { name: 'Test Deal', stage: 'invalid-stage' } },
      });

      expect(createObjectRecord).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockDeal);
    });

    it('should handle task creation with empty content', async () => {
      // Set E2E mode to test mock data path
      process.env.E2E_MODE = 'true';

      const mockTaskRecord: AttioRecord = {
        id: { record_id: 'task_123', task_id: 'task_123' },
        values: { content: 'New task' }, // Default content will be used
      };
      vi.mocked(MockService.createTask).mockResolvedValue(mockTaskRecord);

      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { content: '' },
        warnings: [],
        errors: [],
      });

      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.TASKS,
        record_data: { values: { content: '' } },
      });

      expect(result).toEqual(mockTaskRecord);
      expect(MockService.createTask).toHaveBeenCalledWith({
        content: 'New task', // Default content used when input is empty
        title: 'New task', // Dual field support
      });
    });

    it('should throw error when title is provided instead of content', async () => {
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { title: 'Task Title' }, // Using 'title' instead of 'content'
        warnings: [],
        errors: [],
      });

      await expect(
        UniversalCreateService.createRecord({
          resource_type: UniversalResourceType.TASKS,
          record_data: { values: { title: 'Task Title' } },
        })
      ).rejects.toThrow('Use content instead of title');
    });

    it('should handle task creation with field mapping and conversion', async () => {
      // Set E2E mode to test mock data path
      process.env.E2E_MODE = 'true';

      const mockTaskRecord: AttioRecord = {
        id: { record_id: 'task_123', task_id: 'task_123' },
        values: { content: 'Test Task' },
      };
      vi.mocked(MockService.createTask).mockResolvedValue(mockTaskRecord);

      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { content: 'Test Task' },
        warnings: [],
        errors: [],
      });

      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.TASKS,
        record_data: { values: { content: 'Test Task' } },
      });

      expect(result).toEqual(mockTaskRecord); // Should return mock data directly in E2E mode
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
      vi.mocked(MockService.createCompany).mockResolvedValue(mockCompany);

      const result = await UniversalCreateService.createRecord({
        resource_type: 'company' as any,
        record_data: { values: { name: 'Test Company' } },
      });

      expect(result).toEqual(mockCompany);
    });

    it('should handle unsupported resource type without correction', async () => {
      vi.mocked(validateResourceType).mockReturnValue({
        corrected: null,
        suggestion: 'Valid resource types are: companies, people, lists',
      });

      await expect(
        UniversalCreateService.createRecord({
          resource_type: 'invalid' as any,
          record_data: { values: { name: 'Test' } },
        })
      ).rejects.toThrow('Unsupported resource type: invalid');
    });

    it('should handle task creation errors with enhanced error handling', async () => {
      const originalError = new Error('Task creation failed');
      vi.mocked(MockService.createTask).mockRejectedValue(originalError);
      vi.mocked(ErrorEnhancer.autoEnhance).mockReturnValue(
        new Error('Enhanced task error')
      );

      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { content: 'Test Task' },
        warnings: [],
        errors: [],
      });

      await expect(
        UniversalCreateService.createRecord({
          resource_type: UniversalResourceType.TASKS,
          record_data: { values: { content: 'Test Task' } },
        })
      ).rejects.toThrow('Enhanced task error');

      expect(ErrorEnhancer.autoEnhance).toHaveBeenCalledWith(
        originalError,
        'tasks',
        'create-record'
      );
    });

    it('should handle field validation warnings and suggestions logging', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(validateFields).mockReturnValue({
        valid: true,
        warnings: ['Field warning 1', 'Field warning 2'],
        suggestions: ['Suggestion 1', 'Suggestion 2'],
        errors: [],
      });

      const mockCompany: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Test Company' },
      };
      vi.mocked(MockService.createCompany).mockResolvedValue(mockCompany);

      await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_data: { values: { name: 'Test Company' } },
      });

      expect(console.error).toHaveBeenCalledWith(
        'Field validation warnings:',
        'Field warning 1\nField warning 2'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Field suggestions:',
        'Suggestion 1\nSuggestion 2'
      );

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
