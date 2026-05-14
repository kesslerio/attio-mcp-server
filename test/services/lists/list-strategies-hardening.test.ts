/**
 * Unit tests for universal path hardening (Issue #1195).
 * Verifies ListCreateStrategy and ListUpdateStrategy consume the shared validator.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListCreateStrategy } from '@/services/create/strategies/ListCreateStrategy.js';
import { ListUpdateStrategy } from '@/services/update/strategies/ListUpdateStrategy.js';
import { invalidateObjectCache } from '@/services/lists/ListConfigurationValidator.js';
import type { AttioList } from '@/types/attio.js';

// Mock the lazy client for workspace object fetching
vi.mock('@/api/lazy-client.js', () => ({
  getLazyAttioClient: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  })),
}));

// Mock the objects/lists module
vi.mock('@/objects/lists.js', () => ({
  createList: vi.fn(),
  updateList: vi.fn(),
}));

// Mock field-mapper (used by both strategies for error handling)
vi.mock('@/handlers/tool-configs/universal/field-mapper.js', () => ({
  getFieldSuggestions: vi.fn().mockReturnValue('Try using a valid field name'),
}));

import { getLazyAttioClient } from '@/api/lazy-client.js';
import { createList, updateList } from '@/objects/lists.js';

const mockList: AttioList = {
  id: { list_id: 'list-789' },
  title: 'Test List',
  name: 'Test List',
  object_slug: 'companies',
  workspace_id: 'ws-1',
  created_at: '2024-01-01',
  updated_at: '2024-01-02',
};

describe('ListCreateStrategy (hardened)', () => {
  let strategy: ListCreateStrategy;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateObjectCache();
    strategy = new ListCreateStrategy();
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

    vi.mocked(createList).mockResolvedValue(mockList);

    const result = await strategy.create({
      values: { name: 'Test', parent_object: 'companies' },
      resourceType: 'lists',
    });

    expect(result.id.list_id).toBe('list-789');
    expect(createList).toHaveBeenCalledWith({
      name: 'Test',
      parent_object: 'companies',
    });
  });

  it('rejects invalid parent_object before API call', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      data: { data: [{ api_slug: 'companies' }] },
    });
    vi.mocked(getLazyAttioClient).mockReturnValue({
      get: mockGet,
      post: vi.fn(),
      patch: vi.fn(),
    } as never);

    await expect(
      strategy.create({
        values: { name: 'Test', parent_object: 'invalid_object' },
        resourceType: 'lists',
      })
    ).rejects.toThrow('Invalid parent_object "invalid_object"');

    // API should NOT be called
    expect(createList).not.toHaveBeenCalled();
  });

  it('skips validation when parent_object is absent', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      data: { data: [{ api_slug: 'companies' }] },
    });
    vi.mocked(getLazyAttioClient).mockReturnValue({
      get: mockGet,
      post: vi.fn(),
      patch: vi.fn(),
    } as never);

    vi.mocked(createList).mockResolvedValue(mockList);

    // No parent_object — validation skipped
    const result = await strategy.create({
      values: { name: 'Test' },
      resourceType: 'lists',
    });

    expect(result).toBeDefined();
    // Workspace objects should NOT have been fetched
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('ListUpdateStrategy (hardened)', () => {
  let strategy: ListUpdateStrategy;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateObjectCache();
    strategy = new ListUpdateStrategy();
  });

  it('allows non-immutable field updates', async () => {
    vi.mocked(updateList).mockResolvedValue(mockList);

    const result = await strategy.update(
      'list-789',
      { name: 'New Name' },
      'lists'
    );

    expect(result.name).toBe('Test List');
    expect(updateList).toHaveBeenCalledWith('list-789', { name: 'New Name' });
  });

  it('rejects parent_object as immutable before API call', async () => {
    await expect(
      strategy.update('list-789', { parent_object: 'people' }, 'lists')
    ).rejects.toThrow('Cannot update immutable field(s): parent_object');

    // API should NOT be called
    expect(updateList).not.toHaveBeenCalled();
  });

  it('rejects update with both mutable and immutable fields', async () => {
    await expect(
      strategy.update(
        'list-789',
        { name: 'New Name', parent_object: 'people' },
        'lists'
      )
    ).rejects.toThrow('Cannot update immutable field(s): parent_object');

    expect(updateList).not.toHaveBeenCalled();
  });

  it('preserves existing error handling for attribute errors', async () => {
    vi.mocked(updateList).mockRejectedValue(
      new Error('Cannot find attribute with slug/ID "bad_field"')
    );

    await expect(
      strategy.update('list-789', { bad_field: 'value' }, 'lists')
    ).rejects.toThrow('Cannot find attribute');
  });
});
