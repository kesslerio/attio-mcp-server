/**
 * Tests for status field operator validation in handleSearchRecords
 *
 * Status fields (stage, status, etc.) only support equality operators.
 * These tests verify that helpful errors are returned for invalid operators.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSearchRecords } from '@attio-mcp/core';
import type { HttpClient } from '@attio-mcp/core';

// Mock HTTP client that should never be called when validation fails
function createMockClient(): HttpClient {
  return {
    get: vi.fn().mockRejectedValue(new Error('Should not be called')),
    post: vi.fn().mockRejectedValue(new Error('Should not be called')),
    patch: vi.fn().mockRejectedValue(new Error('Should not be called')),
    put: vi.fn().mockRejectedValue(new Error('Should not be called')),
    delete: vi.fn().mockRejectedValue(new Error('Should not be called')),
  };
}

describe('Status Field Validation', () => {
  let mockClient: HttpClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe('transformFilterCondition for status fields', () => {
    it('should accept eq operator for stage field', async () => {
      // Reset mock to succeed for valid filter
      mockClient.post = vi.fn().mockResolvedValue({
        data: { data: [] },
      });

      const result = await handleSearchRecords(mockClient, {
        resource_type: 'deals',
        filters: {
          filters: [
            {
              attribute: { slug: 'stage' },
              condition: 'eq',
              value: 'Demo',
            },
          ],
        },
      });

      // Should not return an error for valid operator
      expect(result.isError).toBeFalsy();
      // API should be called with correct filter format
      expect(mockClient.post).toHaveBeenCalledWith(
        '/v2/objects/deals/records/query',
        expect.objectContaining({
          filter: {
            $and: [{ stage: { $eq: 'Demo' } }],
          },
        })
      );
    });

    it('should throw error for contains operator on stage field', async () => {
      const result = await handleSearchRecords(mockClient, {
        resource_type: 'deals',
        filters: {
          filters: [
            {
              attribute: { slug: 'stage' },
              condition: 'contains',
              value: 'Demo',
            },
          ],
        },
      });

      // Should return error before hitting API
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Status field "stage" only supports equality operators'
      );
      expect(result.content[0].text).toContain('eq/equals');
      expect(result.content[0].text).toContain('contains');

      // API should NOT have been called
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should throw error for starts_with operator on stage field', async () => {
      const result = await handleSearchRecords(mockClient, {
        resource_type: 'deals',
        filters: {
          filters: [
            {
              attribute: { slug: 'stage' },
              condition: 'starts_with',
              value: 'Demo',
            },
          ],
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('stage');
      expect(result.content[0].text).toContain('eq/equals');
      expect(result.content[0].text).toContain('starts_with');

      // API should NOT have been called
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should accept equals operator for status field', async () => {
      mockClient.post = vi.fn().mockResolvedValue({
        data: { data: [] },
      });

      const result = await handleSearchRecords(mockClient, {
        resource_type: 'deals',
        filters: {
          filters: [
            {
              attribute: { slug: 'status' },
              condition: 'equals',
              value: 'Active',
            },
          ],
        },
      });

      expect(result.isError).toBeFalsy();
      expect(mockClient.post).toHaveBeenCalled();
    });
  });

  describe('actor-reference fields still work', () => {
    it('should transform owner field to actor-reference format', async () => {
      mockClient.post = vi.fn().mockResolvedValue({
        data: { data: [] },
      });

      await handleSearchRecords(mockClient, {
        resource_type: 'deals',
        filters: {
          filters: [
            {
              attribute: { slug: 'owner' },
              condition: 'eq',
              value: 'user-id-123',
            },
          ],
        },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/v2/objects/deals/records/query',
        expect.objectContaining({
          filter: {
            $and: [
              {
                owner: {
                  referenced_actor_type: 'workspace-member',
                  referenced_actor_id: 'user-id-123',
                },
              },
            ],
          },
        })
      );
    });
  });

  describe('regular fields still work', () => {
    it('should allow contains operator on text fields', async () => {
      mockClient.post = vi.fn().mockResolvedValue({
        data: { data: [] },
      });

      await handleSearchRecords(mockClient, {
        resource_type: 'companies',
        filters: {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: 'contains',
              value: 'Acme',
            },
          ],
        },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/v2/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            $and: [{ name: { $contains: 'Acme' } }],
          },
        })
      );
    });
  });

  describe('combined filters with status and owner', () => {
    it('should validate status operator while processing owner correctly', async () => {
      const result = await handleSearchRecords(mockClient, {
        resource_type: 'deals',
        filters: {
          filters: [
            {
              attribute: { slug: 'owner' },
              condition: 'eq',
              value: 'user-123',
            },
            {
              attribute: { slug: 'stage' },
              condition: 'contains', // Invalid for status field
              value: 'Demo',
            },
          ],
        },
      });

      // Should fail on the invalid stage filter
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('stage');
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should process combined valid filters correctly', async () => {
      mockClient.post = vi.fn().mockResolvedValue({
        data: { data: [] },
      });

      await handleSearchRecords(mockClient, {
        resource_type: 'deals',
        filters: {
          filters: [
            {
              attribute: { slug: 'owner' },
              condition: 'eq',
              value: 'user-123',
            },
            {
              attribute: { slug: 'stage' },
              condition: 'eq', // Valid for status field
              value: 'Demo',
            },
          ],
        },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/v2/objects/deals/records/query',
        expect.objectContaining({
          filter: {
            $and: [
              {
                owner: {
                  referenced_actor_type: 'workspace-member',
                  referenced_actor_id: 'user-123',
                },
              },
              { stage: { $eq: 'Demo' } },
            ],
          },
        })
      );
    });
  });

  describe('operator alias normalization', () => {
    it('should transform "equals" alias to $eq', async () => {
      mockClient.post = vi.fn().mockResolvedValue({
        data: { data: [] },
      });

      await handleSearchRecords(mockClient, {
        resource_type: 'companies',
        filters: {
          filters: [
            {
              attribute: { slug: 'city' },
              condition: 'equals', // Alias for eq
              value: 'Austin',
            },
          ],
        },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/v2/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            $and: [{ city: { $eq: 'Austin' } }],
          },
        })
      );
    });

    it('should transform "is" alias to $eq', async () => {
      mockClient.post = vi.fn().mockResolvedValue({
        data: { data: [] },
      });

      await handleSearchRecords(mockClient, {
        resource_type: 'companies',
        filters: {
          filters: [
            {
              attribute: { slug: 'city' },
              condition: 'is', // Alias for eq
              value: 'Austin',
            },
          ],
        },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/v2/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            $and: [{ city: { $eq: 'Austin' } }],
          },
        })
      );
    });

    it('should strip leading $ and not double-prefix', async () => {
      mockClient.post = vi.fn().mockResolvedValue({
        data: { data: [] },
      });

      await handleSearchRecords(mockClient, {
        resource_type: 'companies',
        filters: {
          filters: [
            {
              attribute: { slug: 'city' },
              condition: '$eq', // User included $ prefix
              value: 'Austin',
            },
          ],
        },
      });

      // Should be $eq, not $$eq
      expect(mockClient.post).toHaveBeenCalledWith(
        '/v2/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            $and: [{ city: { $eq: 'Austin' } }],
          },
        })
      );
    });

    it('should transform "$contains" to $contains (strip $, keep operator)', async () => {
      mockClient.post = vi.fn().mockResolvedValue({
        data: { data: [] },
      });

      await handleSearchRecords(mockClient, {
        resource_type: 'companies',
        filters: {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: '$contains', // User included $ prefix
              value: 'Acme',
            },
          ],
        },
      });

      // Should be $contains, not $$contains
      expect(mockClient.post).toHaveBeenCalledWith(
        '/v2/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            $and: [{ name: { $contains: 'Acme' } }],
          },
        })
      );
    });

    it('should be case-insensitive for aliases', async () => {
      mockClient.post = vi.fn().mockResolvedValue({
        data: { data: [] },
      });

      await handleSearchRecords(mockClient, {
        resource_type: 'companies',
        filters: {
          filters: [
            {
              attribute: { slug: 'city' },
              condition: 'EQUALS', // Uppercase alias
              value: 'Austin',
            },
          ],
        },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/v2/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            $and: [{ city: { $eq: 'Austin' } }],
          },
        })
      );
    });

    it('should normalize "equals" for status fields and allow it', async () => {
      mockClient.post = vi.fn().mockResolvedValue({
        data: { data: [] },
      });

      const result = await handleSearchRecords(mockClient, {
        resource_type: 'deals',
        filters: {
          filters: [
            {
              attribute: { slug: 'stage' },
              condition: 'equals', // Alias for eq - should work for status fields
              value: 'Demo',
            },
          ],
        },
      });

      expect(result.isError).toBeFalsy();
      expect(mockClient.post).toHaveBeenCalledWith(
        '/v2/objects/deals/records/query',
        expect.objectContaining({
          filter: {
            $and: [{ stage: { $eq: 'Demo' } }],
          },
        })
      );
    });
  });
});
