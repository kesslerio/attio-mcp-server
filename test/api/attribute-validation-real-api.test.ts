/**
 * End-to-end tests for attribute validation with real Attio API
 * These tests require a valid Attio API key and will be skipped if SKIP_INTEGRATION_TESTS=true
 */

import { getAttioClient } from '../../src/api/attio-client.js';
import {
  clearAttributeCache,
  getAttributeTypeInfo,
  getObjectAttributeMetadata,
} from '../../src/api/attribute-types.js';
import { InvalidRequestError } from '../../src/errors/api-errors.js';
import { ResourceType } from '../../src/types/attio.js';
import { CompanyValidator } from '../../src/validators/company-validator.js';

// Determine if tests should be skipped
const SKIP_TESTS =
  process.env.SKIP_INTEGRATION_TESTS === 'true' || !process.env.ATTIO_API_KEY;
const TEST_PREFIX = SKIP_TESTS ? 'skip' : 'only';

// Use a consistent company name prefix to help with cleanup
const TEST_COMPANY_PREFIX = 'ValidationTest_';

// Helper to generate unique name
const generateUniqueName = () =>
  `${TEST_COMPANY_PREFIX}${Math.floor(Math.random() * 100_000)}`;

// Create a test company and return its ID
async function createTestCompany(attributes: Record<string, any>) {
  // Ensure the company has a unique name
  const companyData = {
    name: generateUniqueName(),
    ...attributes,
  };

  try {
    // Direct API call to create company
    const api = getAttioClient();
    const response = await api.post(
      `/objects/${ResourceType.COMPANIES}/records`,
      { values: companyData }
    );

    return response.data.data.id.record_id;
  } catch (error) {
    console.error('Failed to create test company:', error);
    throw error;
  }
}

// Delete a test company
async function deleteTestCompany(companyId: string) {
  try {
    const api = getAttioClient();
    await api.delete(`/objects/${ResourceType.COMPANIES}/records/${companyId}`);
  } catch (error) {
    console.error(`Failed to delete test company ${companyId}:`, error);
  }
}

// Clean up all test companies created during testing
async function cleanupTestCompanies() {
  try {
    const api = getAttioClient();
    const response = await api.get(
      `/objects/${ResourceType.COMPANIES}/records?limit=100`
    );

    const companies = response.data.data || [];
    const testCompanies = companies.filter(
      (company: any) =>
        company.values.name &&
        Array.isArray(company.values.name) &&
        company.values.name[0] &&
        typeof company.values.name[0].value === 'string' &&
        company.values.name[0].value.startsWith(TEST_COMPANY_PREFIX)
    );

    for (const company of testCompanies) {
      await deleteTestCompany(company.id.record_id);
    }
  } catch (error) {
    console.error('Failed to cleanup test companies:', error);
  }
}

describe(`Attribute Validation with Real Attio API (${
  SKIP_TESTS ? 'SKIPPED' : 'ACTIVE'
})`, () => {
  // Only run tests if not skipped
  beforeAll(() => {
    // Skip all tests if SKIP_INTEGRATION_TESTS is true
    if (SKIP_TESTS) {
      console.log(
        'Skipping API integration tests - no API key or SKIP_INTEGRATION_TESTS=true'
      );
      return;
    }

    // Clear attribute cache to ensure fresh data
    clearAttributeCache();

    // Set longer timeout for API tests
    vi.setConfig({ testTimeout: 30000 }); // 30 seconds
  });

  // Clean up after tests if they ran
  afterAll(async () => {
    if (!SKIP_TESTS) {
      await cleanupTestCompanies();
    }
  });

  describe(`Company validation with real attributes (${TEST_PREFIX})`, () => {
    // This will run or skip based on TEST_PREFIX
    it[TEST_PREFIX](
      'should fetch real attribute metadata from Attio API',
      async () => {
        const metadata = await getObjectAttributeMetadata(
          ResourceType.COMPANIES
        );

        // Verify we got metadata
        expect(metadata).toBeDefined();
        expect(metadata.size).toBeGreaterThan(0);

        // Check for common company attributes
        expect(metadata.has('name')).toBe(true);

        // Examine the schema for name attribute
        const nameAttr = metadata.get('name');
        expect(nameAttr).toBeDefined();
        expect(nameAttr?.type).toBe('text');
      }
    );

    it[TEST_PREFIX](
      'should validate company creation with type conversion',
      async () => {
        // Test data with values requiring conversion
        const companyData = {
          name: generateUniqueName(),
          website: 'https://example.com',
          is_customer: 'true', // String to be converted to boolean
          company_size: '100', // String to be converted to number
          description: 'Test company',
        };

        // Validate using the attribute validator
        const validated = await CompanyValidator.validateCreate(companyData);

        // Check type conversions
        expect(validated.is_customer).toBe(true);
        expect(validated.company_size).toBe(100);

        // Create the company in Attio
        const companyId = await createTestCompany(validated);

        // Verify company was created
        expect(companyId).toBeDefined();

        // Clean up
        await deleteTestCompany(companyId);
      }
    );

    it[TEST_PREFIX](
      'should validate company update with type conversion',
      async () => {
        // Create a test company
        const companyId = await createTestCompany({
          name: generateUniqueName(),
          company_size: 50,
        });

        // Test update data with values requiring conversion
        const updateData = {
          company_size: '200', // String to be converted to number
          is_customer: 1, // Number to be converted to boolean
        };

        // Validate using the attribute validator
        const validated = await CompanyValidator.validateUpdate(
          companyId,
          updateData
        );

        // Check type conversions
        expect(validated.company_size).toBe(200);
        expect(validated.is_customer).toBe(true);

        // Update the company in Attio
        const api = getAttioClient();
        await api.patch(
          `/objects/${ResourceType.COMPANIES}/records/${companyId}`,
          { values: validated }
        );

        // Verify update with direct API call
        const response = await api.get(
          `/objects/${ResourceType.COMPANIES}/records/${companyId}`
        );
        const updatedCompany = response.data.data;

        // Check for updated values
        // Note: Structure may vary based on Attio API response format
        expect(updatedCompany).toBeDefined();

        // Clean up
        await deleteTestCompany(companyId);
      }
    );

    it[TEST_PREFIX]('should validate single attribute update', async () => {
      // Create a test company
      const companyId = await createTestCompany({
        name: generateUniqueName(),
      });

      // Test single attribute update with conversion
      const attributeName = 'company_size';
      const attributeValue = '300'; // String to be converted to number

      // Validate using the attribute validator
      const validatedValue = await CompanyValidator.validateAttributeUpdate(
        companyId,
        attributeName,
        attributeValue
      );

      // Check type conversion
      expect(validatedValue).toBe(300);

      // Update the attribute in Attio
      const api = getAttioClient();
      await api.patch(
        `/objects/${ResourceType.COMPANIES}/records/${companyId}`,
        { values: { [attributeName]: validatedValue } }
      );

      // Verify update with direct API call
      const response = await api.get(
        `/objects/${ResourceType.COMPANIES}/records/${companyId}`
      );
      const updatedCompany = response.data.data;

      // Check for updated value
      expect(updatedCompany).toBeDefined();

      // Clean up
      await deleteTestCompany(companyId);
    });

    it[TEST_PREFIX]('should reject invalid attribute values', async () => {
      // Test with invalid data
      const invalidData = {
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
