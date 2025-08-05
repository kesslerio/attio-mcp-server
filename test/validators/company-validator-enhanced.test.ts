/**
 * Tests for the enhanced company validator with attribute type validation
 */

import {
  detectFieldType,
  getAttributeTypeInfo,
} from '../../src/api/attribute-types.js';
import { InvalidRequestError } from '../../src/errors/api-errors.js';
import {
  InvalidCompanyDataError,
  InvalidCompanyFieldTypeError,
  MissingCompanyFieldError,
} from '../../src/errors/company-errors.js';
import { CompanyValidator } from '../../src/validators/company-validator.js';

// Mock the attribute type modules
vi.mock('../../src/api/attribute-types.js', () => ({
  getAttributeTypeInfo: vi.fn(),
  getFieldValidationRules: vi.fn(),
  detectFieldType: vi.fn(),
}));

describe('Enhanced Company Validator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    CompanyValidator.clearFieldTypeCache();
  });

  describe('validateAttributeTypes', () => {
    it('should validate and convert attributes based on their types', async () => {
      // Mock attribute type info for different fields
      (getAttributeTypeInfo as vi.Mock).mockImplementation(
        async (objectSlug, attributeName) => {
          switch (attributeName) {
            case 'name':
              return {
                fieldType: 'string',
                isArray: false,
                isRequired: true,
                isUnique: true,
                attioType: 'text',
                metadata: {},
              };
            case 'employees':
              return {
                fieldType: 'number',
                isArray: false,
                isRequired: false,
                isUnique: false,
                attioType: 'number',
                metadata: {},
              };
            case 'is_active':
              return {
                fieldType: 'boolean',
                isArray: false,
                isRequired: false,
                isUnique: false,
                attioType: 'checkbox',
                metadata: {},
              };
            case 'founded_date':
              return {
                fieldType: 'string',
                isArray: false,
                isRequired: false,
                isUnique: false,
                attioType: 'date',
                metadata: {},
              };
            default:
              return {
                fieldType: 'string',
                isArray: false,
                isRequired: false,
                isUnique: false,
                attioType: 'text',
                metadata: {},
              };
          }
        }
      );

      // Test attribute validation with various types
      const attributes = {
        name: 'Acme Corporation',
        employees: '500', // String that should be converted to number
        is_active: 1, // Number that should be converted to boolean
        founded_date: '2023-01-15', // Date string
        description: 'Test company', // Regular string
      };

      const result = await CompanyValidator.validateAttributeTypes(attributes);

      // Verify the attributes were converted correctly
      expect(result).toEqual({
        name: 'Acme Corporation',
        employees: 500, // Should be converted to number
        is_active: true, // Should be converted to boolean
        founded_date: '2023-01-15', // Remains a string as the field type is string
        description: 'Test company',
      });

      // Verify API calls
      expect(getAttributeTypeInfo).toHaveBeenCalledWith('companies', 'name');
      expect(getAttributeTypeInfo).toHaveBeenCalledWith(
        'companies',
        'employees'
      );
      expect(getAttributeTypeInfo).toHaveBeenCalledWith(
        'companies',
        'is_active'
      );
      expect(getAttributeTypeInfo).toHaveBeenCalledWith(
        'companies',
        'founded_date'
      );
      expect(getAttributeTypeInfo).toHaveBeenCalledWith(
        'companies',
        'description'
      );
    });

    it('should handle null values correctly', async () => {
      const attributes = {
        name: null,
        description: null,
      };

      const result = await CompanyValidator.validateAttributeTypes(attributes);

      // Null values should remain null
      expect(result).toEqual({
        name: null,
        description: null,
      });

      // The API should not be called for null values
      expect(getAttributeTypeInfo).not.toHaveBeenCalled();
    });

    it('should throw an error for invalid attribute values', async () => {
      // Mock type info for a number field
      (getAttributeTypeInfo as vi.Mock).mockResolvedValue({
        fieldType: 'number',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'number',
        metadata: {},
      });

      const attributes = {
        employees: 'not-a-number', // Invalid for number type
      };

      // Should throw an InvalidRequestError
      await expect(
        CompanyValidator.validateAttributeTypes(attributes)
      ).rejects.toThrow(InvalidRequestError);

      // Verify the API call was made
      expect(getAttributeTypeInfo).toHaveBeenCalledWith(
        'companies',
        'employees'
      );
    });

    it('should proceed with original value if type info cannot be determined', async () => {
      // Mock getAttributeTypeInfo to throw an error
      (getAttributeTypeInfo as vi.Mock).mockRejectedValue(
        new Error('API error')
      );

      const attributes = {
        custom_field: 'test value',
      };

      // Should not throw but use the original value
      const result = await CompanyValidator.validateAttributeTypes(attributes);

      expect(result).toEqual({
        custom_field: 'test value',
      });

      // Verify the API call was attempted
      expect(getAttributeTypeInfo).toHaveBeenCalledWith(
        'companies',
        'custom_field'
      );
    });
  });

  describe('validateCreate', () => {
    it('should validate required fields and enhance with type validation', async () => {
      // Mock validateFieldType and performSpecialValidation
      vi.spyOn(CompanyValidator as any, 'validateFieldType').mockResolvedValue(
        undefined
      );
      vi.spyOn(
        CompanyValidator as any,
        'performSpecialValidation'
      ).mockResolvedValue(undefined);

      // Mock validateAttributeTypes for type conversion
      vi.spyOn(CompanyValidator, 'validateAttributeTypes').mockResolvedValue({
        name: 'Acme Corp',
        employees: 250,
        is_active: true,
      });

      const attributes = {
        name: 'Acme Corp',
        employees: '250',
        is_active: 'yes',
      };

      const result = await CompanyValidator.validateCreate(attributes);

      // Should return the validated and converted attributes
      expect(result).toEqual({
        name: 'Acme Corp',
        employees: 250,
        is_active: true,
      });

      // Should call validateAttributeTypes
      expect(CompanyValidator.validateAttributeTypes).toHaveBeenCalledWith(
        attributes
      );
    });

    it('should throw MissingCompanyFieldError if name is missing', async () => {
      const attributes = {
        employees: '250',
        // Missing required name field
      };

      await expect(CompanyValidator.validateCreate(attributes)).rejects.toThrow(
        MissingCompanyFieldError
      );

      // Should not reach validateAttributeTypes since validation fails early
      expect(CompanyValidator.validateAttributeTypes).not.toHaveBeenCalled();
    });
  });

  describe('validateUpdate', () => {
    it('should validate company ID and enhance with type validation', async () => {
      // Mock validateFieldType and performSpecialValidation
      vi.spyOn(CompanyValidator as any, 'validateFieldType').mockResolvedValue(
        undefined
      );
      vi.spyOn(
        CompanyValidator as any,
        'performSpecialValidation'
      ).mockResolvedValue(undefined);

      // Mock validateAttributeTypes for type conversion
      vi.spyOn(CompanyValidator, 'validateAttributeTypes').mockResolvedValue({
        name: 'Updated Corp',
        employees: 300,
      });

      const companyId = 'comp_123456';
      const attributes = {
        name: 'Updated Corp',
        employees: '300',
      };

      const result = await CompanyValidator.validateUpdate(
        companyId,
        attributes
      );

      // Should return the validated and converted attributes
      expect(result).toEqual({
        name: 'Updated Corp',
        employees: 300,
      });

      // Should call validateAttributeTypes
      expect(CompanyValidator.validateAttributeTypes).toHaveBeenCalledWith(
        attributes
      );
    });

    it('should throw InvalidCompanyDataError if company ID is invalid', async () => {
      const attributes = {
        name: 'Updated Corp',
      };

      // Invalid company ID (empty string)
      await expect(
        CompanyValidator.validateUpdate('', attributes)
      ).rejects.toThrow(InvalidCompanyDataError);

      // Should not reach validateAttributeTypes since validation fails early
      expect(CompanyValidator.validateAttributeTypes).not.toHaveBeenCalled();
    });
  });

  describe('validateAttributeUpdate', () => {
    it('should validate a single attribute and return converted value', async () => {
      // Mock validateFieldType
      vi.spyOn(CompanyValidator as any, 'validateFieldType').mockResolvedValue(
        undefined
      );

      // Mock validateAttributeTypes for the single attribute
      vi.spyOn(CompanyValidator, 'validateAttributeTypes').mockImplementation(
        async (attributeObj) => ({
          revenue: 1_000_000,
        })
      );

      const companyId = 'comp_123456';
      const attributeName = 'revenue';
      const attributeValue = '1000000';

      const result = await CompanyValidator.validateAttributeUpdate(
        companyId,
        attributeName,
        attributeValue
      );

      // Should return the converted value
      expect(result).toBe(1_000_000);

      // Should call validateAttributeTypes with the attribute object
      expect(CompanyValidator.validateAttributeTypes).toHaveBeenCalledWith({
        revenue: '1000000',
      });
    });

    it('should throw InvalidCompanyDataError for an invalid company ID', async () => {
      await expect(
        CompanyValidator.validateAttributeUpdate(
          '', // Invalid company ID
          'name',
          'Test Company'
        )
      ).rejects.toThrow(InvalidCompanyDataError);
    });

    it('should throw InvalidCompanyDataError for an invalid attribute name', async () => {
      await expect(
        CompanyValidator.validateAttributeUpdate(
          'comp_123456',
          '', // Invalid attribute name
          'Test Value'
        )
      ).rejects.toThrow(InvalidCompanyDataError);
    });
  });
});
