/**
 * Split: field-mapper – validation and suggestions
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';

// Minimal config mock to match original environment
vi.mock('../../../../src/handlers/tool-configs/universal/config.js', () => ({
  strictModeFor: vi.fn(() => false),
}));

describe('field-mapper – validation and suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateResourceType()', () => {
    it('validates correct resource types', () => {
      expect(result.valid).toBe(true);
      expect(result.corrected).toBeUndefined();
    });

    it('corrects invalid resource types', () => {
      expect(result.valid).toBe(false);
      expect(result.corrected).toBe('companies');
    });

    it('handles typos in resource types', () => {
      expect(result.valid).toBe(false);
      expect(result.corrected).toBe('companies');
    });

    it('provides suggestion for unknown types', () => {
      expect(result.valid).toBe(false);
      expect(result.suggestion).toBeDefined();
      expect(result.suggestion).toContain('Valid types are');
    });
  });

  describe('getFieldSuggestions()', () => {
    it('suggests close field names', () => {
        UniversalResourceType.COMPANIES,
        'nam'
      );
      expect(typeof suggestions).toBe('string');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('name');
    });

    it('suggests partial matches', () => {
        UniversalResourceType.COMPANIES,
        'domain'
      );
      expect(typeof suggestions).toBe('string');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('domains');
    });

    it('provides fallback message for poor matches', () => {
        UniversalResourceType.COMPANIES,
        'xyz123'
      );
      expect(typeof suggestions).toBe('string');
      expect(suggestions).toContain('Unknown field');
    });

    it('handles known common mistakes', () => {
        UniversalResourceType.COMPANIES,
        'website'
      );
      expect(typeof suggestions).toBe('string');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('handles unsupported resource types', () => {
        'unsupported' as UniversalResourceType,
        'field'
      );
      expect(typeof suggestions).toBe('string');
      expect(suggestions).toContain('Unable to provide suggestions');
    });
  });

  describe('validateFields()', () => {
    it('validates correct fields', () => {
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects invalid fields', () => {
        invalid_field: 'value',
        another_invalid: 'value',
      } as any;
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('provides suggestions for invalid fields', () => {
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('handles empty field objects', () => {
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Required field "name" is missing');
    });
  });
});
