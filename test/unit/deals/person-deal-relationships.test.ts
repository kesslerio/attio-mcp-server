/**
 * Unit tests for person-to-deals relationship functionality - Issue #747
 */
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { searchDealsByPerson } from '../../../src/objects/deals/relationships.js';

// Mock the lazy client
vi.mock('../../../src/api/lazy-client.js', () => ({
  getLazyAttioClient: vi.fn(),
}));

// Mock the validation utilities
vi.mock('../../../src/utils/filters/index.js', () => ({
  validateNumericParam: vi.fn((value, name, defaultValue) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseInt(value, 10) || defaultValue;
    return defaultValue;
  }),
}));

import { getLazyAttioClient } from '../../../src/api/lazy-client.js';

describe('Person-to-Deals Relationship Search - Issue #747', () => {
  const mockPersonId = 'person-123';
  const mockClient = {
    post: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getLazyAttioClient as Mock).mockReturnValue(mockClient);
  });

  describe('searchDealsByPerson', () => {
    it('should search for deals associated with a person', async () => {
      const mockDeals = [
        {
          id: { record_id: 'deal-1' },
          values: {
            title: [{ value: 'Deal One' }],
            associated_people: [{ target_record_id: mockPersonId }],
          },
        },
        {
          id: { record_id: 'deal-2' },
          values: {
            title: [{ value: 'Deal Two' }],
            associated_people: [{ target_record_id: mockPersonId }],
          },
        },
      ];

      mockClient.post.mockResolvedValue({
        data: { data: mockDeals },
      });

      const result = await searchDealsByPerson(mockPersonId);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/objects/deals/records/query',
        {
          filter: {
            associated_people: {
              target_object: 'people',
              target_record_id: mockPersonId,
            },
          },
          limit: 20,
          offset: 0,
        }
      );

      expect(result).toEqual(mockDeals);
    });

    it('should handle custom limit and offset parameters', async () => {
      const mockDeals = [];
      mockClient.post.mockResolvedValue({
        data: { data: mockDeals },
      });

      await searchDealsByPerson(mockPersonId, 50, 10);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/objects/deals/records/query',
        {
          filter: {
            associated_people: {
              target_object: 'people',
              target_record_id: mockPersonId,
            },
          },
          limit: 50,
          offset: 10,
        }
      );
    });

    it('should handle string limit and offset parameters', async () => {
      const mockDeals = [];
      mockClient.post.mockResolvedValue({
        data: { data: mockDeals },
      });

      await searchDealsByPerson(mockPersonId, '30', '5');

      expect(mockClient.post).toHaveBeenCalledWith(
        '/objects/deals/records/query',
        {
          filter: {
            associated_people: {
              target_object: 'people',
              target_record_id: mockPersonId,
            },
          },
          limit: 30,
          offset: 5,
        }
      );
    });

    it('should return empty array when no deals found', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: [] },
      });

      const result = await searchDealsByPerson(mockPersonId);

      expect(result).toEqual([]);
    });

    it('should return empty array when response data is null', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: null },
      });

      const result = await searchDealsByPerson(mockPersonId);

      expect(result).toEqual([]);
    });

    it('should return empty array when response is malformed', async () => {
      mockClient.post.mockResolvedValue({});

      const result = await searchDealsByPerson(mockPersonId);

      expect(result).toEqual([]);
    });

    it('should throw FilterValidationError for invalid person ID', async () => {
      await expect(searchDealsByPerson('')).rejects.toThrow(
        'Person ID must be a non-empty string'
      );
      await expect(searchDealsByPerson('   ')).rejects.toThrow(
        'Person ID must be a non-empty string'
      );
    });

    it('should throw FilterValidationError for non-string person ID', async () => {
      // @ts-expect-error Testing invalid input
      await expect(searchDealsByPerson(null)).rejects.toThrow(
        'Person ID must be a non-empty string'
      );
      // @ts-expect-error Testing invalid input
      await expect(searchDealsByPerson(123)).rejects.toThrow(
        'Person ID must be a non-empty string'
      );
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error');
      mockClient.post.mockRejectedValue(apiError);

      await expect(searchDealsByPerson(mockPersonId)).rejects.toThrow(
        'Failed to search deals by person: API Error'
      );
    });

    it('should preserve FilterValidationErrors', async () => {
      const validationError = new Error('Invalid filter');
      validationError.name = 'FilterValidationError';
      mockClient.post.mockRejectedValue(validationError);

      await expect(searchDealsByPerson(mockPersonId)).rejects.toThrow(
        'Invalid filter'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle deals with multiple associated people', async () => {
      const mockDeals = [
        {
          id: { record_id: 'deal-1' },
          values: {
            title: [{ value: 'Shared Deal' }],
            associated_people: [
              { target_record_id: mockPersonId },
              { target_record_id: 'person-456' },
            ],
          },
        },
      ];

      mockClient.post.mockResolvedValue({
        data: { data: mockDeals },
      });

      const result = await searchDealsByPerson(mockPersonId);

      expect(result).toEqual(mockDeals);
      expect(mockClient.post).toHaveBeenCalledWith(
        '/objects/deals/records/query',
        {
          filter: {
            associated_people: {
              target_object: 'people',
              target_record_id: mockPersonId,
            },
          },
          limit: 20,
          offset: 0,
        }
      );
    });

    it('should handle deals with complex value structures', async () => {
      const mockDeals = [
        {
          id: { record_id: 'deal-1' },
          values: {
            title: [{ value: 'Complex Deal' }],
            stage: [{ value: 'negotiation' }],
            value: [{ value: 50000 }],
            associated_people: [{ target_record_id: mockPersonId }],
            associated_company: { target_record_id: 'company-789' },
          },
        },
      ];

      mockClient.post.mockResolvedValue({
        data: { data: mockDeals },
      });

      const result = await searchDealsByPerson(mockPersonId);

      expect(result).toEqual(mockDeals);
    });
  });
});
