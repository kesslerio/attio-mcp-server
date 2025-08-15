/**
 * Phase 1 Integration Tests
 *
 * These tests validate the Phase 1 fixes with real API calls when ATTIO_API_KEY is available.
 * They complement the unit tests in phase1-fixes-verification.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { validateToolInput } from '../src/middleware/validation.js';
import { PerformanceMonitor } from '../src/middleware/performance.js';
import { SchemaPreValidator } from '../src/utils/schema-pre-validation.js';
import { PeopleNormalizer } from '../src/utils/normalization/people-normalization.js';
import { ResourceMapper } from '../src/utils/resource-mapping.js';

// Skip these tests if no API key is available
const SKIP_INTEGRATION =
  !process.env.ATTIO_API_KEY || process.env.SKIP_INTEGRATION_TESTS === 'true';

describe.skipIf(SKIP_INTEGRATION)('Phase 1 Integration Tests', () => {
  let performanceMonitor: PerformanceMonitor;
  let schemaValidator: SchemaPreValidator;

  beforeAll(() => {
    performanceMonitor = PerformanceMonitor.getInstance();
    schemaValidator = SchemaPreValidator.getInstance();
  });

  afterAll(() => {
    // Clean up any test data if needed
    performanceMonitor.reset();
  });

  describe('Schema Validation with Real API', () => {
    it('should validate against real company attributes', async () => {
      // Pre-populate cache with real attributes
      const attributes =
        await schemaValidator.getAvailableAttributes('companies');

      // Valid data that matches real schema
      const validData = {
        name: 'Test Company',
        domain: 'test.com',
        team_size: 50,
      };

      const validation = await schemaValidator.validateRecordData(
        'companies',
        validData
      );
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid fields against real schema', async () => {
      const invalidData = {
        name: 'Test Company',
        invalid_field_xyz: 'should fail',
        another_bad_field: 123,
      };

      const validation = await schemaValidator.validateRecordData(
        'companies',
        invalidData
      );
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(2);
      expect(validation.errors[0]).toContain('invalid_field_xyz');
      expect(validation.suggestions).toBeDefined();
    });
  });

  describe('Performance Monitoring with Real Operations', () => {
    it('should track real API call performance', async () => {
      const operation = 'test-api-call';

      // Start tracking
      performanceMonitor.startOperation(operation);

      // Simulate a real API-like delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // End tracking
      performanceMonitor.endOperation(operation);

      // Check metrics
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalOperations).toBeGreaterThan(0);
      expect(metrics.averageTime).toBeGreaterThan(50);
      expect(metrics.averageTime).toBeLessThan(200);
    });

    it('should detect slow operations', async () => {
      const operation = 'slow-operation';

      // Track a slow operation
      performanceMonitor.startOperation(operation);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const result = performanceMonitor.endOperation(operation);

      // Should be marked as warning (>100ms)
      expect(result.duration).toBeGreaterThan(100);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.slowOperations).toBeGreaterThan(0);
    });
  });

  describe('Resource Mapping with Real Resources', () => {
    it('should generate correct paths for all resource types', () => {
      // Test real resource types
      const testCases = [
        { type: 'companies', id: '123', expected: '/objects/companies/123' },
        { type: 'people', id: '456', expected: '/objects/people/456' },
        { type: 'lists', id: '789', expected: '/lists/789' },
        { type: 'tasks', id: 'abc', expected: '/tasks/abc' },
        { type: 'deals', id: 'def', expected: '/objects/deals/def' },
      ];

      for (const testCase of testCases) {
        const path = ResourceMapper.getResourcePath(
          testCase.type as any,
          testCase.id
        );
        expect(path).toBe(testCase.expected);
      }
    });

    it('should handle custom object types correctly', () => {
      const customType = 'custom_crm_object';
      const path = ResourceMapper.getResourcePath(customType as any, 'xyz');
      expect(path).toBe('/objects/custom_crm_object/xyz');
      expect(path).not.toContain('/objects/objects/');
    });
  });

  describe('People Normalization with Various Formats', () => {
    it('should normalize real-world name formats', () => {
      const testCases = [
        {
          input: 'John Doe',
          expected: { first_name: 'John', last_name: 'Doe' },
        },
        {
          input: { name: 'Jane Smith' },
          expected: { first_name: 'Jane', last_name: 'Smith' },
        },
        {
          input: { first_name: 'Bob', last_name: 'Johnson' },
          expected: { first_name: 'Bob', last_name: 'Johnson' },
        },
        {
          input: 'Mary Jane Watson Parker',
          expected: { first_name: 'Mary', last_name: 'Parker' },
        },
      ];

      for (const testCase of testCases) {
        const result = PeopleNormalizer.normalizeName(testCase.input);
        expect(result).toEqual(testCase.expected);
      }
    });

    it('should normalize email formats correctly', () => {
      const testCases = [
        {
          input: 'john@example.com',
          expected: [
            { email_address: 'john@example.com', email_type: 'primary' },
          ],
        },
        {
          input: { email_address: 'jane@test.org' },
          expected: [{ email_address: 'jane@test.org', email_type: 'primary' }],
        },
        {
          input: ['bob@company.com', 'bob.personal@gmail.com'],
          expected: [
            { email_address: 'bob@company.com', email_type: 'primary' },
            {
              email_address: 'bob.personal@gmail.com',
              email_type: 'secondary',
            },
          ],
        },
      ];

      for (const testCase of testCases) {
        const result = PeopleNormalizer.normalizeEmails(testCase.input);
        expect(result).toEqual(testCase.expected);
      }
    });

    it('should validate complex email formats', () => {
      const validEmails = [
        'user@example.com',
        'user+tag@example.com',
        'user.name@example.co.uk',
        'user_name@example-domain.com',
        'user123@test.domain.com',
      ];

      const invalidEmails = [
        'invalid.email',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        'a'.repeat(65) + '@example.com', // Too long local part
        'user@' + 'a'.repeat(250) + '.com', // Too long total
      ];

      for (const email of validEmails) {
        const result = PeopleNormalizer.normalizeEmails(email);
        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
      }

      for (const email of invalidEmails) {
        const result = PeopleNormalizer.normalizeEmails(email);
        expect(result).toBeUndefined();
      }
    });
  });

  describe('End-to-End Validation Flow', () => {
    it('should validate a complete company creation request', async () => {
      const input = {
        resource_type: 'companies',
        action: 'create',
        data: {
          name: 'Acme Corporation',
          domain: 'acme.com',
          team_size: 100,
          description: 'A test company for integration testing',
        },
      };

      // Validate with schema
      const schemaValidation = validateToolInput(input, {
        type: 'object',
        properties: {
          resource_type: {
            type: 'string',
            enum: ['companies', 'people', 'lists', 'tasks', 'deals'],
          },
          action: {
            type: 'string',
            enum: ['create', 'update', 'delete', 'search'],
          },
          data: { type: 'object' },
        },
        required: ['resource_type', 'action', 'data'],
      });

      expect(schemaValidation.success).toBe(true);

      // Validate fields against real attributes
      const fieldValidation = await schemaValidator.validateRecordData(
        'companies',
        input.data
      );
      expect(fieldValidation.isValid).toBe(true);
    });

    it('should validate a complete people creation request with normalization', async () => {
      const input = {
        resource_type: 'people',
        action: 'create',
        data: {
          name: 'John Doe',
          email_address: 'john.doe@example.com', // Will be normalized to email_addresses array
          phone: '+1-555-0123', // Will be normalized
        },
      };

      // Normalize the data
      const normalized = PeopleNormalizer.normalizePeopleData(input.data);

      expect(normalized).toHaveProperty('first_name', 'John');
      expect(normalized).toHaveProperty('last_name', 'Doe');
      expect(normalized).toHaveProperty('email_addresses');
      expect(normalized.email_addresses).toHaveLength(1);
      expect(normalized.email_addresses[0]).toHaveProperty(
        'email_address',
        'john.doe@example.com'
      );
    });
  });
});
