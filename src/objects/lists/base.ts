import { decodeMutationResult } from '@/api/operations/mutation-result.js';
/**
 * Core list CRUD operations.
 */
import { UniversalValidationError } from '@/handlers/tool-configs/universal/errors/validation-errors.js';
import { getLazyAttioClient } from '@/api/lazy-client.js';
import {
  getAllLists as getGenericLists,
  getListDetails as getGenericListDetails,
} from '@/api/operations/index.js';
import { EnhancedApiError } from '@/errors/enhanced-api-errors.js';
import { AttioApiError } from '@/errors/api-errors.js';
import { safeErrorDetails } from '@/types/attio-error-body.js';
import { getErrorMessage, getErrorStatus } from '@/types/error-interfaces.js';
import { hasErrorResponse } from '@/types/list-types.js';
import { createScopedLogger, OperationType } from '@/utils/logger.js';
import type { AttioList } from '@/types/attio.js';
import {
  asListArray,
  ensureListShape,
  extract,
} from '@/objects/lists/shared.js';

/**
 * Gets all lists in the workspace.
 */
export async function getLists(
  objectSlug?: string,
  limit: number = 20
): Promise<AttioList[]> {
  const lists = await getGenericLists(objectSlug, limit);
  return Object.defineProperty(asListArray(lists), 'truncated', {
    value: (lists as AttioList[] & { truncated?: boolean }).truncated ?? true,
  });
}

/**
 * Gets details for a specific list.
 */
export async function getListDetails(listId: string): Promise<AttioList> {
  const list = await getGenericListDetails(listId);
  return ensureListShape(list);
}

/**
 * Creates a new list in Attio.
 */
export async function createList(
  attributes: Record<string, unknown>
): Promise<AttioList> {
  if (!attributes || typeof attributes !== 'object') {
    throw new UniversalValidationError(
      'Invalid attributes: Must be a non-empty object'
    );
  }

  if (!attributes.name) {
    throw new UniversalValidationError('List name is required');
  }

  if (!attributes.parent_object) {
    throw new UniversalValidationError(
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

    return decodeMutationResult(() =>
      ensureListShape(extract<AttioList>(response))
    );
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
      // Preserve status + allow-listed body so categorizeError reports a
      // deterministic input error (not the retry-inviting default) (Issue #1148).
      const body = safeErrorDetails(error.response?.data);
      throw new AttioApiError(
        `Invalid list attributes: ${body.message ?? (error instanceof Error ? error.message : 'Bad request')}`,
        400,
        path,
        'POST',
        body,
        error instanceof Error ? new Error(error.message) : undefined
      );
    } else if (hasErrorResponse(error) && error.response?.status === 403) {
      // Preserve HTTP status + Attio error code (e.g. billing_error vs
      // insufficient_scopes) so categorizeError can distinguish plan gating
      // from permission failures instead of receiving a flattened Error.
      // Details are allow-listed (AttioErrorBody); cause carries only the
      // message so the raw axios response never reaches serializers/logs.
      const body = safeErrorDetails(error.response?.data);
      throw new AttioApiError(
        'Insufficient permissions to create list' +
          (body.message ? `: ${body.message}` : ''),
        403,
        path,
        'POST',
        body,
        error instanceof Error ? new Error(error.message) : undefined
      );
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
    throw new UniversalValidationError(
      'Invalid list ID: Must be a non-empty string'
    );
  }

  if (!attributes || typeof attributes !== 'object') {
    throw new UniversalValidationError(
      'Invalid attributes: Must be a non-empty object'
    );
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

    return decodeMutationResult(() => extract<AttioList>(response));
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
      const body = safeErrorDetails(error.response?.data);
      throw new AttioApiError(
        `List ${listId} not found`,
        404,
        path,
        'PATCH',
        body,
        error instanceof Error ? new Error(error.message) : undefined
      );
    } else if (hasErrorResponse(error) && error.response?.status === 400) {
      // Preserve status + allow-listed body (see createList) (Issue #1148).
      const body = safeErrorDetails(error.response?.data);
      throw new AttioApiError(
        `Invalid list attributes: ${body.message ?? (error instanceof Error ? error.message : 'Bad request')}`,
        400,
        path,
        'PATCH',
        body,
        error instanceof Error ? new Error(error.message) : undefined
      );
    } else if (hasErrorResponse(error) && error.response?.status === 403) {
      // Preserve status + Attio error code for categorizeError (see createList).
      const body = safeErrorDetails(error.response?.data);
      throw new AttioApiError(
        `Insufficient permissions to update list ${listId}` +
          (body.message ? `: ${body.message}` : ''),
        403,
        path,
        'PATCH',
        body,
        error instanceof Error ? new Error(error.message) : undefined
      );
    }

    throw error;
  }
}

/**
 * Deletes a list in Attio.
 */
export async function deleteList(listId: string): Promise<boolean> {
  if (!listId || typeof listId !== 'string') {
    throw new UniversalValidationError(
      'Invalid list ID: Must be a non-empty string'
    );
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
