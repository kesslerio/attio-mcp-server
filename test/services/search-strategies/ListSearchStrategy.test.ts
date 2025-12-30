/**
 * Unit tests for ListSearchStrategy workspace_id prioritization
 * Issue #1068 - Fix universal tools list format
 * Addresses critical review feedback on operator semantics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListSearchStrategy } from '@/services/search-strategies/ListSearchStrategy.js';
import { AttioList } from '@/types/attio.js';

describe('ListSearchStrategy - workspace_id prioritization', () => {
  let strategy: ListSearchStrategy;

  beforeEach(() => {
    // Create strategy with minimal dependencies for unit testing
    strategy = new ListSearchStrategy({
      listFunction: vi.fn(),
    });
  });

  describe('convertListsToRecords - workspace_id extraction', () => {
    it('should prioritize top-level workspace_id over nested when both exist', () => {
      const mockLists: AttioList[] = [
        {
          id: {
            list_id: 'list-123',
            workspace_id: 'ws-nested',
          },
          workspace_id: 'ws-toplevel',
          name: 'Test List',
          title: 'Test List',
          api_slug: 'test-list',
          object_slug: 'companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // Access private method via type assertion for testing
      const result = (strategy as any).convertListsToRecords(mockLists);

      expect(result).toHaveLength(1);
      expect(result[0].workspace_id).toBe('ws-toplevel');
      expect(result[0].id.list_id).toBe('list-123');
    });

    it('should preserve empty string workspace_id when top-level is empty string', () => {
      const mockLists: AttioList[] = [
        {
          id: {
            list_id: 'list-123',
            workspace_id: 'ws-nested',
          },
          workspace_id: '', // Empty string should be preserved
          name: 'Test List',
          title: 'Test List',
          api_slug: 'test-list',
          object_slug: 'companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const result = (strategy as any).convertListsToRecords(mockLists);

      expect(result).toHaveLength(1);
      // Empty string should be preserved, NOT overwritten by nested value
      expect(result[0].workspace_id).toBe('');
      expect(result[0].id.list_id).toBe('list-123');
    });

    it('should fall back to nested workspace_id when top-level is null', () => {
      const mockLists: AttioList[] = [
        {
          id: {
            list_id: 'list-123',
            workspace_id: 'ws-nested',
          },
          workspace_id: null as any, // null should trigger fallback
          name: 'Test List',
          title: 'Test List',
          api_slug: 'test-list',
          object_slug: 'companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const result = (strategy as any).convertListsToRecords(mockLists);

      expect(result).toHaveLength(1);
      // null should fall back to nested value
      expect(result[0].workspace_id).toBe('ws-nested');
      expect(result[0].id.list_id).toBe('list-123');
    });

    it('should fall back to nested workspace_id when top-level is undefined', () => {
      const mockLists: AttioList[] = [
        {
          id: {
            list_id: 'list-123',
            workspace_id: 'ws-nested',
          },
          // workspace_id is undefined (not present)
          name: 'Test List',
          title: 'Test List',
          api_slug: 'test-list',
          object_slug: 'companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const result = (strategy as any).convertListsToRecords(mockLists);

      expect(result).toHaveLength(1);
      // undefined should fall back to nested value
      expect(result[0].workspace_id).toBe('ws-nested');
      expect(result[0].id.list_id).toBe('list-123');
    });

    it('should handle missing workspace_id in both locations', () => {
      const mockLists: AttioList[] = [
        {
          id: {
            list_id: 'list-123',
            // No workspace_id in id
          },
          // No top-level workspace_id
          name: 'Test List',
          title: 'Test List',
          api_slug: 'test-list',
          object_slug: 'companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const result = (strategy as any).convertListsToRecords(mockLists);

      expect(result).toHaveLength(1);
      // When both are undefined, workspace_id should not be set
      expect(result[0].workspace_id).toBeUndefined();
      expect(result[0].id.list_id).toBe('list-123');
    });

    it('should preserve all other list fields during transformation', () => {
      const mockLists: AttioList[] = [
        {
          id: {
            list_id: 'list-123',
            workspace_id: 'ws-nested',
          },
          workspace_id: 'ws-toplevel',
          name: 'Test List',
          title: 'Test List Title',
          api_slug: 'test-list',
          object_slug: 'companies',
          description: 'Test description',
          entry_count: 42,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          custom_field: 'custom_value',
        },
      ];

      const result = (strategy as any).convertListsToRecords(mockLists);

      expect(result).toHaveLength(1);
      const list = result[0];

      // Verify all fields are preserved
      expect(list.workspace_id).toBe('ws-toplevel');
      expect(list.name).toBe('Test List');
      expect(list.title).toBe('Test List Title');
      expect(list.api_slug).toBe('test-list');
      expect(list.object_slug).toBe('companies');
      expect(list.description).toBe('Test description');
      expect(list.entry_count).toBe(42);
      expect(list.created_at).toBe('2024-01-01T00:00:00Z');
      expect(list.updated_at).toBe('2024-01-02T00:00:00Z');
      expect((list as any).custom_field).toBe('custom_value');
    });

    it('should use name field with fallback to title', () => {
      const mockListsWithName: AttioList[] = [
        {
          id: { list_id: 'list-1' },
          name: 'Custom Name',
          title: 'Different Title',
          api_slug: 'test-list',
          object_slug: 'companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockListsWithoutName: AttioList[] = [
        {
          id: { list_id: 'list-2' },
          title: 'Title Only',
          api_slug: 'test-list',
          object_slug: 'companies',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const resultWithName = (strategy as any).convertListsToRecords(
        mockListsWithName
      );
      const resultWithoutName = (strategy as any).convertListsToRecords(
        mockListsWithoutName
      );

      // When name exists, use it
      expect(resultWithName[0].name).toBe('Custom Name');

      // When name is undefined, fall back to title
      expect(resultWithoutName[0].name).toBe('Title Only');
    });
  });
});
