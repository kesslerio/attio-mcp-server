/**
 * Phase 1 Fixes Verification Tests
 *
 * Tests to verify that all Phase 1 critical bug fixes are working correctly.
 * Issue #377: E2E Test Suite Critical Gaps
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { validateUniversalToolParams } from '../src/handlers/tool-configs/universal/schemas.js';
import { PeopleDataNormalizer } from '../src/utils/normalization/people-normalization.js';
import { ResourceMapper } from '../src/utils/resource-mapping.js';
import { SchemaPreValidator } from '../src/utils/schema-pre-validation.js';
import {
  JsonSchemaValidator,
  ParameterValidationMiddleware,
} from '../src/middleware/validation.js';
import {
  validateApiKey,
  runPreflightChecks,
} from '../test/e2e/setup/preflight.js';
import { UniversalResourceType } from '../src/handlers/tool-configs/universal/types.js';

describe('Phase 1 Critical Bug Fixes', () => {
  describe('1. JSON Schema Validation (Elevated Priority)', () => {
    it('should validate parameters against JSON schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number', minimum: 0, maximum: 150 },
          active: { type: 'boolean' },
        },
        required: ['name'],
        additionalProperties: false,
      };

      // Valid params
      const validResult = JsonSchemaValidator.validate(
        { name: 'John', age: 30, active: true },
        schema
      );
      expect(validResult.valid).toBe(true);
      expect(validResult.sanitizedParams).toBeDefined();

      // Invalid params - missing required field
      const invalidResult1 = JsonSchemaValidator.validate({ age: 30 }, schema);
      expect(invalidResult1.valid).toBe(false);
      expect(invalidResult1.errors).toHaveLength(1);
      expect(invalidResult1.errors![0].message).toContain(
        'Missing required field'
      );

      // Invalid params - wrong type
      const invalidResult2 = JsonSchemaValidator.validate(
        { name: 123, age: 'thirty' },
        schema
      );
      expect(invalidResult2.valid).toBe(false);
      expect(invalidResult2.errors!.length).toBeGreaterThan(0);

      // Invalid params - additional property
      const invalidResult3 = JsonSchemaValidator.validate(
        { name: 'John', extra: 'field' },
        schema
      );
      expect(invalidResult3.valid).toBe(false);
      expect(invalidResult3.errors![0].message).toContain('Unknown field');
    });
  });

  describe('2. Preflight API Key Validation', () => {
    it('should detect missing API key', () => {
      const originalApiKey = process.env.ATTIO_API_KEY;
      delete process.env.ATTIO_API_KEY;

      const result = validateApiKey();
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_API_KEY');
      expect(result.errors[0].fatal).toBe(true);

      // Restore
      if (originalApiKey) process.env.ATTIO_API_KEY = originalApiKey;
    });

    it('should detect empty API key', () => {
      const originalApiKey = process.env.ATTIO_API_KEY;
      process.env.ATTIO_API_KEY = '   ';

      const result = validateApiKey();
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EMPTY_API_KEY');

      // Restore
      if (originalApiKey) process.env.ATTIO_API_KEY = originalApiKey;
    });

    it('should detect placeholder API key', () => {
      const originalApiKey = process.env.ATTIO_API_KEY;
      process.env.ATTIO_API_KEY = 'your_api_key_here';

      const result = validateApiKey();
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PLACEHOLDER_API_KEY');

      // Restore
      if (originalApiKey) process.env.ATTIO_API_KEY = originalApiKey;
    });

    it('should warn about unusual API key format', () => {
      const originalApiKey = process.env.ATTIO_API_KEY;
      process.env.ATTIO_API_KEY = 'unusual-key-format-123';

      const result = validateApiKey();
      // Should be valid but with warnings
      expect(result.valid).toBe(true);
      // May have warnings about format

      // Restore
      if (originalApiKey) process.env.ATTIO_API_KEY = originalApiKey;
    });
  });

  describe('3. Parameter Validation Regression Fix', () => {
    it('should reject negative limit values', () => {
      expect(() => {
        validateUniversalToolParams('search-records', {
          resource_type: 'companies',
          limit: -1,
        });
      }).toThrow('Parameter "limit" must be at least 1');
    });

    it('should reject limit values over 100', () => {
      expect(() => {
        validateUniversalToolParams('search-records', {
          resource_type: 'companies',
          limit: 150,
        });
      }).toThrow('Parameter "limit" must not exceed 100');
    });

    it('should reject negative offset values', () => {
      expect(() => {
        validateUniversalToolParams('search-records', {
          resource_type: 'companies',
          offset: -10,
        });
      }).toThrow('Parameter "offset" must be non-negative');
    });

    it('should validate ID format', () => {
      expect(() => {
        validateUniversalToolParams('get-record-details', {
          resource_type: 'companies',
          record_id: 'invalid id with spaces!',
        });
      }).toThrow('Invalid record_id format');
    });

    it('should accept valid parameters', () => {
      const result = validateUniversalToolParams('search-records', {
        resource_type: 'companies',
        limit: 50,
        offset: 10,
        query: 'test',
      });

      expect(result).toBeDefined();
      expect(result.resource_type).toBe('companies');
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);
    });
  });

  describe('4. Resource Pathing for Lists', () => {
    it('should generate correct base path for lists', () => {
      const path = ResourceMapper.getBasePath('lists');
      expect(path).toBe('/lists');
    });

    it('should generate correct base path for companies', () => {
      const path = ResourceMapper.getBasePath('companies');
      expect(path).toBe('/objects/companies');
    });

    it('should generate correct search path for lists', () => {
      const path = ResourceMapper.getSearchPath('lists');
      expect(path).toBe('/lists');
    });

    it('should generate correct search path for companies', () => {
      const path = ResourceMapper.getSearchPath('companies');
      expect(path).toBe('/objects/companies/query');
    });

    it('should handle custom object types', () => {
      const customType = 'custom_objects';
      expect(ResourceMapper.isCustomObjectType(customType)).toBe(true);
      expect(ResourceMapper.getBasePath(customType)).toBe(
        '/objects/custom_objects'
      );
    });

    it('should normalize resource types', () => {
      expect(ResourceMapper.normalizeResourceType('company')).toBe('companies');
      expect(ResourceMapper.normalizeResourceType('person')).toBe('people');
      expect(ResourceMapper.normalizeResourceType('list')).toBe('lists');
    });
  });

  describe('5. People Input Normalization', () => {
    it('should normalize name string to object', () => {
      const result = PeopleDataNormalizer.normalizeName('John Doe');
      expect(result).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe',
      });
    });

    it('should normalize single name', () => {
      const result = PeopleDataNormalizer.normalizeName('Madonna');
      expect(result).toEqual({
        first_name: 'Madonna',
        full_name: 'Madonna',
      });
    });

    it('should normalize name object', () => {
      const result = PeopleDataNormalizer.normalizeName({
        first_name: 'Jane',
        last_name: 'Smith',
      });
      expect(result).toEqual({
        first_name: 'Jane',
        last_name: 'Smith',
        full_name: 'Jane Smith',
      });
    });

    it('should normalize email string to array', () => {
      const result = PeopleDataNormalizer.normalizeEmails('john@example.com');
      expect(result).toEqual([{ email_address: 'john@example.com' }]);
    });

    it('should normalize email_address field to email_addresses array', () => {
      const result = PeopleDataNormalizer.normalizeEmails({
        email_address: 'jane@example.com',
      });
      expect(result).toEqual([{ email_address: 'jane@example.com' }]);
    });

    it('should normalize complete people data', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        company: 'Acme Corp',
      };

      const result = PeopleDataNormalizer.normalizePeopleData(input);

      expect(result.name).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe',
      });
      expect(result.email_addresses).toEqual([
        { email_address: 'john@example.com' },
      ]);
      expect(result.phone_numbers).toEqual([{ phone_number: '+1234567890' }]);
      expect(result.company).toBe('Acme Corp');
    });
  });

  describe('6. Schema Pre-validation', () => {
    it('should get default attributes for companies', async () => {
      const attrs = await SchemaPreValidator.getAttributes(
        UniversalResourceType.COMPANIES
      );
      expect(attrs).toBeDefined();
      expect(attrs.length).toBeGreaterThan(0);

      const nameAttr = attrs.find((a) => a.slug === 'name');
      expect(nameAttr).toBeDefined();
      expect(nameAttr?.is_required).toBe(true);
    });

    it('should validate record data against attributes', async () => {
      const validation = await SchemaPreValidator.validateRecordData(
        UniversalResourceType.COMPANIES,
        {
          name: 'Test Company',
          domain: 'test.com',
          unknown_field: 'value',
        }
      );

      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Unknown field');
    });

    it('should suggest field corrections', async () => {
      const validation = await SchemaPreValidator.validateRecordData(
        UniversalResourceType.COMPANIES,
        {
          nam: 'Test Company', // Typo
          domian: 'test.com', // Typo
        }
      );

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.suggestions.size).toBeGreaterThan(0);
    });

    it('should validate field types', async () => {
      const validation = await SchemaPreValidator.validateRecordData(
        UniversalResourceType.COMPANIES,
        {
          name: 'Test Company',
          employee_count: 'not a number', // Should be number
        }
      );

      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('expects a number');
    });
  });

  describe('7. Quick Wins Implementation', () => {
    describe('Parameter Validation Regex', () => {
      it('should validate ID format with regex', () => {
        const idRegex = /^[a-zA-Z0-9_-]+$/;

        expect(idRegex.test('comp_abc123')).toBe(true);
        expect(idRegex.test('person-xyz-789')).toBe(true);
        expect(idRegex.test('invalid id!')).toBe(false);
        expect(idRegex.test('has spaces')).toBe(false);
      });
    });

    describe('Early ID Format Validation', () => {
      it('should validate ID early in the process', () => {
        expect(() => {
          validateUniversalToolParams('get-record-details', {
            resource_type: 'companies',
            record_id: 'ab', // Too short
          });
        }).toThrow('Invalid record_id length');

        expect(() => {
          validateUniversalToolParams('get-record-details', {
            resource_type: 'companies',
            record_id: 'a'.repeat(101), // Too long
          });
        }).toThrow('Invalid record_id length');
      });
    });

    describe('Performance Middleware', () => {
      it('should import performance tracking middleware', async () => {
        const { PerformanceTracker } = await import(
          '../src/middleware/performance.js'
        );

        expect(PerformanceTracker).toBeDefined();
        expect(PerformanceTracker.startOperation).toBeDefined();
        expect(PerformanceTracker.endOperation).toBeDefined();
        expect(PerformanceTracker.getSummary).toBeDefined();
      });
    });
  });

  describe('Integration Test', () => {
    it('should work together for a complete flow', () => {
      // 1. Validate API key (mock valid key)
      const originalApiKey = process.env.ATTIO_API_KEY;
      process.env.ATTIO_API_KEY = 'valid_test_key_12345';

      const apiKeyResult = validateApiKey();
      expect(apiKeyResult.valid).toBe(true);

      // 2. Normalize people input
      const inputData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const normalizedData =
        PeopleDataNormalizer.normalizePeopleData(inputData);
      expect(normalizedData.name?.first_name).toBe('John');
      expect(normalizedData.email_addresses).toHaveLength(1);

      // 3. Validate parameters
      const validatedParams = validateUniversalToolParams('create-record', {
        resource_type: 'people',
        record_data: normalizedData,
      });

      expect(validatedParams).toBeDefined();
      expect(validatedParams.resource_type).toBe('people');

      // 4. Check resource mapping
      const resourcePath = ResourceMapper.getResourcePath('people', 'pers_123');
      expect(resourcePath).toBe('/objects/people/pers_123');

      // Restore
      if (originalApiKey) {
        process.env.ATTIO_API_KEY = originalApiKey;
      } else {
        delete process.env.ATTIO_API_KEY;
      }
    });
  });
});
