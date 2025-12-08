/**
 * Unit tests for QueryApiService
 * Issue #935: Tests for extracted Query API service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryApiService } from '@/services/search/QueryApiService.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';
import {
  AuthenticationError,
  RateLimitError,
  ResourceNotFoundError,
} from '@/errors/api-errors.js';

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

// Mock filter utilities
vi.mock('@/utils/filters/index.js', () => ({
  createRelationshipQuery: vi.fn(() => ({ filter: { test: 'relationship' } })),
  createTimeframeQuery: vi.fn(() => ({ filter: { test: 'timeframe' } })),
  createContentSearchQuery: vi.fn(() => ({ filter: { test: 'content' } })),
}));

import * as AttioClientModule from '@/api/attio-client.js';

describe('QueryApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('searchByRelationship', () => {
    it('should return records for valid relationship search', async () => {
      const mockRecords = [
        { id: { record_id: 'rec1' } },
        { id: { record_id: 'rec2' } },
      ];
      const mockPost = vi
        .fn()
        .mockResolvedValue({ data: { data: mockRecords } });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      const results = await QueryApiService.searchByRelationship(
        UniversalResourceType.COMPANIES,
        UniversalResourceType.PEOPLE,
        'target-uuid-123',
        10,
        0
      );

      expect(results).toEqual(mockRecords);
      expect(mockPost).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({ limit: 10, offset: 0 })
      );
    });

    it('should return empty array for ResourceNotFoundError', async () => {
      const mockPost = vi.fn().mockRejectedValue({
        response: { status: 404, data: { error: 'Not found' } },
      });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      const results = await QueryApiService.searchByRelationship(
        UniversalResourceType.COMPANIES,
        UniversalResourceType.PEOPLE,
        'invalid-uuid'
      );

      expect(results).toEqual([]);
    });

    it('should throw AuthenticationError on 401', async () => {
      const mockPost = vi.fn().mockRejectedValue({
        response: { status: 401, data: { error: 'Unauthorized' } },
      });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      await expect(
        QueryApiService.searchByRelationship(
          UniversalResourceType.COMPANIES,
          UniversalResourceType.PEOPLE,
          'uuid'
        )
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
        QueryApiService.searchByRelationship(
          UniversalResourceType.COMPANIES,
          UniversalResourceType.PEOPLE,
          'uuid'
        )
      ).rejects.toThrow(RateLimitError);
    });
  });

  describe('searchByTimeframe', () => {
    it('should return records for valid timeframe search', async () => {
      const mockRecords = [{ id: { record_id: 'rec1' } }];
      const mockPost = vi
        .fn()
        .mockResolvedValue({ data: { data: mockRecords } });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      const results = await QueryApiService.searchByTimeframe(
        UniversalResourceType.COMPANIES,
        {
          resourceType: UniversalResourceType.COMPANIES,
          attribute: 'created_at',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          operator: 'between',
        },
        10,
        0
      );

      expect(results).toEqual(mockRecords);
    });

    it('should return empty array on not found', async () => {
      const mockPost = vi.fn().mockRejectedValue({
        response: { status: 404, data: { error: 'Not found' } },
      });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      const results = await QueryApiService.searchByTimeframe(
        UniversalResourceType.COMPANIES,
        {
          resourceType: UniversalResourceType.COMPANIES,
          attribute: 'created_at',
          operator: 'between',
        }
      );

      expect(results).toEqual([]);
    });
  });

  describe('searchByContent', () => {
    it('should return records for valid content search', async () => {
      const mockRecords = [{ id: { record_id: 'rec1' } }];
      const mockPost = vi
        .fn()
        .mockResolvedValue({ data: { data: mockRecords } });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      const results = await QueryApiService.searchByContent(
        UniversalResourceType.COMPANIES,
        'test query',
        ['name', 'description'],
        true,
        10,
        0
      );

      expect(results).toEqual(mockRecords);
    });

    it('should use default fields when none provided', async () => {
      const mockRecords = [{ id: { record_id: 'rec1' } }];
      const mockPost = vi
        .fn()
        .mockResolvedValue({ data: { data: mockRecords } });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      const results = await QueryApiService.searchByContent(
        UniversalResourceType.COMPANIES,
        'test query'
      );

      expect(results).toEqual(mockRecords);
    });

    it('should use correct default fields for people', async () => {
      const mockRecords = [{ id: { record_id: 'rec1' } }];
      const mockPost = vi
        .fn()
        .mockResolvedValue({ data: { data: mockRecords } });
      vi.mocked(AttioClientModule.getAttioClient).mockReturnValue({
        post: mockPost,
      } as any);

      const results = await QueryApiService.searchByContent(
        UniversalResourceType.PEOPLE,
        'john'
      );

      expect(results).toEqual(mockRecords);
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
        QueryApiService.searchByContent(
          UniversalResourceType.COMPANIES,
          'test query'
        )
      ).rejects.toThrow(ServerError);
    });
  });
});
