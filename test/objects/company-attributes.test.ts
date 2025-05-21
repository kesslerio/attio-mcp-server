/**
 * Tests for the company attributes functionality
 */
import { getCompanyAttributes } from '../../src/objects/companies/attributes';
import { getCompanyDetails } from '../../src/objects/companies/basic';

// Mock dependencies
jest.mock('../../src/objects/companies/basic', () => ({
  getCompanyDetails: jest.fn(),
  extractCompanyId: jest.fn().mockImplementation(id => id),
}));

describe('Company Attributes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCompanyAttributes', () => {
    it('should return specific attribute value when attributeName is provided', async () => {
      // Mock company details with test data
      (getCompanyDetails as jest.Mock).mockResolvedValue({
        id: { record_id: 'comp_123' },
        values: {
          name: [{ value: 'Test Company' }],
          stage: [{ value: 'Prospect' }],
          industry: [{ value: 'Technology' }]
        }
      });

      // Test retrieving an existing attribute
      const result = await getCompanyAttributes('comp_123', 'stage');
      
      expect(result).toEqual({
        value: 'Prospect',
        company: 'Test Company'
      });
    });

    it('should return all available attributes when attributeName is not provided', async () => {
      // Mock company details with test data
      (getCompanyDetails as jest.Mock).mockResolvedValue({
        id: { record_id: 'comp_123' },
        values: {
          name: [{ value: 'Test Company' }],
          stage: [{ value: 'Prospect' }],
          industry: [{ value: 'Technology' }]
        }
      });

      // Test retrieving all attributes
      const result = await getCompanyAttributes('comp_123');
      
      expect(result).toEqual({
        attributes: ['industry', 'name', 'stage'], // Should be sorted alphabetically
        company: 'Test Company'
      });
    });

    it('should handle errors properly when attribute is not found', async () => {
      // Mock company details with test data
      (getCompanyDetails as jest.Mock).mockResolvedValue({
        id: { record_id: 'comp_123' },
        values: {
          name: [{ value: 'Test Company' }],
          industry: [{ value: 'Technology' }]
        }
      });

      // Test handling when attribute doesn't exist
      await expect(getCompanyAttributes('comp_123', 'non_existent_attribute'))
        .rejects
        .toThrow(/Failed to get company attribute/);
    });

    it('should handle errors from getCompanyDetails', async () => {
      // Mock getCompanyDetails to throw an error
      (getCompanyDetails as jest.Mock).mockRejectedValue(new Error('API error'));

      // Test error handling
      await expect(getCompanyAttributes('comp_123', 'stage'))
        .rejects
        .toThrow(/Failed to get company attribute/);
    });
  });
});