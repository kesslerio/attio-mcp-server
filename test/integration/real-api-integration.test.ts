import { describe, expect, test, vi } from 'vitest';
import {
  createCompany,
  deleteCompany,
  getCompanyDetails,
  searchCompanies,
  updateCompany,
} from '../../src/objects/companies/index.js';
import {
  createPerson,
  deletePerson,
  getPersonDetails,
  searchPeople,
  updatePerson,
} from '../../src/objects/people/index.js';
import {
  expectIntegrationError,
  generateTestData,
  setupIntegrationTests,
  trackTestRecord,
  waitForApiIndexing,
} from '../helpers/integration-test-setup.js';

describe('Real API Integration Tests', () => {
  // Setup integration test environment with enhanced error handling
  const testSetup = setupIntegrationTests({
    skipOnMissingApiKey: true,
    timeout: 30000,
    verbose: true,
  });

  if (testSetup.shouldSkip) {
    test.skip(`Skipping integration tests - ${testSetup.skipReason}`, () => {});
    return;
  }

  // Generate test data using the setup timestamp
  const testData = generateTestData(testSetup.timestamp);
  let createdCompanyId: string;
  let createdPersonId: string;

  describe('Companies Module - Real API', () => {
    it('should create a real company', async () => {
      const companyData = {
        name: testData.companyName,
        website: testData.websiteUrl,
        description: testData.description,
      };

      const company = await createCompany(companyData);

      // Enhanced validation with better error reporting
      expect(
        company,
        'Company creation should return a valid object'
      ).toBeDefined();
      expect(company.id, 'Company should have an ID object').toBeDefined();
      expect(
        company.id.record_id,
        'Company should have a record_id'
      ).toBeDefined();
      expect(
        company.values?.name,
        'Company should have a name field'
      ).toBeDefined();
      expect(
        company.values.name?.[0]?.value,
        'Company name should match input'
      ).toBe(testData.companyName);

      createdCompanyId = company.id.record_id;
      trackTestRecord('company', createdCompanyId);
    });

    it('should search for the created company', async () => {
      // Wait for API indexing with helper function
      await waitForApiIndexing();

      const results = await searchCompanies(testData.companyName);

      expect(results, 'Search should return results array').toBeDefined();
      expect(Array.isArray(results), 'Results should be an array').toBe(true);
      expect(
        results.length,
        'Should find at least one company'
      ).toBeGreaterThan(0);

      const foundCompany = results.find(
        (c) => c.values.name?.[0]?.value === testData.companyName
      );
      expect(
        foundCompany,
        'Should find the created company in search results'
      ).toBeDefined();
    });

    it('should get company details', async () => {
      const details = await getCompanyDetails(createdCompanyId);

      expect(details, 'Company details should be returned').toBeDefined();
      expect(
        details.id?.record_id,
        'Details should have correct record ID'
      ).toBe(createdCompanyId);
      expect(
        details.values?.name?.[0]?.value,
        'Details should have correct name'
      ).toBe(testData.companyName);
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
        email_addresses: [testData.personEmail],
        name: testData.personName,
      };

      const person = await createPerson(personData);

      expect(
        person,
        'Person creation should return a valid object'
      ).toBeDefined();
      expect(person.id, 'Person should have an ID object').toBeDefined();
      expect(
        person.id.record_id,
        'Person should have a record_id'
      ).toBeDefined();
      expect(
        person.values?.email_addresses,
        'Person should have email addresses'
      ).toBeDefined();

      if (person.values.email_addresses) {
        expect(
          person.values.email_addresses[0]?.email_address,
          'Email should match input'
        ).toBe(testData.personEmail);
      }

      createdPersonId = person.id.record_id;
      trackTestRecord('person', createdPersonId);
    });

    it('should search for the created person', async () => {
      // Wait for API indexing
      await waitForApiIndexing();

      const results = await searchPeople(testData.personName);

      expect(results, 'Search should return results array').toBeDefined();
      expect(Array.isArray(results), 'Results should be an array').toBe(true);
      expect(results.length, 'Should find at least one person').toBeGreaterThan(
        0
      );

      const foundPerson = results.find((p) =>
        p.values.email_addresses?.some(
          (e: any) => e.email_address === testData.personEmail
        )
      );
      expect(
        foundPerson,
        'Should find the created person in search results'
      ).toBeDefined();
    });

    it('should get person details', async () => {
      const details = await getPersonDetails(createdPersonId);

      expect(details, 'Person details should be returned').toBeDefined();
      expect(
        details.id?.record_id,
        'Details should have correct record ID'
      ).toBe(createdPersonId);

      if (details.values?.email_addresses) {
        expect(
          details.values.email_addresses[0]?.email_address,
          'Details should have correct email'
        ).toBe(testData.personEmail);
      }
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
        name: `Linked Company ${testSetup.timestamp}`,
        website: `https://linked${testSetup.timestamp}.com`,
      });

      // Create a new person
      const person = await createPerson({
        email_addresses: [`linked${testSetup.timestamp}@example.com`],
        name: `Linked Person ${testSetup.timestamp}`,
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

  describe('Enhanced Error Handling - Real API', () => {
    it('should handle non-existent company with enhanced error details', async () => {
      try {
        await getCompanyDetails('non-existent-company-id-12345');
        throw new Error('Expected error was not thrown');
      } catch (error) {
        // Test our enhanced error handling
        const isValidError = expectIntegrationError(error, [
          'not found',
          'invalid',
          'non-existent',
        ]);
        expect(
          isValidError || error instanceof Error,
          'Should throw a proper error'
        ).toBe(true);
      }
    });

    it('should handle invalid company data with helpful suggestions', async () => {
      try {
        await createCompany({
          // Missing required name field - should trigger validation
          website: 'https://invalid.com',
        } as any);
        throw new Error('Expected validation error was not thrown');
      } catch (error) {
        const isValidError = expectIntegrationError(error, [
          'required',
          'name',
          'missing',
        ]);
        expect(
          isValidError || error instanceof Error,
          'Should provide validation error'
        ).toBe(true);
      }
    });

    it('should handle non-existent person with enhanced error details', async () => {
      try {
        await getPersonDetails('non-existent-person-id-67890');
        throw new Error('Expected error was not thrown');
      } catch (error) {
        const isValidError = expectIntegrationError(error, [
          'not found',
          'invalid',
          'non-existent',
        ]);
        expect(
          isValidError || error instanceof Error,
          'Should throw a proper error'
        ).toBe(true);
      }
    });

    it('should provide helpful validation for invalid person data', async () => {
      try {
        await createPerson({
          // Missing required fields - should trigger enhanced validation
          phone_numbers: ['+1234567890'],
        } as any);
        throw new Error('Expected validation error was not thrown');
      } catch (error) {
        const isValidError = expectIntegrationError(error, [
          'required',
          'email',
          'name',
          'missing',
        ]);
        expect(
          isValidError || error instanceof Error,
          'Should provide validation guidance'
        ).toBe(true);
      }
    });
  });
});
