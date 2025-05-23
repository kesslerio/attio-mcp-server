import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  batchCreateCompanies,
  batchUpdateCompanies,
  batchDeleteCompanies,
  batchSearchCompanies,
  batchGetCompanyDetails
} from '../../src/objects/batch-companies';

// New test to validate the dispatch function's handling of the batch-create-companies tool
// Add this test to verify the fix for issue #153
import * as companies from '../../src/objects/companies/index';

// Define proper types for mock functions
interface BatchItem {
  id: string;
  params: any;
}

interface BatchResult {
  id: string;
  success: boolean;
  data?: any;
  error?: any;
}

interface BatchSummary {
  total: number;
  succeeded: number;
  failed: number;
}

interface BatchResponse {
  results: BatchResult[];
  summary: BatchSummary;
}

// Mock the individual operations
vi.mock('../../src/objects/companies');

// Mock the CompanyValidator to avoid API calls during validation
vi.mock('../../src/validators/company-validator', () => ({
  CompanyValidator: {
    validateCreate: vi.fn(async (company: any) => {
      // Simple validation that passes through the company data without API calls
      if (!company.name) {
        throw new Error('Name is required');
      }
      return company;
    }),
    validateUpdate: vi.fn(async (companyId: string, attributes: any) => {
      return attributes;
    })
  }
}));

vi.mock('../../src/api/operations/index', () => ({
  executeBatchOperations: vi.fn(async (items: BatchItem[], fn: (params: any) => Promise<any>, config?: any): Promise<BatchResponse> => {
    const results: BatchResult[] = [];
    let succeeded = 0;
    let failed = 0;
    
    for (const item of items) {
      try {
        const data = await fn(item.params);
        results.push({ id: item.id, success: true, data });
        succeeded++;
      } catch (error) {
        results.push({ id: item.id, success: false, error });
        failed++;
      }
    }
    
    return { results, summary: { total: items.length, succeeded, failed } };
  }),
  batchCreateRecords: (vi.fn() as any).mockRejectedValue(new Error('Batch API not available')),
  batchUpdateRecords: (vi.fn() as any).mockRejectedValue(new Error('Batch API not available'))
}));

describe('Batch Company Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('batchCreateCompanies', () => {
    it('should create multiple companies successfully', async () => {
      const mockCompany1 = {
        id: { record_id: '1' },
        values: { name: [{ value: 'Company 1' }] }
      };
      const mockCompany2 = {
        id: { record_id: '2' },
        values: { name: [{ value: 'Company 2' }] }
      };
      
      (companies.createCompany as vi.MockedFunction<typeof companies.createCompany>)
        .mockResolvedValueOnce(mockCompany1)
        .mockResolvedValueOnce(mockCompany2);
      
      const companiesData = [
        { name: 'Company 1', website: 'https://company1.com' },
        { name: 'Company 2', website: 'https://company2.com' }
      ];
      
      // Call the function with the new parameter structure
      const result = await batchCreateCompanies({ companies: companiesData });
      
      expect(result.summary).toEqual({
        total: 2,
        succeeded: 2,
        failed: 0
      });
      
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({
        id: 'create_company_0',
        success: true,
        data: mockCompany1
      });
      expect(result.results[1]).toEqual({
        id: 'create_company_1',
        success: true,
        data: mockCompany2
      });
    });
    
    it('should handle partial failures', async () => {
      (companies.createCompany as vi.MockedFunction<typeof companies.createCompany>)
        .mockResolvedValueOnce({
          id: { record_id: '1' },
          values: { name: [{ value: 'Company 1' }] }
        })
        .mockRejectedValueOnce(new Error('Validation error'));
      
      const companiesData = [
        { name: 'Company 1' },
        { name: 'Company 2' } // Valid name, but will fail in createCompany mock
      ];
      
      const result = await batchCreateCompanies({ companies: companiesData });
      
      expect(result.summary).toEqual({
        total: 2,
        succeeded: 1,
        failed: 1
      });
      
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeDefined();
    });
  });
  
  describe('batchUpdateCompanies', () => {
    it('should update multiple companies successfully', async () => {
      const mockUpdated1 = {
        id: { record_id: '1' },
        values: { 
          name: [{ value: 'Updated Company 1' }],
          website: [{ value: 'https://updated1.com' }]
        }
      };
      const mockUpdated2 = {
        id: { record_id: '2' },
        values: { 
          name: [{ value: 'Updated Company 2' }],
          website: [{ value: 'https://updated2.com' }]
        }
      };
      
      (companies.updateCompany as vi.MockedFunction<typeof companies.updateCompany>)
        .mockResolvedValueOnce(mockUpdated1)
        .mockResolvedValueOnce(mockUpdated2);
      
      const updates = [
        { id: '1', attributes: { name: 'Updated Company 1', website: 'https://updated1.com' } },
        { id: '2', attributes: { name: 'Updated Company 2', website: 'https://updated2.com' } }
      ];
      
      const result = await batchUpdateCompanies({ updates });
      
      expect(result.summary).toEqual({
        total: 2,
        succeeded: 2,
        failed: 0
      });
      
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].data).toEqual(mockUpdated1);
    });
  });
  
  describe('batchDeleteCompanies', () => {
    it('should delete multiple companies successfully', async () => {
      (companies.deleteCompany as vi.MockedFunction<typeof companies.deleteCompany>)
        .mockResolvedValue(true);
      
      const companyIds = ['1', '2', '3'];
      
      const result = await batchDeleteCompanies(companyIds);
      
      expect(result.summary).toEqual({
        total: 3,
        succeeded: 3,
        failed: 0
      });
      
      expect(result.results).toHaveLength(3);
      expect(result.results.every(r => r.success)).toBe(true);
      expect(companies.deleteCompany).toHaveBeenCalledTimes(3);
    });
    
    it('should handle deletion failures', async () => {
      (companies.deleteCompany as vi.MockedFunction<typeof companies.deleteCompany>)
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(true);
      
      const companyIds = ['1', '2', '3'];
      
      const result = await batchDeleteCompanies(companyIds);
      
      expect(result.summary).toEqual({
        total: 3,
        succeeded: 2,
        failed: 1
      });
      
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].success).toBe(true);
    });
  });
  
  describe('batchSearchCompanies', () => {
    it('should perform multiple searches successfully', async () => {
      const mockResults1 = [
        { id: { record_id: '1' }, values: { name: [{ value: 'Tech Corp' }] } }
      ];
      const mockResults2 = [
        { id: { record_id: '2' }, values: { name: [{ value: 'Finance Inc' }] } },
        { id: { record_id: '3' }, values: { name: [{ value: 'Finance Ltd' }] } }
      ];
      
      (companies.searchCompanies as vi.MockedFunction<typeof companies.searchCompanies>)
        .mockResolvedValueOnce(mockResults1)
        .mockResolvedValueOnce(mockResults2);
      
      const queries = ['tech', 'finance'];
      
      const result = await batchSearchCompanies(queries);
      
      expect(result.summary).toEqual({
        total: 2,
        succeeded: 2,
        failed: 0
      });
      
      expect(result.results[0].data).toEqual(mockResults1);
      expect(result.results[1].data).toEqual(mockResults2);
    });
  });
  
  describe('batchGetCompanyDetails', () => {
    it('should fetch details for multiple companies', async () => {
      const mockCompany1 = {
        id: { record_id: '1' },
        values: { 
          name: [{ value: 'Company 1' }],
          website: [{ value: 'https://company1.com' }]
        }
      };
      const mockCompany2 = {
        id: { record_id: '2' },
        values: { 
          name: [{ value: 'Company 2' }],
          website: [{ value: 'https://company2.com' }]
        }
      };
      
      (companies.getCompanyDetails as vi.MockedFunction<typeof companies.getCompanyDetails>)
        .mockResolvedValueOnce(mockCompany1)
        .mockResolvedValueOnce(mockCompany2);
      
      const companyIds = ['1', '2'];
      
      const result = await batchGetCompanyDetails(companyIds);
      
      expect(result.summary).toEqual({
        total: 2,
        succeeded: 2,
        failed: 0
      });
      
      expect(result.results[0].data).toEqual(mockCompany1);
      expect(result.results[1].data).toEqual(mockCompany2);
    });
  });
  
  describe('Issue #153 Validation', () => {
    it('should correctly handle the exact example request from issue #153', async () => {
      // Mock implementation for batch create
      const mockCompanies = [
        { 
          id: { record_id: 'alpha123' }, 
          values: { 
            name: [{ value: 'Test Company Alpha' }],
            description: [{ value: 'A test company for batch operations' }],
            industry: [{ value: 'Technology' }]
          } 
        },
        { 
          id: { record_id: 'beta456' }, 
          values: { 
            name: [{ value: 'Test Company Beta' }],
            description: [{ value: 'Another test company for batch operations' }],
            industry: [{ value: 'Consulting' }]
          } 
        },
        { 
          id: { record_id: 'gamma789' }, 
          values: { 
            name: [{ value: 'Test Company Gamma' }],
            description: [{ value: 'A third test company for batch operations' }],
            industry: [{ value: 'Manufacturing' }]
          } 
        }
      ];
      
      // Clear any previous mocks and set up fresh ones for this test
      vi.clearAllMocks();
      
      // Mock the createCompany function since the batch API will fail in test
      (companies.createCompany as vi.MockedFunction<typeof companies.createCompany>)
        .mockResolvedValueOnce(mockCompanies[0])
        .mockResolvedValueOnce(mockCompanies[1])
        .mockResolvedValueOnce(mockCompanies[2]);
        
      // This is the exact request payload from issue #153
      const exampleRequest = {
        companies: [
          {
            name: "Test Company Alpha",
            description: "A test company for batch operations",
            industry: "Technology"
          },
          {
            name: "Test Company Beta",
            description: "Another test company for batch operations",
            industry: "Consulting"
          },
          {
            name: "Test Company Gamma",
            description: "A third test company for batch operations",
            industry: "Manufacturing"
          }
        ]
      };
      
      // Call the function with the example request
      const result = await batchCreateCompanies(exampleRequest);
      
      // Verify results
      expect(result.summary).toEqual({
        total: 3,
        succeeded: 3,
        failed: 0
      });
      
      // Verify each company was created with correct data
      expect(result.results).toHaveLength(3);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].data?.values?.name?.[0]?.value).toBe('Test Company Alpha');
      expect(result.results[1].data?.values?.name?.[0]?.value).toBe('Test Company Beta');
      expect(result.results[2].data?.values?.name?.[0]?.value).toBe('Test Company Gamma');
    });
    
    // Edge case tests for input validation
    describe('Edge Cases', () => {
      it('should reject null params object', async () => {
        await expect(batchCreateCompanies(null as any))
          .rejects.toThrow("Invalid request: params object is required");
      });
      
      it('should reject undefined companies array', async () => {
        await expect(batchCreateCompanies({} as any))
          .rejects.toThrow("Invalid request: 'companies' parameter is required");
      });
      
      it('should reject non-array companies parameter', async () => {
        await expect(batchCreateCompanies({ companies: 'not an array' as any }))
          .rejects.toThrow("Invalid request: 'companies' parameter must be an array");
      });
      
      it('should reject empty companies array', async () => {
        await expect(batchCreateCompanies({ companies: [] }))
          .rejects.toThrow("Invalid request: 'companies' array cannot be empty");
      });
      
      it('should reject companies array with null items', async () => {
        await expect(batchCreateCompanies({ companies: [null] as any }))
          .rejects.toThrow("Invalid company data at index 0: must be a non-null object");
      });
      
      it('should reject companies array with items missing name', async () => {
        await expect(batchCreateCompanies({ 
          companies: [{ description: 'Missing name' }] 
        }))
          .rejects.toThrow("Invalid company data at index 0: 'name' is required");
      });
      
      // Similar tests for batch update
      it('should reject null params object for update', async () => {
        await expect(batchUpdateCompanies(null as any))
          .rejects.toThrow("Invalid request: params object is required");
      });
      
      it('should reject undefined updates array', async () => {
        await expect(batchUpdateCompanies({} as any))
          .rejects.toThrow("Invalid request: 'updates' parameter is required");
      });
      
      it('should reject companies array with items missing required properties', async () => {
        await expect(batchUpdateCompanies({ 
          updates: [{ /* missing id and attributes */ }] as any
        }))
          .rejects.toThrow("Invalid update data at index 0: 'id' is required");
        
        await expect(batchUpdateCompanies({ 
          updates: [{ id: '123' /* missing attributes */ }] as any
        }))
          .rejects.toThrow("Invalid update data at index 0: 'attributes' must be a non-null object");
      });
    });
  });
  
  describe('Batch Configuration', () => {
    it('should respect maxBatchSize configuration', async () => {
      const mockCompany = {
        id: { record_id: '1' },
        values: { name: [{ value: 'Test Company' }] }
      };
      
      (companies.createCompany as vi.MockedFunction<typeof companies.createCompany>)
        .mockResolvedValue(mockCompany);
      
      const companiesData = Array(15).fill(0).map((_, i) => ({
        name: `Company ${i}`
      }));
      
      const result = await batchCreateCompanies({ 
        companies: companiesData, 
        config: { maxBatchSize: 5 } // Should process in 3 chunks 
      });
      
      expect(result.summary.total).toBe(15);
      // The actual chunking is handled by executeBatchOperations
      // which we're mocking, so we can't test the chunking directly
    });
    
    it('should respect continueOnError configuration', async () => {
      (companies.createCompany as vi.MockedFunction<typeof companies.createCompany>)
        .mockResolvedValueOnce({
          id: { record_id: '1' },
          values: { name: [{ value: 'Company 1' }] }
        })
        .mockRejectedValueOnce(new Error('Error on second'))
        .mockResolvedValueOnce({
          id: { record_id: '3' },
          values: { name: [{ value: 'Company 3' }] }
        });
      
      const companiesData = [
        { name: 'Company 1' },
        { name: 'Company 2' }, // This will fail
        { name: 'Company 3' }
      ];
      
      const result = await batchCreateCompanies({
        companies: companiesData,
        config: { continueOnError: true } // Default, but explicit here
      });
      
      expect(result.summary).toEqual({
        total: 3,
        succeeded: 2,
        failed: 1
      });
    });
  });
});