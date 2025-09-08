/**
 * Split: UniversalCreateService core resources (companies, people, lists)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AttioRecord } from '../../src/types/attio.js';
import { convertAttributeFormats } from '../../src/utils/attribute-format-helpers.js';
import { createList } from '../../src/objects/lists.js';
import { getCreateService } from '../../src/services/create/index.js';
import { PeopleDataNormalizer } from '../../src/utils/normalization/people-normalization.js';
import { UniversalCreateService } from '../../src/services/UniversalCreateService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { ValidationService } from '../../src/services/ValidationService.js';

vi.mock('../../src/services/create/index.js', () => ({
  getCreateService: vi.fn(() => mockCreateService),
  shouldUseMockData: vi.fn(() => true),
}));

import { UniversalCreateService } from '../../src/services/UniversalCreateService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../src/types/attio.js';
import { ValidationService } from '../../src/services/ValidationService.js';
import { PeopleDataNormalizer } from '../../src/utils/normalization/people-normalization.js';
import { convertAttributeFormats } from '../../src/utils/attribute-format-helpers.js';
import { createList } from '../../src/objects/lists.js';
import { getCreateService } from '../../src/services/create/index.js';
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
      (resourceType: string, data: unknown) =>
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
      mockCreateService.createCompany.mockResolvedValue(mockCompany);

        resource_type: UniversalResourceType.COMPANIES,
        record_data: { values: { name: 'Test Company' } },
      });

      expect(convertAttributeFormats).toHaveBeenCalledWith('companies', {
        name: 'Test Company',
      });
      expect(mockCreateService.createCompany).toHaveBeenCalled();
      expect(result).toEqual(mockCompany);
    });

    it('should create a person record with email validation', async () => {
      const mockPerson: AttioRecord = {
        id: { record_id: 'person_456' },
        values: { name: 'John Doe' },
      } as any;
      mockCreateService.createPerson.mockResolvedValue(mockPerson);

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
      expect(mockCreateService.createPerson).toHaveBeenCalled();
      expect(result).toEqual(mockPerson);
    });

    it('should create a list record and convert format', async () => {
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
