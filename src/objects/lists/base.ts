/**
 * Core list CRUD operations.
 */
import { getLazyAttioClient } from '../../api/lazy-client.js';
import {
  getAllLists as getGenericLists,
  getListDetails as getGenericListDetails,
} from '../../api/operations/index.js';
import { EnhancedApiError } from '../../errors/enhanced-api-errors.js';
import {
  getErrorMessage,
  getErrorStatus,
} from '../../types/error-interfaces.js';
import { hasErrorResponse } from '../../types/list-types.js';
import { createScopedLogger, OperationType } from '../../utils/logger.js';
import type { AttioList } from '../../types/attio.js';
import { asListArray, ensureListShape, extract } from './shared.js';

/**
 * Gets all lists in the workspace.
 */
export async function getLists(
  objectSlug?: string,
  limit: number = 20
): Promise<AttioList[]> {
  try {
    return await getGenericLists(objectSlug, limit);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error) ?? 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      createScopedLogger('objects.lists', 'getLists').warn(
        'Generic getLists failed',
        { errorMessage }
      );
    }

    const api = getLazyAttioClient();
    let path = `/lists?limit=${limit}`;

    if (objectSlug) {
      path += `&objectSlug=${objectSlug}`;
    }

    const response = await api.get(path);
    return asListArray(extract<AttioList[]>(response));
  }
}

/**
 * Gets details for a specific list.
 */
export async function getListDetails(listId: string): Promise<AttioList> {
  try {
    return await getGenericListDetails(listId);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error) ?? 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      createScopedLogger('objects.lists', 'getListDetails').warn(
        'Generic getListDetails failed',
        { errorMessage }
      );
    }

    const api = getLazyAttioClient();
    const path = `/lists/${listId}`;

    try {
      const response = await api.get(path);
      const extracted = extract<AttioList>(response);
      return ensureListShape(extracted);
    } catch (apiError: unknown) {
      const status = getErrorStatus(apiError);
      if (status === 404) {
        throw new EnhancedApiError('Record not found', 404, path, 'GET', {
          resourceType: 'lists',
          recordId: String(listId),
          httpStatus: 404,
          documentationHint: 'Use search-lists to find valid list IDs.',
        });
      }
      if (status === 422) {
        const { InvalidRequestError } = await import(
          '../../errors/api-errors.js'
        );
        throw new InvalidRequestError(
          'Invalid parameter(s) for list operation',
          '/lists',
          'GET'
        );
      }

      const code = typeof status === 'number' ? status : 500;
      throw new EnhancedApiError(
        getErrorMessage(apiError) ?? 'List retrieval failed',
        code,
        path,
        'GET',
        {
          resourceType: 'lists',
          recordId: String(listId),
          httpStatus: code,
        }
      );
    }
  }
}

/**
 * Creates a new list in Attio.
 */
export async function createList(
  attributes: Record<string, unknown>
): Promise<AttioList> {
  if (!attributes || typeof attributes !== 'object') {
    throw new Error('Invalid attributes: Must be a non-empty object');
  }

  if (!attributes.name) {
    throw new Error('List name is required');
  }

  if (!attributes.parent_object) {
    throw new Error(
      'Parent object type is required (e.g., "companies", "people")'
    );
  }

  const api = getLazyAttioClient();
  const path = '/lists';

  try {
    if (process.env.NODE_ENV === 'development') {
      createScopedLogger(
        'objects.lists',
        'createList',
        OperationType.API_CALL
      ).info('Creating list with attributes', { attributes });
    }

    const response = await api.post(path, {
      data: attributes,
    });

    if (process.env.NODE_ENV === 'development') {
      createScopedLogger(
        'objects.lists',
        'createList',
        OperationType.API_CALL
      ).info('Create list success', { data: response.data });
    }

    const extracted = extract<AttioList>(response);
    return ensureListShape(extracted);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const log = createScopedLogger('objects.lists', 'createList');
      log.warn('Create list error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: hasErrorResponse(error) ? error.response?.status : undefined,
        data: hasErrorResponse(error) ? error.response?.data || {} : undefined,
      });
    }

    if (hasErrorResponse(error) && error.response?.status === 400) {
      throw new Error(
        `Invalid list attributes: ${
          error instanceof Error ? error.message : 'Bad request'
        }`
      );
    } else if (hasErrorResponse(error) && error.response?.status === 403) {
      throw new Error('Insufficient permissions to create list');
    }

    throw error;
  }
}

/**
 * Updates a list in Attio.
 */
export async function updateList(
  listId: string,
  attributes: Record<string, unknown>
): Promise<AttioList> {
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!attributes || typeof attributes !== 'object') {
    throw new Error('Invalid attributes: Must be a non-empty object');
  }

  const api = getLazyAttioClient();
  const path = `/lists/${listId}`;

  try {
    if (process.env.NODE_ENV === 'development') {
      createScopedLogger(
        'objects.lists',
        'updateList',
        OperationType.API_CALL
      ).info('Updating list', {
        listId,
        attributes,
      });
    }

    const response = await api.patch(path, {
      data: attributes,
    });

    if (process.env.NODE_ENV === 'development') {
      createScopedLogger(
        'objects.lists',
        'updateList',
        OperationType.API_CALL
      ).info('Update list success', { data: response.data });
    }

    return extract<AttioList>(response);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const log = createScopedLogger('objects.lists', 'updateList');
      log.warn('Update list error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: hasErrorResponse(error) ? error.response?.status : undefined,
        data: hasErrorResponse(error) ? error.response?.data || {} : undefined,
      });
    }

    if (hasErrorResponse(error) && error.response?.status === 404) {
      throw new Error(`List ${listId} not found`);
    } else if (hasErrorResponse(error) && error.response?.status === 400) {
      throw new Error(
        `Invalid list attributes: ${
          error instanceof Error ? error.message : 'Bad request'
        }`
      );
    } else if (hasErrorResponse(error) && error.response?.status === 403) {
      throw new Error(`Insufficient permissions to update list ${listId}`);
    }

    throw error;
  }
}

/**
 * Deletes a list in Attio.
 */
export async function deleteList(listId: string): Promise<boolean> {
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  const api = getLazyAttioClient();
  const path = `/lists/${listId}`;

  try {
    if (process.env.NODE_ENV === 'development') {
      createScopedLogger(
        'objects.lists',
        'deleteList',
        OperationType.API_CALL
      ).info('Deleting list', { listId });
    }

    await api.delete(path);

    if (process.env.NODE_ENV === 'development') {
      createScopedLogger(
        'objects.lists',
        'deleteList',
        OperationType.API_CALL
      ).info('Delete list success', { listId });
    }

    return true;
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      const log = createScopedLogger('objects.lists', 'deleteList');
      log.warn('Delete list error', {
        message: getErrorMessage(error) ?? 'Unknown error',
        status: hasErrorResponse(error) ? error.response?.status : undefined,
        data: hasErrorResponse(error) ? error.response?.data || {} : undefined,
      });
    }

    const status = getErrorStatus(error);
    if (status === 404) {
      throw new EnhancedApiError('Record not found', 404, path, 'DELETE', {
        resourceType: 'lists',
        recordId: String(listId),
        httpStatus: 404,
      });
    }
    const code = Number.isFinite(status) ? (status as number) : 500;
    throw new EnhancedApiError(
      getErrorMessage(error) ?? 'List deletion failed',
      code,
      path,
      'DELETE',
      {
        resourceType: 'lists',
        recordId: String(listId),
        httpStatus: code,
      }
    );
  }
}
