/**
 * Unit tests for Record Reference Error Enhancer
 * Issue #1001 - Strategy Pattern for CRUD error handling
 * Issue #997 - Enhanced record-reference attribute error handling
 *
 * CRITICAL TEST: Proves fix from Commit 1 works - "Invalid value was passed
 * to attribute" pattern is now correctly matched in matches() method.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordReferenceEnhancer } from '@/handlers/tool-configs/universal/core/error-enhancers/record-reference-enhancer.js';
import type { CrudErrorContext } from '@/handlers/tool-configs/universal/core/error-enhancers/types.js';

describe('record-reference-enhancer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('matches()', () => {
    it('should match "Missing target_object" pattern', () => {
      const error = new Error(
        'Missing target_object on record reference value'
      );
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(recordReferenceEnhancer.matches(error, context)).toBe(true);
    });

    it('should match "record reference" pattern', () => {
      const error = new Error('Invalid record reference format');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(recordReferenceEnhancer.matches(error, context)).toBe(true);
    });

    it('should match "target_record_id" pattern', () => {
      const error = new Error('Missing target_record_id in reference');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(recordReferenceEnhancer.matches(error, context)).toBe(true);
    });

    it('CRITICAL: should match "Invalid value was passed to attribute" pattern with company field', () => {
      const error = {
        message: 'Invalid value was passed to attribute',
        response: {
          data: {
            validation_errors: [
              {
                field: 'company',
                message: 'Invalid value was passed to attribute company',
              },
            ],
          },
        },
      };

      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
        recordData: { company: { bad: 'format' } },
      };

      // This test proves the fix from Commit 1 works
      expect(recordReferenceEnhancer.matches(error, context)).toBe(true);
    });

    it('CRITICAL: should match "Invalid value was passed to attribute" with associated_people field', () => {
      const error = {
        message: 'Invalid value',
        response: {
          data: {
            validation_errors: [
              {
                message:
                  'Invalid value was passed to attribute associated_people',
              },
            ],
          },
        },
      };

      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(recordReferenceEnhancer.matches(error, context)).toBe(true);
    });

    it('CRITICAL: should match "Invalid value was passed to attribute" with main_contact field', () => {
      const error = new Error(
        'Invalid value was passed to attribute main_contact'
      );
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
      };

      expect(recordReferenceEnhancer.matches(error, context)).toBe(true);
    });

    it('should not match "Invalid value was passed to attribute" without record-reference field', () => {
      const error = new Error('Invalid value was passed to attribute revenue');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      // "revenue" is not a record-reference field
      expect(recordReferenceEnhancer.matches(error, context)).toBe(false);
    });

    it('should not match unrelated errors', () => {
      const error = new Error('Missing required field');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(recordReferenceEnhancer.matches(error, context)).toBe(false);
    });

    it('should match string errors', () => {
      const error = 'Missing target_object on value';
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(recordReferenceEnhancer.matches(error, context)).toBe(true);
    });

    it('should extract validation_errors from axios-style errors', () => {
      const error = {
        message: 'Validation failed',
        response: {
          data: {
            message: 'Missing target_object on record reference',
            validation_errors: [{ field: 'company', message: 'Invalid' }],
          },
        },
      };

      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
      };

      expect(recordReferenceEnhancer.matches(error, context)).toBe(true);
    });
  });

  describe('enhance()', () => {
    it('should enhance record-reference error with format guidance', async () => {
      const error = new Error(
        'Missing target_object on record reference value'
      );
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { company: { bad: 'format' } },
      };

      const result = await recordReferenceEnhancer.enhance(error, context);

      expect(result).toContain('Record reference format error');
      expect(result).toContain('on field "company"');
      expect(result).toContain('The Attio API expects record-reference fields');
      expect(result).toContain('"target_object": "object_type"');
      expect(result).toContain('"target_record_id": "uuid"');
      expect(result).toContain(
        'Simplified formats (auto-transformed by this server)'
      );
      expect(result).toContain('"company": "record-uuid"');
      expect(result).toContain('auto-transformation may have failed');
    });

    it('should identify affected field from recordData', async () => {
      const error = new Error('record reference error');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
        recordData: { associated_company: 'invalid-format' },
      };

      const result = await recordReferenceEnhancer.enhance(error, context);

      expect(result).toContain('on field "associated_company"');
    });

    it('should handle multiple potential reference fields', async () => {
      const error = new Error('Missing target_object');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'deals',
        recordData: { main_contact: 'test', other_field: 'value' },
      };

      const result = await recordReferenceEnhancer.enhance(error, context);

      expect(result).toContain('on field "main_contact"');
    });

    it('should return message without field when no matching field in recordData', async () => {
      const error = new Error('record reference error');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { name: 'Test Company' },
      };

      const result = await recordReferenceEnhancer.enhance(error, context);

      expect(result).toContain('Record reference format error');
      expect(result).not.toContain('on field');
      expect(result).toContain('The Attio API expects');
    });

    it('should handle missing recordData', async () => {
      const error = new Error('Missing target_object');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await recordReferenceEnhancer.enhance(error, context);

      expect(result).toContain('Record reference format error');
      expect(result).not.toContain('on field');
    });

    it('should detect "associated_people" field', async () => {
      const error = new Error('target_record_id missing');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { associated_people: [{ id: 'test' }] },
      };

      const result = await recordReferenceEnhancer.enhance(error, context);

      expect(result).toContain('on field "associated_people"');
    });

    it('should detect "person" field', async () => {
      const error = new Error('record reference format issue');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'notes',
        recordData: { person: 'invalid' },
      };

      const result = await recordReferenceEnhancer.enhance(error, context);

      expect(result).toContain('on field "person"');
    });

    it('should detect "people" field', async () => {
      const error = new Error('Missing target_object');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'lists',
        recordData: { people: ['test'] },
      };

      const result = await recordReferenceEnhancer.enhance(error, context);

      expect(result).toContain('on field "people"');
    });

    it('should include both API format and simplified formats in guidance', async () => {
      const error = new Error('record reference error');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { company: 'test' },
      };

      const result = await recordReferenceEnhancer.enhance(error, context);

      // API format
      expect(result).toContain('target_object');
      expect(result).toContain('target_record_id');

      // Simplified formats
      expect(result).toContain('String: "company": "record-uuid"');
      expect(result).toContain('Legacy object: "company": {"record_id":');
    });

    it('should return null for non-matching errors', async () => {
      const error = new Error('Some other error');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { name: 'Test' },
      };

      const result = await recordReferenceEnhancer.enhance(error, context);

      expect(result).toBeNull();
    });
  });

  describe('errorName', () => {
    it('should have correct error name', () => {
      expect(recordReferenceEnhancer.errorName).toBe('record_reference_error');
    });
  });

  describe('name', () => {
    it('should have correct enhancer name', () => {
      expect(recordReferenceEnhancer.name).toBe('record-reference');
    });
  });
});
