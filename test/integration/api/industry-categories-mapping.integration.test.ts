/**
 * End-to-end test for the industry-to-categories mapping issue #176
 * Uses real Attio API – requires ATTIO_API_KEY (skips otherwise)
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import {
  createCompany,
  updateCompany,
  getCompanyDetails,
  deleteCompany,
} from '../../../src/objects/companies/index.js';
import { initializeAttioClient } from '../../../src/api/attio-client.js';

const SKIP_INTEGRATION_TESTS =
  !process.env.ATTIO_API_KEY || process.env.SKIP_INTEGRATION_TESTS === 'true';

describe('Industry-Categories Mapping - E2E Tests', () => {
  if (SKIP_INTEGRATION_TESTS) {
    it.skip('Skipping E2E tests - no API key found or tests disabled', () => {});
    return;
  }

  const testCompanies: string[] = [];

  beforeAll(() => {
    const apiKey = process.env.ATTIO_API_KEY!;
    initializeAttioClient(apiKey);
  });

  afterEach(async () => {
    for (const companyId of testCompanies) {
      try {
        await deleteCompany(companyId);
      } catch {}
    }
    testCompanies.length = 0;
  });

  describe('Company Creation with Industry Field', () => {
    it('should create a company with industry field mapped to categories', async () => {
      const testIndustry = 'Software & Technology';
      const companyData = {
        name: `Industry Mapping Test ${Date.now()}`,
        industry: testIndustry,
      };
      const createdCompany = await createCompany(companyData);
      expect(createdCompany).toBeDefined();
      expect(createdCompany.id?.record_id).toBeDefined();
      if (createdCompany.id?.record_id)
        testCompanies.push(createdCompany.id.record_id);

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
  });
});
