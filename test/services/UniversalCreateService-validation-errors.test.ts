/**
 * Split: UniversalCreateService validation and error handling
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('../../src/services/ValidationService.js', () => ({
  ValidationService: {
    truncateSuggestions: vi.fn((s: string[]) => s),
    validateEmailAddresses: vi.fn(),
  },
}));
vi.mock('../../src/handlers/tool-configs/universal/field-mapper.js', () => ({
  mapRecordFields: vi.fn(),
  validateResourceType: vi.fn(),
  getFieldSuggestions: vi.fn(),
  validateFields: vi.fn(),
  getValidResourceTypes: vi.fn(() => ''),
  FIELD_MAPPINGS: {},
}));
vi.mock('../../src/utils/validation-utils.js', () => ({
  validateRecordFields: vi.fn(),
}));
vi.mock('../../src/utils/attribute-format-helpers.js', () => ({
  convertAttributeFormats: vi.fn((t: string, d: any) => d),
  getFormatErrorHelp: vi.fn(
    (t: string, f: string, m: string) => `Enhanced: ${m}`
  ),
}));
vi.mock('../../src/errors/enhanced-api-errors.js', () => ({
  EnhancedApiError: vi
    .fn()
    .mockImplementation(
      (
        message: string,
        statusCode: number,
        endpoint: string,
        method: string
      ) => {
        const e: any = new Error(message);
        e.statusCode = statusCode;
        e.endpoint = endpoint;
        e.method = method;
        e.name = 'EnhancedApiError';
        return e;
      }
    ),
  ErrorEnhancer: { autoEnhance: vi.fn((e: any) => e) },
  ErrorTemplates: {
    TASK_FIELD_MAPPING: vi.fn(
      (a: string, b: string) => new Error(`Use ${b} instead of ${a}`)
    ),
  },
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

import { UniversalCreateService } from '../../src/services/UniversalCreateService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { getCreateService } from '../../src/services/create/index.js';
import {
  validateFields,
  mapRecordFields,
  getFieldSuggestions,
  validateResourceType,
} from '../../src/handlers/tool-configs/universal/field-mapper.js';
import { validateRecordFields } from '../../src/utils/validation-utils.js';
import {
  ErrorEnhancer,
  EnhancedApiError,
} from '../../src/errors/enhanced-api-errors.js';
import { getFormatErrorHelp } from '../../src/utils/attribute-format-helpers.js';

describe('UniversalCreateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ENABLE_ENHANCED_VALIDATION;

    // Setup default mock returns
    vi.mocked(validateFields).mockReturnValue({
      valid: true,
      warnings: [],
      suggestions: [],
      errors: [],
    } as any);

    vi.mocked(validateResourceType).mockReturnValue(true);

    vi.mocked(mapRecordFields).mockImplementation(
      (resourceType: string, data: any) =>
        ({
          mapped: data,
          warnings: [],
          errors: [],
        }) as any
    );
  });

  describe('createRecord - validation/errors', () => {
    it('should handle field validation errors', async () => {
      vi.mocked(validateFields).mockReturnValue({
        valid: false,
        warnings: [],
        suggestions: ['Try using "name" instead'],
        errors: ['Invalid field: xyz'],
      } as any);
      await expect(
        UniversalCreateService.createRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: { values: { xyz: 'Invalid' } },
        })
      ).rejects.toThrow('Validation failed for companies');
    });

    it('should handle field mapping errors', async () => {
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: {},
        warnings: [],
        errors: ['Mapping error: conflicting fields'],
      } as any);
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
      } as any);
      await expect(
        UniversalCreateService.createRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: { values: { name: 'Test' } },
        })
      ).rejects.toThrow('Enhanced validation failed');
    });

    it('should handle company creation with null result', async () => {
      mockCreateService.createCompany.mockResolvedValue(null as any);
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
      mockCreateService.createCompany.mockResolvedValue({
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
      mockCreateService.createCompany.mockRejectedValue(error);
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
      mockCreateService.createCompany.mockRejectedValue(error);
      await expect(
        UniversalCreateService.createRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_data: { values: { name: 'Duplicate Company' } },
        })
      ).rejects.toThrow('Uniqueness constraint violation for companies');
    });

    it('should handle unsupported resource type with correction', async () => {
      vi.mocked(validateResourceType).mockReturnValue({
        valid: false,
        corrected: UniversalResourceType.COMPANIES,
        suggestion: 'Did you mean "companies"?',
      } as any);
      mockCreateService.createCompany.mockResolvedValue({
        id: { record_id: 'comp_123' },
        values: { name: 'Test Company' },
      } as any);
      const result = await UniversalCreateService.createRecord({
        resource_type: 'company' as any,
        record_data: { values: { name: 'Test Company' } },
      });
      expect(result).toBeDefined();
    });

    it('should handle unsupported resource type without correction', async () => {
      vi.mocked(validateResourceType).mockReturnValue({
        valid: false,
        corrected: undefined,
        suggestion: 'Valid resource types are: companies, people, lists',
      } as any);
      await expect(
        UniversalCreateService.createRecord({
          resource_type: 'invalid' as any,
          record_data: { values: { name: 'Test' } },
        })
      ).rejects.toThrow('Unsupported resource type: invalid');
    });

    it('should handle task creation errors with enhanced error handling', async () => {
      const originalError = new Error('Task creation failed');
      mockCreateService.createTask.mockRejectedValue(originalError);
      vi.mocked(ErrorEnhancer.autoEnhance).mockReturnValue(
        new EnhancedApiError(
          'Enhanced task error',
          400,
          '/api/tasks',
          'POST'
        ) as any
      );
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { content: 'Test Task' },
        warnings: [],
        errors: [],
      } as any);
      await expect(
        UniversalCreateService.createRecord({
          resource_type: UniversalResourceType.TASKS,
          record_data: { values: { content: 'Test Task' } },
        })
      ).rejects.toThrow('Enhanced task error');
    });

    it('should handle field validation warnings and suggestions logging', async () => {
      process.env.E2E_MODE = 'true';
      vi.mocked(validateFields).mockReturnValue({
        valid: true,
        warnings: ['Field warning 1', 'Field warning 2'],
        suggestions: ['Suggestion 1', 'Suggestion 2'],
        errors: [],
      } as any);
      mockCreateService.createCompany.mockResolvedValue({
        id: { record_id: 'comp_123' },
        values: { name: 'Test Company' },
      } as any);
      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_data: { values: { name: 'Test Company' } },
      });
      expect(result).toBeDefined();
    });
  });
});
