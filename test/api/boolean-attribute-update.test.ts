/**
 * End-to-end tests for boolean attribute updates with actual Attio API
 *
 * These tests require a valid ATTIO_API_KEY environment variable.
 * They can be skipped by setting SKIP_INTEGRATION_TESTS=true.
 */
import {
  createCompany,
  deleteCompany,
  updateCompany,
  updateCompanyAttribute,
} from '../../src/objects/companies/basic.js';
import type { Company } from '../../src/types/attio.js';

// Test configuration
const SKIP_TESTS = process.env.SKIP_INTEGRATION_TESTS === 'true';
const TEST_TIMEOUT = 30_000; // 30 seconds
const TEST_COMPANY_NAME = `Test Company ${Date.now()}`;

describe('Boolean Attribute API Tests', () => {
  let testCompany: Company;

  // Skip all tests if integration tests are disabled
  beforeAll(() => {
    if (SKIP_TESTS) {
      console.warn(
        'Skipping boolean attribute API tests because SKIP_INTEGRATION_TESTS=true'
      );
    } else if (!process.env.ATTIO_API_KEY) {
      console.warn(
        'Skipping boolean attribute API tests because ATTIO_API_KEY is not set'
      );
    }
  });

  // Create a test company before all tests
  beforeAll(async () => {
    // Skip setup if tests are disabled
    if (SKIP_TESTS || !process.env.ATTIO_API_KEY) {
      return;
    }

    try {
      testCompany = await createCompany({
        name: TEST_COMPANY_NAME,
        is_active: 'true',
        uses_body_composition: 'true',
      });

      console.log(`Created test company: ${testCompany.id?.record_id}`);
    } catch (error) {
      console.error('Error creating test company:', error);
      throw error;
    }
  }, TEST_TIMEOUT);

  // Clean up after all tests
  afterAll(async () => {
    // Skip cleanup if tests are disabled or if no test company was created
    if (
      SKIP_TESTS ||
      !process.env.ATTIO_API_KEY ||
      !testCompany?.id?.record_id
    ) {
      return;
    }

    try {
      await deleteCompany(testCompany.id.record_id);
      console.log(`Deleted test company: ${testCompany.id.record_id}`);
    } catch (error) {
      console.error('Error deleting test company:', error);
    }
  }, TEST_TIMEOUT);

  // Test updating a boolean attribute with string 'false'
  test.skipIf(SKIP_TESTS || !process.env.ATTIO_API_KEY)(
    'updates boolean attribute with string "false"',
    async () => {
      const companyId = testCompany?.id?.record_id;
      expect(companyId).toBeDefined();

      // Update the is_active attribute with string 'false'
      const result = await updateCompanyAttribute(
        companyId!,
        'is_active',
        'false'
      );

      // Verify the result
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      // Check if the boolean was properly updated (the actual value format will depend on Attio's API response)
      const isActiveValue = result.values?.is_active;
      expect(isActiveValue).toBeDefined();

      // The format might be an array of objects with a value property
      if (Array.isArray(isActiveValue) && isActiveValue.length > 0) {
        expect(isActiveValue[0].value).toBe(false);
      }
    },
    TEST_TIMEOUT
  );

  // Test updating a boolean attribute with string 'true'
  test.skipIf(SKIP_TESTS || !process.env.ATTIO_API_KEY)(
    'updates boolean attribute with string "true"',
    async () => {
      const companyId = testCompany?.id?.record_id;
      expect(companyId).toBeDefined();

      // Update the is_active attribute with string 'true'
      const result = await updateCompanyAttribute(
        companyId!,
        'is_active',
        'true'
      );

      // Verify the result
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      // Check if the boolean was properly updated
      const isActiveValue = result.values?.is_active;
      expect(isActiveValue).toBeDefined();

      if (Array.isArray(isActiveValue) && isActiveValue.length > 0) {
        expect(isActiveValue[0].value).toBe(true);
      }
    },
    TEST_TIMEOUT
  );

  // Test updating multiple boolean attributes in a single request
  test.skipIf(SKIP_TESTS || !process.env.ATTIO_API_KEY)(
    'updates multiple boolean attributes with string values',
    async () => {
      const companyId = testCompany?.id?.record_id;
      expect(companyId).toBeDefined();

      // Update multiple boolean attributes with string values
      const result = await updateCompany(companyId!, {
        is_active: 'no',
        uses_body_composition: 'yes',
      });

      // Verify the result
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      // Check if the boolean values were properly updated
      const isActiveValue = result.values?.is_active;
      const usesBodyCompositionValue = result.values?.uses_body_composition;

      expect(isActiveValue).toBeDefined();
      expect(usesBodyCompositionValue).toBeDefined();

      if (Array.isArray(isActiveValue) && isActiveValue.length > 0) {
        expect(isActiveValue[0].value).toBe(false);
      }

      if (
        Array.isArray(usesBodyCompositionValue) &&
        usesBodyCompositionValue.length > 0
      ) {
        expect(usesBodyCompositionValue[0].value).toBe(true);
      }
    },
    TEST_TIMEOUT
  );
});
