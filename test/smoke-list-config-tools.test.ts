/**
 * Live smoke test for list configuration tools (Issue #1195).
 * Uses real Attio API - requires ATTIO_API_KEY in .env.
 *
 * Run: bunx vitest run --config configs/vitest/vitest.config.ts test/smoke-list-config-tools.test.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { executeToolRequest } from '@/handlers/tools/dispatcher/core.js';
import { invalidateObjectCache } from '@/services/lists/ListConfigurationValidator.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

interface ToolResult {
  content: Array<{ type?: string; text?: string }>;
  isError?: boolean;
}

const hasApiKey = !!process.env.ATTIO_API_KEY;

function makeRequest(
  toolName: string,
  args: Record<string, unknown>
): CallToolRequest {
  return {
    method: 'tools/call' as const,
    params: { name: toolName, arguments: args },
  };
}

function getText(result: unknown): string {
  const r = result as ToolResult;
  return r?.content?.[0]?.text || '';
}

function isError(result: unknown): boolean {
  const r = result as ToolResult;
  return r?.isError === true;
}

describe.skipIf(!hasApiKey)('Live smoke: list configuration tools', () => {
  let createdListId: string | null = null;

  beforeEach(() => {
    invalidateObjectCache();
  });

  it('create-list: basic creation', async () => {
    const result = await executeToolRequest(
      makeRequest('create-list', {
        name: 'Smoke Test List',
        parent_object: 'companies',
        description: 'Created by smoke test - safe to delete',
      })
    );
    const text = getText(result);
    console.log('create-list response:', text.substring(0, 500));

    expect(isError(result)).toBe(false);
    const match = text.match(/"list_id"\s*:\s*"([^"]+)"/);
    if (match) createdListId = match[1];
    expect(text).toContain('list_id');
    expect(text).toContain('companies');
  });

  it('create-list: template dry-run', async () => {
    const result = await executeToolRequest(
      makeRequest('create-list', {
        name: 'Smoke Pipeline',
        parent_object: 'companies',
        template: 'sales_pipeline',
        dry_run: true,
      })
    );
    const text = getText(result);
    console.log('template dry-run:', text.substring(0, 500));

    expect(isError(result)).toBe(false);
    expect(text).toContain('dry_run');
    expect(text).toContain('stages');
  });

  it('create-list: invalid parent_object is rejected', async () => {
    const result = await executeToolRequest(
      makeRequest('create-list', {
        name: 'Bad List',
        parent_object: 'nonexistent_object_xyz',
      })
    );
    const text = getText(result);
    console.log('invalid parent_object:', text.substring(0, 500));

    // Should either be an error result or contain validation message
    expect(isError(result) || text.includes('Invalid parent_object')).toBe(
      true
    );
  });

  it('update-list-configuration: rename', async () => {
    if (!createdListId) return;
    const result = await executeToolRequest(
      makeRequest('update-list-configuration', {
        listId: createdListId,
        attributes: { name: 'Smoke Test List (Updated)' },
      })
    );
    const text = getText(result);
    console.log('update rename:', text.substring(0, 500));

    expect(isError(result)).toBe(false);
    expect(text).toContain('list_id');
  });

  it('update-list-configuration: immutable field rejection', async () => {
    if (!createdListId) return;
    const result = await executeToolRequest(
      makeRequest('update-list-configuration', {
        listId: createdListId,
        attributes: { parent_object: 'people' },
      })
    );
    const text = getText(result);
    console.log('immutable rejection:', text.substring(0, 500));

    expect(isError(result) || text.includes('immutable')).toBe(true);
  });

  it('update-list-configuration: dry-run', async () => {
    if (!createdListId) return;
    const result = await executeToolRequest(
      makeRequest('update-list-configuration', {
        listId: createdListId,
        attributes: { name: 'Dry Run Preview' },
        dry_run: true,
      })
    );
    const text = getText(result);
    console.log('dry-run update:', text.substring(0, 500));

    expect(isError(result)).toBe(false);
    expect(text).toContain('dry_run');
  });

  it('cleanup: delete test list', async () => {
    if (!createdListId) return;
    const result = await executeToolRequest(
      makeRequest('delete-record', {
        resource_type: 'lists',
        record_id: createdListId,
      })
    );
    console.log('cleanup done');
    expect(result).toBeDefined();
  });
});
