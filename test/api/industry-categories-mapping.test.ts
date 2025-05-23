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
import { describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import { 
  createCompany, 
  updateCompany, 
  getCompanyDetails,
  deleteCompany
} from '../../src/objects/companies/index';
import { initializeAttioClient } from '../../src/api/attio-client';
import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.test' });

// Skip integration tests if no API key is available or SKIP_INTEGRATION_TESTS is set
const skipIntegrationTests = !process.env.ATTIO_API_KEY || process.env.SKIP_INTEGRATION_TESTS === 'true';

(skipIntegrationTests ? describe.skip : describe)('Industry-Categories Mapping - E2E Tests', () => {
  const testCompanies: string[] = [];
  
  beforeAll(() => {
    // Initialize the Attio client with test API key
    initializeAttioClient(process.env.ATTIO_API_KEY!);
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
        industry: testIndustry
      };
      
      // Create the company with industry field
      const result = await createCompany(companyData);
      expect(result).toBeDefined();
      expect(result.id?.record_id).toBeDefined();
      
      // Track for cleanup
      testCompanies.push(result.id.record_id);
      
      // Fetch the company details to verify mapping
      const companyDetails = await getCompanyDetails(result.id.record_id);
      
      // Verify that either:
      // 1. The industry value shows up in categories field, OR
      // 2. The industry field was successfully set if it exists in the account
      const hasCategories = companyDetails.values?.categories?.[0]?.value === testIndustry;
      const hasIndustry = companyDetails.values?.industry?.[0]?.value === testIndustry;
      
      // One of these conditions must be true
      expect(hasCategories || hasIndustry).toBe(true);
      
      // Log for diagnostics
      console.log('Company created:', {
        name: companyDetails.values?.name?.[0]?.value,
        categories: companyDetails.values?.categories?.[0]?.value,
        industry: companyDetails.values?.industry?.[0]?.value
      });
    });
  });
  
  describe('Company Update with Industry Field', () => {
    it('should update a company with industry field mapped to categories', async () => {
      // First create a company without industry
      const company = await createCompany({
        name: `Industry Update Test ${Date.now()}`
      });
      testCompanies.push(company.id.record_id);
      
      // Update with industry field
      const testIndustry = 'Finance & Banking';
      const updatedCompany = await updateCompany(company.id.record_id, {
        industry: testIndustry
      });
      
      // Fetch the company details to verify mapping
      const companyDetails = await getCompanyDetails(company.id.record_id);
      
      // Verify that either categories or industry field has the value
      const hasCategories = companyDetails.values?.categories?.[0]?.value === testIndustry;
      const hasIndustry = companyDetails.values?.industry?.[0]?.value === testIndustry;
      
      // One of these conditions must be true
      expect(hasCategories || hasIndustry).toBe(true);
      
      // Log for diagnostics
      console.log('Company updated:', {
        name: companyDetails.values?.name?.[0]?.value,
        categories: companyDetails.values?.categories?.[0]?.value,
        industry: companyDetails.values?.industry?.[0]?.value
      });
    });
    
    it('should handle multiple industry values correctly', async () => {
      // First create a company without industry
      const company = await createCompany({
        name: `Multiple Industries Test ${Date.now()}`
      });
      testCompanies.push(company.id.record_id);
      
      // Update with multiple industry values (as an array)
      const industryValues = ['Healthcare', 'Biotechnology'];
      const updatedCompany = await updateCompany(company.id.record_id, {
        industry: industryValues.join(', ')
      });
      
      // Fetch the company details to verify mapping
      const companyDetails = await getCompanyDetails(company.id.record_id);
      
      // Get the categories or industry values
      const categoryValues = companyDetails.values?.categories?.map((v: any) => v.value) || [];
      const industryFieldValues = companyDetails.values?.industry?.map((v: any) => v.value) || [];
      
      // Check if either field contains the values
      const hasAllCategoriesValues = industryValues.every(v => categoryValues.includes(v));
      const hasAllIndustryValues = industryValues.every(v => industryFieldValues.includes(v));
      
      // One of these conditions must be true
      expect(hasAllCategoriesValues || hasAllIndustryValues).toBe(true);
      
      // Log for diagnostics
      console.log('Company with multiple values:', {
        name: companyDetails.values?.name?.[0]?.value,
        categories: categoryValues,
        industry: industryFieldValues
      });
    });
  });
});