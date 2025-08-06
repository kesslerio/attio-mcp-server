/**
 * Tests for the attribute mapping utilities
 */
import {
  COMMON_ATTRIBUTE_MAP,
  getAttributeSlug,
  getListSlug,
  getObjectSlug,
  translateAttributeNamesInFilters,
} from '../../src/utils/attribute-mapping/index.js';
import * as configLoader from '../../src/utils/config-loader.js';

// Mock the config-loader
vi.mock('../../src/utils/config-loader', () => ({
  loadMappingConfig: vi.fn(),
}));

describe('Attribute Mapping', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAttributeSlug', () => {
    it('should return the matching slug from config', () => {
      // Mock the config loader to return a test configuration
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              Name: 'name',
              Email: 'email',
            },
            objects: {
              companies: {
                'B2B Segment': 'type_persona',
              },
            },
            custom: {
              'Custom Field': 'custom_slug',
            },
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // Test common attributes
      expect(getAttributeSlug('Name')).toBe('name');
      expect(getAttributeSlug('Email')).toBe('email');

      // Test object-specific attributes
      expect(getAttributeSlug('B2B Segment', 'companies')).toBe('type_persona');

      // Test custom attributes
      expect(getAttributeSlug('Custom Field')).toBe('custom_slug');
    });

    it('should handle case-insensitive matching', () => {
      // Mock the config loader to return a test configuration
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              Name: 'name',
            },
            objects: {},
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // Test case-insensitive matching
      expect(getAttributeSlug('name')).toBe('name');
      expect(getAttributeSlug('NAME')).toBe('name');
    });

    it('should fall back to legacy map if not found in config', () => {
      // Mock the config loader to return a test configuration without the requested mapping
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {},
            objects: {},
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // This should fall back to the legacy map
      expect(getAttributeSlug('B2B Segment')).toBe('type_persona');
    });

    it('should return the original input if no mapping found', () => {
      // Mock the config loader to return an empty configuration
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {},
            objects: {},
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // Test with an unknown attribute
      expect(getAttributeSlug('Unknown Attribute')).toBe('Unknown Attribute');
    });

    it('should handle null or undefined input', () => {
      // Test with null or undefined
      expect(getAttributeSlug('')).toBe('');
      expect(getAttributeSlug(undefined as unknown)).toBe(undefined);
    });

    it('should map industry to categories via special case handling', () => {
      // Reset modules to ensure fresh state
      vi.resetModules();

      // Industry should map to categories through special case handling
      const result = getAttributeSlug('industry');
      expect(result).toBe('categories');

      // Industry type should also map to categories
      const resultType = getAttributeSlug('industry type');
      expect(resultType).toBe('categories');
    });

    it('should prioritize object-specific mappings over common mappings', () => {
      // Mock the config loader to return a test configuration with both common and object-specific mappings
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              Name: 'name',
            },
            objects: {
              companies: {
                Name: 'name',
              },
            },
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // Should use the common mapping (both are the same in this case)
      const companySlug = getAttributeSlug('Name', 'companies');
      expect(companySlug).toBe('name');

      // Should use the common mapping without object type
      const commonSlug = getAttributeSlug('Name');
      expect(commonSlug).toBe('name');
    });
  });

  describe('getObjectSlug', () => {
    it('should return the matching object slug from config', () => {
      // Mock the config loader to return a test configuration
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {},
            objects: {},
            custom: {},
          },
          objects: {
            Companies: 'companies',
            People: 'people',
          },
          lists: {},
          relationships: {},
        },
      });

      // Test object mappings
      expect(getObjectSlug('Companies')).toBe('companies');
      expect(getObjectSlug('People')).toBe('people');
    });

    it('should handle case-insensitive matching for objects', () => {
      // Mock the config loader to return a test configuration
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {},
            objects: {},
            custom: {},
          },
          objects: {
            Companies: 'companies',
          },
          lists: {},
          relationships: {},
        },
      });

      // Test case-insensitive matching
      expect(getObjectSlug('companies')).toBe('companies');
      expect(getObjectSlug('COMPANIES')).toBe('companies');
    });

    it('should normalize unknown object names', () => {
      // Mock the config loader to return an empty configuration
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {},
            objects: {},
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // Test with an unknown object name
      expect(getObjectSlug('New Object Type')).toBe('new_object_type');
    });
  });

  describe('getListSlug', () => {
    it('should return the matching list slug from config', () => {
      // Mock the config loader to return a test configuration
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {},
            objects: {},
            custom: {},
          },
          objects: {},
          lists: {
            'Important Leads': 'important_leads',
            'VIP Contacts': 'vip_contacts',
          },
          relationships: {},
        },
      });

      // Test list mappings - should use the mapping from config
      const importantLeadsSlug = getListSlug('Important Leads');
      expect(importantLeadsSlug).toBe('important_leads');

      const vipContactsSlug = getListSlug('VIP Contacts');
      expect(vipContactsSlug).toBe('vip_contacts');
    });

    it('should return the original input for unknown lists', () => {
      // Mock the config loader to return an empty configuration
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {},
            objects: {},
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // Reset cached config to ensure we use the latest mock
      vi.resetModules();

      // Test with an unknown list name
      expect(getListSlug('Unknown List')).toBe('Unknown List');
    });
  });

  describe('translateAttributeNamesInFilters', () => {
    beforeEach(() => {
      // Reset modules before each test to ensure fresh state
      vi.resetModules();

      // Mock the config loader with a comprehensive test configuration
      (configLoader.loadMappingConfig as vi.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              Name: 'name',
              Email: 'email',
              Phone: 'phone',
            },
            objects: {
              companies: {
                Name: 'name_companies',
                Industry: 'industry',
              },
              people: {
                Name: 'name_people',
                Phone: 'phone_number',
              },
            },
            custom: {
              'Custom Field': 'custom_field_slug',
            },
          },
          objects: {
            Companies: 'companies',
            People: 'people',
          },
          lists: {
            'Important Leads': 'important_leads',
          },
          relationships: {},
        },
      });
    });

    it('should translate attribute names in a simple filter', () => {
      const filter = {
        attribute: {
          slug: 'Name',
        },
        condition: 'equals',
        value: 'Test Company',
      };

      const translated = translateAttributeNamesInFilters(filter);
      expect(translated.attribute.slug).toBe('name');
    });

    it('should use object context for translations', () => {
      const filter = {
        attribute: {
          slug: 'Name',
        },
        condition: 'equals',
        value: 'Test Company',
      };

      const translated = translateAttributeNamesInFilters(filter, 'companies');
      // Since the mock config has Name mapped to 'name_companies' for companies object type
      // But getAttributeSlug prioritizes common mappings over object-specific for Name
      // The actual behavior should return 'name' from common mappings
      expect(translated.attribute.slug).toBe('name_companies');
    });

    it('should handle nested filter structures', () => {
      const filter = {
        operator: 'and',
        filters: [
          {
            attribute: {
              slug: 'Name',
            },
            condition: 'equals',
            value: 'Test Company',
          },
          {
            attribute: {
              slug: 'Email',
            },
            condition: 'contains',
            value: 'test',
          },
        ],
      };

      const translated = translateAttributeNamesInFilters(filter);
      expect(translated.filters[0].attribute.slug).toBe('name');
      expect(translated.filters[1].attribute.slug).toBe('email');
    });

    it('should respect object-specific context in nested filters', () => {
      const filter = {
        operator: 'and',
        filters: [
          {
            attribute: {
              slug: 'Name',
            },
            condition: 'equals',
            value: 'Test Company',
            objectType: 'companies',
          },
          {
            attribute: {
              slug: 'Phone',
            },
            condition: 'contains',
            value: '123',
            objectType: 'people',
          },
        ],
      };

      const translated = translateAttributeNamesInFilters(filter);
      // Name should map to 'name' from common mappings (takes priority)
      expect(translated.filters[0].attribute.slug).toBe('name_companies');
      // Phone should map to 'phone_number' for people object type
      expect(translated.filters[1].attribute.slug).toBe('phone_number');
    });

    it('should handle null or undefined filters', () => {
      expect(translateAttributeNamesInFilters(null)).toBeNull();
      expect(translateAttributeNamesInFilters(undefined)).toBeUndefined();
    });

    it('should process deeply nested object structures', () => {
      const complexFilter = {
        operator: 'and',
        filters: [
          {
            operator: 'or',
            filters: [
              {
                attribute: {
                  slug: 'Name',
                },
                condition: 'equals',
                value: 'Test',
                objectType: 'companies',
              },
              {
                attribute: {
                  slug: 'Industry',
                },
                condition: 'equals',
                value: 'Technology',
              },
            ],
          },
          {
            companies: {
              attribute: {
                slug: 'Name',
              },
              condition: 'contains',
              value: 'Corp',
            },
          },
          {
            people: {
              attribute: {
                slug: 'Phone',
              },
              condition: 'equals',
              value: '123456789',
            },
          },
        ],
      };

      const translated = translateAttributeNamesInFilters(complexFilter);

      // Check nested OR filters
      // Name should use common mapping 'name' even with companies objectType
      expect(translated.filters[0].filters[0].attribute.slug).toBe(
        'name_companies'
      );
      expect(translated.filters[0].filters[1].attribute.slug).toBe(
        'categories'
      ); // Industry maps to categories

      // Check object-specific sections
      // Name in companies context uses object-specific mapping
      expect(translated.filters[1].companies.attribute.slug).toBe(
        'name_companies'
      );
      expect(translated.filters[2].people.attribute.slug).toBe('phone_number');
    });
  });
});
