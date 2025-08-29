/**
 * Split: UniversalCreateService core resources (companies, people, lists)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('../../src/services/ValidationService.js', () => ({
  ValidationService: {
    truncateSuggestions: vi.fn((s: string[]) => s),
    validateEmailAddresses: vi.fn(),
  },
}));
vi.mock('../../src/services/UniversalUtilityService.js', () => ({
  UniversalUtilityService: { convertTaskToRecord: vi.fn() },
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
  convertAttributeFormats: vi.fn((type: string, data: any) => data),
  getFormatErrorHelp: vi.fn(
    (type: string, field: string, message: string) => `Enhanced: ${message}`
  ),
  validatePeopleAttributesPrePost: vi.fn(),
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
  PeopleDataNormalizer: { normalizePeopleData: vi.fn((d: any) => d) },
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
        const error: any = new Error(message);
        error.statusCode = statusCode;
        error.endpoint = endpoint;
        error.method = method;
        error.name = 'EnhancedApiError';
        return error;
      }
    ),
  ErrorTemplates: {
    TASK_FIELD_MAPPING: vi.fn(
      (tried: string, correct: string) =>
        new Error(`Use ${correct} instead of ${tried}`)
    ),
  },
  ErrorEnhancer: { autoEnhance: vi.fn((e: any) => e) },
}));
vi.mock('../../src/utils/logger.js', () => ({
  debug: vi.fn(),
  createScopedLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  OperationType: { API_CALL: 'api_call' },
}));
vi.mock('../../src/objects/companies/index.js', () => ({
  createCompany: vi.fn(),
}));
vi.mock('../../src/objects/lists.js', () => ({ createList: vi.fn() }));
vi.mock('../../src/objects/people/index.js', () => ({ createPerson: vi.fn() }));
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

import { UniversalCreateService } from '../../src/services/UniversalCreateService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../src/types/attio.js';
import { ValidationService } from '../../src/services/ValidationService.js';
import { PeopleDataNormalizer } from '../../src/utils/normalization/people-normalization.js';
import { convertAttributeFormats } from '../../src/utils/attribute-format-helpers.js';
import { createList } from '../../src/objects/lists.js';
import { MockService } from '../../src/services/MockService.js';
import {
  validateFields,
  mapRecordFields,
} from '../../src/handlers/tool-configs/universal/field-mapper.js';

describe('UniversalCreateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.E2E_MODE;
    delete process.env.USE_MOCK_DATA;
    delete process.env.OFFLINE_MODE;
    delete process.env.PERFORMANCE_TEST;
    delete process.env.ENABLE_ENHANCED_VALIDATION;

    // Setup default mock returns
    vi.mocked(validateFields).mockReturnValue({
      valid: true,
      warnings: [],
      suggestions: [],
      errors: [],
    } as any);

    vi.mocked(mapRecordFields).mockImplementation(
      (resourceType: string, data: any) =>
        ({
          mapped: data,
          warnings: [],
          errors: [],
        }) as any
    );
  });

  describe('createRecord', () => {
    it('should create a company record', async () => {
      const mockCompany: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Test Company' },
      } as any;
      vi.mocked(MockService.createCompany).mockResolvedValue(mockCompany);

      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_data: { values: { name: 'Test Company' } },
      });

      expect(convertAttributeFormats).toHaveBeenCalledWith('companies', {
        name: 'Test Company',
      });
      expect(MockService.createCompany).toHaveBeenCalled();
      expect(result).toEqual(mockCompany);
    });

    it('should create a person record with email validation', async () => {
      const mockPerson: AttioRecord = {
        id: { record_id: 'person_456' },
        values: { name: 'John Doe' },
      } as any;
      vi.mocked(MockService.createPerson).mockResolvedValue(mockPerson);

      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.PEOPLE,
        record_data: { values: { name: 'John Doe' } },
      });

      expect(ValidationService.validateEmailAddresses).toHaveBeenCalledWith({
        name: 'John Doe',
      });
      expect(PeopleDataNormalizer.normalizePeopleData).toHaveBeenCalled();
      expect(convertAttributeFormats).toHaveBeenCalledWith('people', {
        name: 'John Doe',
      });
      expect(MockService.createPerson).toHaveBeenCalled();
      expect(result).toEqual(mockPerson);
    });

    it('should create a list record and convert format', async () => {
      const mockList = {
        id: { list_id: 'list_789' },
        title: 'Test List',
        name: 'Test List',
        description: 'Test description',
        object_slug: 'companies',
        api_slug: 'test-list',
        workspace_id: 'ws_123',
        workspace_member_access: 'read',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      } as any;
      vi.mocked(createList).mockResolvedValue(mockList);

      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.LISTS,
        record_data: { values: { name: 'Test List' } },
      });

      expect(createList).toHaveBeenCalledWith({ name: 'Test List' });
      expect(result).toEqual({
        id: { record_id: 'list_789', list_id: 'list_789' },
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
  });
});
