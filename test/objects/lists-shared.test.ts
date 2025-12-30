/**
 * Unit tests for list shared utilities
 * Tests for ensureListShape() workspace_id extraction
 * Issue #1068 - Fix universal tools list format
 */

import { describe, it, expect } from 'vitest';
import { ensureListShape } from '@src/objects/lists/shared.js';

describe('ensureListShape - workspace_id extraction', () => {
  it('should extract workspace_id from nested id object', () => {
    const raw = {
      id: { list_id: 'list-123', workspace_id: 'ws-456' },
      name: 'Test List',
      api_slug: 'test-list',
      object_slug: 'companies',
    };

    const result = ensureListShape(raw);

    expect(result.workspace_id).toBe('ws-456');
    expect(result.id.list_id).toBe('list-123');
    expect(result.name).toBe('Test List');
  });

  it('should prioritize top-level workspace_id over nested', () => {
    const raw = {
      id: { list_id: 'list-123', workspace_id: 'ws-nested' },
      workspace_id: 'ws-toplevel',
      name: 'Test List',
      api_slug: 'test-list',
      object_slug: 'companies',
    };

    const result = ensureListShape(raw);

    // Top-level should take precedence
    expect(result.workspace_id).toBe('ws-toplevel');
    expect(result.id.list_id).toBe('list-123');
  });

  it('should handle missing workspace_id gracefully', () => {
    const raw = {
      id: { list_id: 'list-123' },
      name: 'Test List',
      api_slug: 'test-list',
      object_slug: 'companies',
    };

    const result = ensureListShape(raw);

    // workspace_id defaults to empty string when not present
    expect(result.workspace_id).toBe('');
    expect(result.id.list_id).toBe('list-123');
  });

  it('should handle empty string workspace_id from nested id', () => {
    const raw = {
      id: { list_id: 'list-123', workspace_id: '' },
      name: 'Test List',
      api_slug: 'test-list',
      object_slug: 'companies',
    };

    const result = ensureListShape(raw);

    // Empty string workspace_id should not be overridden
    expect(result.workspace_id).toBe('');
    expect(result.id.list_id).toBe('list-123');
  });

  it('should extract workspace_id even when other id fields are present', () => {
    const raw = {
      id: {
        list_id: 'list-123',
        workspace_id: 'ws-789',
        object_id: 'obj-456',
        some_other_field: 'value',
      },
      name: 'Test List',
      api_slug: 'test-list',
      object_slug: 'companies',
    };

    const result = ensureListShape(raw);

    expect(result.workspace_id).toBe('ws-789');
    expect(result.id.list_id).toBe('list-123');
  });

  it('should preserve all list fields while extracting workspace_id', () => {
    const raw = {
      id: { list_id: 'list-123', workspace_id: 'ws-456' },
      name: 'Test List',
      title: 'Test List Title',
      api_slug: 'test-list',
      object_slug: 'companies',
      description: 'A test list',
      entry_count: 42,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      custom_field: 'custom_value',
    };

    const result = ensureListShape(raw);

    // All fields should be preserved
    expect(result.workspace_id).toBe('ws-456');
    expect(result.name).toBe('Test List');
    expect(result.title).toBe('Test List Title');
    expect(result.api_slug).toBe('test-list');
    expect(result.object_slug).toBe('companies');
    expect(result.description).toBe('A test list');
    expect(result.entry_count).toBe(42);
    expect(result.created_at).toBe('2024-01-01T00:00:00Z');
    expect(result.updated_at).toBe('2024-01-02T00:00:00Z');
    expect((result as Record<string, unknown>).custom_field).toBe(
      'custom_value'
    );
  });

  it('should handle null workspace_id from nested id', () => {
    const raw = {
      id: { list_id: 'list-123', workspace_id: null },
      name: 'Test List',
      api_slug: 'test-list',
      object_slug: 'companies',
    };

    const result = ensureListShape(raw);

    // null workspace_id defaults to empty string (due to || '' fallback)
    expect(result.workspace_id).toBe('');
    expect(result.id.list_id).toBe('list-123');
  });
});

describe('ensureListShape - general functionality', () => {
  it('should ensure name field is set from title when name is missing', () => {
    const raw = {
      id: { list_id: 'list-123' },
      title: 'Test List Title',
      api_slug: 'test-list',
      object_slug: 'companies',
    };

    const result = ensureListShape(raw);

    // name should be set from title
    expect(result.name).toBe('Test List Title');
    expect(result.title).toBe('Test List Title');
  });

  it('should preserve name when both name and title are present', () => {
    const raw = {
      id: { list_id: 'list-123' },
      name: 'Custom Name',
      title: 'Different Title',
      api_slug: 'test-list',
      object_slug: 'companies',
    };

    const result = ensureListShape(raw);

    // Both should be preserved
    expect(result.name).toBe('Custom Name');
    expect(result.title).toBe('Different Title');
  });

  it('should handle list with minimal required fields', () => {
    const raw = {
      id: { list_id: 'list-min' },
      name: 'Minimal List',
      api_slug: 'minimal-list',
      object_slug: 'companies',
    };

    const result = ensureListShape(raw);

    expect(result.id.list_id).toBe('list-min');
    expect(result.name).toBe('Minimal List');
    expect(result.api_slug).toBe('minimal-list');
    expect(result.object_slug).toBe('companies');
  });
});
