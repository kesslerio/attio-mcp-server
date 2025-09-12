/**
 * Tests for enhanced attribute mapping functionality
 * Specifically tests special case handling and fuzzy matching
 */
import { describe, beforeEach, it, expect, vi } from 'vitest';
import {
  getAttributeSlug,
  invalidateConfigCache,
} from '../../src/utils/attribute-mapping/index.js';
import * as mappingUtils from '../../src/utils/attribute-mapping/mapping-utils.js';
import * as configLoader from '../../src/utils/config-loader.js';

// Mock the config-loader
vi.mock('../../src/utils/config-loader', () => ({
  loadMappingConfig: vi.fn(),
}));

describe('Enhanced Attribute Mapping', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateConfigCache();

    // Set up default empty configuration for tests
    (configLoader.loadMappingConfig as any).mockReturnValue({
      version: '1.0',
      mappings: {
        attributes: { common: {}, objects: {}, custom: {} },
        objects: {},
        lists: {},
        relationships: {},
      },
    });
  });

  describe('Special Case Handling', () => {
    it('should return field names as-is with default mapping (no B2B segment special cases)', () => {
      // After legacy mapping removal (Issue #626), B2B segment no longer maps to type_persona
      // Default behavior: field names return as-is without custom mappings
      const variations = ['B2B Segment', 'b2b_segment', 'b2bsegment', 'B2B'];

      // Default behavior: return field names as-is
      expect(getAttributeSlug('B2B Segment')).toBe('B2B Segment');
      expect(getAttributeSlug('b2b_segment')).toBe('b2b_segment');
      expect(getAttributeSlug('b2bsegment')).toBe('b2bsegment');
      expect(getAttributeSlug('B2B')).toBe('B2B');
    });

    it('should handle industry mapping (valid special case)', () => {
      // Industry -> categories mapping is still valid as it maps to existing Attio field
      expect(getAttributeSlug('industry')).toBe('categories');
      expect(getAttributeSlug('Industry')).toBe('categories');
      expect(getAttributeSlug('Industry Type')).toBe('categories');
    });

    it('should return other field names as-is with default behavior', () => {
      // Default behavior: field names return as-is without custom mappings
      expect(getAttributeSlug('b2b-segment')).toBe('b2b-segment');
      expect(getAttributeSlug('b2b   segment')).toBe('b2b   segment');
      expect(getAttributeSlug('b2b.segment')).toBe('b2b.segment');
    });
  });

  describe('Tiered Matching Approach', () => {
    it('should use valid special cases like industry mapping', () => {
      // Mock configuration with a different mapping for industry
      // Special case handling should override the config for valid mappings
      (configLoader.loadMappingConfig as any).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              industry: 'wrong_mapping',
            },
            objects: {},
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // Special case handling should override the config for valid mappings
      expect(getAttributeSlug('industry')).toBe('categories');

      // Spy on handleSpecialCases to ensure it was called
      const handleSpecialCasesSpy = vi.spyOn(
        mappingUtils,
        'handleSpecialCases'
      );
      getAttributeSlug('industry');
      expect(handleSpecialCasesSpy).toHaveBeenCalledWith('industry');
    });

    it('should use case-insensitive lookup after special cases', () => {
      (configLoader.loadMappingConfig as any).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              'Custom Field': 'custom_slug',
            },
            objects: {},
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // Should find the mapping with different case
      expect(getAttributeSlug('custom field')).toBe('custom_slug');
      expect(getAttributeSlug('CUSTOM FIELD')).toBe('custom_slug');
    });

    it('should use normalized lookup when case-insensitive fails', () => {
      (configLoader.loadMappingConfig as any).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              CustomField: 'custom_slug',
            },
            objects: {},
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // Should find the mapping with different spacing
      expect(getAttributeSlug('Custom Field')).toBe('custom_slug');
      expect(getAttributeSlug('custom  field')).toBe('custom_slug');
    });

    it('should use aggressive normalization as a last resort', () => {
      // For this test, we'll spy on lookupAggressiveNormalized instead of trying
      // to set up the full chain, which is difficult to mock completely
      const lookupAggressiveNormalizedSpy = vi
        .spyOn(mappingUtils, 'lookupAggressiveNormalized')
        .mockReturnValue('custom_slug');

      // Call the function to test the aggressive normalization path
      const result = getAttributeSlug('Custom.Field');

      // Verify the aggressive normalization function was called
      expect(lookupAggressiveNormalizedSpy).toHaveBeenCalled();
      expect(result).toBe('custom_slug');

      // Restore the original implementation
      lookupAggressiveNormalizedSpy.mockRestore();
    });

    it('should handle snake case conversion', () => {
      (configLoader.loadMappingConfig as any).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              'Account Manager': 'account_manager',
            },
            objects: {},
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // Should convert snake case to display name and then look up
      expect(getAttributeSlug('account_manager')).toBe('account_manager');
    });

    it('should return field names as-is when no custom mappings exist', () => {
      // Test default behavior: no custom mappings should return field names as-is
      (configLoader.loadMappingConfig as any).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: { common: {}, objects: {}, custom: {} },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      expect(getAttributeSlug('postal_code')).toBe('postal_code');
      expect(getAttributeSlug('ZIP')).toBe('ZIP'); // No default mapping for ZIP
    });
  });

  describe('Object-Specific Mappings', () => {
    it('should prioritize object-specific mappings over common mappings', () => {
      (configLoader.loadMappingConfig as any).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              Status: 'status_common',
            },
            objects: {
              companies: {
                Status: 'status_companies',
              },
              people: {
                Status: 'status_people',
              },
            },
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // Should use object-specific mapping when object type is provided
      expect(getAttributeSlug('Status', 'companies')).toBe('status_companies');
      expect(getAttributeSlug('Status', 'people')).toBe('status_people');

      // Should fall back to common mapping when no object type is provided
      expect(getAttributeSlug('Status')).toBe('status_common');
    });
  });
});
