/**
 * List filtering operations.
 */
import { getLazyAttioClient } from '../../api/lazy-client.js';
import { FilterValue } from '../../types/api-operations.js';
import type { AttioListEntry } from '../../types/attio.js';
import { ListEntryFilters } from '../../api/operations/index.js';
import { hasErrorResponse } from '../../types/list-types.js';
import { createScopedLogger } from '../../utils/logger.js';
import {
  createPathBasedFilter,
  processListEntries,
} from '../../utils/record-utils.js';
import { getListEntries } from './entries.js';

/**
 * Filters list entries by a specific attribute.
 */
export async function filterListEntries(
  listId: string,
  attributeSlug: string,
  condition: string,
  value: unknown,
  limit: number = 20,
  offset: number = 0
): Promise<AttioListEntry[]> {
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!attributeSlug || typeof attributeSlug !== 'string') {
    throw new Error('Invalid attribute slug: Must be a non-empty string');
  }

  if (!condition || typeof condition !== 'string') {
    throw new Error('Invalid condition: Must be a non-empty string');
  }

  const filters: ListEntryFilters = {
    filters: [
      {
        attribute: { slug: attributeSlug },
        condition,
        value: value as FilterValue,
      },
    ],
    matchAny: false,
  };

  return getListEntries(listId, limit, offset, filters);
}

/**
 * Advanced filtering of list entries with multiple conditions.
 */
export async function advancedFilterListEntries(
  listId: string,
  filters: ListEntryFilters,
  limit: number = 20,
  offset: number = 0
): Promise<AttioListEntry[]> {
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!filters || typeof filters !== 'object') {
    throw new Error('Invalid filters: Must be an object');
  }

  if (!filters.filters || !Array.isArray(filters.filters)) {
    throw new Error('Invalid filters: Must contain a filters array');
  }

  return getListEntries(listId, limit, offset, filters);
}

/**
 * Filters list entries based on parent record properties using path-based filtering.
 */
export async function filterListEntriesByParent(
  listId: string,
  parentObjectType: string,
  parentAttributeSlug: string,
  condition: string,
  value: unknown,
  limit: number = 20,
  offset: number = 0
): Promise<AttioListEntry[]> {
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!parentObjectType || typeof parentObjectType !== 'string') {
    throw new Error('Invalid parent object type: Must be a non-empty string');
  }

  if (!parentAttributeSlug || typeof parentAttributeSlug !== 'string') {
    throw new Error(
      'Invalid parent attribute slug: Must be a non-empty string'
    );
  }

  if (!condition || typeof condition !== 'string') {
    throw new Error('Invalid condition: Must be a non-empty string');
  }

  try {
    const api = getLazyAttioClient();
    const { path, constraints } = createPathBasedFilter(
      listId,
      parentObjectType,
      parentAttributeSlug,
      condition,
      value
    );

    const payload = {
      limit,
      offset,
      expand: ['record'],
      path,
      constraints,
    };

    if (process.env.NODE_ENV === 'development') {
      const log = createScopedLogger(
        'objects.lists',
        'filterListEntriesByParent'
      );
      log.info('Filtering with path-based filter', {
        listId,
        parentObjectType,
        parentAttributeSlug,
        condition,
        value,
        payload,
      });
    }

    const endpoint = `/lists/${listId}/entries/query`;
    const response = await api.post(endpoint, payload);
    const entries = processListEntries(response.data.data || []);

    if (process.env.NODE_ENV === 'development') {
      createScopedLogger('objects.lists', 'filterListEntriesByParent').info(
        'Matching entries found',
        { count: entries.length }
      );
    }

    return entries;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const log = createScopedLogger(
        'objects.lists',
        'filterListEntriesByParent'
      );
      log.warn('Error filtering list entries', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: hasErrorResponse(error) ? error.response?.status : undefined,
        data: hasErrorResponse(error) ? error.response?.data || {} : undefined,
      });
    }

    if (hasErrorResponse(error) && error.response?.status === 400) {
      throw new Error(
        `Invalid filter parameters: ${
          error instanceof Error ? error.message : 'Bad request'
        }`
      );
    } else if (hasErrorResponse(error) && error.response?.status === 404) {
      throw new Error(`List ${listId} not found`);
    }

    throw error;
  }
}

/**
 * Filters list entries by parent record ID.
 */
export async function filterListEntriesByParentId(
  listId: string,
  recordId: string,
  limit: number = 20,
  offset: number = 0
): Promise<AttioListEntry[]> {
  return filterListEntriesByParent(
    listId,
    'record',
    'record_id',
    'equals',
    recordId,
    limit,
    offset
  );
}
