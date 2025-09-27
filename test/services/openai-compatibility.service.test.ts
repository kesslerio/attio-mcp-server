import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenAiCompatibilityService } from '@/services/OpenAiCompatibilityService.js';
import { UniversalSearchService } from '@/services/UniversalSearchService.js';
import { UniversalRetrievalService } from '@/services/UniversalRetrievalService.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import type { AttioRecord } from '@/types/attio.js';

const companyRecord: AttioRecord = {
  id: {
    record_id: 'company-1',
  },
  values: {
    name: [
      {
        value: 'Acme Inc.',
      },
    ],
    description: [
      {
        value: 'Road-runner deterrent specialists',
      },
    ],
  },
};

const personRecord: AttioRecord = {
  id: {
    record_id: 'person-1',
  },
  values: {
    name: [
      {
        value: 'Wile E. Coyote',
      },
    ],
    job_title: [
      {
        value: 'Inventor',
      },
    ],
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OpenAiCompatibilityService.search', () => {
  it('aggregates results across resource types', async () => {
    const searchSpy = vi
      .spyOn(UniversalSearchService, 'searchRecords')
      .mockImplementation(async ({ resource_type }) => {
        if (resource_type === UniversalResourceType.COMPANIES) {
          return [companyRecord];
        }

        if (resource_type === UniversalResourceType.PEOPLE) {
          return [personRecord];
        }

        return [];
      });

    const results = await OpenAiCompatibilityService.search({
      query: 'acme',
      type: 'all',
      limit: 5,
    });

    expect(searchSpy).toHaveBeenCalled();
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: 'companies:company-1',
      title: 'Acme Inc.',
      url: 'https://api.attio.com/v2/objects/companies/records/company-1',
    });
    expect(results[1]).toMatchObject({
      id: 'people:person-1',
      title: 'Wile E. Coyote',
    });
  });

  it('validates required query', async () => {
    await expect(
      OpenAiCompatibilityService.search({
        // @ts-expect-error verifying runtime validation
        query: '   ',
      })
    ).rejects.toThrow('Query must be provided');
  });
});

describe('OpenAiCompatibilityService.fetch', () => {
  it('returns a fetch payload with serialized record text', async () => {
    vi.spyOn(UniversalRetrievalService, 'getRecordDetails').mockResolvedValue(
      companyRecord
    );

    const result = await OpenAiCompatibilityService.fetch(
      'companies:company-1'
    );

    expect(result).toMatchObject({
      id: 'companies:company-1',
      title: 'Acme Inc.',
      url: 'https://api.attio.com/v2/objects/companies/records/company-1',
    });
    expect(result.text).toContain('Acme Inc.');
  });

  it('rejects malformed identifiers', async () => {
    await expect(OpenAiCompatibilityService.fetch('bad-id')).rejects.toThrow(
      'Expected identifier format'
    );
  });
});
