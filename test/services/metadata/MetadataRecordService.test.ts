import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultMetadataRecordService } from '../../../src/services/metadata/MetadataRecordService.js';
import { DefaultMetadataErrorService } from '../../../src/services/metadata/MetadataErrorService.js';
import { UniversalResourceType } from '../../../src/handlers/tool-configs/universal/types.js';

const mockGet = vi.fn();
const mockClient = { get: mockGet };

const service = new DefaultMetadataRecordService(
  new DefaultMetadataErrorService()
);

describe('DefaultMetadataRecordService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).setTestApiClient?.(mockClient);
  });

  it('returns record attribute values when present', async () => {
    const recordValues = { name: 'Acme Corp' };
    mockGet.mockResolvedValue({ data: { data: { values: recordValues } } });

    const result = await service.getAttributesForRecord(
      UniversalResourceType.COMPANIES,
      'company_1'
    );

    expect(mockGet).toHaveBeenCalledWith(
      '/objects/companies/records/company_1'
    );
    expect(result).toEqual(recordValues);
  });

  it('throws structured error when record fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('Not found'));

    await expect(
      service.getAttributesForRecord(UniversalResourceType.PEOPLE, 'person_1')
    ).rejects.toThrowError('Failed to get record attributes: Not found');
  });
});
