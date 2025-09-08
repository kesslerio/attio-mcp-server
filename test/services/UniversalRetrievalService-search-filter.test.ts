/**
 * Split: UniversalRetrievalService search & field filtering
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AttioRecord } from '../../src/types/attio.js';
import { CachingService } from '../../src/services/CachingService.js';
import { getCompanyDetails } from '../../src/objects/companies/index.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { UniversalRetrievalService } from '../../src/services/UniversalRetrievalService.js';

describe('UniversalRetrievalService', () => {
  describe('Field filtering', () => {
    beforeEach(() => {
      vi.mocked(CachingService.isCached404).mockReturnValue(false);
    });

    it('should filter non-AttioRecord objects correctly', async () => {
        name: 'Test',
        domain: 'test.com',
        employees: 50,
        industry: 'Tech',
      };

        plainObject,
        ['name', 'domain']
      );

      expect(filtered).toEqual({ name: 'Test', domain: 'test.com' });
    });

    it('should return full data when no fields specified', async () => {
      const fullRecord: AttioRecord = {
        id: { record_id: 'comp_123' },
        values: { name: [{ value: 'Test Company' }], domain: 'test.com' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      } as any;

      vi.mocked(getCompanyDetails).mockResolvedValue(fullRecord);

        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'comp_123',
      });

      expect(result).toEqual(fullRecord);
    });
  });
});
