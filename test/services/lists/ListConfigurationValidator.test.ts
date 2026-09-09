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

  // --- validateAccessControls ---

  describe('validateAccessControls', () => {
    it('passes with workspace_access full-access', () => {
      expect(() =>
        ListConfigurationValidator.validateAccessControls(
          { workspace_access: 'full-access' },
          { enforceFullAccessInvariant: true }
        )
      ).not.toThrow();
    });

    it('passes with a member entry level full-access', () => {
      expect(() =>
        ListConfigurationValidator.validateAccessControls(
          {
            workspace_member_access: [
              {
                workspace_member_id: '11111111-1111-4111-8111-111111111111',
                level: 'full-access',
              },
            ],
          },
          { enforceFullAccessInvariant: true }
        )
      ).not.toThrow();
    });

    it('rejects invalid workspace_access value', () => {
      expect(() =>
        ListConfigurationValidator.validateAccessControls({
          workspace_access: 'invalid-level',
        })
      ).toThrow('Invalid workspace_access');
    });

    it('rejects malformed workspace_member_access entry', () => {
      expect(() =>
        ListConfigurationValidator.validateAccessControls({
          workspace_member_access: [{ workspace_member_id: 'member-1' }],
        })
      ).toThrow('Invalid workspace_member_access entry');
    });

    it('rejects workspace_member_access that is not an array', () => {
      expect(() =>
        ListConfigurationValidator.validateAccessControls({
          workspace_member_access: 'not-an-array',
        })
      ).toThrow('must be an array');
    });

    it('rejects create-time invariant when no full-access grantee exists', () => {
      expect(() =>
        ListConfigurationValidator.validateAccessControls(
          { workspace_access: 'read-only' },
          { enforceFullAccessInvariant: true }
        )
      ).toThrow('full-access');
    });

    it('does not enforce invariant when option is omitted', () => {
      expect(() =>
        ListConfigurationValidator.validateAccessControls({
          workspace_access: 'read-only',
        })
      ).not.toThrow();
    });

    it('handles null/undefined attributes gracefully', () => {
      expect(() =>
        ListConfigurationValidator.validateAccessControls(null as never)
      ).not.toThrow();
      expect(() =>
        ListConfigurationValidator.validateAccessControls(undefined as never)
      ).not.toThrow();
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

    it('categorizes 403 with billing_error code as plan_gating', () => {
      const error = {
        message: 'Billing error',
        response: { status: 403, data: { code: 'billing_error' } },
      };
      const result = ListConfigurationValidator.categorizeError(error);
      expect(result.category).toBe(ListErrorCategory.PLAN_GATING);
      expect(result.suggested_next_step).toContain('plan');
    });

    it('categorizes 403 with insufficient_scopes code as permission_failure', () => {
      const error = {
        message: 'Insufficient scopes',
        response: { status: 403, data: { code: 'insufficient_scopes' } },
      };
      const result = ListConfigurationValidator.categorizeError(error);
      expect(result.category).toBe(ListErrorCategory.PERMISSION_FAILURE);
      expect(result.suggested_next_step).toContain('permissions');
    });

    it('categorizes 403 with no code as permission_failure fallback', () => {
      const error = {
        message: 'Forbidden',
        response: { status: 403, data: {} },
      };
      const result = ListConfigurationValidator.categorizeError(error);
      expect(result.category).toBe(ListErrorCategory.PERMISSION_FAILURE);
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

    it('categorizes AttioApiError with billing_error details as plan_gating', async () => {
      const { AttioApiError } = await import('@/errors/api-errors.js');
      const error = new AttioApiError('Billing error', 403, '/lists', 'POST', {
        code: 'billing_error',
      });
      const result = ListConfigurationValidator.categorizeError(error);
      expect(result.category).toBe(ListErrorCategory.PLAN_GATING);
    });

    it('categorizes UniversalValidationError as unsupported_input, never the retry default (Issue #1148)', async () => {
      const { UniversalValidationError, ErrorType } =
        await import('@/handlers/tool-configs/universal/errors/validation-errors.js');
      const error = new UniversalValidationError(
        'Invalid workspace_access value "bad".',
        ErrorType.USER_ERROR,
        { suggestion: 'Valid values: full-access, read-and-write, read-only.' }
      );
      const result = ListConfigurationValidator.categorizeError(error);
      expect(result.category).toBe(ListErrorCategory.UNSUPPORTED_INPUT);
      expect(result.message).toContain('Valid values');
      expect(result.suggested_next_step).not.toContain('Retry the operation');
    });

    it('preserves PERMISSION_FAILURE for codeless 403 on response-shaped errors (no regression)', () => {
      const error = { message: 'Forbidden', response: { status: 403 } };
      const result = ListConfigurationValidator.categorizeError(error);
      expect(result.category).toBe(ListErrorCategory.PERMISSION_FAILURE);
    });
  });

  // --- normalizeWorkspaceAccess (Issue #1148, R2) ---

  describe('normalizeWorkspaceAccess (pure, never mutates)', () => {
    it('converts the string "null" sentinel to JSON null', () => {
      const attrs: Record<string, unknown> = { workspace_access: 'null' };
      const out = ListConfigurationValidator.normalizeWorkspaceAccess(attrs);
      expect(out.workspace_access).toBeNull();
      expect(attrs.workspace_access).toBe('null'); // input untouched
    });

    it('leaves real JSON null untouched', () => {
      const attrs: Record<string, unknown> = { workspace_access: null };
      const out = ListConfigurationValidator.normalizeWorkspaceAccess(attrs);
      expect(out.workspace_access).toBeNull();
    });

    it('leaves valid enum strings untouched', () => {
      const attrs: Record<string, unknown> = {
        workspace_access: 'read-and-write',
      };
      const out = ListConfigurationValidator.normalizeWorkspaceAccess(attrs);
      expect(out.workspace_access).toBe('read-and-write');
    });

    it('is a no-op when workspace_access is absent', () => {
      const attrs: Record<string, unknown> = { name: 'x' };
      const out = ListConfigurationValidator.normalizeWorkspaceAccess(attrs);
      expect('workspace_access' in out).toBe(false);
    });
  });

  // --- applyAccessDefaults seam (Issue #1148 review fix) ---

  describe('applyAccessDefaults', () => {
    it('create: injects full-access default when neither field provided', () => {
      const out = ListConfigurationValidator.applyAccessDefaults(
        { name: 'x' },
        { surface: 'create' }
      );
      expect(out.workspace_access).toBe('full-access');
    });

    it('create: does NOT inject when member access provided', () => {
      const out = ListConfigurationValidator.applyAccessDefaults(
        {
          workspace_member_access: [
            {
              workspace_member_id: '11111111-1111-4111-8111-111111111111',
              level: 'full-access',
            },
          ],
        },
        { surface: 'create' }
      );
      expect(out.workspace_access).toBeUndefined();
    });

    it('create: normalizes string "null" before the invariant check', () => {
      const out = ListConfigurationValidator.applyAccessDefaults(
        {
          workspace_access: 'null',
          workspace_member_access: [
            {
              workspace_member_id: '11111111-1111-4111-8111-111111111111',
              level: 'full-access',
            },
          ],
        },
        { surface: 'create' }
      );
      expect(out.workspace_access).toBeNull();
    });

    it('create: rejects no full-access grantee', () => {
      expect(() =>
        ListConfigurationValidator.applyAccessDefaults(
          { workspace_access: 'read-only' },
          { surface: 'create' }
        )
      ).toThrow('full-access');
    });

    it('update: no default injection, no invariant', () => {
      const out = ListConfigurationValidator.applyAccessDefaults(
        { workspace_access: 'read-only' },
        { surface: 'update' }
      );
      expect(out.workspace_access).toBe('read-only');
    });

    it('never mutates the input object', () => {
      const input: Record<string, unknown> = { workspace_access: 'null' };
      ListConfigurationValidator.applyAccessDefaults(input, {
        surface: 'update',
      });
      expect(input.workspace_access).toBe('null');
    });

    it('create: default object is a fresh copy (input untouched)', () => {
      const input: Record<string, unknown> = { name: 'x' };
      const out = ListConfigurationValidator.applyAccessDefaults(input, {
        surface: 'create',
      });
      expect(out.workspace_access).toBe('full-access');
      expect('workspace_access' in input).toBe(false);
    });

    it('categorizes status-bearing errors by HTTP status, not message heuristics (review #4)', () => {
      const apiErr = Object.assign(new Error('Request failed'), {
        response: { status: 500, data: { message: 'server exploded' } },
      });
      const c = ListConfigurationValidator.categorizeError(apiErr);
      // 500 is a real API status -> must NOT claim unsupported_input via
      // message matching; routes to unsupported only for deterministic 4xx.
      // A 5xx should surface as api_failure (retry-inviting is correct here).
      expect([
        ListErrorCategory.API_FAILURE,
        ListErrorCategory.UNSUPPORTED_INPUT,
      ]).toContain(c.category);
      expect(c.api_error_status).toBe(500);
    });

    it('400 response-shaped error categorizes unsupported_input with status', () => {
      const c = ListConfigurationValidator.categorizeError({
        message: 'Bad Request: workspace_member_id invalid',
        response: { status: 400 },
      });
      expect(c.category).toBe(ListErrorCategory.UNSUPPORTED_INPUT);
      expect(c.api_error_status).toBe(400);
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
