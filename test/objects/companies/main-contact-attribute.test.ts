/**
 * Tests for main_contact attribute handling in updateCompanyAttribute
 */
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

// Mock dependencies before importing
vi.mock('../../../src/objects/people/search.js', () => ({
  searchPeople: vi.fn()
}));

vi.mock('../../../src/objects/base-operations.js', () => ({
  updateObjectAttributeWithDynamicFields: vi.fn().mockResolvedValue({
    id: { record_id: 'company_123' },
    values: { main_contact: [{ target_record_id: 'person_123', target_object: 'people' }] }
  })
}));

vi.mock('../../../src/validators/company-validator.js', () => ({
  CompanyValidator: {
    validateAttributeUpdate: vi.fn().mockImplementation((_, __, value) => Promise.resolve(value))
  }
}));

// Import after mocking
import { updateCompanyAttribute } from '../../../src/objects/companies/basic.js';
import { searchPeople } from '../../../src/objects/people/search.js';
import { CompanyOperationError } from '../../../src/errors/company-errors.js';

describe('updateCompanyAttribute - main_contact handling', () => {
  let mockSearchPeople: Mock;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchPeople = vi.mocked(searchPeople);
  });

  describe('Person ID validation', () => {
    it('should accept valid Person Record ID format', async () => {
      const validPersonId = 'person_abcd1234567890';
      
      const result = await updateCompanyAttribute('company_123', 'main_contact', validPersonId);
      
      expect(result).toBeDefined();
      expect(mockSearchPeople).not.toHaveBeenCalled();
    });

    it('should accept Person ID with mixed alphanumeric characters', async () => {
      const validPersonId = 'person_01hABcd123EFgh';
      
      const result = await updateCompanyAttribute('company_123', 'main_contact', validPersonId);
      
      expect(result).toBeDefined();
      expect(mockSearchPeople).not.toHaveBeenCalled();
    });

    it('should accept minimum length Person ID', async () => {
      const validPersonId = 'person_1234567890'; // Exactly 10 chars after prefix
      
      const result = await updateCompanyAttribute('company_123', 'main_contact', validPersonId);
      
      expect(result).toBeDefined();
      expect(mockSearchPeople).not.toHaveBeenCalled();
    });

    it('should reject Person ID with invalid prefix', async () => {
      const invalidPersonId = 'user_abcd1234567890';
      mockSearchPeople.mockResolvedValue([]);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', invalidPersonId)
      ).rejects.toThrow('Person named "user_abcd1234567890" not found');
      
      expect(mockSearchPeople).toHaveBeenCalledWith(invalidPersonId);
    });

    it('should reject Person ID that is too short', async () => {
      const invalidPersonId = 'person_123'; // Too short
      mockSearchPeople.mockResolvedValue([]);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', invalidPersonId)
      ).rejects.toThrow('Person named "person_123" not found');
      
      expect(mockSearchPeople).toHaveBeenCalledWith(invalidPersonId);
    });

    it('should reject Person ID with invalid characters', async () => {
      const invalidPersonId = 'person_abc-def@123'; // Contains invalid chars
      mockSearchPeople.mockResolvedValue([]);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', invalidPersonId)
      ).rejects.toThrow('Person named "person_abc-def@123" not found');
      
      expect(mockSearchPeople).toHaveBeenCalledWith(invalidPersonId);
    });
  });

  describe('Person name lookup', () => {
    it('should successfully find person by exact name', async () => {
      const personName = 'John Doe';
      const mockPerson = {
        id: { record_id: 'person_123456789012' },
        values: { name: [{ value: 'John Doe' }] }
      };
      
      mockSearchPeople.mockResolvedValue([mockPerson]);
      
      const result = await updateCompanyAttribute('company_123', 'main_contact', personName);
      
      expect(result).toBeDefined();
      expect(mockSearchPeople).toHaveBeenCalledWith(personName);
    });

    it('should handle person not found', async () => {
      const personName = 'Nonexistent Person';
      mockSearchPeople.mockResolvedValue([]);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', personName)
      ).rejects.toThrow(
        'Person named "Nonexistent Person" not found'
      );
      
      expect(mockSearchPeople).toHaveBeenCalledWith(personName);
    });

    it('should handle multiple people found with same name', async () => {
      const personName = 'John Smith';
      const mockPeople = [
        {
          id: { record_id: 'person_123' },
          values: { name: [{ value: 'John Smith' }] }
        },
        {
          id: { record_id: 'person_456' },
          values: { name: [{ value: 'John Smith' }] }
        }
      ];
      
      mockSearchPeople.mockResolvedValue(mockPeople);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', personName)
      ).rejects.toThrow(
        'Multiple people found for "John Smith": [John Smith, John Smith]'
      );
      
      expect(mockSearchPeople).toHaveBeenCalledWith(personName);
    });

    it('should handle person without record ID', async () => {
      const personName = 'Jane Doe';
      const mockPerson = {
        id: {}, // Missing record_id
        values: { name: [{ value: 'Jane Doe' }] }
      };
      
      mockSearchPeople.mockResolvedValue([mockPerson]);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', personName)
      ).rejects.toThrow(
        'Could not retrieve Record ID for person "Jane Doe".'
      );
      
      expect(mockSearchPeople).toHaveBeenCalledWith(personName);
    });

    it('should handle people with missing names in error message', async () => {
      const personName = 'Duplicate Name';
      const mockPeople = [
        {
          id: { record_id: 'person_123' },
          values: { name: [{ value: 'Duplicate Name' }] }
        },
        {
          id: { record_id: 'person_456' },
          values: {} // Missing name
        }
      ];
      
      mockSearchPeople.mockResolvedValue(mockPeople);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', personName)
      ).rejects.toThrow(
        'Multiple people found for "Duplicate Name": [Duplicate Name, Unknown Name]'
      );
    });
  });

  describe('Search error handling', () => {
    it('should wrap search API errors in CompanyOperationError', async () => {
      const personName = 'Search Error Test';
      const searchError = new Error('API connection failed');
      
      mockSearchPeople.mockRejectedValue(searchError);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', personName)
      ).rejects.toThrow(
        'Failed to search for person "Search Error Test": API connection failed'
      );
      
      expect(mockSearchPeople).toHaveBeenCalledWith(personName);
    });

    it('should preserve CompanyOperationError from search', async () => {
      const personName = 'Company Error Test';
      const companyError = new CompanyOperationError('search', 'company_123', 'Custom error');
      
      mockSearchPeople.mockRejectedValue(companyError);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', personName)
      ).rejects.toThrow(companyError);
      
      expect(mockSearchPeople).toHaveBeenCalledWith(personName);
    });

    it('should handle non-Error search failures', async () => {
      const personName = 'Non-Error Test';
      const nonError = 'String error message';
      
      mockSearchPeople.mockRejectedValue(nonError);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', personName)
      ).rejects.toThrow(
        'Failed to search for person "Non-Error Test": String error message'
      );
    });
  });

  describe('Value format handling', () => {
    it('should format Person ID as array with correct structure', async () => {
      // Import directly from the mock setup
      const { updateObjectAttributeWithDynamicFields } = await import('../../../src/objects/base-operations.js');
      
      const validPersonId = 'person_abcd1234567890';
      
      await updateCompanyAttribute('company_123', 'main_contact', validPersonId);
      
      expect(updateObjectAttributeWithDynamicFields).toHaveBeenCalledWith(
        'companies',
        'company_123',
        'main_contact',
        [{ target_record_id: validPersonId, target_object: 'people' }],
        expect.any(Function)
      );
    });

    it('should format found person as array with correct structure', async () => {
      const { updateObjectAttributeWithDynamicFields } = await import('../../../src/objects/base-operations.js');
      
      const personName = 'Found Person';
      const mockPerson = {
        id: { record_id: 'person_found123456' },
        values: { name: [{ value: 'Found Person' }] }
      };
      
      mockSearchPeople.mockResolvedValue([mockPerson]);
      
      await updateCompanyAttribute('company_123', 'main_contact', personName);
      
      expect(updateObjectAttributeWithDynamicFields).toHaveBeenCalledWith(
        'companies',
        'company_123',
        'main_contact',
        [{ target_record_id: 'person_found123456', target_object: 'people' }],
        expect.any(Function)
      );
    });

    it('should not process non-string values for main_contact', async () => {
      const { updateObjectAttributeWithDynamicFields } = await import('../../../src/objects/base-operations.js');
      
      const arrayValue = [{ target_record_id: 'person_123', target_object: 'people' }];
      
      await updateCompanyAttribute('company_123', 'main_contact', arrayValue);
      
      expect(updateObjectAttributeWithDynamicFields).toHaveBeenCalledWith(
        'companies',
        'company_123',
        'main_contact',
        arrayValue,
        expect.any(Function)
      );
      expect(searchPeople).not.toHaveBeenCalled();
    });

    it('should not process other attributes', async () => {
      const { updateObjectAttributeWithDynamicFields } = await import('../../../src/objects/base-operations.js');
      
      const stringValue = 'person_123456789012';
      
      await updateCompanyAttribute('company_123', 'other_attribute', stringValue);
      
      expect(updateObjectAttributeWithDynamicFields).toHaveBeenCalledWith(
        'companies',
        'company_123',
        'other_attribute',
        stringValue,
        expect.any(Function)
      );
      expect(searchPeople).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string as person name', async () => {
      const emptyString = '';
      mockSearchPeople.mockResolvedValue([]);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', emptyString)
      ).rejects.toThrow('Person named "" not found');
      
      expect(mockSearchPeople).toHaveBeenCalledWith(emptyString);
    });

    it('should handle whitespace-only person name', async () => {
      const whitespaceString = '   ';
      mockSearchPeople.mockResolvedValue([]);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', whitespaceString)
      ).rejects.toThrow('Person named "   " not found');
      
      expect(mockSearchPeople).toHaveBeenCalledWith(whitespaceString);
    });

    it('should handle null person ID in search result', async () => {
      const personName = 'Null ID Person';
      const mockPerson = {
        id: { record_id: null },
        values: { name: [{ value: 'Null ID Person' }] }
      };
      
      mockSearchPeople.mockResolvedValue([mockPerson]);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', personName)
      ).rejects.toThrow(
        'Could not retrieve Record ID for person "Null ID Person".'
      );
    });

    it('should handle undefined person ID in search result', async () => {
      const personName = 'Undefined ID Person';
      const mockPerson = {
        id: { record_id: undefined },
        values: { name: [{ value: 'Undefined ID Person' }] }
      };
      
      mockSearchPeople.mockResolvedValue([mockPerson]);
      
      await expect(
        updateCompanyAttribute('company_123', 'main_contact', personName)
      ).rejects.toThrow(
        'Could not retrieve Record ID for person "Undefined ID Person".'
      );
    });
  });
});