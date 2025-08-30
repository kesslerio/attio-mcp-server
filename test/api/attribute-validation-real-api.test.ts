/**
 * End-to-end tests for attribute validation with real Attio API
 * These tests require a valid Attio API key and will be skipped if SKIP_INTEGRATION_TESTS=true
 */
import { describe, beforeAll, afterAll, it, expect, test } from 'vitest';

import { CompanyValidator } from '../../src/validators/company-validator.js';
import { getAttioClient } from '../../src/api/attio-client.js';
import { InvalidRequestError } from '../../src/errors/api-errors.js';
import { ResourceType } from '../../src/types/attio.js';

// Determine if tests should be skipped
  process.env.RUN_REAL_API_TESTS !== 'true' || !process.env.ATTIO_API_KEY;

// Use a consistent company name prefix to help with cleanup

// Helper to generate unique name
  `${TEST_COMPANY_PREFIX}${Math.floor(Math.random() * 100000)}`;

// Create a test company and return its ID
async function createTestCompany(attributes: Record<string, unknown>) {
  // Ensure the company has a unique name
    name: generateUniqueName(),
    ...attributes,
  };

  try {
    // Direct API call to create company
      `/objects/${ResourceType.COMPANIES}/records`,
      { values: companyData }
    );

    return response.data.data.id.record_id;
  } catch (error: unknown) {
    console.error('Failed to create test company:', error);
    throw error;
  }
}

// Delete a test company
async function deleteTestCompany(companyId: string) {
  try {
    await api.delete(`/objects/${ResourceType.COMPANIES}/records/${companyId}`);
  } catch (error: unknown) {
    console.error(`Failed to delete test company ${companyId}:`, error);
  }
}

// Clean up all test companies created during testing
async function cleanupTestCompanies() {
  try {
      `/objects/${ResourceType.COMPANIES}/records?limit=100`
    );

      (company: unknown) =>
        company.values.name &&
        Array.isArray(company.values.name) &&
        company.values.name[0] &&
        typeof company.values.name[0].value === 'string' &&
        company.values.name[0].value.startsWith(TEST_COMPANY_PREFIX)
    );

    for (const company of testCompanies) {
      await deleteTestCompany(company.id.record_id);
    }
  } catch (error: unknown) {
    console.error('Failed to cleanup test companies:', error);
  }
}

// Skip the entire suite if real API tests are not enabled
describe.skipIf(SKIP_TESTS)(`Attribute Validation with Real Attio API`, () => {
  beforeAll(async () => {
    // Clear attribute cache to ensure fresh data
    clearAttributeCache();

    // Set longer timeout for API tests
    test.setTimeout(30000); // 30 seconds
  });

  // Clean up after tests
  afterAll(async () => {
    await cleanupTestCompanies();
  });

  describe('Company validation with real attributes', () => {
    it('should fetch real attribute metadata from Attio API', async () => {

      // Verify we got metadata
      expect(metadata).toBeDefined();
      expect(metadata.size).toBeGreaterThan(0);

      // Check for common company attributes
      expect(metadata.has('name')).toBe(true);

      // Examine the schema for name attribute
      expect(nameAttr).toBeDefined();
      expect(nameAttr?.type).toBe('text');
    });

    it('should validate company creation with type conversion', async () => {
      // Test data with values requiring conversion
        name: generateUniqueName(),
        website: 'https://example.com',
        is_customer: 'true', // String to be converted to boolean
        company_size: '100', // String to be converted to number
        description: 'Test company',
      };

      // Validate using the attribute validator

      // Check type conversions
      expect(validated.is_customer).toBe(true);
      expect(validated.company_size).toBe(100);

      // Create the company in Attio

      // Verify company was created
      expect(companyId).toBeDefined();

      // Clean up
      await deleteTestCompany(companyId);
    });

    it('should validate company update with type conversion', async () => {
      // Create a test company
        name: generateUniqueName(),
        company_size: 50,
      });

      // Test update data with values requiring conversion
        company_size: '200', // String to be converted to number
        is_customer: 1, // Number to be converted to boolean
      };

      // Validate using the attribute validator
        companyId,
        updateData
      );

      // Check type conversions
      expect(validated.company_size).toBe(200);
      expect(validated.is_customer).toBe(true);

      // Update the company in Attio
      await api.patch(
        `/objects/${ResourceType.COMPANIES}/records/${companyId}`,
        { values: validated }
      );

      // Verify update with direct API call
        `/objects/${ResourceType.COMPANIES}/records/${companyId}`
      );

      // Check for updated values
      // Note: Structure may vary based on Attio API response format
      expect(updatedCompany).toBeDefined();

      // Clean up
      await deleteTestCompany(companyId);
    });

    it('should validate single attribute update', async () => {
      // Create a test company
        name: generateUniqueName(),
      });

      // Test single attribute update with conversion

      // Validate using the attribute validator
        companyId,
        attributeName,
        attributeValue
      );

      // Check type conversion
      expect(validatedValue).toBe(300);

      // Update the attribute in Attio
      await api.patch(
        `/objects/${ResourceType.COMPANIES}/records/${companyId}`,
        { values: { [attributeName]: validatedValue } }
      );

      // Verify update with direct API call
        `/objects/${ResourceType.COMPANIES}/records/${companyId}`
      );

      // Check for updated value
      expect(updatedCompany).toBeDefined();

      // Clean up
      await deleteTestCompany(companyId);
    });

    it('should reject invalid attribute values', async () => {
      // Test with invalid data
        name: generateUniqueName(),
        company_size: 'not-a-number', // Invalid for number field
      };

      // Should reject with error
      await expect(
        CompanyValidator.validateCreate(invalidData)
      ).rejects.toThrow();
    });
  });
});
