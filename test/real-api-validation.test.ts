/**
 * Real API Validation Tests
 *
 * These tests validate core functionality against the live Attio API when ATTIO_API_KEY is available.
 * Tests schema validation, performance monitoring, and data normalization with real API responses.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { EmailValidationMode } from '../src/utils/normalization/email-validation-config.js';
import { PeopleDataNormalizer } from '../src/utils/normalization/people-normalization.js';
import { PerformanceMonitor } from '../src/middleware/performance.js';
import { ResourceMapper } from '../src/utils/resource-mapping.js';
import { SchemaPreValidator } from '../src/utils/schema-pre-validation.js';

// Skip these tests if no API key is available
  !process.env.ATTIO_API_KEY || process.env.SKIP_INTEGRATION_TESTS === 'true';

describe.skipIf(SKIP_INTEGRATION)('Real API Validation Tests', () => {
  let performanceMonitor: unknown;

  beforeAll(() => {
    performanceMonitor = PerformanceMonitor.getInstance();
  });

  afterAll(() => {
    // Clean up any test data if needed
    performanceMonitor.reset();
  });

  describe('Schema Validation with Real API', () => {
    it('should validate against real company attributes', async () => {
      // Pre-populate cache with real attributes
        'companies' as any
      );

      // Valid data that matches real schema
        name: 'Test Company',
        domain: 'test.com',
        team_size: 50,
      };

        'companies' as any,
        validData
      );
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid fields against real schema', async () => {
        name: 'Test Company',
        invalid_field_xyz: 'should fail',
        another_bad_field: 123,
      };

        'companies' as any,
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

      // Start tracking
      performanceMonitor.startOperation(operation);

      // Simulate a real API-like delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // End tracking
      performanceMonitor.endOperation(operation);

      // Check metrics
      expect(metrics.totalOperations).toBeGreaterThan(0);
      expect(metrics.averageTime).toBeGreaterThan(50);
      expect(metrics.averageTime).toBeLessThan(200);
    });

    it('should detect slow operations', async () => {

      // Track a slow operation
      performanceMonitor.startOperation(operation);
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be marked as warning (>100ms)
      expect(result.duration).toBeGreaterThan(100);

      expect(metrics.slowOperations).toBeGreaterThan(0);
    });
  });

  describe('Resource Mapping with Real Resources', () => {
    it('should generate correct paths for all resource types', () => {
      // Test real resource types
        { type: 'companies', id: '123', expected: '/objects/companies/123' },
        { type: 'people', id: '456', expected: '/objects/people/456' },
        { type: 'lists', id: '789', expected: '/lists/789' },
        { type: 'tasks', id: 'abc', expected: '/tasks/abc' },
        { type: 'deals', id: 'def', expected: '/objects/deals/def' },
      ];

      for (const testCase of testCases) {
          testCase.type as any,
          testCase.id
        );
        expect(path).toBe(testCase.expected);
      }
    });

    it('should handle custom object types correctly', () => {
      expect(path).toBe('/objects/custom_crm_object/xyz');
      expect(path).not.toContain('/objects/objects/');
    });
  });

  describe('People Normalization with Various Formats', () => {
    it('should normalize real-world name formats', () => {
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
        expect(result).toEqual(testCase.expected);
      }
    });

    it('should normalize email formats correctly', () => {
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
        expect(result).toEqual(testCase.expected);
      }
    });

    it('should validate complex email formats', () => {
        'user@example.com',
        'user+tag@example.com',
        'user.name@example.co.uk',
        'user_name@example-domain.com',
        'user123@test.domain.com',
      ];

        'invalid.email',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        'a'.repeat(65) + '@example.com', // Too long local part
        'user@' + 'a'.repeat(250) + '.com', // Too long total
      ];

      for (const email of validEmails) {
        expect(result).toBeDefined();
        expect(result).toHaveLength(1);
      }

      for (const email of invalidEmails) {
          mode: EmailValidationMode.WARN,
          logDeprecationWarnings: false,
        });
        expect(result).toBeUndefined();
      }
    });
  });

  describe('End-to-End Validation Flow', () => {
    it('should validate a complete company creation request', async () => {
        resource_type: 'companies',
        action: 'create',
        data: {
          name: 'Acme Corporation',
          domain: 'acme.com',
          team_size: 100,
          description: 'A test company for integration testing',
        },
      };

      // Basic input structure validation
      expect(input).toHaveProperty('resource_type');
      expect(input).toHaveProperty('action');
      expect(input).toHaveProperty('data');
      expect(input.resource_type).toBe('companies');

      // Validate fields against real attributes
        'companies' as any,
        input.data
      );
      expect(fieldValidation.isValid).toBe(true);
    });

    it('should validate a complete people creation request with normalization', async () => {
        resource_type: 'people',
        action: 'create',
        data: {
          name: 'John Doe',
          email_address: 'john.doe@example.com', // Will be normalized to email_addresses array
          phone: '+1-555-0123', // Will be normalized
        },
      };

      // Normalize the data
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
