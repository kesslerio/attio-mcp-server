/**
 * List entry operations.
 */
import { getLazyAttioClient } from '../../api/lazy-client.js';
import {
  getListEntries as getGenericListEntries,
  addRecordToList as addGenericRecordToList,
  updateListEntry as updateGenericListEntry,
  removeRecordFromList as removeGenericRecordFromList,
  ListEntryFilters,
} from '../../api/operations/index.js';
import type { AttioListEntry } from '../../types/attio.js';
import { ResourceType } from '../../types/attio.js';
import { ListEntryValues, hasErrorResponse } from '../../types/list-types.js';
import { createScopedLogger } from '../../utils/logger.js';
import { getErrorMessage } from '../../types/error-interfaces.js';
import { extract } from './shared.js';

interface ListEntryCreatePayload {
  data: {
    parent_record_id: string;
    parent_object: ResourceType;
    entry_values?: ListEntryValues;
  };
}

/**
 * Gets entries for a specific list.
 */
export async function getListEntries(
  listId: string,
  limit: number = 20,
  offset: number = 0,
  filters?: ListEntryFilters
): Promise<AttioListEntry[]> {
  return getGenericListEntries(listId, limit, offset, filters);
}

/**
 * Adds a record to a list.
 */
export async function addRecordToList(
  listId: string,
  recordId: string,
  objectType: string,
  initialValues?: ListEntryValues
): Promise<AttioListEntry> {
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!recordId || typeof recordId !== 'string') {
    throw new Error('Invalid record ID: Must be a non-empty string');
  }

  if (!objectType || typeof objectType !== 'string') {
    throw new Error(
      'Object type is required: Must be a non-empty string (e.g., "companies", "people")'
    );
  }

  if (!Object.values(ResourceType).includes(objectType as ResourceType)) {
    const validTypes = Object.values(ResourceType).join(', ');
    throw new Error(
      `Invalid object type: "${objectType}". Must be one of: ${validTypes}`
    );
  }

  const resourceType = objectType as ResourceType;

  try {
    return await addGenericRecordToList(
      listId,
      recordId,
      resourceType,
      initialValues
    );
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      const log = createScopedLogger('objects.lists', 'addRecordToList');
      log.warn(
        'Generic addRecordToList failed; falling back to direct implementation',
        {
          listId,
          recordId,
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      );
    }

    const api = getLazyAttioClient();
    const path = `/lists/${listId}/entries`;

    const payload: ListEntryCreatePayload = {
      data: {
        parent_record_id: recordId,
        parent_object: resourceType,
      },
    };

    if (initialValues && Object.keys(initialValues).length > 0) {
      payload.data.entry_values = initialValues;
    }

    if (process.env.NODE_ENV === 'development') {
      const log = createScopedLogger('objects.lists', 'addRecordToList');
      log.info('Fallback request payload', { path, payload });
      log.debug('Object Type', { objectType });
      if (initialValues) {
        log.debug('Initial Values', { initialValues });
      }
    }

    try {
      const response = await api.post(path, payload);

      if (process.env.NODE_ENV === 'development') {
        const log = createScopedLogger('objects.lists', 'addRecordToList');
        log.info('Fallback success response', {
          data: response.data || {},
        });
      }

      return extract<AttioListEntry>(response);
    } catch (fallbackError: unknown) {
      if (process.env.NODE_ENV === 'development') {
        const log = createScopedLogger('objects.lists', 'addRecordToList');
        log.warn('Error adding record to list (fallback path)', {
          listId,
          recordId,
          message:
            fallbackError instanceof Error
              ? fallbackError.message
              : 'Unknown error',
          status: hasErrorResponse(fallbackError)
            ? fallbackError.response?.status
            : undefined,
          data: hasErrorResponse(fallbackError)
            ? fallbackError.response?.data || {}
            : undefined,
          validationErrors: hasErrorResponse(fallbackError)
            ? fallbackError.response?.data?.validation_errors
            : undefined,
        });
      }

      if (
        hasErrorResponse(fallbackError) &&
        fallbackError.response?.status === 400
      ) {
        const validationErrors =
          fallbackError.response?.data?.validation_errors || [];
        const errorDetails = validationErrors
          .map((validationError) => {
            return `${validationError.path?.join('.') || 'unknown'}: ${
              validationError.message || 'unknown'
            }`;
          })
          .join('; ');

        throw new Error(
          `Validation error adding record to list: ${
            errorDetails || getErrorMessage(fallbackError) || 'Unknown error'
          }`
        );
      }

      throw fallbackError;
    }
  }
}

/**
 * Updates a list entry (e.g., changing stage).
 */
export async function updateListEntry(
  listId: string,
  entryId: string,
  attributes: Record<string, unknown>
): Promise<AttioListEntry> {
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!entryId || typeof entryId !== 'string') {
    throw new Error('Invalid entry ID: Must be a non-empty string');
  }

  if (
    !attributes ||
    typeof attributes !== 'object' ||
    Array.isArray(attributes)
  ) {
    throw new Error('Invalid attributes: Must be a non-empty object');
  }

  try {
    return await updateGenericListEntry(listId, entryId, attributes);
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      const log = createScopedLogger('objects.lists', 'updateListEntry');
      log.warn('Generic updateListEntry failed; falling back', {
        listId,
        entryId,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const api = getLazyAttioClient();
    const path = `/lists/${listId}/entries/${entryId}`;

    if (process.env.NODE_ENV === 'development') {
      const log = createScopedLogger('objects.lists', 'updateListEntry');
      log.info('Fallback request payload', { path, attributes });
    }

    const response = await api.patch(path, {
      data: {
        entry_values: attributes,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      const log = createScopedLogger('objects.lists', 'updateListEntry');
      log.info('Fallback success response', {
        data: response.data || {},
      });
    }

    return extract<AttioListEntry>(response);
  }
}

/**
 * Removes a record from a list.
 */
export async function removeRecordFromList(
  listId: string,
  entryId: string
): Promise<boolean> {
  try {
    return await removeGenericRecordFromList(listId, entryId);
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      createScopedLogger('objects.lists', 'removeRecordFromList').warn(
        'Generic removeRecordFromList failed',
        {
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      );
    }

    const api = getLazyAttioClient();
    const path = `/lists/${listId}/entries/${entryId}`;

    await api.delete(path);
    return true;
  }
}

/**
 * Filters list entries by a specific attribute.
 */
