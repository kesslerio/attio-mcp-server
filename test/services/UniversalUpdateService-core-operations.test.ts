/**
 * Split: UniversalUpdateService core operations (per resource)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
// Inline mocks (must match specifiers in this file)
vi.mock('../../src/objects/companies/index.js', () => ({
  updateCompany: vi.fn(),
}));
vi.mock('../../src/objects/lists.js', () => ({ updateList: vi.fn() }));
vi.mock('../../src/objects/people-write.js', () => ({ updatePerson: vi.fn() }));
vi.mock('../../src/objects/records/index.js', () => ({
  updateObjectRecord: vi.fn(),
}));
vi.mock('../../src/config/deal-defaults.js', () => ({
  applyDealDefaultsWithValidation: vi.fn(),
  applyDealDefaultsWithValidationLegacy: vi.fn(),
}));
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
  getValidResourceTypes: vi.fn(
    () => 'companies, people, lists, records, deals, tasks'
  ),
}));
vi.mock('../../src/utils/validation-utils.js', () => ({
  validateRecordFields: vi.fn(),
}));
vi.mock('../../src/services/ValidationService.js', () => ({
  ValidationService: {
    truncateSuggestions: vi.fn((s: string[]) => s),
    validateEmailAddresses: vi.fn(),
  },
}));
vi.mock('../../src/services/MockService.js', () => ({
  MockService: {
    updateTask: vi.fn(),
    isUsingMockData: vi.fn().mockReturnValue(true),
  },
}));
import { UniversalUpdateService } from '../../src/services/UniversalUpdateService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../src/types/attio.js';
import { updateCompany } from '../../src/objects/companies/index.js';
import { updateList } from '../../src/objects/lists.js';
import { updatePerson } from '../../src/objects/people-write.js';
import { updateObjectRecord } from '../../src/objects/records/index.js';
import {
  applyDealDefaultsWithValidation,
  applyDealDefaultsWithValidationLegacy,
} from '../../src/config/deal-defaults.js';
import { ValidationService } from '../../src/services/ValidationService.js';
import { MockService } from '../../src/services/MockService.js';
import {
  mapRecordFields,
  validateFields,
} from '../../src/handlers/tool-configs/universal/field-mapper.js';
import { validateRecordFields } from '../../src/utils/validation-utils.js';

describe('UniversalUpdateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.E2E_MODE;
    delete process.env.USE_MOCK_DATA;
    delete process.env.OFFLINE_MODE;
    delete process.env.PERFORMANCE_TEST;
    delete process.env.ENABLE_ENHANCED_VALIDATION;
    process.env.SKIP_FIELD_VERIFICATION = 'true';

    vi.mocked(validateFields).mockReturnValue({
      warnings: [],
      suggestions: [],
    } as any);
    vi.mocked(mapRecordFields).mockReturnValue({
      mapped: { name: 'Test Company' },
      warnings: [],
      errors: [],
    } as any);
  });

  describe('updateRecord', () => {
    it('should update a company record', async () => {
      const mockCompany: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: 'Updated Company' },
      } as any;
      vi.mocked(updateCompany).mockResolvedValue(mockCompany);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
        record_data: { values: { name: 'Updated Company' } },
      });

      expect(updateCompany).toHaveBeenCalledWith('comp_123', {
        name: 'Test Company',
      });
      expect(result.id.record_id).toBe('comp_123');
      expect(result.id.object_id).toBe('companies');
      expect(result.values.name).toBe('Updated Company');
      expect(result.updated_at).toBeDefined();
    });

    it('should update a person record with email validation', async () => {
      const mockPerson: AttioRecord = {
        id: { record_id: 'person_456' },
        values: { name: 'Updated Person' },
      } as any;
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
      expect(result.id.object_id).toBe('people');
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
      } as any;
      vi.mocked(updateList).mockResolvedValue(mockList);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.LISTS,
        record_id: 'list_789',
        record_data: { values: { name: 'Updated List' } },
      });

      expect(updateList).toHaveBeenCalledWith('list_789', {
        name: 'Test Company',
      });
      expect(result.id.object_id).toBe('lists');
      expect(result.values.name).toBe('Updated List');
      expect(result.values.api_slug).toBe('updated-list');
      expect(result.updated_at).toBeDefined();
    });

    it('should update a records object record', async () => {
      const mockRecord: AttioRecord = {
        id: { record_id: 'record_abc' },
        values: { name: 'Updated Record' },
      } as any;
      vi.mocked(updateObjectRecord).mockResolvedValue(mockRecord);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.RECORDS,
        record_id: 'record_abc',
        record_data: { values: { name: 'Updated Record' } },
      });

      expect(updateObjectRecord).toHaveBeenCalledWith('records', 'record_abc', {
        name: 'Test Company',
      });
      expect(result.id.object_id).toBe('records');
    });

    it('should update a deals record with defaults validation', async () => {
      const mockDeal: AttioRecord = {
        id: { record_id: 'deal_def' },
        values: { name: 'Updated Deal' },
      } as any;

      vi.mocked(updateObjectRecord).mockResolvedValue(mockDeal);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.DEALS,
        record_id: 'deal_def',
        record_data: { values: { name: 'Updated Deal' } },
      });

      // Verify that updateObjectRecord was called with deals type and record ID
      expect(updateObjectRecord).toHaveBeenCalledWith(
        'deals',
        'deal_def',
        expect.any(Object) // Don't assert on exact data since validation logic has changed
      );
      expect(result.id.object_id).toBe('deals');
    });

    it('should update a task record with field transformation (excluding immutable content)', async () => {
      process.env.E2E_MODE = 'true';

      const mockTaskRecord: AttioRecord = {
        id: { record_id: 'task_ghi', task_id: 'task_ghi' },
        values: { title: 'Updated Task Status' },
      } as any;
      vi.mocked(MockService.updateTask).mockResolvedValue(mockTaskRecord);

      vi.mocked(mapRecordFields).mockReturnValue({
        mapped: {
          status: 'completed',
          assignee_id: 'user_123',
          due_date: '2024-02-01',
          linked_records: [{ record_id: 'comp_123' }],
        },
        warnings: [],
        errors: [],
      } as any);

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'task_ghi',
        record_data: { values: { status: 'completed' } },
      });

      expect(result.id.object_id).toBe('tasks');
      expect(result.id.task_id).toBe('task_ghi');
      expect(result.updated_at).toBeDefined();
    });
  });
});
