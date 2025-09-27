import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenAiCompatibilityService } from '@/services/OpenAiCompatibilityService.js';
import { UniversalSearchService } from '@/services/UniversalSearchService.js';
import { UniversalRetrievalService } from '@/services/UniversalRetrievalService.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import type { AttioRecord } from '@/types/attio.js';

const sampleCompanyRecord: AttioRecord = {
  id: {
    record_id: 'company-123',
  },
  values: {
    name: [
      {
        value: 'Acme Inc.',
      },
    ],
    description: [
      {
        value: 'Leading provider of road runner deterrents',
      },
    ],
  },
};

const samplePersonRecord: AttioRecord = {
  id: {
    record_id: 'person-456',
  },
  values: {
    name: [
      {
        value: 'Wile Coyote',
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
  it('maps records into OpenAI search results without duplicating queries', async () => {
    const searchSpy = vi
      .spyOn(UniversalSearchService, 'searchRecords')
      .mockImplementation(async ({ resource_type }) => {
        if (resource_type === UniversalResourceType.COMPANIES) {
          return [sampleCompanyRecord];
        }
        if (resource_type === UniversalResourceType.PEOPLE) {
          return [samplePersonRecord];
        }
        return [];
      });

    const results = await OpenAiCompatibilityService.search({
      query: 'acme',
      type: 'all',
      limit: 4,
    });

    expect(searchSpy).toHaveBeenCalledTimes(4);
    expect(searchSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        resource_type: UniversalResourceType.COMPANIES,
      })
    );
    expect(searchSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ resource_type: UniversalResourceType.PEOPLE })
    );
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: 'companies:company-123',
      title: 'Acme Inc.',
      url: 'https://api.attio.com/v2/objects/companies/records/company-123',
    });
    expect(results[1]).toMatchObject({
      id: 'people:person-456',
      title: 'Wile Coyote',
    });
  });

  it('throws when query is missing', async () => {
    await expect(
      OpenAiCompatibilityService.search({
        // @ts-expect-error - deliberately passing invalid input
        query: '',
      })
    ).rejects.toThrow('Query must be provided');
  });
});

describe('OpenAiCompatibilityService.fetch', () => {
  it('retrieves and maps a record into fetch payload', async () => {
    vi.spyOn(UniversalRetrievalService, 'getRecordDetails').mockResolvedValue(
      sampleCompanyRecord
    );

    const result = await OpenAiCompatibilityService.fetch(
      'companies:company-123'
    );

    expect(result).toMatchObject({
      id: 'companies:company-123',
      title: 'Acme Inc.',
      url: 'https://api.attio.com/v2/objects/companies/records/company-123',
    });
    expect(result.text).toContain('Acme Inc.');
  });

  it('rejects invalid identifiers', async () => {
    await expect(OpenAiCompatibilityService.fetch('invalid')).rejects.toThrow(
      'Expected identifier format'
    );
  });
});
