/**
 * Split: UniversalCreateService objects/deals/tasks operations
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
  getValidResourceTypes: vi.fn(
    () => 'companies, people, lists, records, deals, tasks'
  ),
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
vi.mock('../../src/config/deal-defaults.js', () => ({
  applyDealDefaultsWithValidation: vi.fn(),
  getDealDefaults: vi.fn(() => ({ stage: 'default-stage' })),
  validateDealInput: vi.fn(() => ({
    isValid: true,
    suggestions: [],
    warnings: [],
  })),
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
vi.mock('../../src/objects/records/index.js', () => ({
  createObjectRecord: vi.fn(),
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
import { AttioRecord } from '../../src/types/attio.js';
import {
  applyDealDefaultsWithValidation,
  validateDealInput,
} from '../../src/config/deal-defaults.js';
import { createObjectRecord } from '../../src/objects/records/index.js';
import { getCreateService } from '../../src/services/create/index.js';
import {
  mapRecordFields,
  getFieldSuggestions,
  validateFields,
} from '../../src/handlers/tool-configs/universal/field-mapper.js';
import { getFormatErrorHelp } from '../../src/utils/attribute-format-helpers.js';

describe('UniversalCreateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.E2E_MODE;

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

  describe('createRecord - objects/deals/tasks', () => {
    it('should create a records object record', async () => {
      const mockRecord: AttioRecord = {
        id: { record_id: 'record_abc' },
        values: { name: 'Test Record' },
      } as any;
      vi.mocked(createObjectRecord).mockResolvedValue(mockRecord);
      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.RECORDS,
        record_data: { values: { name: 'Test Record' }, object: 'companies' },
      });
      expect(createObjectRecord).toHaveBeenCalledWith('companies', {
        values: { name: 'Test Record' },
      });
      expect(result).toEqual(mockRecord);
    });

    it('should create a deals record with defaults validation', async () => {
      const mockDeal: AttioRecord = {
        id: { record_id: 'deal_def' },
        values: { name: 'Test Deal' },
      } as any;
      const mockDealData = { name: 'Test Deal', stage: 'qualified' } as any;
      vi.mocked(applyDealDefaultsWithValidation).mockResolvedValue(
        mockDealData
      );
      vi.mocked(createObjectRecord).mockResolvedValue(mockDeal);
      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.DEALS,
        record_data: { values: { name: 'Test Deal' } },
      });
      expect(validateDealInput).toHaveBeenCalledWith({ name: 'Test Deal' });
      expect(applyDealDefaultsWithValidation).toHaveBeenCalled();
      expect(result).toEqual(mockDeal);
    });

    it('should create a task record with field transformation', async () => {
      const mockTaskRecord: AttioRecord = {
        id: { record_id: 'task_ghi', task_id: 'task_ghi' },
        values: { content: 'Test Task' },
      } as any;
      mockCreateService.createTask.mockResolvedValue(mockTaskRecord);
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: {
          content: 'Test Task',
          assignees: 'user_123',
          deadline_at: '2024-02-01',
          linked_records: 'comp_123',
        },
        warnings: [],
        errors: [],
      } as any);
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
      expect(mockCreateService.createTask).toHaveBeenCalledWith({
        content: 'Test Task',
        assigneeId: 'user_123',
        dueDate: '2024-02-01',
        recordId: 'comp_123',
      });
      expect(result).toEqual(mockTaskRecord);
    });

    it('should handle deals with stage validation failure and retry', async () => {
      const originalData = { name: 'Test Deal', stage: 'invalid-stage' } as any;
      const defaultData = { name: 'Test Deal', stage: 'default-stage' } as any;
      const mockDeal: AttioRecord = {
        id: { record_id: 'deal_123' },
        values: { name: 'Test Deal' },
      } as any;
      vi.mocked(applyDealDefaultsWithValidation)
        .mockResolvedValueOnce(originalData)
        .mockResolvedValueOnce(defaultData);
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

    it('should handle task creation with empty content (E2E mode)', async () => {
      process.env.E2E_MODE = 'true';
      const mockTaskRecord: AttioRecord = {
        id: { record_id: 'task_123', task_id: 'task_123' },
        values: { content: 'New task' },
      } as any;
      mockCreateService.createTask.mockResolvedValue(mockTaskRecord);
      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: { content: '' },
        warnings: [],
        errors: [],
      } as any);
      const result = await UniversalCreateService.createRecord({
        resource_type: UniversalResourceType.TASKS,
        record_data: { values: { content: '' } },
      });
      expect(result).toEqual(mockTaskRecord);
      expect(mockCreateService.createTask).toHaveBeenCalledWith({
        content: 'New task',
      });
    });
  });
});
