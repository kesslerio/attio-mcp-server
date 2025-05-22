import { describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import { 
  createCompany, 
  updateCompany, 
  updateCompanyAttribute, 
  deleteCompany,
  getCompanyDetails
} from '../../src/objects/companies/index';
import { initializeAttioClient } from '../../src/api/attio-client';
import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.test' });

// Skip integration tests if no API key is available
const skipIntegrationTests = !process.env.ATTIO_API_KEY;

describe.skipIf(skipIntegrationTests)('Company Write Operations - Integration Tests', () => {
  const testCompanies: string[] = [];
  
  beforeAll(() => {
    // Initialize the Attio client with test API key
    initializeAttioClient({
      apiKey: process.env.ATTIO_API_KEY!
    });
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
  
  describe('createCompany', () => {
    it('should create a new company with basic attributes', async () => {
      const companyData = {
        name: `Test Company ${Date.now()}`,
        website: 'https://test-company.com',
        description: 'A test company for integration testing'
      };
      
      const result = await createCompany(companyData);
      
      expect(result).toBeDefined();
      expect(result.id?.record_id).toBeDefined();
      expect(result.values?.name?.[0]?.value).toBe(companyData.name);
      expect(result.values?.website?.[0]?.value).toBe(companyData.website);
      expect(result.values?.description?.[0]?.value).toBe(companyData.description);
      
      // Track for cleanup
      testCompanies.push(result.id.record_id);
    });
    
    it('should create a company with custom attributes', async () => {
      const companyData = {
        name: `Test Custom Company ${Date.now()}`,
        industry: 'Technology',
        employee_range: '51-200',
        primary_location: {
          locality: 'San Francisco',
          region: 'CA',
          country_code: 'US'
        }
      };
      
      const result = await createCompany(companyData);
      
      expect(result).toBeDefined();
      expect(result.values?.name?.[0]?.value).toBe(companyData.name);
      expect(result.values?.industry?.[0]?.value).toBe(companyData.industry);
      
      // Track for cleanup
      testCompanies.push(result.id.record_id);
    });
    
    it('should handle validation errors properly', async () => {
      // Attempt to create a company without required fields
      await expect(createCompany({})).rejects.toThrow();
    });
  });
  
  describe('updateCompany', () => {
    it('should update multiple attributes at once', async () => {
      // First create a company
      const company = await createCompany({
        name: `Update Test Company ${Date.now()}`
      });
      testCompanies.push(company.id.record_id);
      
      const updates = {
        website: 'https://updated.com',
        description: 'Updated description',
        industry: 'Finance'
      };
      
      const result = await updateCompany(company.id.record_id, updates);
      
      expect(result.values?.website?.[0]?.value).toBe(updates.website);
      expect(result.values?.description?.[0]?.value).toBe(updates.description);
      expect(result.values?.industry?.[0]?.value).toBe(updates.industry);
    });
    
    it('should handle null values in updates', async () => {
      // Create a company with a description
      const company = await createCompany({
        name: `Null Test Company ${Date.now()}`,
        description: 'Initial description'
      });
      testCompanies.push(company.id.record_id);
      
      // Update description to null
      const result = await updateCompany(company.id.record_id, {
        description: null
      });
      
      expect(result.values?.description).toBeNull();
    });
  });
  
  describe('updateCompanyAttribute', () => {
    it('should update a single attribute', async () => {
      const company = await createCompany({
        name: `Attribute Test Company ${Date.now()}`
      });
      testCompanies.push(company.id.record_id);
      
      const newWebsite = 'https://attribute-updated.com';
      const result = await updateCompanyAttribute(
        company.id.record_id,
        'website',
        newWebsite
      );
      
      expect(result.values?.website?.[0]?.value).toBe(newWebsite);
    });
    
    it('should handle null value updates (Issue #97 regression test)', async () => {
      const company = await createCompany({
        name: `Null Attribute Test ${Date.now()}`,
        website: 'https://initial.com'
      });
      testCompanies.push(company.id.record_id);
      
      // Update website to null
      const result = await updateCompanyAttribute(
        company.id.record_id,
        'website',
        null
      );
      
      expect(result.values?.website).toBeNull();
    });
  });
  
  describe('deleteCompany', () => {
    it('should delete a company successfully', async () => {
      const company = await createCompany({
        name: `Delete Test Company ${Date.now()}`
      });
      
      const deleteResult = await deleteCompany(company.id.record_id);
      expect(deleteResult).toBe(true);
      
      // Verify company is deleted
      await expect(getCompanyDetails(company.id.record_id))
        .rejects.toThrow();
    });
    
    it('should handle deletion of non-existent company', async () => {
      const fakeId = 'non-existent-id-' + Date.now();
      await expect(deleteCompany(fakeId)).rejects.toThrow();
    });
  });
  
  describe('Concurrent Operations', () => {
    it('should handle concurrent updates gracefully', async () => {
      const company = await createCompany({
        name: `Concurrent Test Company ${Date.now()}`,
        counter_field: 0
      });
      testCompanies.push(company.id.record_id);
      
      // Attempt concurrent updates
      const updatePromises = Array(5).fill(0).map((_, i) => 
        updateCompanyAttribute(
          company.id.record_id,
          'description',
          `Update ${i}`
        )
      );
      
      const results = await Promise.allSettled(updatePromises);
      
      // All updates should succeed (no optimistic locking yet)
      const successfulUpdates = results.filter(r => r.status === 'fulfilled');
      expect(successfulUpdates.length).toBeGreaterThan(0);
    });
    
    it('should handle concurrent creation with same data', async () => {
      const baseName = `Concurrent Create ${Date.now()}`;
      
      // Attempt to create multiple companies with same name concurrently
      const createPromises = Array(3).fill(0).map(() => 
        createCompany({ 
          name: baseName,
          unique_id: Math.random().toString(36)
        })
      );
      
      const results = await Promise.allSettled(createPromises);
      
      // Track created companies for cleanup
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          testCompanies.push(result.value.id.record_id);
        }
      });
      
      // All should succeed since we don't have unique constraints on name
      const successfulCreates = results.filter(r => r.status === 'fulfilled');
      expect(successfulCreates.length).toBe(3);
    });
  });
  
  describe('Rate Limiting', () => {
    it('should handle rate limiting with retry logic', async () => {
      const company = await createCompany({
        name: `Rate Limit Test ${Date.now()}`
      });
      testCompanies.push(company.id.record_id);
      
      // Make multiple rapid requests to potentially trigger rate limiting
      const rapidUpdatePromises = Array(10).fill(0).map((_, i) => 
        updateCompanyAttribute(
          company.id.record_id,
          'description',
          `Rapid update ${i}`
        )
      );
      
      const results = await Promise.allSettled(rapidUpdatePromises);
      
      // With retry logic, most should succeed
      const successfulUpdates = results.filter(r => r.status === 'fulfilled');
      expect(successfulUpdates.length).toBeGreaterThan(5);
    });
  });
});

// Configuration instructions for running integration tests
console.log(`
To run integration tests:
1. Create a .env.test file with your Attio API key:
   ATTIO_API_KEY=your_test_api_key_here
   
2. Run the tests:
   npm test -- test/integration/company-write-operations.test.ts
`);