/**
 * Tests for the attribute mapping utilities
 */
import { 
  getAttributeSlug, 
  getObjectSlug, 
  getListSlug,
  translateAttributeNamesInFilters,
  COMMON_ATTRIBUTE_MAP
} from '../../src/utils/attribute-mapping/index';
import * as configLoader from '../../src/utils/config-loader';

// Mock the config-loader
jest.mock('../../src/utils/config-loader', () => ({
  loadMappingConfig: jest.fn(),
}));

describe('Attribute Mapping', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAttributeSlug', () => {
    it('should return the matching slug from config', () => {
      // Mock the config loader to return a test configuration
      (configLoader.loadMappingConfig as jest.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              'Name': 'name',
              'Email': 'email',
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
      (configLoader.loadMappingConfig as jest.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              'Name': 'name',
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
      (configLoader.loadMappingConfig as jest.Mock).mockReturnValue({
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
      (configLoader.loadMappingConfig as jest.Mock).mockReturnValue({
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
      expect(getAttributeSlug(undefined as any)).toBe(undefined);
    });

    it('should prioritize object-specific mappings over common mappings', () => {
      // Mock the config loader to return a test configuration with both common and object-specific mappings
      (configLoader.loadMappingConfig as jest.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              'Name': 'name_common',
            },
            objects: {
              companies: {
                'Name': 'name_companies',
              },
            },
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
      });

      // Reset cached config first to ensure we use the mock
      jest.resetModules();
      
      // Should use the company-specific mapping
      const companySlug = getAttributeSlug('Name', 'companies');
      expect(companySlug).toBe('name_companies');
      
      // Should use the common mapping without object type
      const commonSlug = getAttributeSlug('Name');
      expect(commonSlug).toBe('name_common');
    });
  });

  describe('getObjectSlug', () => {
    it('should return the matching object slug from config', () => {
      // Mock the config loader to return a test configuration
      (configLoader.loadMappingConfig as jest.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {},
            objects: {},
            custom: {},
          },
          objects: {
            'Companies': 'companies',
            'People': 'people',
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
      (configLoader.loadMappingConfig as jest.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {},
            objects: {},
            custom: {},
          },
          objects: {
            'Companies': 'companies',
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
      (configLoader.loadMappingConfig as jest.Mock).mockReturnValue({
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
      (configLoader.loadMappingConfig as jest.Mock).mockReturnValue({
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

      // Reset cached config to ensure we use the latest mock
      jest.resetModules();
      
      // Test list mappings
      const importantLeadsSlug = getListSlug('Important Leads');
      expect(importantLeadsSlug).toBe('important_leads');
      
      const vipContactsSlug = getListSlug('VIP Contacts');
      expect(vipContactsSlug).toBe('vip_contacts');
    });

    it('should return the original input for unknown lists', () => {
      // Mock the config loader to return an empty configuration
      (configLoader.loadMappingConfig as jest.Mock).mockReturnValue({
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
      jest.resetModules();
      
      // Test with an unknown list name
      expect(getListSlug('Unknown List')).toBe('Unknown List');
    });
  });

  describe('translateAttributeNamesInFilters', () => {
    beforeEach(() => {
      // Reset modules before each test to ensure fresh state
      jest.resetModules();
      
      // Mock the config loader with a comprehensive test configuration
      (configLoader.loadMappingConfig as jest.Mock).mockReturnValue({
        version: '1.0',
        mappings: {
          attributes: {
            common: {
              'Name': 'name',
              'Email': 'email',
              'Phone': 'phone',
            },
            objects: {
              companies: {
                'Name': 'name_companies',
                'Industry': 'industry',
              },
              people: {
                'Name': 'name_people',
                'Phone': 'phone_number',
              },
            },
            custom: {
              'Custom Field': 'custom_field_slug',
            },
          },
          objects: {
            'Companies': 'companies',
            'People': 'people',
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
              slug: 'Name',
            },
            condition: 'contains',
            value: 'John',
            objectType: 'people',
          },
        ],
      };

      const translated = translateAttributeNamesInFilters(filter);
      expect(translated.filters[0].attribute.slug).toBe('name_companies');
      expect(translated.filters[1].attribute.slug).toBe('name_people');
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
      expect(translated.filters[0].filters[0].attribute.slug).toBe('name_companies');
      expect(translated.filters[0].filters[1].attribute.slug).toBe('industry');
      
      // Check object-specific sections
      expect(translated.filters[1].companies.attribute.slug).toBe('name_companies');
      expect(translated.filters[2].people.attribute.slug).toBe('phone_number');
    });
  });
});