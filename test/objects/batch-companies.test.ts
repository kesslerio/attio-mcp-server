import { 
  batchSearchCompanies,
  batchGetCompanyDetails,
  extractCompanyId
} from '../../src/objects/companies';
import * as attioOperations from '../../src/api/attio-operations';
import { getAttioClient } from '../../src/api/attio-client';
import { Company } from '../../src/types/attio';

// Mock the attio-operations module
jest.mock('../../src/api/attio-operations');
jest.mock('../../src/api/attio-client', () => ({
  getAttioClient: jest.fn(),
}));

describe('Companies Batch Operations', () => {
  // Sample mock data
  const mockCompany1: Company = {
    id: {
      record_id: 'company123'
    },
    values: {
      name: [{ value: 'Acme Inc' }],
      website: [{ value: 'https://acme.com' }]
    }
  };

  const mockCompany2: Company = {
    id: {
      record_id: 'company456'
    },
    values: {
      name: [{ value: 'Globex Corp' }],
      website: [{ value: 'https://globex.com' }]
    }
  };

  // Mock API client
  const mockApiClient = {
    post: jest.fn(),
    get: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getAttioClient as jest.Mock).mockReturnValue(mockApiClient);
  });

  describe('extractCompanyId', () => {
    it('should extract ID from URI format', () => {
      const result = extractCompanyId('attio://companies/company123');
      expect(result).toBe('company123');
    });

    it('should handle direct IDs', () => {
      const result = extractCompanyId('company123');
      expect(result).toBe('company123');
    });

    it('should throw error for invalid resource type', () => {
      expect(() => extractCompanyId('attio://people/person123'))
        .toThrow('Invalid resource type in URI: Expected \'companies\', got \'people\'');
    });

    it('should handle malformed URIs with graceful fallback', () => {
      const result = extractCompanyId('attio://malformed/company123/extra');
      expect(result).toBe('extra');
    });
  });

  describe('batchSearchCompanies', () => {
    it('should call batchSearchObjects with correct parameters', async () => {
      // Setup mock response
      const mockResponse = {
        results: [
          { id: 'search_companies_0', success: true, data: [mockCompany1] },
          { id: 'search_companies_1', success: true, data: [mockCompany2] }
        ],
        summary: {
          total: 2,
          succeeded: 2,
          failed: 0
        }
      };
      
      // Mock the batchSearchObjects function
      (attioOperations.batchSearchObjects as jest.Mock).mockResolvedValue(mockResponse);

      // Call the function
      const result = await batchSearchCompanies(['Acme', 'Globex']);

      // Assertions
      expect(attioOperations.batchSearchObjects).toHaveBeenCalledWith(
        'companies',
        ['Acme', 'Globex'],
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors using fallback implementation', async () => {
      // Mock batchSearchObjects to fail
      (attioOperations.batchSearchObjects as jest.Mock).mockImplementation(() => {
        throw new Error('Batch operation failed');
      });
      
      // Mock the searchCompanies for individual searches in the fallback
      jest.spyOn(require('../../src/objects/companies'), 'searchCompanies')
        .mockResolvedValueOnce([mockCompany1])
        .mockRejectedValueOnce(new Error('Search failed'));

      // Call the function
      const result = await batchSearchCompanies(['Acme', 'Unknown']);

      // Assertions
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.results.length).toBe(2);
      
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].data).toEqual([mockCompany1]);
      
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeInstanceOf(Error);
      expect(result.results[1].error.message).toBe('Search failed');
    });
  });

  describe('batchGetCompanyDetails', () => {
    it('should call batchGetObjectDetails with correct parameters', async () => {
      // Setup mock response
      const mockResponse = {
        results: [
          { id: 'get_companies_company123', success: true, data: mockCompany1 },
          { id: 'get_companies_company456', success: true, data: mockCompany2 }
        ],
        summary: {
          total: 2,
          succeeded: 2,
          failed: 0
        }
      };
      
      // Mock the batchGetObjectDetails function
      (attioOperations.batchGetObjectDetails as jest.Mock).mockResolvedValue(mockResponse);

      // Call the function
      const result = await batchGetCompanyDetails(['company123', 'company456']);

      // Assertions
      expect(attioOperations.batchGetObjectDetails).toHaveBeenCalledWith(
        'companies',
        ['company123', 'company456'],
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle URI format in IDs', async () => {
      // Setup mock response
      const mockResponse = {
        results: [
          { id: 'get_companies_0', success: true, data: mockCompany1 },
          { id: 'get_companies_1', success: true, data: mockCompany2 }
        ],
        summary: {
          total: 2,
          succeeded: 2,
          failed: 0
        }
      };
      
      // Mock the batchGetObjectDetails function
      (attioOperations.batchGetObjectDetails as jest.Mock).mockResolvedValue(mockResponse);

      // Call the function with URI format
      const result = await batchGetCompanyDetails([
        'attio://companies/company123', 
        'attio://companies/company456'
      ]);

      // Assertions
      expect(attioOperations.batchGetObjectDetails).toHaveBeenCalledWith(
        'companies',
        ['company123', 'company456'],
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors using fallback implementation', async () => {
      // Mock batchGetObjectDetails to fail
      (attioOperations.batchGetObjectDetails as jest.Mock).mockImplementation(() => {
        throw new Error('Batch operation failed');
      });
      
      // Mock the getCompanyDetails for individual gets in the fallback
      jest.spyOn(require('../../src/objects/companies'), 'getCompanyDetails')
        .mockResolvedValueOnce(mockCompany1)
        .mockRejectedValueOnce(new Error('Company not found'));

      // Call the function
      const result = await batchGetCompanyDetails(['company123', 'nonexistent']);

      // Assertions
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.results.length).toBe(2);
      
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].data).toEqual(mockCompany1);
      
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeInstanceOf(Error);
      expect(result.results[1].error.message).toBe('Company not found');
    });
  });
});