/**
 * Split: field-mapper – validation and suggestions
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';
import { validateResourceType, getFieldSuggestions, validateFields } from '../../../../src/handlers/tool-configs/universal/field-mapper.js';

// Minimal config mock to match original environment
vi.mock('../../../../src/handlers/tool-configs/universal/config.js', () => ({ strictModeFor: vi.fn(() => false) }));

describe('field-mapper – validation and suggestions', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.clearAllMocks(); });

  describe('validateResourceType()', () => {
    it('validates correct resource types', () => {
      const result = validateResourceType('companies');
      expect(result.valid).toBe(true);
      expect(result.corrected).toBeUndefined();
    });

    it('corrects invalid resource types', () => {
      const result = validateResourceType('company');
      expect(result.valid).toBe(false);
      expect(result.corrected).toBe('companies');
    });

    it('handles typos in resource types', () => {
      const result = validateResourceType('comapny');
      expect(result.valid).toBe(false);
      expect(result.corrected).toBe('companies');
    });

    it('provides suggestion for unknown types', () => {
      const result = validateResourceType('unknown_type');
      expect(result.valid).toBe(false);
      expect(result.suggestion).toBeDefined();
      expect(result.suggestion).toContain('Valid types are');
    });
  });

  describe('getFieldSuggestions()', () => {
    it('suggests close field names', () => {
      const suggestions = getFieldSuggestions(UniversalResourceType.COMPANIES, 'nam');
      expect(typeof suggestions).toBe('string');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('name');
    });

    it('suggests partial matches', () => {
      const suggestions = getFieldSuggestions(UniversalResourceType.COMPANIES, 'domain');
      expect(typeof suggestions).toBe('string');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('domains');
    });

    it('provides fallback message for poor matches', () => {
      const suggestions = getFieldSuggestions(UniversalResourceType.COMPANIES, 'xyz123');
      expect(typeof suggestions).toBe('string');
      expect(suggestions).toContain('Unknown field');
    });

    it('handles known common mistakes', () => {
      const suggestions = getFieldSuggestions(UniversalResourceType.COMPANIES, 'website');
      expect(typeof suggestions).toBe('string');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('handles unsupported resource types', () => {
      const suggestions = getFieldSuggestions('unsupported' as UniversalResourceType, 'field');
      expect(typeof suggestions).toBe('string');
      expect(suggestions).toContain('Unable to provide suggestions');
    });
  });

  describe('validateFields()', () => {
    it('validates correct fields', () => {
      const fields = { name: 'Test Corp', domains: ['test.com'] };
      const result = validateFields(UniversalResourceType.COMPANIES, fields);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects invalid fields', () => {
      const fields = { invalid_field: 'value', another_invalid: 'value' } as any;
      const result = validateFields(UniversalResourceType.COMPANIES, fields);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('provides suggestions for invalid fields', () => {
      const fields = { nam: 'Test Corp', webiste: 'test.com' } as any;
      const result = validateFields(UniversalResourceType.COMPANIES, fields);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('handles empty field objects', () => {
      const result = validateFields(UniversalResourceType.COMPANIES, {});
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Required field "name" is missing');
    });
  });
});

