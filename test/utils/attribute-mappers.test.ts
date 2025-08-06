/**
 * Tests for attribute mapping functionality
 */
import {
  getAttributeSlug,
  invalidateConfigCache,
} from '../../src/utils/attribute-mapping/attribute-mappers.js';
import * as mappingUtils from '../../src/utils/attribute-mapping/mapping-utils.js';
import * as configLoader from '../../src/utils/config-loader.js';

// Mock the config loader to test with controlled configurations
vi.mock('../../src/utils/config-loader', () => ({
  loadMappingConfig: vi.fn().mockImplementation(() => ({
    version: '1.0',
    mappings: {
      attributes: {
        common: {
          Industry: 'categories', // The problem field that can cause infinite recursion
          'Company Name': 'name',
        },
        objects: {
          companies: {
            'Medical Field': 'categories',
            'Healthcare Industry': 'categories',
          },
        },
        custom: {},
      },
      objects: {
        Companies: 'companies',
        People: 'people',
      },
      lists: {},
      relationships: {},
    },
  })),
}));

describe('Attribute Mappers', () => {
  beforeEach(() => {
    // Reset all caches before each test
    invalidateConfigCache();
    vi.clearAllMocks();
  });

  describe('getAttributeSlug', () => {
    it('should return mapped slug for known attributes', () => {
      expect(getAttributeSlug('Industry')).toBe('categories');
      expect(getAttributeSlug('company name')).toBe('name');
      expect(getAttributeSlug('INDUSTRY')).toBe('categories');
    });

    it('should return original attribute name if no mapping exists', () => {
      expect(getAttributeSlug('UnknownAttribute')).toBe('UnknownAttribute');
    });

    it('should handle object-specific mappings', () => {
      expect(getAttributeSlug('medical field', 'companies')).toBe('categories');
      expect(getAttributeSlug('healthcare industry', 'companies')).toBe(
        'categories'
      );
    });

    it('should NOT fall into infinite recursion when handling special cases', () => {
      // This line would trigger infinite recursion before the fix
      expect(getAttributeSlug('industry')).toBe('categories');

      // Test the fix for other similar cases
      expect(getAttributeSlug('categories')).toBe('categories');
      expect(getAttributeSlug('category')).toBe('category');
    });

    it('should handle snake case conversion without infinite recursion', () => {
      // Mock handleSpecialCases to simulate the problematic behavior
      const originalHandleSpecialCases = mappingUtils.handleSpecialCases;
      vi.spyOn(mappingUtils, 'handleSpecialCases').mockImplementation((key) => {
        if (key.toLowerCase() === 'industry') return 'categories';
        if (key.toLowerCase() === 'categories') return 'industry'; // This creates a circular reference
        return originalHandleSpecialCases(key);
      });

      // This would cause infinite recursion without our fix
      expect(() => getAttributeSlug('industry_type')).not.toThrow();

      // Restore original function
      (mappingUtils.handleSpecialCases as vi.Mock).mockRestore();
    });

    it('should handle edge cases in snake case conversion', () => {
      // Test attribute names that should not trigger snake case conversion
      expect(getAttributeSlug('already has spaces')).toBe('already has spaces');
      expect(getAttributeSlug('nounderscores')).toBe('nounderscores');

      // Test valid snake case conversion
      expect(getAttributeSlug('company_name')).toBe('name'); // Based on mock config
    });
  });
});
