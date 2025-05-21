/**
 * Tests for the boolean value conversion in attribute mapping
 */
import { convertToBoolean } from '../../../src/utils/attribute-mapping/attribute-mappers.js';
import { CompanyValidator } from '../../../src/validators/company-validator.js';

describe('Boolean value conversion', () => {
  // Direct tests for the convertToBoolean function
  describe('convertToBoolean function', () => {
    test('converts string values to booleans correctly', () => {
      // Truthy string values
      expect(convertToBoolean('true')).toBe(true);
      expect(convertToBoolean('TRUE')).toBe(true);
      expect(convertToBoolean('yes')).toBe(true);
      expect(convertToBoolean('YES')).toBe(true);
      expect(convertToBoolean('y')).toBe(true);
      expect(convertToBoolean('Y')).toBe(true);
      expect(convertToBoolean('1')).toBe(true);
      
      // Falsy string values
      expect(convertToBoolean('false')).toBe(false);
      expect(convertToBoolean('FALSE')).toBe(false);
      expect(convertToBoolean('no')).toBe(false);
      expect(convertToBoolean('NO')).toBe(false);
      expect(convertToBoolean('n')).toBe(false);
      expect(convertToBoolean('N')).toBe(false);
      expect(convertToBoolean('0')).toBe(false);
    });
    
    test('handles boolean values', () => {
      expect(convertToBoolean(true)).toBe(true);
      expect(convertToBoolean(false)).toBe(false);
    });
    
    test('handles numeric values', () => {
      expect(convertToBoolean(1)).toBe(true);
      expect(convertToBoolean(100)).toBe(true);
      expect(convertToBoolean(0)).toBe(false);
    });
    
    test('handles other values by converting to boolean', () => {
      expect(convertToBoolean({})).toBe(true); // Non-empty objects are truthy
      expect(convertToBoolean([])).toBe(true); // Arrays are truthy
      expect(convertToBoolean(null)).toBe(false); // Null is falsy
      expect(convertToBoolean(undefined)).toBe(false); // Undefined is falsy
    });
  });
  
  // Tests for Company Validator boolean conversion
  describe('CompanyValidator boolean conversion', () => {
    // We'll need to mock the detectFieldType function for testing
    const originalFieldTypeCache = new Map(CompanyValidator['fieldTypeCache']);
    const mockDetectFieldType = jest.fn();
    
    beforeEach(() => {
      // Reset the cache between tests
      CompanyValidator['fieldTypeCache'] = new Map();
      CompanyValidator['fieldTypeCache'].set('is_active', 'boolean');
      CompanyValidator['fieldTypeCache'].set('uses_body_composition', 'boolean');
      
      // Mock implementation to avoid real API calls
      jest.mock('../../../src/api/attribute-types.js', () => ({
        detectFieldType: () => Promise.resolve('boolean')
      }));
    });
    
    afterEach(() => {
      // Restore original cache
      CompanyValidator['fieldTypeCache'] = originalFieldTypeCache;
      jest.clearAllMocks();
    });
    
    test('validateAttributeUpdate converts string boolean values', async () => {
      // Test with string boolean values
      const result1 = await CompanyValidator.validateAttributeUpdate('comp_123', 'is_active', 'true');
      expect(result1).toBe(true);
      
      const result2 = await CompanyValidator.validateAttributeUpdate('comp_123', 'is_active', 'false');
      expect(result2).toBe(false);
      
      const result3 = await CompanyValidator.validateAttributeUpdate('comp_123', 'uses_body_composition', 'no');
      expect(result3).toBe(false);
    });
    
    test('validateCreate converts boolean fields in attributes', async () => {
      const attributes = {
        name: 'Test Company',
        is_active: 'yes',
        uses_body_composition: 'false'
      };
      
      const result = await CompanyValidator.validateCreate(attributes);
      
      // Validate converted values
      expect(result.is_active).toBe(true);
      expect(result.uses_body_composition).toBe(false);
      expect(result.name).toBe('Test Company');
    });
    
    test('validateUpdate converts boolean fields in attributes', async () => {
      const attributes = {
        is_active: 'no',
        uses_body_composition: 'true'
      };
      
      const result = await CompanyValidator.validateUpdate('comp_123', attributes);
      
      // Validate converted values
      expect(result.is_active).toBe(false);
      expect(result.uses_body_composition).toBe(true);
    });
  });
});