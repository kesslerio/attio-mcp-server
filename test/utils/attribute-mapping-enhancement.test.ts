/**
 * Tests for enhanced attribute mapping functionality
 * Specifically tests special case handling and fuzzy matching
 */
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
  });

  describe('Special Case Handling', () => {
    it('should correctly map B2B Segment special cases', () => {
      // We'll use different variations of the B2B Segment attribute
      const variations = [
        'B2B Segment',
        'b2b_segment',
        'b2bsegment',
        'B2B',
        'Business Segment',
        'Customer Segment',
        'Client Segment',
      ];

      // All should map to type_persona
      variations.forEach((variation) => {
        expect(getAttributeSlug(variation)).toBe('type_persona');
      });
    });

    it('should handle special cases with different character cases', () => {
      expect(getAttributeSlug('b2b segment')).toBe('type_persona');
      expect(getAttributeSlug('B2B SEGMENT')).toBe('type_persona');
      expect(getAttributeSlug('B2b SeGmEnT')).toBe('type_persona');
    });

    it('should handle special cases with different spacing and formats', () => {
      expect(getAttributeSlug('b2b-segment')).toBe('type_persona');
      expect(getAttributeSlug('b2b   segment')).toBe('type_persona');
      expect(getAttributeSlug('b2b.segment')).toBe('type_persona');
    });
  });

  describe('Tiered Matching Approach', () => {
    it('should first check for special cases', () => {
      // Mock configuration with a different mapping for B2B Segment
      // This shouldn't be used because special case handling has priority
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              'B2B Segment': 'wrong_mapping',
            },
            objects: {},
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // Special case handling should override the config
      expect(getAttributeSlug('B2B Segment')).toBe('type_persona');

      // Spy on handleSpecialCases to ensure it was called
      const handleSpecialCasesSpy = vi.spyOn(
        mappingUtils,
        'handleSpecialCases'
      );
      getAttributeSlug('B2B Segment');
      expect(handleSpecialCasesSpy).toHaveBeenCalledWith('B2B Segment');
    });

    it('should use case-insensitive lookup after special cases', () => {
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
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
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
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
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
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

    it('should map postal code fields without converting to zip', () => {
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: { common: {}, objects: {}, custom: {} },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      expect(getAttributeSlug('postal_code')).toBe('postal_code');
      expect(getAttributeSlug('ZIP')).toBe('postal_code');
    });
  });

  describe('Object-Specific Mappings', () => {
    it('should prioritize object-specific mappings over common mappings', () => {
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
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
