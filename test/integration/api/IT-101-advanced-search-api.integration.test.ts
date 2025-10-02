/**
 * IT-101: Advanced search API integration tests.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { advancedSearchObject } from '@/api/operations/search.js';
import { FilterConditionType, ResourceType } from '@/types/attio.js';
import { initializeAttioClient } from '@/api/attio-client.js';
import { FilterValidationError } from '@/errors/api-errors.js';
import { advancedSearchCompanies } from '@/objects/companies/search.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

const runIntegrationTests = shouldRunIntegrationTests();

describe.skipIf(!runIntegrationTests)(
  'IT-101: Advanced search API',
  { timeout: 30000 },
  () => {
    beforeAll(async () => {
      vi.doUnmock('@/objects/companies/search.js');
      vi.doUnmock('@/objects/companies/index.js');

      const apiKey = process.env.ATTIO_API_KEY as string;
      initializeAttioClient(apiKey);
    });

    describe('advancedSearchCompanies', () => {
      it('IT-101.1: returns companies matching a simple name filter', async () => {
        const filters = {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: FilterConditionType.CONTAINS,
              value: 'inc',
            },
          ],
        };

        const results = await advancedSearchCompanies(filters, 5);
        expect(Array.isArray(results)).toBe(true);
        if (results.length > 0) {
          const company = results[0];
          expect(company).toHaveProperty('id');
          expect(company).toHaveProperty('values');
          expect(company.values).toHaveProperty('name');
        }
      });

      it('IT-101.2: handles OR logic with multiple conditions', async () => {
        const filters = {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: FilterConditionType.CONTAINS,
              value: 'inc',
            },
            {
              attribute: { slug: 'name' },
              condition: FilterConditionType.CONTAINS,
              value: 'tech',
            },
          ],
          matchAny: true,
        };

        const results = await advancedSearchCompanies(filters, 5);
        expect(Array.isArray(results)).toBe(true);
      });

      it('IT-101.3: handles company-specific attributes', async () => {
        const filters = {
          filters: [
            {
              attribute: { slug: 'website' },
              condition: FilterConditionType.CONTAINS,
              value: '.com',
            },
          ],
        };

        const results = await advancedSearchCompanies(filters, 5);
        expect(Array.isArray(results)).toBe(true);
      });

      it('IT-101.4: reports invalid filter structures', async () => {
        const filters = {
          filters: [{ condition: FilterConditionType.CONTAINS, value: 'test' }],
        } as unknown;

        await expect(advancedSearchCompanies(filters as never)).rejects.toThrow(
          /invalid/i
        );
      });

      it('IT-101.5: reports invalid filter conditions', async () => {
        const filters = {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: 'not_a_real_condition' as FilterConditionType,
              value: 'test',
            },
          ],
        };

        await expect(advancedSearchCompanies(filters)).rejects.toThrow(
          /invalid condition/i
        );
      });
    });

    describe('advancedSearchObject', () => {
      it('IT-101.6: searches via the generic API helper', async () => {
        const filters = {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: FilterConditionType.CONTAINS,
              value: 'inc',
            },
          ],
        };

        const results = await advancedSearchObject(
          ResourceType.COMPANIES,
          filters,
          5
        );
        expect(Array.isArray(results)).toBe(true);
      });

      it('IT-101.7: surfaces filter validation errors', async () => {
        const filters = {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: 'not_a_real_condition' as FilterConditionType,
              value: 'test',
            },
          ],
        };

        await expect(
          advancedSearchObject(ResourceType.COMPANIES, filters)
        ).rejects.toThrow(FilterValidationError);
      });

      it('IT-101.8: rejects non-array filter collections', async () => {
        const filters = { filters: { not: 'an array' } } as unknown;

        await expect(
          advancedSearchObject(ResourceType.COMPANIES, filters as never)
        ).rejects.toThrow(/must be an array/i);
      });
    });
  }
);
