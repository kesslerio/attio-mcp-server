/**
 * Unit tests for ListConfigurationValidator.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ListConfigurationValidator,
  invalidateObjectCache,
} from '@/services/lists/ListConfigurationValidator.js';
import {
  IMMUTABLE_LIST_FIELDS,
  ListErrorCategory,
  normalizeListResponse,
} from '@/services/lists/types.js';
import type { AttioList } from '@/types/attio.js';

// Mock the lazy client to control workspace object responses
vi.mock('@/api/lazy-client.js', () => ({
  getLazyAttioClient: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

import { getLazyAttioClient } from '@/api/lazy-client.js';

describe('ListConfigurationValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateObjectCache();
  });

  // --- validateParentObject ---

  describe('validateParentObject', () => {
    it('rejects empty or non-string parent_object', async () => {
      await expect(
        ListConfigurationValidator.validateParentObject('')
      ).rejects.toThrow('parent_object is required');
    });

    it('rejects invalid parent_object with list of valid options', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        data: {
          data: [
            { api_slug: 'companies' },
            { api_slug: 'people' },
            { slug: 'deals' },
          ],
        },
      });
      vi.mocked(getLazyAttioClient).mockReturnValue({
        get: mockGet,
      } as never);

      await expect(
        ListConfigurationValidator.validateParentObject('invalid_object')
      ).rejects.toThrow('Invalid parent_object "invalid_object"');

      try {
        await ListConfigurationValidator.validateParentObject('invalid_object');
      } catch (e: unknown) {
        const err = e as { suggestion?: string };
        expect(err.suggestion).toContain('companies');
        expect(err.suggestion).toContain('people');
      }
    });

    it('passes for valid parent_object', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        data: {
          data: [{ api_slug: 'companies' }, { api_slug: 'people' }],
        },
      });
      vi.mocked(getLazyAttioClient).mockReturnValue({
        get: mockGet,
      } as never);

      const result =
        await ListConfigurationValidator.validateParentObject('companies');
      expect(result).toBe('companies');
    });

    it('allows through when workspace objects fetch fails', async () => {
      const mockGet = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.mocked(getLazyAttioClient).mockReturnValue({
        get: mockGet,
      } as never);

      // Should not throw — let API reject instead
      const result =
        await ListConfigurationValidator.validateParentObject('companies');
      expect(result).toBe('companies');
    });

    it('uses cache on subsequent calls', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        data: {
          data: [{ api_slug: 'companies' }],
        },
      });
      vi.mocked(getLazyAttioClient).mockReturnValue({
        get: mockGet,
      } as never);

      await ListConfigurationValidator.validateParentObject('companies');
      await ListConfigurationValidator.validateParentObject('companies');

      // Only one API call due to caching
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('paginates when workspace has >200 objects', async () => {
      // First page: 200 items (full page → hasMore)
      const page1 = Array.from({ length: 200 }, (_, i) => ({
        api_slug: `obj_${i}`,
      }));
      // Second page: 5 items (partial → done)
      const page2 = [
        { api_slug: 'companies' },
        { api_slug: 'people' },
        { api_slug: 'deals' },
        { api_slug: 'custom_obj_1' },
        { api_slug: 'custom_obj_2' },
      ];

      const mockGet = vi
        .fn()
        .mockResolvedValueOnce({ data: { data: page1 } })
        .mockResolvedValueOnce({ data: { data: page2 } });

      vi.mocked(getLazyAttioClient).mockReturnValue({
        get: mockGet,
      } as never);

      const result =
        await ListConfigurationValidator.validateParentObject('companies');
      expect(result).toBe('companies');

      // Two API calls: page 1 + page 2
      expect(mockGet).toHaveBeenCalledTimes(2);
      // Verify offset was passed for pagination
      expect(mockGet).toHaveBeenNthCalledWith(2, '/objects', {
        params: { limit: 200, offset: 200 },
      });
    });
  });

  // --- detectImmutableFields ---

  describe('detectImmutableFields', () => {
    it('passes when no immutable fields are present', () => {
      expect(() =>
        ListConfigurationValidator.detectImmutableFields({ name: 'New Name' })
      ).not.toThrow();
    });

    it('rejects parent_object as immutable', () => {
      expect(() =>
        ListConfigurationValidator.detectImmutableFields({
          parent_object: 'people',
        })
      ).toThrow('Cannot update immutable field(s): parent_object');
    });

    it('error includes suggestion to create new list', () => {
      try {
        ListConfigurationValidator.detectImmutableFields({
          parent_object: 'people',
        });
      } catch (e: unknown) {
        const err = e as { suggestion?: string };
        expect(err.suggestion).toContain('create a new list');
      }
    });

    it('handles null/undefined attributes gracefully', () => {
      expect(() =>
        ListConfigurationValidator.detectImmutableFields(null as never)
      ).not.toThrow();
      expect(() =>
        ListConfigurationValidator.detectImmutableFields(undefined as never)
      ).not.toThrow();
    });

    it('IMMUTABLE_LIST_FIELDS contains parent_object', () => {
      expect(IMMUTABLE_LIST_FIELDS.has('parent_object')).toBe(true);
    });
  });

  // --- expandTemplate ---

  describe('expandTemplate', () => {
    it('delegates to list-templates expandTemplate', () => {
      const result = ListConfigurationValidator.expandTemplate(
        'sales_pipeline',
        {
          name: 'My Pipeline',
        }
      );
      expect(result.name).toBe('My Pipeline');
      expect(result.parent_object).toBe('companies');
    });

    it('throws for unknown template', () => {
      expect(() =>
        ListConfigurationValidator.expandTemplate('nonexistent')
      ).toThrow('Unknown template');
    });
  });

  // --- normalizeResponse ---

  describe('normalizeResponse', () => {
    const rawList: AttioList = {
      id: { list_id: 'list-123' },
      title: 'My List',
      name: 'My List',
      object_slug: 'companies',
      workspace_id: 'ws-456',
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
      entry_count: 10,
      description: 'A test list',
    };

    it('returns normalized shape with list_id, name, parent_object', () => {
      const result = ListConfigurationValidator.normalizeResponse(rawList);
      expect(result.list_id).toBe('list-123');
      expect(result.name).toBe('My List');
      expect(result.parent_object).toBe('companies');
    });

    it('includes fields_summary with non-metadata fields', () => {
      const result = ListConfigurationValidator.normalizeResponse(rawList);
      expect(result.fields_summary).toBeDefined();
      expect(result.fields_summary.description).toBe('A test list');
      // Metadata fields excluded
      expect('id' in result.fields_summary).toBe(false);
      expect('workspace_id' in result.fields_summary).toBe(false);
    });

    it('includes dry_run flag when set', () => {
      const result = ListConfigurationValidator.normalizeResponse(
        rawList,
        true
      );
      expect(result.dry_run).toBe(true);
    });

    it('omits dry_run when not set', () => {
      const result = ListConfigurationValidator.normalizeResponse(rawList);
      expect(result.dry_run).toBeUndefined();
    });

    it('falls back to title when name is absent', () => {
      const noName = { ...rawList, name: undefined };
      const result = ListConfigurationValidator.normalizeResponse(noName);
      expect(result.name).toBe('My List'); // title fallback
    });
  });

  // --- categorizeError ---

  describe('categorizeError', () => {
    it('categorizes 403 as permission_failure', () => {
      const error = { message: 'Forbidden', response: { status: 403 } };
      const result = ListConfigurationValidator.categorizeError(error);
      expect(result.category).toBe(ListErrorCategory.PERMISSION_FAILURE);
      expect(result.suggested_next_step).toContain('permissions');
    });

    it('categorizes 401 as token_scope', () => {
      const error = { message: 'Unauthorized', response: { status: 401 } };
      const result = ListConfigurationValidator.categorizeError(error);
      expect(result.category).toBe(ListErrorCategory.TOKEN_SCOPE);
    });

    it('categorizes "Cannot find attribute" as unsupported_input', () => {
      const error = new Error('Cannot find attribute with slug/ID "bad_field"');
      const result = ListConfigurationValidator.categorizeError(error);
      expect(result.category).toBe(ListErrorCategory.UNSUPPORTED_INPUT);
    });

    it('categorizes 400-status errors as unsupported_input', () => {
      const error = {
        message: 'Invalid list attributes: bad request',
        response: { status: 400 },
      };
      const result = ListConfigurationValidator.categorizeError(error);
      expect(result.category).toBe(ListErrorCategory.UNSUPPORTED_INPUT);
    });

    it('categorizes unknown errors as api_failure', () => {
      const error = new Error('Something went wrong');
      const result = ListConfigurationValidator.categorizeError(error);
      expect(result.category).toBe(ListErrorCategory.API_FAILURE);
    });

    it('categorizes AttioApiError with 403 as permission_failure', async () => {
      const { AttioApiError } = await import('@/errors/api-errors.js');
      const error = new AttioApiError('Forbidden', 403, '/lists', 'POST');
      const result = ListConfigurationValidator.categorizeError(error);
      expect(result.category).toBe(ListErrorCategory.PERMISSION_FAILURE);
    });
  });
});

// --- normalizeListResponse standalone tests ---

describe('normalizeListResponse', () => {
  it('handles empty id gracefully', () => {
    const raw = {
      id: {},
      title: 'Test',
      object_slug: 'people',
      workspace_id: 'ws',
      created_at: '',
      updated_at: '',
    } as AttioList;
    const result = normalizeListResponse(raw);
    expect(result.list_id).toBe('');
    expect(result.name).toBe('Test');
  });
});
