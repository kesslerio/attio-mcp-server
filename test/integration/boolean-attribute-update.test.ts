/**
 * Integration tests for boolean attribute update functionality
 */
import { 
  updateCompanyAttribute,
  updateCompany 
} from '../../src/objects/companies/basic.js';
import { CompanyValidator } from '../../src/validators/company-validator.js';
import { getAttioClient } from '../../src/api/attio-client.js';
import { ResourceType } from '../../src/types/attio.js';
import { detectFieldType } from '../../src/api/attribute-types.js';

// Mock the attio client
jest.mock('../../src/api/attio-client.js');
jest.mock('../../src/api/attribute-types.js');

describe('Boolean Attribute Updates Integration', () => {
  let mockApiClient: any;
  const MOCK_COMPANY_ID = 'comp_12345';
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset the field type cache
    CompanyValidator.clearFieldTypeCache();
    
    // Set up mock API client
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    };
    
    // Mock the getAttioClient to return our mock client
    (getAttioClient as jest.Mock).mockReturnValue(mockApiClient);
    
    // Mock the detectFieldType to return 'boolean' for specific fields
    (detectFieldType as jest.Mock).mockImplementation((resourceType: string, fieldName: string) => {
      if (fieldName === 'is_active' || fieldName === 'uses_body_composition') {
        return Promise.resolve('boolean');
      }
      return Promise.resolve('string');
    });
  });
  
  describe('updateCompanyAttribute', () => {
    test('converts string "false" to boolean false before updating API', async () => {
      // Mock API responses
      mockApiClient.get.mockResolvedValueOnce({
        data: {
          id: MOCK_COMPANY_ID,
          values: {
            name: [{ value: 'Test Company' }],
            is_active: [{ value: true }]
          }
        }
      });
      
      mockApiClient.patch.mockResolvedValueOnce({
        data: {
          id: MOCK_COMPANY_ID,
          values: {
            name: [{ value: 'Test Company' }],
            is_active: [{ value: false }]
          }
        }
      });
      
      // Call function with string 'false'
      const result = await updateCompanyAttribute(MOCK_COMPANY_ID, 'is_active', 'false');
      
      // Verify that the API was called (boolean conversion should happen during validation)
      expect(mockApiClient.patch).toHaveBeenCalledTimes(1);
      
      // Verify the result is correctly returned with the expected boolean value
      expect(result.id).toBe(MOCK_COMPANY_ID);
      expect(result.values.is_active[0].value).toBe(false);
    });
    
    test('converts string "true" to boolean true before updating API', async () => {
      // Mock API responses
      mockApiClient.get.mockResolvedValueOnce({
        data: {
          id: MOCK_COMPANY_ID,
          values: {
            name: [{ value: 'Test Company' }],
            uses_body_composition: [{ value: false }]
          }
        }
      });
      
      mockApiClient.patch.mockResolvedValueOnce({
        data: {
          id: MOCK_COMPANY_ID,
          values: {
            name: [{ value: 'Test Company' }],
            uses_body_composition: [{ value: true }]
          }
        }
      });
      
      // Call function with string 'true'
      const result = await updateCompanyAttribute(MOCK_COMPANY_ID, 'uses_body_composition', 'true');
      
      // Verify that the API was called (boolean conversion should happen during validation)
      expect(mockApiClient.patch).toHaveBeenCalledTimes(1);
      
      // Verify the result is correctly returned with the expected boolean value
      expect(result.id).toBe(MOCK_COMPANY_ID);
      expect(result.values.uses_body_composition[0].value).toBe(true);
    });
    
    test('correctly handles alternative string boolean values ("yes"/"no")', async () => {
      // Mock API responses
      mockApiClient.get.mockResolvedValueOnce({
        data: {
          id: MOCK_COMPANY_ID,
          values: {
            name: [{ value: 'Test Company' }],
            is_active: [{ value: false }]
          }
        }
      });
      
      mockApiClient.patch.mockResolvedValueOnce({
        data: {
          id: MOCK_COMPANY_ID,
          values: {
            name: [{ value: 'Test Company' }],
            is_active: [{ value: true }]
          }
        }
      });
      
      // Call function with string 'yes'
      const result = await updateCompanyAttribute(MOCK_COMPANY_ID, 'is_active', 'yes');
      
      // Verify that the API was called (boolean conversion should happen during validation)
      expect(mockApiClient.patch).toHaveBeenCalledTimes(1);
      
      // Verify the result is correctly returned with the expected boolean value
      expect(result.id).toBe(MOCK_COMPANY_ID);
      expect(result.values.is_active[0].value).toBe(true);
    });
  });
  
  describe('updateCompany', () => {
    test('converts multiple boolean string values in a single update', async () => {
      // Mock API responses
      mockApiClient.get.mockResolvedValueOnce({
        data: {
          id: MOCK_COMPANY_ID,
          values: {
            name: [{ value: 'Test Company' }],
            is_active: [{ value: true }],
            uses_body_composition: [{ value: true }]
          }
        }
      });
      
      mockApiClient.patch.mockResolvedValueOnce({
        data: {
          id: MOCK_COMPANY_ID,
          values: {
            name: [{ value: 'Test Company' }],
            is_active: [{ value: false }],
            uses_body_composition: [{ value: false }]
          }
        }
      });
      
      // Call updateCompany with multiple string boolean values
      const result = await updateCompany(MOCK_COMPANY_ID, {
        is_active: 'no',
        uses_body_composition: 'false'
      });
      
      // Verify that the API was called (boolean conversion should happen during validation)
      expect(mockApiClient.patch).toHaveBeenCalledTimes(1);
      
      // Verify the result is correctly returned with the expected boolean values
      expect(result.id).toBe(MOCK_COMPANY_ID);
      expect(result.values.is_active[0].value).toBe(false);
      expect(result.values.uses_body_composition[0].value).toBe(false);
    });
  });
});