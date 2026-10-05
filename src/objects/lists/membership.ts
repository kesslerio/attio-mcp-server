/**
 * List membership utilities.
 */
import { UniversalValidationError } from '@/handlers/tool-configs/universal/errors/validation-errors.js';
import { getLazyAttioClient } from '@/api/lazy-client.js';
import { ResourceType } from '@/types/attio.js';
import { ListEntryValues, ListMembership } from '@/types/list-types.js';
import { getErrorMessage } from '@/types/error-interfaces.js';
import { createScopedLogger } from '@/utils/logger.js';
import { isValidUUID } from '@/utils/validation/uuid-validation.js';
import { isNotFoundError } from '@/objects/lists/shared.js';

export async function getRecordListMemberships(
  recordId: string,
  objectType?: string,
  includeEntryValues: boolean = false,
  batchSize: number = 5
): Promise<ListMembership[]> {
  if (!recordId || typeof recordId !== 'string' || !isValidUUID(recordId)) {
    return [];
  }

  if (
    objectType &&
    !Object.values(ResourceType).includes(objectType as ResourceType)
  ) {
    const validTypes = Object.values(ResourceType).join(', ');
    throw new UniversalValidationError(
      `Invalid object type: "${objectType}". Must be one of: ${validTypes}`
    );
  }

  try {
    const api = getLazyAttioClient();
    const memberships: ListMembership[] = [];

    const objectTypes = objectType
      ? [objectType]
      : ['companies', 'people', 'deals'];
    const maxTypes = Math.max(1, batchSize);
    const typesToQuery = objectTypes.slice(0, maxTypes);
    let truncated = !objectType || typesToQuery.length < objectTypes.length;

    for (const objType of typesToQuery) {
      try {
        const response = await api.get(
          `/objects/${objType}/records/${recordId}/entries`
        );
        truncated ||= Boolean(response?.data?.meta?.next_cursor) || !Array.isArray(response?.data?.data);
        const rawEntries = Array.isArray(response?.data?.data)
          ? (response.data.data as Array<Record<string, unknown>>)
          : [];

        truncated ||= rawEntries.length >= 100;

        for (const entry of rawEntries) {
          const listId =
            (entry.list_id as string | undefined) ||
            (
              (entry.list as Record<string, unknown> | undefined)?.id as
                | { list_id?: string }
                | undefined
            )?.list_id ||
            'unknown';
          const listName =
            ((entry.list as Record<string, unknown> | undefined)?.name as
              | string
              | undefined) || 'Unknown List';
          const entryIdValue = entry.id as
            | string
            | { entry_id?: string }
            | undefined;
          const entryId =
            typeof entryIdValue === 'string'
              ? entryIdValue
              : (entryIdValue?.entry_id ?? 'unknown');

          memberships.push({
            listId,
            listName,
            entryId,
            entryValues: includeEntryValues
              ? ((entry.values as ListEntryValues | undefined) ?? {})
              : undefined,
          });
        }

        if (objectType) {
          break;
        }
      } catch (error: unknown) {
        if (isNotFoundError(error)) {
          continue;
        }
        truncated = true;
        if (process.env.NODE_ENV === 'development') {
          createScopedLogger('lists', 'getRecordListMemberships').warn(
            `Error checking ${objType} entries for record ${recordId}`,
            { error: getErrorMessage(error) ?? String(error) }
          );
        }
      }
    }

    return Object.defineProperty(memberships, 'truncated', { value: truncated });
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return [];
    }
    if (process.env.NODE_ENV === 'development') {
      createScopedLogger('lists', 'getRecordListMemberships').warn(
        `Error in getRecordListMemberships for record ${recordId}`,
        { error: getErrorMessage(error) ?? String(error) }
      );
    }
    return [];
  }
}
