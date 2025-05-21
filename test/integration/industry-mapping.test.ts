/**
 * Integration tests for industry-to-categories field mapping for companies
 * Tests issue #176 fix for the incorrect industry field mapping
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { createCompany, updateCompany } from '../../src/objects/companies/index';
import { getAttributeSlug } from '../../src/utils/attribute-mapping/index';
import { initializeAttioClient } from '../../src/api/attio-client';
import * as attioClient from '../../src/api/attio-client';

// Mock the attioClient module
vi.mock('../../src/api/attio-client', async () => {
  const actual = await vi.importActual('../../src/api/attio-client');
  return {
    ...actual as any,
    getAttioClient: vi.fn(),
    initializeAttioClient: vi.fn(),
  };
});

describe('Industry Field Mapping - Integration Tests', () => {
  let mockApiCall: vi.Mock;
  
  beforeAll(() => {
    initializeAttioClient({ apiKey: 'test-api-key' });
  });
  
  beforeEach(() => {
    mockApiCall = vi.fn();
    vi.mocked(attioClient.getAttioClient).mockReturnValue({
      post: mockApiCall,
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as any);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Industry to Categories Mapping', () => {
    it('should map "industry" to "categories" when creating a company', async () => {
      // Prepare mock response
      const mockCompanyId = 'test-company-id';
      const mockResponse = {
        id: { record_id: mockCompanyId },
        values: {
          name: [{ value: 'Test Company' }],
          categories: [{ value: 'Technology' }],
          // Note: No 'industry' field in the response
        }
      };
      
      mockApiCall.mockResolvedValueOnce({ data: mockResponse });
      
      // Create a company with 'industry' field
      const companyData = {
        name: 'Test Company',
        industry: 'Technology'
      };
      
      const result = await createCompany(companyData);
      
      // Verify the API call was made with 'categories' instead of 'industry'
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      
      // Get the transformed data sent to the API
      const apiCallArg = mockApiCall.mock.calls[0][1];
      
      // Verify categories was used instead of industry
      expect(apiCallArg.values.categories).toBeDefined();
      expect(apiCallArg.values.categories[0].value).toBe('Technology');
      expect(apiCallArg.values.industry).toBeUndefined();
    });
    
    it('should map "industry" to "categories" when updating a company', async () => {
      // Prepare mock response
      const mockCompanyId = 'test-company-id';
      const mockResponse = {
        id: { record_id: mockCompanyId },
        values: {
          name: [{ value: 'Test Company' }],
          categories: [{ value: 'Finance' }],
        }
      };
      
      mockApiCall.mockResolvedValueOnce({ data: mockResponse });
      
      // Update a company with 'industry' field
      const updates = {
        industry: 'Finance'
      };
      
      const result = await updateCompany(mockCompanyId, updates);
      
      // Verify the API call was made with 'categories' instead of 'industry'
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      
      // Get the transformed data sent to the API
      const apiCallArg = mockApiCall.mock.calls[0][1];
      
      // Verify categories was used instead of industry
      expect(apiCallArg.values.categories).toBeDefined();
      expect(apiCallArg.values.categories[0].value).toBe('Finance');
      expect(apiCallArg.values.industry).toBeUndefined();
    });
    
    it('should map multiple values with different casings properly', async () => {
      // Test direct attribute mapping functions to verify different cases
      expect(getAttributeSlug('industry')).toBe('categories');
      expect(getAttributeSlug('Industry')).toBe('categories');
      expect(getAttributeSlug('INDUSTRY')).toBe('categories');
      expect(getAttributeSlug('industry type')).toBe('categories');
      expect(getAttributeSlug('Industry Type')).toBe('categories');
    });
    
    it('should prioritize the special case mapping over config mappings', async () => {
      // Prepare mock response
      const mockCompanyId = 'test-company-id';
      const mockResponse = {
        id: { record_id: mockCompanyId },
        values: {
          name: [{ value: 'Test Company' }],
          categories: [{ value: 'Healthcare' }],
        }
      };
      
      mockApiCall.mockResolvedValueOnce({ data: mockResponse });
      
      // Update a company using both fields
      const updates = {
        industry: 'Healthcare',
        categories: 'Should not be used' // This should be overridden
      };
      
      const result = await updateCompany(mockCompanyId, updates);
      
      // Verify the API call was made correctly
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      
      // Get the transformed data sent to the API
      const apiCallArg = mockApiCall.mock.calls[0][1];
      
      // Verify categories was used with the industry value
      expect(apiCallArg.values.categories).toBeDefined();
      expect(apiCallArg.values.categories[0].value).toBe('Healthcare');
    });
  });
});