/**
 * End-to-end test for the industry-to-categories mapping issue #176
 * Uses real Attio API – requires ATTIO_API_KEY (skips otherwise)
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

import { createCompany, updateCompany, getCompanyDetails, deleteCompany } from '../../../src/objects/companies/index.js';
import { initializeAttioClient } from '../../../src/api/attio-client.js';


describe('Industry-Categories Mapping - E2E Tests', () => {
  if (SKIP_INTEGRATION_TESTS) { it.skip('Skipping E2E tests - no API key found or tests disabled', () => {}); return; }

  const testCompanies: string[] = [];

  beforeAll(() => {
    initializeAttioClient(apiKey);
  });

  afterEach(async () => {
    for (const companyId of testCompanies) {
      try { await deleteCompany(companyId); } catch {}
    }
    testCompanies.length = 0;
  });

  describe('Company Creation with Industry Field', () => {
    it('should create a company with industry field mapped to categories', async () => {
      expect(createdCompany).toBeDefined();
      expect(createdCompany.id?.record_id).toBeDefined();
      if (createdCompany.id?.record_id) testCompanies.push(createdCompany.id.record_id);

      expect(companyDetails?.values).toBeDefined();
      expect(industryValue).toBeDefined();
      if (Array.isArray(industryValue)) {
          typeof val === 'string' ? val.includes(testIndustry)
            : typeof val?.value === 'string' && val.value.includes(testIndustry)
        );
        expect(hasOurIndustry).toBe(true);
      }
    });
  });
});

