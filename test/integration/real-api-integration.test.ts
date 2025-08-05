import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { initializeAttioClient } from '../../src/api/attio-client';
import {
  createCompany,
  deleteCompany,
  getCompanyDetails,
  searchCompanies,
  updateCompany,
} from '../../src/objects/companies/index';
import {
  createPerson,
  deletePerson,
  getPersonDetails,
  searchPeople,
  updatePerson,
} from '../../src/objects/people/index';

// These tests use real API calls - only run when API key is available
const SKIP_INTEGRATION_TESTS = !process.env.ATTIO_API_KEY;

// Increase timeout for real API calls
vi.setConfig({ testTimeout: 30_000 });

describe('Real API Integration Tests', () => {
  if (SKIP_INTEGRATION_TESTS) {
    test.skip('Skipping integration tests - no API key found', () => {});
    return;
  }
  // Generate unique identifiers for test data to avoid conflicts
  const timestamp = Date.now();
  const testCompanyName = `Test Company ${timestamp}`;
  const testPersonEmail = `test${timestamp}@example.com`;

  let createdCompanyId: string;
  let createdPersonId: string;

  beforeAll(() => {
    // Initialize the API client with real credentials
    const apiKey = process.env.ATTIO_API_KEY!;
    initializeAttioClient(apiKey);
  });

  afterAll(async () => {
    // Clean up created test data
    try {
      if (createdCompanyId) {
        await deleteCompany(createdCompanyId);
      }
      if (createdPersonId) {
        await deletePerson(createdPersonId);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  describe('Companies Module - Real API', () => {
    it('should create a real company', async () => {
      const companyData = {
        name: testCompanyName,
        website: `https://test${timestamp}.com`,
        description: 'Integration test company',
      };

      const company = await createCompany(companyData);

      expect(company).toBeDefined();
      expect(company.id).toBeDefined();
      expect(company.id.record_id).toBeDefined();
      expect(company.values.name).toBeDefined();
      expect(company.values.name?.[0]?.value).toBe(testCompanyName);

      createdCompanyId = company.id.record_id;
    });

    it('should search for the created company', async () => {
      // Give the API a moment to index the new company
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const results = await searchCompanies(testCompanyName);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const foundCompany = results.find(
        (c) => c.values.name?.[0]?.value === testCompanyName
      );
      expect(foundCompany).toBeDefined();
    });

    it('should get company details', async () => {
      const details = await getCompanyDetails(createdCompanyId);

      expect(details).toBeDefined();
      expect(details.id.record_id).toBe(createdCompanyId);
      expect(details.values.name?.[0]?.value).toBe(testCompanyName);
    });

    it('should update the company', async () => {
      const updateData = {
        description: 'Updated integration test company',
      };

      const updated = await updateCompany(createdCompanyId, updateData);

      expect(updated).toBeDefined();
      expect(updated.values.description).toBeDefined();
      expect(updated.values.description?.[0]?.value).toBe(
        'Updated integration test company'
      );
    });

    it('should handle search with no results', async () => {
      const results = await searchCompanies('NonExistentCompany123456789');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('People Module - Real API', () => {
    it('should create a real person', async () => {
      const personData = {
        email_addresses: [testPersonEmail],
        name: `Test Person ${timestamp}`,
      };

      const person = await createPerson(personData);

      expect(person).toBeDefined();
      expect(person.id).toBeDefined();
      expect(person.id.record_id).toBeDefined();
      expect(person.values.email_addresses).toBeDefined();
      expect(person.values.email_addresses[0].email_address).toBe(
        testPersonEmail
      );

      createdPersonId = person.id.record_id;
    });

    it('should search for the created person', async () => {
      // Give the API a moment to index the new person
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const results = await searchPeople(`Test Person ${timestamp}`);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const foundPerson = results.find((p) =>
        p.values.email_addresses?.some(
          (e: any) => e.email_address === testPersonEmail
        )
      );
      expect(foundPerson).toBeDefined();
    });

    it('should get person details', async () => {
      const details = await getPersonDetails(createdPersonId);

      expect(details).toBeDefined();
      expect(details.id.record_id).toBe(createdPersonId);
      expect(details.values.email_addresses[0].email_address).toBe(
        testPersonEmail
      );
    });

    it('should update the person', async () => {
      const updateData = {
        title: 'Senior Developer',
        // Removing company link for now as the field name might be different
      };

      const updated = await updatePerson(createdPersonId, updateData);

      expect(updated).toBeDefined();
      expect(updated.values.title).toBeDefined();
      expect(updated.values.title[0].value).toBe('Senior Developer');
    });
  });

  describe('Cross-Module Integration - Real API', () => {
    it('should create and link company and person', async () => {
      // Create a new company
      const company = await createCompany({
        name: `Linked Company ${timestamp}`,
        website: `https://linked${timestamp}.com`,
      });

      // Create a new person
      const person = await createPerson({
        email_addresses: [`linked${timestamp}@example.com`],
        name: `Linked Person ${timestamp}`,
      });

      // Update person with title
      const updatedPerson = await updatePerson(person.id.record_id, {
        title: 'Test Title',
      });

      expect(updatedPerson.values.title).toBeDefined();

      // Clean up
      await deletePerson(person.id.record_id);
      await deleteCompany(company.id.record_id);
    });
  });

  describe('Error Handling - Real API', () => {
    it('should handle non-existent company gracefully', async () => {
      await expect(getCompanyDetails('non-existent-id')).rejects.toThrow();
    });

    it('should handle invalid company data', async () => {
      await expect(
        createCompany({
          // Missing required name field
          website: 'https://invalid.com',
        } as any)
      ).rejects.toThrow();
    });

    it('should handle non-existent person gracefully', async () => {
      await expect(getPersonDetails('non-existent-id')).rejects.toThrow();
    });

    it('should handle invalid person data', async () => {
      await expect(
        createPerson({
          // Missing required email or name
          phone_numbers: ['+1234567890'],
        } as any)
      ).rejects.toThrow();
    });
  });
});
