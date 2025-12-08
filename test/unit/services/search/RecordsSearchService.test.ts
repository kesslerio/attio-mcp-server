/**
 * Unit tests for RecordsSearchService
 * Issue #935: Tests for extracted records search service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecordsSearchService } from '@/services/search/RecordsSearchService.js';
import { AuthenticationError, RateLimitError } from '@/errors/api-errors.js';

// Mock the Attio client module
vi.mock('@/api/attio-client.js', () => ({
  getAttioClient: vi.fn(() => ({
    post: vi.fn(),
  })),
}));

vi.mock('@/api/lazy-client.js', () => ({
  getLazyAttioClient: vi.fn(() => ({
    post: vi.fn(),
  })),
}));

// Mock listObjectRecords
vi.mock('@/objects/records/index.js', () => ({
  listObjectRecords: vi.fn().mockResolvedValue([]),
}));

// Mock ValidationService
vi.mock('@/services/ValidationService.js', () => ({
  ValidationService: {
    validateUUIDForSearch: vi.fn((uuid: string) => {
      // Simple UUID validation for tests
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        uuid
      );
    }),
  },
}));

import * as AttioClientModule from '@/api/attio-client.js';
import { listObjectRecords } from '@/objects/records/index.js';
import { ValidationService } from '@/services/ValidationService.js';

describe('RecordsSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('searchRecordsObjectType', () => {
    it('should return records from listObjectRecords', async () => {
      const mockRecords = [{ id: { record_id: 'rec1' } }];
      vi.mocked(listObjectRecords).mockResolvedValue(mockRecords as any);

      const results = await RecordsSearchService.searchRecordsObjectType(10, 0);

      expect(results).toEqual(mockRecords);
      expect(listObjectRecords).toHaveBeenCalledWith('records', {
        pageSize: 10,
        page: 1,
      });
    });

    it('should return empty array for invalid list_membership UUID', async () => {
      const results = await RecordsSearchService.searchRecordsObjectType(
        10,
        0,
        {
          list_membership: 'invalid-uuid',
        }
      );

      expect(results).toEqual([]);
      expect(listObjectRecords).not.toHaveBeenCalled();
    });

    it('should calculate correct page number from offset', async () => {
      const mockRecords = [{ id: { record_id: 'rec1' } }];
      vi.mocked(listObjectRecords).mockResolvedValue(mockRecords as any);

      await RecordsSearchService.searchRecordsObjectType(10, 20);

      expect(listObjectRecords).toHaveBeenCalledWith('records', {
        pageSize: 10,
        page: 3, // (20 / 10) + 1 = 3
      });
    });
  });

  describe('searchCustomObject', () => {
    it('should return records for custom object search', async () => {
      const mockRecords = [{ id: { record_id: 'custom1' } }];
      const mockPost = vi
        .fn()
        .mockResolvedValue({ data: { data: mockRecords } });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      const results = await RecordsSearchService.searchCustomObject(
        'funds',
        20,
        0
      );

      expect(results).toEqual(mockRecords);
      expect(mockPost).toHaveBeenCalledWith('/objects/funds/records/query', {
        limit: 20,
      });
    });

    it('should include offset in request when provided', async () => {
      const mockRecords = [{ id: { record_id: 'custom1' } }];
      const mockPost = vi
        .fn()
        .mockResolvedValue({ data: { data: mockRecords } });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      await RecordsSearchService.searchCustomObject('funds', 20, 10);

      expect(mockPost).toHaveBeenCalledWith('/objects/funds/records/query', {
        limit: 20,
        offset: 10,
      });
    });

    it('should forward filters to request body', async () => {
      const mockRecords = [{ id: { record_id: 'custom1' } }];
      const mockPost = vi
        .fn()
        .mockResolvedValue({ data: { data: mockRecords } });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      const filters = { status: 'active', category: 'tech' };
      await RecordsSearchService.searchCustomObject('funds', 20, 0, filters);

      expect(mockPost).toHaveBeenCalledWith('/objects/funds/records/query', {
        limit: 20,
        filter: filters,
      });
    });

    it('should return empty array for invalid list_membership UUID', async () => {
      const results = await RecordsSearchService.searchCustomObject(
        'funds',
        20,
        0,
        {
          list_membership: 'invalid-uuid',
        }
      );

      expect(results).toEqual([]);
    });

    it('should exclude list_membership from filter object', async () => {
      const mockRecords = [{ id: { record_id: 'custom1' } }];
      const mockPost = vi
        .fn()
        .mockResolvedValue({ data: { data: mockRecords } });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);
      vi.mocked(ValidationService.validateUUIDForSearch).mockReturnValue(true);

      const filters = {
        list_membership: '550e8400-e29b-41d4-a716-446655440000',
        status: 'active',
      };
      await RecordsSearchService.searchCustomObject('funds', 20, 0, filters);

      expect(mockPost).toHaveBeenCalledWith('/objects/funds/records/query', {
        limit: 20,
        filter: { status: 'active' },
      });
    });

    it('should throw ServerError on 500', async () => {
      const { ServerError } = await import('@/errors/api-errors.js');
      const mockPost = vi.fn().mockRejectedValue({
        response: { status: 500, data: { error: 'Server error' } },
      });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      await expect(
        RecordsSearchService.searchCustomObject('funds', 20, 0)
      ).rejects.toThrow(ServerError);
    });

    it('should throw AuthenticationError on 401', async () => {
      const mockPost = vi.fn().mockRejectedValue({
        response: { status: 401, data: { error: 'Unauthorized' } },
      });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      await expect(
        RecordsSearchService.searchCustomObject('funds', 20, 0)
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw RateLimitError on 429', async () => {
      const mockPost = vi.fn().mockRejectedValue({
        response: { status: 429, data: { error: 'Rate limited' } },
      });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      await expect(
        RecordsSearchService.searchCustomObject('funds', 20, 0)
      ).rejects.toThrow(RateLimitError);
    });
  });
});
