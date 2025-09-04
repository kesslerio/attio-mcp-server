/**
 * Integration tests for timeframe search functionality (Issue #475)
 * Tests the parameter conversion and validation logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UniversalSearchService } from '../../../../src/services/UniversalSearchService.js';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';
import type { UniversalSearchParams } from '../../../../src/handlers/tool-configs/universal/types.js';

// Mock external dependencies
vi.mock('../../../../src/api/attio-client.js');
vi.mock('../../../../src/objects/companies/index.js', () => ({
  advancedSearchCompanies: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../../../src/objects/people/index.js', () => ({
  advancedSearchPeople: vi.fn().mockResolvedValue({ results: [] }),
}));

describe('Timeframe Search Integration', () => {
  const mockDate = new Date('2023-08-15T12:00:00.000Z');
  
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
    vi.clearAllMocks();
    
    // Mock the companies search function
    const mockCompanies = vi.fn().mockResolvedValue([]);
    vi.doMock('../../../../src/objects/companies/index.js', () => ({
      advancedSearchCompanies: mockCompanies,
    }));
    
    // Mock the people search function  
    const mockPeople = vi.fn().mockResolvedValue({ results: [] });
    vi.doMock('../../../../src/objects/people/index.js', () => ({
      advancedSearchPeople: mockPeople,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Date Parameter Validation', () => {
    it('should throw error for invalid date format', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        date_from: 'invalid-date-format',
        date_to: '2023-08-10T23:59:59Z',
      };

      await expect(
        UniversalSearchService.searchRecords(params)
      ).rejects.toThrow('Date parameter validation failed');
    });

    it('should throw error for invalid date range', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        date_from: '2023-08-15T12:00:00Z', // After end date
        date_to: '2023-08-10T23:59:59Z',
      };

      await expect(
        UniversalSearchService.searchRecords(params)
      ).rejects.toThrow('Date parameter validation failed');
    });
  });

  describe('Valid Timeframe Processing', () => {
    it('should successfully process valid timeframe parameters', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        timeframe: 'last_7_days',
        date_field: 'created_at',
      };

      // Should not throw error and should return results (even if empty)
      const results = await UniversalSearchService.searchRecords(params);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should successfully process valid absolute date range', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        date_from: '2023-08-01T00:00:00Z',
        date_to: '2023-08-15T23:59:59Z',
        date_field: 'updated_at',
      };

      // Should not throw error and should return results (even if empty)
      const results = await UniversalSearchService.searchRecords(params);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should prioritize timeframe over absolute dates', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        timeframe: 'yesterday', // Should take precedence
        date_from: '2023-08-01T00:00:00Z', // Should be ignored
        date_to: '2023-08-10T23:59:59Z', // Should be ignored
      };

      // Should not throw error - timeframe should override absolute dates
      const results = await UniversalSearchService.searchRecords(params);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Fallback to Regular Search', () => {
    it('should perform regular search when no timeframe parameters provided', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        query: 'tech company',
        // No timeframe parameters
      };

      const results = await UniversalSearchService.searchRecords(params);

      // Should fall back to regular company search and return results
      expect(Array.isArray(results)).toBe(true);
    });
  });
});