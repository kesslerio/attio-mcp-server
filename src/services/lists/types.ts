/**
 * Shared types for list configuration tools and validation.
 */
import type { AttioList } from '@/types/attio.js';

/**
 * Normalized response shape returned by both dedicated list tools
 * and the universal path after validation/normalization.
 */
export interface NormalizedListResponse {
  list_id: string;
  name: string;
  parent_object: string;
  fields_summary: Record<string, unknown>;
  dry_run?: boolean;
}

/**
 * A list template definition in the static catalog.
 */
export interface ListTemplate {
  name: string;
  parent_object: string;
  description?: string;
  attributes: Record<string, unknown>;
}

/**
 * Error categories for list operations, each with a suggested next step.
 */
export enum ListErrorCategory {
  UNSUPPORTED_INPUT = 'unsupported_input',
  TOKEN_SCOPE = 'token_scope',
  PERMISSION_FAILURE = 'permission_failure',
  API_FAILURE = 'api_failure',
}

/**
 * Categorized error with a suggested next step for the caller.
 */
export interface CategorizedListError {
  category: ListErrorCategory;
  message: string;
  suggested_next_step: string;
}

/**
 * Fields that are immutable on existing Attio lists.
 * Attempts to update these fields should be rejected before the API call.
 */
export const IMMUTABLE_LIST_FIELDS: ReadonlySet<string> = new Set([
  'parent_object',
]);

/**
 * Build a NormalizedListResponse from a raw AttioList.
 */
export function normalizeListResponse(
  raw: AttioList,
  dryRun?: boolean
): NormalizedListResponse {
  if (!raw || typeof raw !== 'object') {
    return {
      list_id: '',
      name: '',
      parent_object: '',
      fields_summary: {},
      ...(dryRun ? { dry_run: true } : {}),
    };
  }

  const listId = raw.id?.list_id ?? '';
  const name = raw.title || raw.name || '';
  const parentObject = raw.object_slug || '';

  // Build fields_summary from all non-metadata fields
  const fieldsSummary: Record<string, unknown> = {};
  const skipKeys = new Set([
    'id',
    'title',
    'name',
    'object_slug',
    'workspace_id',
    'created_at',
    'updated_at',
    'entry_count',
  ]);
  for (const [key, value] of Object.entries(raw)) {
    if (!skipKeys.has(key) && value !== undefined) {
      fieldsSummary[key] = value;
    }
  }

  const result: NormalizedListResponse = {
    list_id: listId,
    name,
    parent_object: parentObject,
    fields_summary: fieldsSummary,
  };

  if (dryRun) {
    result.dry_run = true;
  }

  return result;
}
