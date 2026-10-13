/**
 * IT-107: Industry categories mapping regression coverage.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCompany, getCompanyDetails } from '@/objects/companies/index.js';
import { initializeAttioClient, getAttioClient } from '@/api/attio-client.js';
import { IntegrationFixtures } from '@test/utils/integration-fixtures.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

const runIntegrationTests = shouldRunIntegrationTests();
const industryMappingEnabled =
  process.env.ENABLE_INDUSTRY_MAPPING_TESTS === 'true';

describe.skipIf(!runIntegrationTests || !industryMappingEnabled)(
  'IT-107: Industry categories mapping',
  () => {
    let fixtures: IntegrationFixtures;

    beforeEach(() => {
      const apiKey = process.env.ATTIO_API_KEY as string;
      initializeAttioClient(apiKey);
      fixtures = new IntegrationFixtures(getAttioClient());
    });

    afterEach(async () => {
      await fixtures?.cleanup();
    });

    it('IT-107.1: maps industries to list-backed categories on create', async () => {
      const testIndustry = 'Software & Technology';
      const companyData = {
        industry: testIndustry,
      };

      const createdCompany = await fixtures.create('company', (name) =>
        createCompany({ ...companyData, name })
      );
      expect(createdCompany.id.record_id).toBeDefined();

      const companyDetails = await getCompanyDetails(
        createdCompany.id!.record_id
      );
      expect(companyDetails?.values).toBeDefined();

      const industryValue = companyDetails.values?.industry;
      expect(industryValue).toBeDefined();

      if (Array.isArray(industryValue)) {
        const hasOurIndustry = industryValue.some((val) =>
          typeof val === 'string'
            ? val.includes(testIndustry)
            : typeof val?.value === 'string' && val.value.includes(testIndustry)
        );
        expect(hasOurIndustry).toBe(true);
      }
    });
  }
);
