/**
 * Shared utilities for list operations.
 */
import { AttioList } from '../../types/attio.js';
import { getErrorStatus } from '../../types/error-interfaces.js';

/**
 * Extract data from response, handling axios, fetch, and mock response shapes.
 */
export function extract<T>(response: unknown): T {
  if (typeof response === 'object' && response !== null) {
    const outer = response as { data?: unknown };
    if (outer.data !== undefined) {
      const inner = outer.data;
      if (typeof inner === 'object' && inner !== null && 'data' in inner) {
        const innerData = (inner as { data?: T }).data;
        return (innerData ?? ({} as T)) as T;
      }
      return inner as T;
    }
  }
  return response as T;
}

/**
 * Ensure list shape with proper ID structure and fallback values.
 */
export function ensureListShape(raw: unknown): AttioList {
  const value: Record<string, unknown> =
    typeof raw === 'object' && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  let listId: string | undefined;
  const rawId = value.id;
  if (typeof rawId === 'object' && rawId !== null && 'list_id' in rawId) {
    const candidate = (rawId as Record<string, unknown>).list_id;
    if (typeof candidate === 'string') {
      listId = candidate;
    }
  }
  if (typeof value.list_id === 'string') {
    listId = value.list_id;
  }

  const resolvedListId = listId ?? crypto.randomUUID?.() ?? `tmp_${Date.now()}`;
  const resolvedTitle =
    typeof value.title === 'string'
      ? value.title
      : typeof value.name === 'string'
        ? value.name
        : 'Untitled List';
  const resolvedName =
    typeof value.name === 'string' ? value.name : resolvedTitle;

  return {
    ...value,
    id: { list_id: resolvedListId },
    title: resolvedTitle,
    name: resolvedName,
    description: typeof value.description === 'string' ? value.description : '',
    object_slug:
      typeof value.object_slug === 'string' ? value.object_slug : 'lists',
    workspace_id:
      typeof value.workspace_id === 'string' ? value.workspace_id : '',
    created_at: typeof value.created_at === 'string' ? value.created_at : '',
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : '',
    entry_count:
      typeof value.entry_count === 'number' ? value.entry_count : undefined,
  } as AttioList;
}

/**
 * Helper to convert raw data to proper list array format.
 */
export function asListArray(raw: unknown): AttioList[] {
  return Array.isArray(raw) ? raw.map((item) => ensureListShape(item)) : [];
}

export function isNotFoundError(error: unknown): boolean {
  return getErrorStatus(error) === 404;
}
