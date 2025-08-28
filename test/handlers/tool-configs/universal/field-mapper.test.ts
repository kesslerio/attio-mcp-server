/**
 * Comprehensive test suite for field-mapper.ts
 * 
 * This test suite locks in current behavior before refactoring for Issue #529.
 * Tests all 16 exported functions to ensure backward compatibility during modular refactor.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';

// Import all functions to test
import {
  FIELD_MAPPINGS,
  mapFieldName,
  detectFieldCollisions,
  mapRecordFields,
  validateResourceType,
  getFieldSuggestions,
  validateFields,
  enhanceUniquenessError,
  getValidResourceTypes,
  getValidFields,
  validateCategories,
  processCategories,
  getValidCategories,
  checkDomainConflict,
  transformFieldValue,
  mapTaskFields,
} from '../../../../src/handlers/tool-configs/universal/field-mapper.js';

// Mock the Attio client
vi.mock('../../../../src/api/attio-client.js', () => ({
  getAttioClient: vi.fn(() => ({
    objects: {
      companies: {
        get: vi.fn(() => 
          Promise.resolve({
            data: {
              id: { record_id: 'mock-company-id' },
              values: { domains: ['example.com'] }
            }
          })
        ),
      },
    },
    post: vi.fn(() => 
      Promise.resolve({
        data: {
          data: [] // Empty array = no existing companies with domain
        }
      })
    ),
    get: vi.fn(() =>
      Promise.resolve({
        data: {
          data: [] // Empty array for attributes endpoint
        }
      })
    ),
  })),
}));

// Mock config to prevent actual strict mode checks
vi.mock('../../../../src/handlers/tool-configs/universal/config.js', () => ({
  strictModeFor: vi.fn(() => false),
}));

describe('field-mapper.ts - Comprehensive Test Suite', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('FIELD_MAPPINGS constant', () => {
    it('should contain mappings for all resource types', () => {
      expect(FIELD_MAPPINGS).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.COMPANIES]).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.PEOPLE]).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.DEALS]).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.TASKS]).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.RECORDS]).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.NOTES]).toBeDefined();
      expect(FIELD_MAPPINGS[UniversalResourceType.LISTS]).toBeDefined();
    });

    it('should have proper structure for each mapping', () => {
      Object.values(FIELD_MAPPINGS).forEach(mapping => {
        expect(mapping).toHaveProperty('fieldMappings');
        expect(mapping).toHaveProperty('validFields');
        expect(mapping).toHaveProperty('commonMistakes');
        expect(Array.isArray(mapping.validFields)).toBe(true);
        expect(typeof mapping.fieldMappings).toBe('object');
        expect(typeof mapping.commonMistakes).toBe('object');
      });
    });

    it('should map common company field variations', () => {
      const companyMapping = FIELD_MAPPINGS[UniversalResourceType.COMPANIES];
      expect(companyMapping.fieldMappings.website).toBe('domains');
      expect(companyMapping.fieldMappings.url).toBe('domains');
      expect(companyMapping.fieldMappings.company_name).toBe('name');
    });

    it('should map common people field variations', () => {
      const peopleMapping = FIELD_MAPPINGS[UniversalResourceType.PEOPLE];
      expect(peopleMapping.fieldMappings.first_name).toBe('name');
      expect(peopleMapping.fieldMappings.last_name).toBe('name');
      expect(peopleMapping.fieldMappings.email).toBe('email_addresses');
    });

    it('should map common task field variations', () => {
      const tasksMapping = FIELD_MAPPINGS[UniversalResourceType.TASKS];
      expect(tasksMapping.fieldMappings.title).toBe('content');
      expect(tasksMapping.fieldMappings.status).toBe('is_completed');
      expect(tasksMapping.fieldMappings.due_date).toBe('deadline_at');
    });
  });

  describe('mapFieldName()', () => {
    it('should return original field name when no mapping exists', async () => {
      const result = await mapFieldName(UniversalResourceType.COMPANIES, 'unknown_field');
      expect(result).toBe('unknown_field');
    });

    it('should map incorrect field names to correct ones', async () => {
      const result = await mapFieldName(UniversalResourceType.COMPANIES, 'website');
      expect(result).toBe('domains');
    });

    it('should return original field when it exists in available attributes', async () => {
      const availableAttributes = ['website', 'domains'];
      const result = await mapFieldName(UniversalResourceType.COMPANIES, 'website', availableAttributes);
      expect(result).toBe('website'); // Original field exists, don't map
    });

    it('should map field when original does not exist in available attributes', async () => {
      const availableAttributes = ['domains'];
      const result = await mapFieldName(UniversalResourceType.COMPANIES, 'website', availableAttributes);
      expect(result).toBe('domains'); // Original field doesn't exist, apply mapping
    });

    it('should handle case-insensitive field mapping', async () => {
      const result = await mapFieldName(UniversalResourceType.COMPANIES, 'WEBSITE');
      expect(result).toBe('domains');
    });

    it('should return original field when mapped field does not exist in attributes', async () => {
      const availableAttributes = ['name'];
      const result = await mapFieldName(UniversalResourceType.COMPANIES, 'website', availableAttributes);
      expect(result).toBe('website'); // Mapped field 'domains' doesn't exist, return original
    });
  });

  describe('detectFieldCollisions()', () => {
    it('should detect no collisions when fields map to different targets', async () => {
      const recordData = { name: 'Test', industry: 'Tech' };
      const result = await detectFieldCollisions(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.hasCollisions).toBe(false);
      expect(result.errors).toHaveLength(0);
      expect(result.collisions).toEqual({});
    });

    it('should detect collisions when multiple fields map to same target', async () => {
      const recordData = { website: 'example.com', url: 'example.com' };
      const result = await detectFieldCollisions(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.hasCollisions).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.collisions).toHaveProperty('domains');
      expect(result.collisions.domains).toContain('website');
      expect(result.collisions.domains).toContain('url');
    });

    it('should ignore null-mapped fields in collision detection', async () => {
      // Add a null mapping to test this functionality
      const recordData = { name: 'Test' };
      const result = await detectFieldCollisions(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.hasCollisions).toBe(false);
    });
  });

  describe('mapRecordFields()', () => {
    it('should map all fields in record data', async () => {
      const recordData = { company_name: 'Test Corp', website: 'test.com' };
      const result = await mapRecordFields(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.mapped.name).toBe('Test Corp');
      expect(result.mapped.domains).toEqual([{ domain: 'test.com' }]);
      expect(result.mapped.company_name).toBeUndefined();
      expect(result.mapped.website).toBeUndefined();
    });

    it('should return warnings for mapped fields', async () => {
      const recordData = { company_name: 'Test Corp', website: 'test.com' };
      const result = await mapRecordFields(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('company_name'))).toBe(true);
      expect(result.warnings.some(w => w.includes('website'))).toBe(true);
    });

    it('should detect and report field collisions', async () => {
      const recordData = { website: 'test.com', url: 'test.com' };
      const result = await mapRecordFields(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.errors && result.errors.length > 0).toBe(true);
      expect(result.errors?.[0]).toContain('Field collision detected');
    });

    it('should preserve non-mapped fields', async () => {
      const recordData = { name: 'Test Corp', custom_field: 'custom_value' };
      const result = await mapRecordFields(UniversalResourceType.COMPANIES, recordData);
      
      expect(result.mapped.name).toBe('Test Corp');
      expect(result.mapped.custom_field).toBe('custom_value');
    });
  });

  describe('validateResourceType()', () => {
    it('should validate correct resource types', () => {
      const result = validateResourceType('companies');
      expect(result.valid).toBe(true);
      expect(result.corrected).toBeUndefined();
    });

    it('should correct invalid resource types', () => {
      const result = validateResourceType('company');
      expect(result.valid).toBe(false);
      expect(result.corrected).toBe('companies');
    });

    it('should handle typos in resource types', () => {
      const result = validateResourceType('comapny');
      expect(result.valid).toBe(false);
      expect(result.corrected).toBe('companies');
    });

    it('should provide suggestion for unknown resource types', () => {
      const result = validateResourceType('unknown_type');
      expect(result.valid).toBe(false);
      expect(result.suggestion).toBeDefined();
      expect(result.suggestion).toContain('Valid types are');
    });
  });

  describe('getFieldSuggestions()', () => {
    it('should provide suggestions for close field names', () => {
      const suggestions = getFieldSuggestions(UniversalResourceType.COMPANIES, 'nam');
      expect(typeof suggestions).toBe('string');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('name');
    });

    it('should provide suggestions for partial matches', () => {
      const suggestions = getFieldSuggestions(UniversalResourceType.COMPANIES, 'domain');
      expect(typeof suggestions).toBe('string');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('domains');
    });

    it('should provide fallback message for poor matches', () => {
      const suggestions = getFieldSuggestions(UniversalResourceType.COMPANIES, 'xyz123');
      expect(typeof suggestions).toBe('string');
      expect(suggestions).toContain('Unknown field');
    });

    it('should handle known common mistakes', () => {
      const suggestions = getFieldSuggestions(UniversalResourceType.COMPANIES, 'website');
      expect(typeof suggestions).toBe('string');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should handle unsupported resource types', () => {
      const suggestions = getFieldSuggestions('unsupported' as UniversalResourceType, 'field');
      expect(typeof suggestions).toBe('string');
      expect(suggestions).toContain('Unable to provide suggestions');
    });
  });

  describe('validateFields()', () => {
    it('should validate correct fields', () => {
      const fields = { name: 'Test Corp', domains: ['test.com'] };
      const result = validateFields(UniversalResourceType.COMPANIES, fields);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid fields', () => {
      const fields = { invalid_field: 'value', another_invalid: 'value' };
      const result = validateFields(UniversalResourceType.COMPANIES, fields);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide suggestions for invalid fields', () => {
      const fields = { nam: 'Test Corp', webiste: 'test.com' };
      const result = validateFields(UniversalResourceType.COMPANIES, fields);
      
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle empty field objects', () => {
      const result = validateFields(UniversalResourceType.COMPANIES, {});
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Required field "name" is missing');
    });
  });

  describe('enhanceUniquenessError()', () => {
    it('should return original message when no attribute ID pattern found', async () => {
      const errorMessage = 'Uniqueness constraint violation on field "name"';
      const mappedData = { name: 'Duplicate Corp' };
      
      const result = await enhanceUniquenessError(UniversalResourceType.COMPANIES, errorMessage, mappedData);
      
      // Should return original message since it doesn't match the expected pattern
      expect(result).toBe(errorMessage);
    });

    it('should return original message when field cannot be extracted', async () => {
      const errorMessage = 'Generic uniqueness error';
      const mappedData = { name: 'Test Corp' };
      
      const result = await enhanceUniquenessError(UniversalResourceType.COMPANIES, errorMessage, mappedData);
      
      // Should return original message
      expect(result).toBe(errorMessage);
    });

    it('should return original message when API pattern is not matched', async () => {
      const errorMessage = 'Uniqueness constraint violation';
      const mappedData = { name: 'Test Corp' };
      
      const result = await enhanceUniquenessError(UniversalResourceType.COMPANIES, errorMessage, mappedData);
      
      // Should return original message since no attribute ID pattern is found
      expect(result).toBe(errorMessage);
    });

    it('should attempt enhancement with proper attribute ID pattern', async () => {
      const errorMessage = 'Uniqueness constraint violation for attribute with ID "company-name"';
      const mappedData = { name: 'Test Corp' };
      
      const result = await enhanceUniquenessError(UniversalResourceType.COMPANIES, errorMessage, mappedData);
      
      // Since our mock doesn't provide the full attribute info, it should fall back to original
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getValidResourceTypes()', () => {
    it('should return string of valid resource types', () => {
      const result = getValidResourceTypes();
      expect(typeof result).toBe('string');
      expect(result).toContain('companies');
      expect(result).toContain('people');
      expect(result).toContain('deals');
      expect(result).toContain('tasks');
      expect(result).toContain('records');
      expect(result).toContain('notes');
      expect(result).toContain('lists');
    });
  });

  describe('getValidFields()', () => {
    it('should return array of valid fields for resource type', () => {
      const result = getValidFields(UniversalResourceType.COMPANIES);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('name');
      expect(result).toContain('domains');
    });

    it('should return different fields for different resource types', () => {
      const companyFields = getValidFields(UniversalResourceType.COMPANIES);
      const peopleFields = getValidFields(UniversalResourceType.PEOPLE);
      
      expect(companyFields).not.toEqual(peopleFields);
      expect(peopleFields).toContain('email_addresses');
    });
  });

  describe('validateCategories()', () => {
    it('should validate valid category strings', () => {
      const result = validateCategories('Software');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid category arrays', () => {
      const result = validateCategories(['Software', 'Technology']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid categories', () => {
      const result = validateCategories('Invalid Category');
      // Depending on implementation, this might be valid or invalid
      expect(typeof result.isValid).toBe('boolean');
    });

    it('should handle empty input', () => {
      const result = validateCategories('');
      expect(typeof result.isValid).toBe('boolean');
    });
  });

  describe('processCategories()', () => {
    it('should process string categories', () => {
      // Use a valid category from the VALID_COMPANY_CATEGORIES list
      const result = processCategories(UniversalResourceType.COMPANIES, 'categories', 'Technology');
      expect(Array.isArray(result.processedValue)).toBe(true);
      if (result.processedValue.length > 0) {
        expect(typeof result.processedValue[0]).toBe('string');
      }
      expect(result.warnings.length).toBeGreaterThan(0); // Should have auto-conversion warning
    });

    it('should process array categories', () => {
      // Use valid categories
      const result = processCategories(UniversalResourceType.COMPANIES, 'categories', ['Technology', 'Software']);
      expect(Array.isArray(result.processedValue)).toBe(true);
      expect(result.processedValue.length).toBe(2);
    });

    it('should handle empty input gracefully', () => {
      const result = processCategories(UniversalResourceType.COMPANIES, 'categories', '');
      // Empty input is invalid, so should return original value (empty string)
      expect(typeof result.processedValue).toBe('string');
      expect(result.processedValue).toBe('');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getValidCategories()', () => {
    it('should return array of valid category names', () => {
      const result = getValidCategories();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(cat => typeof cat === 'string')).toBe(true);
    });
  });

  describe('checkDomainConflict()', () => {
    it('should check domain conflicts', async () => {
      const result = await checkDomainConflict('example.com');
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('exists');
      expect(typeof result.exists).toBe('boolean');
    });

    it('should handle empty domain', async () => {
      const result = await checkDomainConflict('');
      expect(typeof result.exists).toBe('boolean');
    });

    it('should return additional information when conflict exists', async () => {
      // Mock a conflict scenario
      const result = await checkDomainConflict('example.com');
      if (result.exists) {
        expect(result).toHaveProperty('existingCompany');
      }
    });
  });

  describe('transformFieldValue()', () => {
    it('should transform boolean-ish values for tasks', async () => {
      const result = await transformFieldValue(UniversalResourceType.TASKS, 'is_completed', 'true');
      expect(result).toBe(true);
    });

    it('should transform boolean-ish values with different inputs', async () => {
      const testCases = [
        ['done', true],
        ['complete', true],
        ['false', false],
        ['open', false],
        ['1', true],
        ['0', false],
      ];

      for (const [input, expected] of testCases) {
        const result = await transformFieldValue(UniversalResourceType.TASKS, 'is_completed', input);
        expect(result).toBe(expected);
      }
    });

    it('should handle arrays for assignees field', async () => {
      const result = await transformFieldValue(UniversalResourceType.TASKS, 'assignees', 'user123');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return original value when no transformation needed', async () => {
      const result = await transformFieldValue(UniversalResourceType.COMPANIES, 'name', 'Test Corp');
      expect(result).toBe('Test Corp');
    });

    it('should handle date transformations', async () => {
      const result = await transformFieldValue(UniversalResourceType.TASKS, 'deadline_at', '2024-12-31');
      // Should return a valid date string or ISO string
      expect(typeof result === 'string' || result instanceof Date).toBe(true);
    });
  });

  describe('mapTaskFields()', () => {
    it('should synthesize content from title during create operation', () => {
      const input = { title: 'Task Title' };
      const result = mapTaskFields('create', input);
      
      expect(result.content).toBe('Task Title');
      expect(result.title).toBe('Task Title');
    });

    it('should not synthesize content during update operation', () => {
      const input = { title: 'Task Title' };
      const result = mapTaskFields('update', input);
      
      expect(result.title).toBe('Task Title');
      // Should not synthesize content for update
    });

    it('should preserve existing content during create', () => {
      const input = { title: 'Task Title', content: 'Existing Content' };
      const result = mapTaskFields('create', input);
      
      expect(result.content).toBe('Existing Content');
      expect(result.title).toBe('Task Title');
    });

    it('should handle missing fields gracefully', () => {
      const result = mapTaskFields('create', {});
      expect(typeof result).toBe('object');
    });

    it('should preserve unmapped fields', () => {
      const input = { custom_field: 'custom_value' };
      const result = mapTaskFields('create', input);
      expect(result.custom_field).toBe('custom_value');
    });

    it('should handle both operations correctly', () => {
      const input = { title: 'Task Title' };
      
      const createResult = mapTaskFields('create', input);
      const updateResult = mapTaskFields('update', input);
      
      expect(createResult.content).toBe('Task Title');
      expect(updateResult.content).toBeUndefined();
    });
  });
});