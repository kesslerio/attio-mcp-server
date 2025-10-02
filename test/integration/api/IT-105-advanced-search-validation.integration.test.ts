/**
 * IT-105: Advanced search validation coverage.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeAttioClient } from '@/api/attio-client.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

vi.clearAllMocks();
vi.resetAllMocks();
vi.doUnmock('@/objects/companies/search.js');

type AdvancedSearchCompaniesType =
  typeof import('@/objects/companies/search.js').advancedSearchCompanies;

let advancedSearchCompanies: AdvancedSearchCompaniesType | undefined;

const runIntegrationTests = shouldRunIntegrationTests();

describe.skipIf(!runIntegrationTests)(
  'IT-105: Advanced search validation',
  { timeout: 30000 },
  () => {
    beforeAll(async () => {
      const apiKey = process.env.ATTIO_API_KEY as string;
      initializeAttioClient(apiKey);

      if (!advancedSearchCompanies) {
        const module = await import('@/objects/companies/search.js');
        advancedSearchCompanies = module.advancedSearchCompanies;
      }
    });

    it('IT-105.1: rejects missing filters object', async () => {
      await expect(advancedSearchCompanies!(null as never)).rejects.toThrow(
        'Filters object is required'
      );
    });

    it('IT-105.2: rejects missing filters array', async () => {
      await expect(advancedSearchCompanies!({} as never)).rejects.toThrow(
        'must include a "filters" array'
      );
    });

    it('IT-105.3: rejects non-array filter collections', async () => {
      const filters = {
        filters: 'not an array',
      } as unknown;

      await expect(advancedSearchCompanies!(filters as never)).rejects.toThrow(
        'must be an array'
      );
    });

    it('IT-105.4: rejects filter objects without attribute metadata', async () => {
      const filters = {
        filters: [
          {
            condition: 'contains',
            value: 'test',
          },
        ],
      } as unknown;

      await expect(advancedSearchCompanies!(filters as never)).rejects.toThrow(
        /missing attribute object/i
      );
    });

    it('IT-105.5: rejects attribute definitions without slug', async () => {
      const filters = {
        filters: [
          {
            attribute: {},
            condition: 'contains',
            value: 'test',
          },
        ],
      } as unknown;

      await expect(advancedSearchCompanies!(filters as never)).rejects.toThrow(
        /missing attribute.slug/i
      );
    });

    it('IT-105.6: rejects filters missing condition property', async () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            value: 'test',
          },
        ],
      } as unknown;

      await expect(advancedSearchCompanies!(filters as never)).rejects.toThrow(
        /missing condition property/i
      );
    });
  }
);
