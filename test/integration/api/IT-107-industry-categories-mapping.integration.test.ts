/**
 * IT-107: Industry categories mapping regression coverage.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  createCompany,
  getCompanyDetails,
  deleteCompany,
} from '@/objects/companies/index.js';
import { initializeAttioClient } from '@/api/attio-client.js';
import { shouldRunIntegrationTests } from '@test/utils/integration-guards.js';

const runIntegrationTests = shouldRunIntegrationTests();
const industryMappingEnabled =
  process.env.ENABLE_INDUSTRY_MAPPING_TESTS === 'true';

describe.skipIf(!runIntegrationTests || !industryMappingEnabled)(
  'IT-107: Industry categories mapping',
  () => {
    const testCompanies: string[] = [];

    beforeAll(() => {
      const apiKey = process.env.ATTIO_API_KEY as string;
      initializeAttioClient(apiKey);
    });

    afterEach(async () => {
      for (const companyId of testCompanies) {
        try {
          await deleteCompany(companyId);
        } catch (error) {
          console.error('Failed to delete test company', error);
        }
      }
      testCompanies.length = 0;
    });

    it('IT-107.1: maps industries to list-backed categories on create', async () => {
      const testIndustry = 'Software & Technology';
      const companyData = {
        name: `Industry Mapping Test ${Date.now()}`,
        industry: testIndustry,
      };

      const createdCompany = await createCompany(companyData);
      expect(createdCompany?.id?.record_id).toBeDefined();
      if (createdCompany?.id?.record_id) {
        testCompanies.push(createdCompany.id.record_id);
      }

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
