import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLazyAttioClient } from '@/api/lazy-client.js';
import {
  CrossResourceValidator,
  ErrorType,
  HttpStatusCode,
  UniversalValidationError,
} from '@/handlers/tool-configs/universal/schemas.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';

vi.mock('@/api/lazy-client.js');

describe('CrossResourceValidator company relationship extraction', () => {
  const mockGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: {} });
    vi.mocked(getLazyAttioClient).mockReturnValue({
      get: mockGet,
    } as unknown as ReturnType<typeof getLazyAttioClient>);
  });

  it.each([
    {
      name: 'company_id string',
      recordData: { company_id: 'company-001' },
      expectedCompanyId: 'company-001',
    },
    {
      name: 'company string',
      recordData: { company: 'company-002' },
      expectedCompanyId: 'company-002',
    },
    {
      name: 'company object with id',
      recordData: { company: { id: 'company-003' } },
      expectedCompanyId: 'company-003',
    },
    {
      name: 'company object with record_id',
      recordData: { company: { record_id: 'company-004' } },
      expectedCompanyId: 'company-004',
    },
    {
      name: 'company object with target_record_id',
      recordData: { company: { target_record_id: 'company-005' } },
      expectedCompanyId: 'company-005',
    },
    {
      name: 'company object with nested id.record_id',
      recordData: { company: { id: { record_id: 'company-005b' } } },
      expectedCompanyId: 'company-005b',
    },
    {
      name: 'company array with Attio record reference',
      recordData: {
        company: [
          {
            target_object: 'companies',
            target_record_id: 'company-006',
          },
        ],
      },
      expectedCompanyId: 'company-006',
    },
    {
      name: 'company array falls back to object without target_object',
      recordData: {
        company: [{}, { record_id: 'company-007' }],
      },
      expectedCompanyId: 'company-007',
    },
    {
      name: 'company array falls back to string ID',
      recordData: {
        company: [{}, 'company-008'],
      },
      expectedCompanyId: 'company-008',
    },
    {
      name: 'company array prefers entries targeting companies',
      recordData: {
        company: [
          {
            target_object: 'people',
            target_record_id: 'person-001',
          },
          {
            target_object: 'companies',
            target_record_id: 'company-009',
          },
        ],
      },
      expectedCompanyId: 'company-009',
    },
  ])(
    'extracts and validates company ID from $name',
    async ({ recordData, expectedCompanyId }) => {
      await CrossResourceValidator.validateRecordRelationships(
        UniversalResourceType.PEOPLE,
        recordData
      );

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith(
        `/objects/companies/records/${expectedCompanyId}`
      );
    }
  );

  it.each([
    {
      name: 'empty company object',
      recordData: { company: {} },
    },
    {
      name: 'blank company string',
      recordData: { company: '   ' },
    },
    {
      name: 'blank company_id string',
      recordData: { company_id: '   ' },
    },
    {
      name: 'non-company target object',
      recordData: {
        company: {
          target_object: 'people',
          target_record_id: 'person-002',
        },
      },
    },
    {
      name: 'array with only non-company targets',
      recordData: {
        company: [
          {
            target_object: 'people',
            target_record_id: 'person-003',
          },
        ],
      },
    },
    {
      name: 'array with only invalid values',
      recordData: {
        company: [{}, null, '   '],
      },
    },
  ])('skips company validation for $name', async ({ recordData }) => {
    await expect(
      CrossResourceValidator.validateRecordRelationships(
        UniversalResourceType.PEOPLE,
        recordData
      )
    ).resolves.toBeUndefined();

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('throws user error with NOT_FOUND when company does not exist', async () => {
    mockGet.mockRejectedValue({ response: { status: 404 } });

    try {
      await CrossResourceValidator.validateRecordRelationships(
        UniversalResourceType.PEOPLE,
        { company: 'company-missing' }
      );
      expect.fail('Expected a UniversalValidationError for missing company');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(UniversalValidationError);
      const validationError = error as UniversalValidationError;
      expect(validationError.errorType).toBe(ErrorType.USER_ERROR);
      expect(validationError.httpStatusCode).toBe(HttpStatusCode.NOT_FOUND);
      expect(validationError.field).toBe('company_id');
      expect(validationError.message).toBe(
        "Company with ID 'company-missing' does not exist"
      );
    }
  });

  it('throws api error with BAD_GATEWAY when Attio lookup fails', async () => {
    mockGet.mockRejectedValue(new Error('network down'));

    try {
      await CrossResourceValidator.validateRecordRelationships(
        UniversalResourceType.PEOPLE,
        {
          company: [
            { target_object: 'companies', target_record_id: 'company-010' },
          ],
        }
      );
      expect.fail('Expected a UniversalValidationError for API lookup failure');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(UniversalValidationError);
      const validationError = error as UniversalValidationError;
      expect(validationError.errorType).toBe(ErrorType.API_ERROR);
      expect(validationError.httpStatusCode).toBe(HttpStatusCode.BAD_GATEWAY);
      expect(validationError.field).toBe('company_id');
      expect(validationError.message).toContain(
        'Failed to validate company existence: network down'
      );
    }
  });
});
