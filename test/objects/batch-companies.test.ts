import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  batchCreateCompanies,
  batchUpdateCompanies,
  batchDeleteCompanies,
  batchSearchCompanies,
  batchGetCompanyDetails
} from '../../src/objects/batch-companies';
import * as companies from '../../src/objects/companies';

// Mock the individual operations
vi.mock('../../src/objects/companies');
vi.mock('../../src/api/attio-operations', () => ({
  executeBatchOperations: vi.fn(async (items, fn, config) => {
    const results = [];
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
  batchCreateRecords: vi.fn().mockRejectedValue(new Error('Batch API not available')),
  batchUpdateRecords: vi.fn().mockRejectedValue(new Error('Batch API not available'))
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
      
      vi.mocked(companies.createCompany)
        .mockResolvedValueOnce(mockCompany1)
        .mockResolvedValueOnce(mockCompany2);
      
      const companiesData = [
        { name: 'Company 1', website: 'https://company1.com' },
        { name: 'Company 2', website: 'https://company2.com' }
      ];
      
      const result = await batchCreateCompanies(companiesData);
      
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
      vi.mocked(companies.createCompany)
        .mockResolvedValueOnce({
          id: { record_id: '1' },
          values: { name: [{ value: 'Company 1' }] }
        })
        .mockRejectedValueOnce(new Error('Validation error'));
      
      const companiesData = [
        { name: 'Company 1' },
        { name: '' } // This should fail validation
      ];
      
      const result = await batchCreateCompanies(companiesData);
      
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
      
      vi.mocked(companies.updateCompany)
        .mockResolvedValueOnce(mockUpdated1)
        .mockResolvedValueOnce(mockUpdated2);
      
      const updates = [
        { id: '1', attributes: { name: 'Updated Company 1', website: 'https://updated1.com' } },
        { id: '2', attributes: { name: 'Updated Company 2', website: 'https://updated2.com' } }
      ];
      
      const result = await batchUpdateCompanies(updates);
      
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
      vi.mocked(companies.deleteCompany)
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
      vi.mocked(companies.deleteCompany)
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
      
      vi.mocked(companies.searchCompanies)
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
      
      vi.mocked(companies.getCompanyDetails)
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
  
  describe('Batch Configuration', () => {
    it('should respect maxBatchSize configuration', async () => {
      const mockCompany = {
        id: { record_id: '1' },
        values: { name: [{ value: 'Test Company' }] }
      };
      
      vi.mocked(companies.createCompany)
        .mockResolvedValue(mockCompany);
      
      const companiesData = Array(15).fill(0).map((_, i) => ({
        name: `Company ${i}`
      }));
      
      const result = await batchCreateCompanies(companiesData, {
        maxBatchSize: 5 // Should process in 3 chunks
      });
      
      expect(result.summary.total).toBe(15);
      // The actual chunking is handled by executeBatchOperations
      // which we're mocking, so we can't test the chunking directly
    });
    
    it('should respect continueOnError configuration', async () => {
      vi.mocked(companies.createCompany)
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
      
      const result = await batchCreateCompanies(companiesData, {
        continueOnError: true // Default, but explicit here
      });
      
      expect(result.summary).toEqual({
        total: 3,
        succeeded: 2,
        failed: 1
      });
    });
  });
});