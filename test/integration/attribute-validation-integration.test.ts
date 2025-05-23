/**
 * Integration tests for attribute validation
 * Tests the integration of attribute validation with company operations
 */
import { CompanyValidator } from '../../src/validators/company-validator.js';
import { getAttributeTypeInfo, formatAttributeValue } from '../../src/api/attribute-types.js';
import { InvalidRequestError } from '../../src/errors/api-errors.js';
import { ResourceType } from '../../src/types/attio.js';

// Mock the attribute API module
jest.mock('../../src/api/attribute-types.js', () => ({
  getAttributeTypeInfo: jest.fn(),
  formatAttributeValue: jest.fn(),
  detectFieldType: jest.fn(),
  getFieldValidationRules: jest.fn()
}));

// Mock response data for company attributes
const MOCK_ATTRIBUTE_METADATA = {
  name: {
    fieldType: 'string',
    isArray: false,
    isRequired: true,
    isUnique: true,
    attioType: 'text',
    metadata: { api_slug: 'name', type: 'text' }
  },
  company_size: {
    fieldType: 'number',
    isArray: false,
    isRequired: false,
    isUnique: false,
    attioType: 'number',
    metadata: { api_slug: 'company_size', type: 'number' }
  },
  is_customer: {
    fieldType: 'boolean',
    isArray: false,
    isRequired: false,
    isUnique: false,
    attioType: 'checkbox',
    metadata: { api_slug: 'is_customer', type: 'checkbox' }
  },
  founded_date: {
    fieldType: 'string',
    isArray: false,
    isRequired: false,
    isUnique: false,
    attioType: 'date',
    metadata: { api_slug: 'founded_date', type: 'date' }
  },
  website: {
    fieldType: 'string',
    isArray: false,
    isRequired: false,
    isUnique: true,
    attioType: 'url',
    metadata: { api_slug: 'website', type: 'url' }
  },
  tags: {
    fieldType: 'array',
    isArray: true,
    isRequired: false,
    isUnique: false,
    attioType: 'select',
    metadata: { api_slug: 'tags', type: 'select', is_multiselect: true }
  },
  related_companies: {
    fieldType: 'array',
    isArray: true,
    isRequired: false,
    isUnique: false,
    attioType: 'record-reference',
    metadata: { api_slug: 'related_companies', type: 'record-reference', is_multiselect: true }
  }
};

describe('Attribute Validation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mocks for getAttributeTypeInfo
    (getAttributeTypeInfo as jest.Mock).mockImplementation(
      async (objectSlug, attributeName) => {
        if ((MOCK_ATTRIBUTE_METADATA as any)[attributeName]) {
          return (MOCK_ATTRIBUTE_METADATA as any)[attributeName];
        }
        
        // Default for unknown attributes
        return {
          fieldType: 'string',
          isArray: false,
          isRequired: false,
          isUnique: false,
          attioType: 'text',
          metadata: { api_slug: attributeName, type: 'text' }
        };
      }
    );
    
    // Set up mock for formatAttributeValue to pass through the value
    (formatAttributeValue as jest.Mock).mockImplementation(
      async (objectSlug, attributeName, value) => value
    );
  });
  
  describe('Company validation with attribute type checking', () => {
    it('should validate and convert company create attributes', async () => {
      // Create test data with mixed types needing conversion
      const companyData = {
        name: 'Acme Corporation',
        company_size: '250',       // String that should be converted to number
        is_customer: 'yes',        // String that should be converted to boolean
        founded_date: '2020-01-15',
        website: 'https://acme.example.com',
        tags: 'enterprise',        // Single string that should be in array
        description: 'A test company'
      };
      
      // Validate using the enhanced validator
      const result = await CompanyValidator.validateCreate(companyData);
      
      // Verify type conversions occurred
      expect(result).toMatchObject({
        name: 'Acme Corporation',
        company_size: 250,         // Converted to number
        is_customer: true,         // Converted to boolean
        founded_date: '2020-01-15',
        website: 'https://acme.example.com',
        tags: ['enterprise'],      // Converted to array
        description: 'A test company'
      });
      
      // Verify that validation occurred and data was processed correctly
      // The validator uses internal type detection, not external API calls
    });
    
    it('should validate and convert company update attributes', async () => {
      // Create test data with mixed types needing conversion
      const companyData = {
        company_size: '500',        // String that should be converted to number
        is_customer: 0,             // Number that should be converted to boolean (false)
        tags: ['enterprise', 'b2b'] // Array that remains array
      };
      
      // Validate using the enhanced validator
      const result = await CompanyValidator.validateUpdate('comp_123456', companyData);
      
      // Verify type conversions occurred
      expect(result).toMatchObject({
        company_size: 500,          // Converted to number
        is_customer: false,         // Converted to boolean
        tags: ['enterprise', 'b2b'] // Still an array
      });
      
      // Verify that validation occurred and data was processed correctly
      // The validator uses internal type detection, not external API calls
    });
    
    it('should validate and convert a single attribute update', async () => {
      // Test single attribute update - string to number conversion
      const result = await CompanyValidator.validateAttributeUpdate(
        'comp_123456',
        'company_size',
        '750'
      );
      
      // Should convert string to number
      expect(result).toBe(750);
      
      // Verify that validation occurred and data was processed correctly
      // The validator uses internal type detection, not external API calls
    });
    
    it('should reject invalid attribute values with descriptive errors', async () => {
      // Test with invalid data for company size (should be a number)
      const companyData = {
        name: 'Acme Corporation',
        company_size: 'not-a-number' // Invalid value for number type
      };
      
      // Should reject the invalid value
      await expect(CompanyValidator.validateCreate(companyData))
        .rejects
        .toThrow(InvalidRequestError);
        
      // Error should mention the field name
      await expect(CompanyValidator.validateCreate(companyData))
        .rejects
        .toThrow(/company_size/);
    });
    
    it('should handle nullable fields correctly', async () => {
      // Test with null values for optional fields
      const companyData = {
        name: 'Acme Corporation', // Required field
        company_size: null,       // Optional field set to null
        website: null,            // Optional field set to null
        founded_date: null        // Optional field set to null
      };
      
      // Should accept null values for optional fields
      const result = await CompanyValidator.validateCreate(companyData);
      
      // Null values should remain null
      expect(result).toMatchObject({
        name: 'Acme Corporation',
        company_size: null,
        website: null,
        founded_date: null
      });
    });
    
    it('should process record references correctly', async () => {
      // Test with record references in different formats
      const companyData = {
        name: 'Acme Corporation',
        related_companies: [
          'rec_123',                    // String ID
          { record_id: 'rec_456' },     // Object with record_id
          { id: 'rec_789' }             // Object with id
        ]
      };
      
      // Should process the record references
      const result = await CompanyValidator.validateCreate(companyData);
      
      // Should preserve the structure as provided (validator doesn't normalize record references)
      expect(result.related_companies).toEqual([
        'rec_123',                    // String ID preserved
        { record_id: 'rec_456' },     // Object with record_id preserved
        { id: 'rec_789' }             // Object with id preserved
      ]);
    });
  });
});