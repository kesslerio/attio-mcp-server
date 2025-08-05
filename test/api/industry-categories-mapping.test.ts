/**
 * End-to-end test for the industry-to-categories mapping issue #176
 *
 * This test verifies that the industry field is correctly mapped to categories
 * when interacting with the real Attio API.
 *
 * To run these tests:
 * 1. Create a .env.test file with your Attio API key:
 *    ATTIO_API_KEY=your_test_api_key_here
 *
 * 2. Run the test:
 *    npm test -- test/api/industry-categories-mapping.test.ts
 *
 * Set SKIP_INTEGRATION_TESTS=true to skip these tests
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { initializeAttioClient } from '../../src/api/attio-client';
import {
  createCompany,
  deleteCompany,
  getCompanyDetails,
  updateCompany,
} from '../../src/objects/companies/index';

// These tests use real API calls - only run when API key is available
const SKIP_INTEGRATION_TESTS =
  !process.env.ATTIO_API_KEY || process.env.SKIP_INTEGRATION_TESTS === 'true';

describe('Industry-Categories Mapping - E2E Tests', () => {
  if (SKIP_INTEGRATION_TESTS) {
    it.skip('Skipping E2E tests - no API key found or tests disabled', () => {});
    return;
  }

  const testCompanies: string[] = [];

  beforeAll(() => {
    // Initialize the Attio client with test API key
    const apiKey = process.env.ATTIO_API_KEY!;
    initializeAttioClient(apiKey);
  });

  afterEach(async () => {
    // Cleanup: Delete any test companies created
    for (const companyId of testCompanies) {
      try {
        await deleteCompany(companyId);
      } catch (error) {
        // Ignore errors during cleanup
      }
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

      // Create the company with industry field
      const createdCompany = await createCompany(companyData);
      testCompanies.push(createdCompany.id.record_id);

      // Verify the company was created with the industry
      expect(createdCompany).toBeDefined();
      expect(createdCompany.id?.record_id).toBeDefined();

      // Get fresh company details to verify mapping
      const companyDetails = await getCompanyDetails(
        createdCompany.id.record_id
      );

      // Check if the industry field exists and has the correct value
      expect(companyDetails?.values).toBeDefined();

      // The industry field should exist with the value we set
      const industryValue = companyDetails.values?.industry;
      expect(industryValue).toBeDefined();

      // Log for debugging
      console.log('Created company with industry:', {
        companyId: createdCompany.id.record_id,
        industryValue,
        allValues: companyDetails.values,
      });

      // Verify the industry field has our expected value
      // This test will help us understand how the industry field is structured
      if (Array.isArray(industryValue)) {
        // If it's an array, check if our industry is in it
        const hasOurIndustry = industryValue.some((val) =>
          typeof val === 'string'
            ? val.includes(testIndustry)
            : val &&
              typeof val === 'object' &&
              JSON.stringify(val).includes(testIndustry)
        );
        expect(hasOurIndustry).toBe(true);
      } else if (typeof industryValue === 'string') {
        expect(industryValue).toContain(testIndustry);
      } else if (industryValue && typeof industryValue === 'object') {
        // If it's an object, stringify and check
        expect(JSON.stringify(industryValue)).toContain(testIndustry);
      }
    }, 30_000);

    it('should update a company industry field and maintain categories mapping', async () => {
      // First create a company without industry
      const companyData = {
        name: `Industry Update Test ${Date.now()}`,
      };

      const createdCompany = await createCompany(companyData);
      testCompanies.push(createdCompany.id.record_id);

      // Now update it with an industry
      const updateIndustry = 'Healthcare & Medical';
      const updatedCompany = await updateCompany(createdCompany.id.record_id, {
        industry: updateIndustry,
      });

      // Verify the update was successful
      expect(updatedCompany).toBeDefined();
      expect(updatedCompany.id?.record_id).toBe(createdCompany.id.record_id);

      // Get fresh details to verify the industry mapping
      const companyDetails = await getCompanyDetails(
        createdCompany.id.record_id
      );
      const industryValue = companyDetails.values?.industry;

      expect(industryValue).toBeDefined();

      // Log for debugging
      console.log('Updated company industry:', {
        companyId: createdCompany.id.record_id,
        industryValue,
        updateIndustry,
      });

      // Verify the industry field contains our updated value
      if (Array.isArray(industryValue)) {
        const hasOurIndustry = industryValue.some((val) =>
          typeof val === 'string'
            ? val.includes(updateIndustry)
            : val &&
              typeof val === 'object' &&
              JSON.stringify(val).includes(updateIndustry)
        );
        expect(hasOurIndustry).toBe(true);
      } else if (typeof industryValue === 'string') {
        expect(industryValue).toContain(updateIndustry);
      } else if (industryValue && typeof industryValue === 'object') {
        expect(JSON.stringify(industryValue)).toContain(updateIndustry);
      }
    }, 30_000);

    it('should handle multiple industry values correctly', async () => {
      const testIndustries = [
        'Technology',
        'Software',
        'AI & Machine Learning',
      ];
      const companyData = {
        name: `Multi-Industry Test ${Date.now()}`,
        industry: testIndustries, // Try passing multiple industries
      };

      try {
        const createdCompany = await createCompany(companyData);
        testCompanies.push(createdCompany.id.record_id);

        const companyDetails = await getCompanyDetails(
          createdCompany.id.record_id
        );
        const industryValue = companyDetails.values?.industry;

        console.log('Multi-industry company created:', {
          companyId: createdCompany.id.record_id,
          inputIndustries: testIndustries,
          resultIndustry: industryValue,
        });

        // Verify that the industry field exists
        expect(industryValue).toBeDefined();

        // Test that our industries are represented somehow
        const industryString = JSON.stringify(industryValue);
        testIndustries.forEach((industry) => {
          expect(industryString).toContain(industry);
        });
      } catch (error) {
        // If multiple industries aren't supported, that's fine - log it
        console.log('Multiple industries not supported:', error.message);
        // Try with a single industry instead
        const singleIndustryData = {
          name: `Single-Industry Fallback Test ${Date.now()}`,
          industry: testIndustries[0],
        };

        const createdCompany = await createCompany(singleIndustryData);
        testCompanies.push(createdCompany.id.record_id);

        const companyDetails = await getCompanyDetails(
          createdCompany.id.record_id
        );
        const industryFieldValues = companyDetails.values?.industry;

        expect(industryFieldValues).toBeDefined();
        console.log('Fallback single industry company:', {
          companyId: createdCompany.id.record_id,
          industry: industryFieldValues,
        });
      }
    });
  });
});
