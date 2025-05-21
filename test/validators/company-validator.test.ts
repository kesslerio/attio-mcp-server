/**
 * Tests for the company validator with attribute type validation
 */
import { CompanyValidator } from '../../src/validators/company-validator.js';
import { getAttributeTypeInfo } from '../../src/api/attribute-types.js';
import { InvalidRequestError } from '../../src/errors/api-errors.js';

// Mock the getAttributeTypeInfo function
jest.mock('../../src/api/attribute-types.js', () => ({
  getAttributeTypeInfo: jest.fn(),
  getFieldValidationRules: jest.fn(),
  detectFieldType: jest.fn()
}));

describe('Company Validator', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    CompanyValidator.clearFieldTypeCache();
  });
  
  describe('validateAttributeTypes', () => {
    it('should validate and convert attributes based on their types', async () => {
      // Mock type info for name (string), employees (number), and active (boolean)
      (getAttributeTypeInfo as jest.Mock).mockImplementation(async (objectSlug, attributeName) => {
        switch (attributeName) {
          case 'name':
            return {
              fieldType: 'string',
              isArray: false,
              isRequired: true,
              isUnique: true,
              attioType: 'text',
              metadata: {}
            };
          case 'employees':
            return {
              fieldType: 'number',
              isArray: false,
              isRequired: false,
              isUnique: false,
              attioType: 'number',
              metadata: {}
            };
          case 'active':
            return {
              fieldType: 'boolean',
              isArray: false,
              isRequired: false,
              isUnique: false,
              attioType: 'checkbox',
              metadata: {}
            };
          default:
            return {
              fieldType: 'string',
              isArray: false,
              isRequired: false,
              isUnique: false,
              attioType: 'text',
              metadata: {}
            };
        }
      });
      
      // Test attributes with mixed types
      const attributes = {
        name: 'Test Company',
        employees: '250', // String that should be converted to number
        active: 'yes',    // String that should be converted to boolean
        description: 'A test company'
      };
      
      const result = await CompanyValidator.validateAttributeTypes(attributes);
      
      // Verify the result contains converted values
      expect(result).toEqual({
        name: 'Test Company',
        employees: 250,        // Should be a number now
        active: true,          // Should be a boolean now
        description: 'A test company'
      });
      
      // Verify API calls
      expect(getAttributeTypeInfo).toHaveBeenCalledTimes(4);
    });
    
    it('should handle null values correctly', async () => {
      // Mock type info for a single attribute
      (getAttributeTypeInfo as jest.Mock).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'text',
        metadata: {}
      });
      
      const attributes = {
        name: null,
        description: null
      };
      
      const result = await CompanyValidator.validateAttributeTypes(attributes);
      
      // Null values should remain null
      expect(result).toEqual({
        name: null,
        description: null
      });
      
      // Type info should not be requested for null values
      expect(getAttributeTypeInfo).not.toHaveBeenCalled();
    });
    
    it('should throw an error for invalid attribute values', async () => {
      // Mock type info for employees as number
      (getAttributeTypeInfo as jest.Mock).mockResolvedValue({
        fieldType: 'number',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'number',
        metadata: {}
      });
      
      const attributes = {
        employees: 'not-a-number' // Invalid for number type
      };
      
      // Should throw an InvalidRequestError
      await expect(CompanyValidator.validateAttributeTypes(attributes))
        .rejects
        .toThrow(InvalidRequestError);
    });
    
    it('should proceed with original value if type info cannot be determined', async () => {
      // Mock getAttributeTypeInfo to throw an error
      (getAttributeTypeInfo as jest.Mock).mockRejectedValue(new Error('API error'));
      
      const attributes = {
        custom_field: 'test value'
      };
      
      const result = await CompanyValidator.validateAttributeTypes(attributes);
      
      // Should keep original value
      expect(result).toEqual({
        custom_field: 'test value'
      });
    });
  });
  
  describe('validateAttributeUpdate integration', () => {
    it('should validate and convert a single attribute value', async () => {
      // Mock the field type detection to return 'number'
      (getAttributeTypeInfo as jest.Mock).mockResolvedValue({
        fieldType: 'number',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'number',
        metadata: {}
      });
      
      // Mock detectFieldType to avoid validation errors
      jest.spyOn(CompanyValidator as any, 'validateFieldType').mockResolvedValue(undefined);
      jest.spyOn(CompanyValidator as any, 'performSpecialValidation').mockResolvedValue(undefined);
      
      // Test with a string value that should be converted to number
      const result = await CompanyValidator.validateAttributeUpdate('comp_123', 'revenue', '5000000');
      
      // Should be converted to a number
      expect(result).toBe(5000000);
    });
    
    it('should throw an error for invalid attribute value', async () => {
      // Mock the field type detection to return 'boolean'
      (getAttributeTypeInfo as jest.Mock).mockResolvedValue({
        fieldType: 'boolean',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'checkbox',
        metadata: {}
      });
      
      // Mock validateFieldType to avoid validation errors
      jest.spyOn(CompanyValidator as any, 'validateFieldType').mockResolvedValue(undefined);
      jest.spyOn(CompanyValidator as any, 'performSpecialValidation').mockResolvedValue(undefined);
      
      // Test with an invalid boolean value
      await expect(CompanyValidator.validateAttributeUpdate('comp_123', 'is_active', 'invalid-boolean'))
        .rejects
        .toThrow();
    });
  });
});