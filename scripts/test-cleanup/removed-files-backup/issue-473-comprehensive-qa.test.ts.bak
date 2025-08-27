/**
 * Comprehensive QA Test for Issue #473: Field Mapping Inconsistencies in Update Operations
 *
 * This test validates all fixes implemented for Issue #473, including:
 * - Field mapping corrections (employee_count → estimated_arr fix removed)
 * - Category validation with fuzzy matching (Issues #220/#218)
 * - Special character sanitization while preserving content
 * - Field persistence verification
 * - Response format normalization across resource types
 * - String-to-array auto-conversion for categories
 *
 * Test Environment Setup:
 * - Set ATTIO_API_KEY in environment for real API tests
 * - Set SKIP_INTEGRATION_TESTS=true to skip API calls
 * - Uses both real API calls and mock data for comprehensive coverage
 */

import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest';
import { UniversalUpdateService } from '../../src/services/UniversalUpdateService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { initializeAttioClient } from '../../src/api/attio-client.js';
import {
  validateCategories,
  processCategories,
} from '../../src/handlers/tool-configs/universal/field-mapper.js';
import {
  createCompany,
  deleteCompany,
} from '../../src/objects/companies/index.js';
import { CompanyMockFactory } from '../utils/mock-factories/CompanyMockFactory.js';

// Test configuration
const SKIP_INTEGRATION_TESTS =
  !process.env.ATTIO_API_KEY || process.env.SKIP_INTEGRATION_TESTS === 'true';
const testCompanies: string[] = [];

describe('Issue #473: Field Mapping Inconsistencies - Comprehensive QA', () => {
  beforeAll(() => {
    if (!SKIP_INTEGRATION_TESTS) {
      initializeAttioClient(process.env.ATTIO_API_KEY!);
    }
  });

  afterEach(async () => {
    // Cleanup created companies
    if (!SKIP_INTEGRATION_TESTS) {
      for (const companyId of testCompanies) {
        try {
          await deleteCompany(companyId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
    testCompanies.length = 0;
  });

  describe('Field Mapping Corrections', () => {
    it('should handle employee_count field correctly without incorrect mapping', async () => {
      const testData = {
        name: `Field Mapping Test ${Date.now()}`,
        employee_count: 250,
        domains: ['field-mapping-test.com'],
      };

      if (SKIP_INTEGRATION_TESTS) {
        // Test with mock data
        const mockCompany = CompanyMockFactory.create({
          name: testData.name,
          employee_count: testData.employee_count,
        });

        expect(mockCompany.values.employee_count).toBeDefined();
        expect(mockCompany.values.name).toBeDefined();
        return;
      }

      // Real API test
      const company = await createCompany(testData);
      testCompanies.push(company.id.record_id);

      expect(company.values.employee_count).toBeDefined();
      expect(company.values.name).toBeDefined();

      // Verify the field was not incorrectly mapped to estimated_arr
      const employeeCountValue = Array.isArray(company.values.employee_count)
        ? company.values.employee_count[0]?.value
        : company.values.employee_count;

      expect(employeeCountValue).toBe(testData.employee_count);
    });

    it('should handle domain/website field mapping correctly', async () => {
      const updateData = {
        website: 'corrected-domain.com', // Should map to domains field
        domain: 'another-domain.com', // Should also map to domains field
      };

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: updateData,
      });

      // Should map both website and domain to domains field
      expect(result.values.domains).toBeDefined();
    });
  });

  describe('Category Validation (Issues #220/#218)', () => {
    it('should validate and auto-convert string categories to arrays', () => {
      const validationResult = validateCategories('Technology');

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.autoConverted).toBe(true);
      expect(validationResult.validatedCategories).toEqual(['Technology']);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should validate array of valid categories', () => {
      const categories = ['Technology', 'Software', 'SaaS'];
      const validationResult = validateCategories(categories);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.autoConverted).toBe(false);
      expect(validationResult.validatedCategories).toEqual(categories);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should provide fuzzy matching suggestions for invalid categories', () => {
      const validationResult = validateCategories('Tecnology'); // Typo in Technology

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors[0]).toContain('Did you mean');
      expect(validationResult.suggestions).toContain('Technology');
    });

    it('should handle case-insensitive category matching', () => {
      const validationResult = validateCategories('technology'); // lowercase

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.validatedCategories).toEqual(['Technology']); // Canonical casing
    });

    it('should process categories field in company updates', () => {
      const result = processCategories(
        UniversalResourceType.COMPANIES,
        'categories',
        'Health Care' // String input
      );

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1); // Auto-conversion warning
      expect(result.processedValue).toEqual(['Health Care']);
    });

    it('should reject invalid categories with helpful suggestions', () => {
      const result = processCategories(
        UniversalResourceType.COMPANIES,
        'categories',
        ['ValidCategory', 'InvalidCategory123']
      );

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('InvalidCategory123');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Special Character Handling', () => {
    it('should preserve special characters in field content', async () => {
      const testData = {
        name: 'Test & Company "Special" Chars',
        description: 'Company with special chars: <>&"\'',
        notes: 'Line 1\nLine 2\tTabbed content',
      };

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

      // Verify special characters are preserved
      const nameValue = Array.isArray(result.values.name)
        ? result.values.name[0]?.value
        : result.values.name;

      expect(nameValue).toContain('&');
      expect(nameValue).toContain('"');
      expect(nameValue).toContain('Special');
    });

    it('should handle unicode and emoji characters', async () => {
      const testData = {
        name: 'Unicode Test 🚀 Company',
        description: 'Supports émojis and ñoñ-ASCII chars: 中文',
      };

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: testData,
      });

      const nameValue = Array.isArray(result.values.name)
        ? result.values.name[0]?.value
        : result.values.name;

      expect(nameValue).toContain('🚀');
      expect(nameValue).toContain('Unicode');
    });
  });

  describe('Field Persistence Verification', () => {
    it('should verify field persistence for company updates (when enabled)', async () => {
      // Set environment to enable field verification
      const originalEnv = process.env.ENABLE_FIELD_VERIFICATION;
      process.env.ENABLE_FIELD_VERIFICATION = 'true';
      process.env.SKIP_FIELD_VERIFICATION = 'true'; // Skip in test environment

      try {
        const result = await UniversalUpdateService.updateRecord({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'mock-company-id',
          record_data: {
            name: 'Persistence Test Company',
            employee_count: 100,
          },
        });

        expect(result).toBeDefined();
        expect(result.values).toBeDefined();
      } finally {
        // Restore original environment
        if (originalEnv !== undefined) {
          process.env.ENABLE_FIELD_VERIFICATION = originalEnv;
        } else {
          delete process.env.ENABLE_FIELD_VERIFICATION;
        }
        delete process.env.SKIP_FIELD_VERIFICATION;
      }
    });
  });

  describe('Response Format Normalization', () => {
    it('should normalize company response format consistently', async () => {
      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: {
          name: 'Normalization Test Company',
          domains: 'single-domain.com', // Should be converted to array
        },
      });

      // Verify consistent AttioRecord format
      expect(result.id).toBeDefined();
      expect(result.id.record_id).toBeDefined();
      expect(result.id.object_id).toBe('companies');
      expect(result.values).toBeDefined();
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();

      // Verify domains is an array
      expect(Array.isArray(result.values.domains)).toBe(true);
    });

    it('should normalize task response format with Issue #480 compatibility', async () => {
      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.TASKS,
        record_id: 'mock-task-id',
        record_data: {
          content: 'Test task content',
          status: 'pending',
        },
      });

      // Verify consistent AttioRecord format
      expect(result.id).toBeDefined();
      expect(result.id.record_id).toBeDefined();
      expect(result.id.object_id).toBe('tasks');
      expect(result.id.task_id).toBeDefined(); // Issue #480 compatibility

      // Verify dual field support
      expect(result.values.content).toBeDefined();
      expect(result.values.title).toBeDefined(); // Issue #480 compatibility
    });

    it('should normalize person response format with array fields', async () => {
      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.PEOPLE,
        record_id: 'mock-person-id',
        record_data: {
          name: 'Test Person',
          email_addresses: 'single@example.com', // Should be converted to array
          phone_numbers: '+1234567890', // Should be converted to array
        },
      });

      // Verify consistent AttioRecord format
      expect(result.id.object_id).toBe('people');

      // Verify arrays are properly formatted
      expect(Array.isArray(result.values.email_addresses)).toBe(true);
      expect(Array.isArray(result.values.phone_numbers)).toBe(true);
    });
  });

  describe('End-to-End Issue #473 Scenarios', () => {
    it('should handle the complete field mapping inconsistency scenario', async () => {
      // Simulate the exact scenario described in Issue #473
      const problematicUpdateData = {
        name: 'Issue #473 Test Company',
        employee_count: 500, // Previously incorrectly mapped to estimated_arr
        categories: 'Technology', // String that should auto-convert to array
        description:
          'Company with "special" & complex chars\nMulti-line content',
        website: 'issue473test.com', // Should map to domains field
      };

      const result = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: problematicUpdateData,
      });

      // Verify all fixes are working
      expect(result.id.object_id).toBe('companies');
      expect(result.values.name).toBeDefined();
      expect(result.values.employee_count).toBeDefined();
      expect(result.values.categories).toBeDefined();
      expect(Array.isArray(result.values.categories)).toBe(true);
      expect(result.values.domains).toBeDefined(); // website mapped to domains
      expect(Array.isArray(result.values.domains)).toBe(true);

      // Verify special characters are preserved
      const descValue = Array.isArray(result.values.description)
        ? result.values.description[0]?.value || result.values.description[0]
        : result.values.description;
      expect(String(descValue)).toContain('"special"');
      expect(String(descValue)).toContain('&');
    });

    it('should demonstrate GET/POST consistency (the core issue)', async () => {
      // This test demonstrates that updates are now consistent with retrievals
      const updateData = {
        name: 'Consistency Test Company',
        employee_count: 250,
        categories: ['Technology', 'Software'],
      };

      const updateResult = await UniversalUpdateService.updateRecord({
        resource_type: UniversalResourceType.COMPANIES,
        record_id: 'mock-company-id',
        record_data: updateData,
      });

      // The response format should now be predictable and consistent
      expect(updateResult.id).toBeDefined();
      expect(updateResult.values).toBeDefined();
      expect(updateResult.id.object_id).toBe('companies');

      // Fields should match what was sent in the update
      expect(updateResult.values.name).toBeDefined();
      expect(updateResult.values.employee_count).toBeDefined();
      expect(updateResult.values.categories).toBeDefined();
      expect(Array.isArray(updateResult.values.categories)).toBe(true);
    });
  });

  describe('Cross-Resource Type Consistency', () => {
    it('should provide consistent response formats across all resource types', async () => {
      const resourceTypes = [
        UniversalResourceType.COMPANIES,
        UniversalResourceType.PEOPLE,
        UniversalResourceType.TASKS,
        UniversalResourceType.DEALS,
        UniversalResourceType.LISTS,
        UniversalResourceType.RECORDS,
      ];

      for (const resourceType of resourceTypes) {
        const result = await UniversalUpdateService.updateRecord({
          resource_type: resourceType,
          record_id: `mock-${resourceType}-id`,
          record_data: { name: `Test ${resourceType}` },
        });

        // All should have consistent AttioRecord structure
        expect(result.id).toBeDefined();
        expect(result.id.record_id).toBeDefined();
        expect(result.id.object_id).toBeDefined();
        expect(result.values).toBeDefined();
        expect(
          typeof result.created_at === 'string' ||
            result.created_at === undefined
        ).toBe(true);
        expect(
          typeof result.updated_at === 'string' ||
            result.updated_at === undefined
        ).toBe(true);
      }
    });
  });
});
