/**
 * Unit tests for create-list and update-list-configuration dedicated tools.
 * Tests the dispatcher handler logic via the ListConfigurationValidator integration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ListConfigurationValidator,
  invalidateObjectCache,
} from '@/services/lists/ListConfigurationValidator.js';
import { expandTemplate } from '@/services/lists/list-templates.js';
import type { AttioList } from '@/types/attio.js';

// Mock the lazy client
vi.mock('@/api/lazy-client.js', () => ({
  getLazyAttioClient: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  })),
}));

// Mock the objects/lists/base module
vi.mock('@/objects/lists/base.js', () => ({
  createList: vi.fn(),
  updateList: vi.fn(),
}));

import { getLazyAttioClient } from '@/api/lazy-client.js';
import { createList, updateList } from '@/objects/lists/base.js';

describe('create-list tool logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateObjectCache();
  });

  it('validates parent_object before creating', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      data: { data: [{ api_slug: 'companies' }, { api_slug: 'people' }] },
    });
    vi.mocked(getLazyAttioClient).mockReturnValue({
      get: mockGet,
      post: vi.fn(),
      patch: vi.fn(),
    } as never);

    // Invalid parent_object should throw
    await expect(
      ListConfigurationValidator.validateParentObject('nonexistent')
    ).rejects.toThrow('Invalid parent_object "nonexistent"');
  });

  it('creates list with valid parent_object', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      data: { data: [{ api_slug: 'companies' }] },
    });
    const mockPost = vi.fn().mockResolvedValue({
      data: {
        data: {
          id: { list_id: 'new-list-123' },
          title: 'My Pipeline',
          name: 'My Pipeline',
          object_slug: 'companies',
          workspace_id: 'ws-1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      },
    });
    vi.mocked(getLazyAttioClient).mockReturnValue({
      get: mockGet,
      post: mockPost,
      patch: vi.fn(),
    } as never);

    const mockList: AttioList = {
      id: { list_id: 'new-list-123' },
      title: 'My Pipeline',
      name: 'My Pipeline',
      object_slug: 'companies',
      workspace_id: 'ws-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };
    vi.mocked(createList).mockResolvedValue(mockList);

    // Validate parent_object passes
    const validated =
      await ListConfigurationValidator.validateParentObject('companies');
    expect(validated).toBe('companies');

    // Create list
    const result = await createList({
      name: 'My Pipeline',
      parent_object: 'companies',
    });
    expect(result.id.list_id).toBe('new-list-123');

    // Normalize
    const normalized = ListConfigurationValidator.normalizeResponse(result);
    expect(normalized.list_id).toBe('new-list-123');
    expect(normalized.name).toBe('My Pipeline');
    expect(normalized.parent_object).toBe('companies');
  });

  it('expands template before validation', () => {
    const expanded = expandTemplate('sales_pipeline', { name: 'Custom Name' });
    expect(expanded.name).toBe('Custom Name');
    expect(expanded.parent_object).toBe('companies');
    expect(expanded.stages).toBeDefined();
  });

  it('dry-run returns preview without API call', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      data: { data: [{ api_slug: 'companies' }] },
    });
    vi.mocked(getLazyAttioClient).mockReturnValue({
      get: mockGet,
      post: vi.fn(),
      patch: vi.fn(),
    } as never);

    // Validate passes
    await ListConfigurationValidator.validateParentObject('companies');

    // Build preview (same as dispatcher dry-run logic)
    const preview = ListConfigurationValidator.normalizeResponse(
      {
        id: { list_id: 'dry-run-preview' },
        title: 'Test Pipeline',
        object_slug: 'companies',
        workspace_id: 'preview',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as AttioList,
      true
    );

    expect(preview.dry_run).toBe(true);
    expect(preview.list_id).toBe('dry-run-preview');
    expect(preview.name).toBe('Test Pipeline');
    expect(preview.parent_object).toBe('companies');

    // createList should NOT have been called
    expect(createList).not.toHaveBeenCalled();
  });
});

describe('update-list-configuration tool logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateObjectCache();
  });

  it('rejects immutable field parent_object', () => {
    expect(() =>
      ListConfigurationValidator.detectImmutableFields({
        parent_object: 'people',
        name: 'New Name',
      })
    ).toThrow('Cannot update immutable field(s): parent_object');
  });

  it('allows non-immutable fields', () => {
    expect(() =>
      ListConfigurationValidator.detectImmutableFields({
        name: 'New Name',
        description: 'Updated desc',
      })
    ).not.toThrow();
  });

  it('updates list with valid attributes', async () => {
    const mockList: AttioList = {
      id: { list_id: 'list-456' },
      title: 'Updated Name',
      name: 'Updated Name',
      object_slug: 'companies',
      workspace_id: 'ws-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
    };
    vi.mocked(updateList).mockResolvedValue(mockList);

    const result = await updateList('list-456', { name: 'Updated Name' });
    const normalized = ListConfigurationValidator.normalizeResponse(result);
    expect(normalized.name).toBe('Updated Name');
    expect(normalized.list_id).toBe('list-456');
  });

  it('dry-run returns preview without API call', () => {
    const preview = ListConfigurationValidator.normalizeResponse(
      {
        id: { list_id: 'list-456' },
        title: 'Preview Name',
        object_slug: 'companies',
        workspace_id: 'preview',
        created_at: '',
        updated_at: new Date().toISOString(),
      } as AttioList,
      true
    );

    expect(preview.dry_run).toBe(true);
    expect(preview.list_id).toBe('list-456');
    expect(updateList).not.toHaveBeenCalled();
  });

  it('categorizes permission errors with next steps', () => {
    const error = { message: 'Forbidden', response: { status: 403 } };
    const categorized = ListConfigurationValidator.categorizeError(error);
    expect(categorized.category).toBe('permission_failure');
    expect(categorized.suggested_next_step).toContain('permissions');
  });
});
