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

  it('defaults to full-access when no access fields provided', async () => {
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
    expect(createList).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_access: 'full-access' })
    );
  });

  it('passes workspace_access through to createList', async () => {
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
        workspace_access: 'full-access',
      }),
      mockToolConfig
    );
    expect(createList).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_access: 'full-access' })
    );
  });

  it('passes workspace_member_access through to createList', async () => {
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
        workspace_member_access: [
          { workspace_member_id: 'member-1', level: 'full-access' },
        ],
      }),
      mockToolConfig
    );
    expect(createList).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_member_access: [
          { workspace_member_id: 'member-1', level: 'full-access' },
        ],
      })
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

  it('merges workspace_access into update attributes', async () => {
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
        workspace_access: 'read-only',
      }),
      mockToolConfig
    );
    expect(updateList).toHaveBeenCalledWith('list-1', {
      name: 'Updated Name',
      workspace_access: 'read-only',
    });
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

// --- Issue #1148 review fixes: reject paths, precedence, e2e 403 chain ---

describe('handleCreateListOperation access-control reject paths (Issue #1148)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateObjectCache();
    setupWorkspaceObjects(['companies']);
  });

  it('rejects invalid workspace_access before any API call', async () => {
    const result = await handleCreateListOperation(
      makeRequest('create-list', {
        name: 'Bad Access',
        parent_object: 'companies',
        workspace_access: 'invalid-level',
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('Invalid workspace_access');
    expect(text).toContain('unsupported_input');
    expect(text).not.toContain('Retry the operation');
    expect(createList).not.toHaveBeenCalled();
  });

  it('rejects non-array workspace_member_access before any API call', async () => {
    const result = await handleCreateListOperation(
      makeRequest('create-list', {
        name: 'Bad Members',
        parent_object: 'companies',
        workspace_member_access: 'not-an-array',
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('must be an array');
    expect(text).toContain('unsupported_input');
    expect(createList).not.toHaveBeenCalled();
  });

  it('enforces the create-time full-access invariant through the handler', async () => {
    const result = await handleCreateListOperation(
      makeRequest('create-list', {
        name: 'No Grantee',
        parent_object: 'companies',
        workspace_member_access: [
          { workspace_member_id: 'member-1', level: 'read-only' },
        ],
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('full-access');
    expect(text).toContain('unsupported_input');
    expect(createList).not.toHaveBeenCalled();
  });

  it('does NOT inject the full-access default when access config arrives via the attributes bag', async () => {
    vi.mocked(createList).mockResolvedValue({
      id: { list_id: 'bag-1' },
      title: 'Bag List',
      name: 'Bag List',
      object_slug: 'companies',
      workspace_id: 'ws-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });

    await handleCreateListOperation(
      makeRequest('create-list', {
        name: 'Bag List',
        parent_object: 'companies',
        attributes: {
          workspace_member_access: [
            { workspace_member_id: 'member-1', level: 'full-access' },
          ],
        },
      }),
      mockToolConfig
    );
    const payload = vi.mocked(createList).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(payload.workspace_access).toBeUndefined();
    expect(payload.workspace_member_access).toBeDefined();
  });

  it('first-class workspace_access wins over attributes-bag value (create)', async () => {
    vi.mocked(createList).mockResolvedValue({
      id: { list_id: 'prec-1' },
      title: 'Prec',
      name: 'Prec',
      object_slug: 'companies',
      workspace_id: 'ws-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });

    await handleCreateListOperation(
      makeRequest('create-list', {
        name: 'Prec',
        parent_object: 'companies',
        workspace_access: 'full-access',
        attributes: { workspace_access: 'read-only' },
      }),
      mockToolConfig
    );
    expect(createList).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_access: 'full-access' })
    );
  });

  it('normalizes the string "null" sentinel to JSON null on the wire (create)', async () => {
    vi.mocked(createList).mockResolvedValue({
      id: { list_id: 'null-1' },
      title: 'Private',
      name: 'Private',
      object_slug: 'companies',
      workspace_id: 'ws-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });

    await handleCreateListOperation(
      makeRequest('create-list', {
        name: 'Private',
        parent_object: 'companies',
        workspace_access: 'null',
        workspace_member_access: [
          { workspace_member_id: 'member-1', level: 'full-access' },
        ],
      }),
      mockToolConfig
    );
    expect(createList).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_access: null })
    );
  });

  it('routes a real createList AttioApiError 403 through the full classifier chain', async () => {
    const { AttioApiError } = await import('@/errors/api-errors.js');
    vi.mocked(createList).mockRejectedValue(
      new AttioApiError(
        'Insufficient permissions to create list',
        403,
        '/lists',
        'POST',
        { code: 'billing_error' }
      )
    );

    const result = await handleCreateListOperation(
      makeRequest('create-list', {
        name: 'Gated',
        parent_object: 'companies',
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('plan_gating');
    expect(text).toContain('plan');
    expect(text).not.toContain('Retry the operation');
  });

  it('preserves PERMISSION_FAILURE (no regression) for codeless 403 through the chain', async () => {
    const { AttioApiError } = await import('@/errors/api-errors.js');
    vi.mocked(createList).mockRejectedValue(
      new AttioApiError(
        'Insufficient permissions to create list',
        403,
        '/lists',
        'POST',
        {}
      )
    );

    const result = await handleCreateListOperation(
      makeRequest('create-list', {
        name: 'Forbidden',
        parent_object: 'companies',
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('permission_failure');
    expect(text).toContain('permissions');
    expect(text).not.toContain('Retry the operation');
  });
});

describe('handleUpdateListConfigurationOperation access-control paths (Issue #1148)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateObjectCache();
  });

  it('rejects invalid workspace_access shape before any API call', async () => {
    const result = await handleUpdateListConfigurationOperation(
      makeRequest('update-list-configuration', {
        listId: 'list-1',
        attributes: {},
        workspace_access: 'not-a-level',
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('Invalid workspace_access');
    expect(text).toContain('unsupported_input');
    expect(updateList).not.toHaveBeenCalled();
  });

  it('normalizes the string "null" sentinel to JSON null on the wire (update)', async () => {
    vi.mocked(updateList).mockResolvedValue({
      id: { list_id: 'list-1' },
      title: 'Private',
      name: 'Private',
      object_slug: 'companies',
      workspace_id: 'ws-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
    });

    await handleUpdateListConfigurationOperation(
      makeRequest('update-list-configuration', {
        listId: 'list-1',
        attributes: { workspace_access: 'null' },
      }),
      mockToolConfig
    );
    expect(updateList).toHaveBeenCalledWith(
      'list-1',
      expect.objectContaining({ workspace_access: null })
    );
  });

  it('first-class workspace_access wins over attributes-bag value (update)', async () => {
    vi.mocked(updateList).mockResolvedValue({
      id: { list_id: 'list-1' },
      title: 'X',
      name: 'X',
      object_slug: 'companies',
      workspace_id: 'ws-1',
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
    });

    await handleUpdateListConfigurationOperation(
      makeRequest('update-list-configuration', {
        listId: 'list-1',
        attributes: { workspace_access: 'read-only' },
        workspace_access: 'read-and-write',
      }),
      mockToolConfig
    );
    expect(updateList).toHaveBeenCalledWith(
      'list-1',
      expect.objectContaining({ workspace_access: 'read-and-write' })
    );
  });

  it('routes a real updateList AttioApiError 403 billing through the chain', async () => {
    const { AttioApiError } = await import('@/errors/api-errors.js');
    vi.mocked(updateList).mockRejectedValue(
      new AttioApiError(
        'Insufficient permissions to update list list-1',
        403,
        '/lists/list-1',
        'PATCH',
        { code: 'billing_error' }
      )
    );

    const result = await handleUpdateListConfigurationOperation(
      makeRequest('update-list-configuration', {
        listId: 'list-1',
        attributes: { workspace_access: 'read-only' },
      }),
      mockToolConfig
    );
    const text = (result as { content: Array<{ text: string }> }).content[0]
      .text;
    expect(text).toContain('plan_gating');
  });
});
