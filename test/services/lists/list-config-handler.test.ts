/**
 * Handler-level tests for create-list and update-list-configuration tools.
 * Tests the actual dispatcher handler functions, not just the validator.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleCreateListOperation,
  handleUpdateListConfigurationOperation,
} from '@/handlers/tools/dispatcher/operations/lists.js';
import { invalidateObjectCache } from '@/services/lists/ListConfigurationValidator.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { ToolConfig } from '@/handlers/tool-types.js';

// Mock the lazy client
vi.mock('@/api/lazy-client.js', () => ({
  getLazyAttioClient: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  })),
}));

// Mock createList / updateList
vi.mock('@/objects/lists/base.js', () => ({
  createList: vi.fn(),
  updateList: vi.fn(),
}));

import { getLazyAttioClient } from '@/api/lazy-client.js';
import { createList, updateList } from '@/objects/lists/base.js';

function makeRequest(
  toolName: string,
  args: Record<string, unknown>
): CallToolRequest {
  return {
    method: 'tools/call' as const,
    params: { name: toolName, arguments: args },
  };
}

const mockToolConfig: ToolConfig = {
  name: 'create-list',
  handler: vi.fn(),
  formatResult: (result: unknown) => JSON.stringify(result),
};

function setupWorkspaceObjects(slugs: string[]) {
  const mockGet = vi.fn().mockResolvedValue({
    data: { data: slugs.map((s) => ({ api_slug: s })) },
  });
  vi.mocked(getLazyAttioClient).mockReturnValue({
    get: mockGet,
    post: vi.fn(),
    patch: vi.fn(),
  } as never);
}

describe('handleCreateListOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateObjectCache();
  });

  it('returns error when name is missing', async () => {
    const result = await handleCreateListOperation(
      makeRequest('create-list', { parent_object: 'companies' }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('name parameter is required');
  });

  it('returns error when parent_object is missing', async () => {
    const result = await handleCreateListOperation(
      makeRequest('create-list', { name: 'Test' }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('parent_object parameter is required');
  });

  it('returns error for invalid parent_object', async () => {
    setupWorkspaceObjects(['companies', 'people']);

    const result = await handleCreateListOperation(
      makeRequest('create-list', {
        name: 'Bad List',
        parent_object: 'nonexistent',
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('Invalid parent_object');
  });

  it('creates list with valid params', async () => {
    setupWorkspaceObjects(['companies']);
    vi.mocked(createList).mockResolvedValue({
      id: { list_id: 'new-123' },
      title: 'My List',
      name: 'My List',
      object_slug: 'companies',
      workspace_id: 'ws-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });

    const result = await handleCreateListOperation(
      makeRequest('create-list', {
        name: 'My List',
        parent_object: 'companies',
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('new-123');
    expect(text).toContain('companies');
    expect(createList).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My List', parent_object: 'companies' })
    );
  });

  it('returns dry-run preview without API call', async () => {
    setupWorkspaceObjects(['companies']);

    const result = await handleCreateListOperation(
      makeRequest('create-list', {
        name: 'Pipeline',
        parent_object: 'companies',
        dry_run: true,
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('dry_run');
    expect(text).toContain('dry-run-preview');
    expect(createList).not.toHaveBeenCalled();
  });

  it('expands template before validation', async () => {
    setupWorkspaceObjects(['companies']);
    vi.mocked(createList).mockResolvedValue({
      id: { list_id: 'tpl-123' },
      title: 'Sales Pipeline',
      name: 'Sales Pipeline',
      object_slug: 'companies',
      workspace_id: 'ws-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });

    const result = await handleCreateListOperation(
      makeRequest('create-list', {
        name: 'Sales Pipeline',
        parent_object: 'companies',
        template: 'sales_pipeline',
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('tpl-123');
    expect(createList).toHaveBeenCalledWith(
      expect.objectContaining({ stages: expect.any(Array) })
    );
  });
});

describe('handleUpdateListConfigurationOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateObjectCache();
  });

  it('returns error when listId is missing', async () => {
    const result = await handleUpdateListConfigurationOperation(
      makeRequest('update-list-configuration', {
        attributes: { name: 'New' },
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('listId parameter is required');
  });

  it('returns error when attributes are missing', async () => {
    const result = await handleUpdateListConfigurationOperation(
      makeRequest('update-list-configuration', { listId: 'list-1' }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('attributes parameter is required');
  });

  it('rejects immutable field parent_object', async () => {
    const result = await handleUpdateListConfigurationOperation(
      makeRequest('update-list-configuration', {
        listId: 'list-1',
        attributes: { parent_object: 'people', name: 'New' },
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('immutable');
    expect(updateList).not.toHaveBeenCalled();
  });

  it('updates list with valid attributes', async () => {
    vi.mocked(updateList).mockResolvedValue({
      id: { list_id: 'list-1' },
      title: 'Updated Name',
      name: 'Updated Name',
      object_slug: 'companies',
      workspace_id: 'ws-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
    });

    const result = await handleUpdateListConfigurationOperation(
      makeRequest('update-list-configuration', {
        listId: 'list-1',
        attributes: { name: 'Updated Name' },
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('list-1');
    expect(text).toContain('Updated Name');
    expect(updateList).toHaveBeenCalledWith('list-1', { name: 'Updated Name' });
  });

  it('returns dry-run preview without API call', async () => {
    const result = await handleUpdateListConfigurationOperation(
      makeRequest('update-list-configuration', {
        listId: 'list-1',
        attributes: { name: 'Preview' },
        dry_run: true,
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('dry_run');
    expect(text).toContain('list-1');
    expect(updateList).not.toHaveBeenCalled();
  });
});
