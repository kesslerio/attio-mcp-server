import { UniversalValidationError } from '@/handlers/tool-configs/universal/errors/validation-errors.js';
import {
  SearchType,
  SortType,
  UniversalResourceType as R,
} from '@/handlers/tool-configs/universal/types.js';
import type { SearchRoutingParams } from '@/services/search/SearchCoordinator.js';

export function validateConnectorSearchControls(params: unknown): void {
  if (!params || typeof params !== 'object') return;
  for (const field of [
    'filters',
    'sort',
    'sort_by',
    'sort_order',
    'search_type',
    'fields',
    'match_type',
  ]) {
    if (Object.hasOwn(params, field)) {
      throw new UniversalValidationError(
        `${field} is not supported by connector search. Omit it or use records_search.`,
        undefined,
        { field }
      );
    }
  }
}

/** Reject options the selected route would otherwise silently discard. */
export function validateSearchInput(params: SearchRoutingParams): void {
  const {
    resource_type: resource,
    query,
    filters,
    search_type: type = SearchType.BASIC,
  } = params;
  const hasQuery = Boolean(query?.trim());
  const hasFilters = Boolean(filters && Object.keys(filters).length);
  const objectStrategy = [R.COMPANIES, R.PEOPLE, R.DEALS].includes(resource);
  const nonObject = [R.NOTES, R.TASKS, R.LISTS].includes(resource);
  const queryRoute =
    type === SearchType.TIMEFRAME || type === SearchType.RELATIONSHIP;
  const contentRoute =
    type === SearchType.CONTENT && Boolean(params.content_fields?.length);
  const strategyContent =
    hasQuery &&
    (!hasFilters || resource === R.NOTES) &&
    !queryRoute &&
    !contentRoute &&
    (type === SearchType.CONTENT || resource === R.NOTES) &&
    (objectStrategy || nonObject);
  const reject = (field: string, message: string): never => {
    throw new UniversalValidationError(message, undefined, { field });
  };

  if (params.sort_by != null || params.sort_order != null) {
    reject(
      'sort_by',
      'sort_by and sort_order are not supported. Omit both options.'
    );
  }
  if (
    params.sort != null &&
    !(params.sort === SortType.RELEVANCE && strategyContent)
  ) {
    reject(
      'sort',
      'Explicit sorting is supported only as sort=relevance for strategy-based content searches.'
    );
  }
  if (queryRoute) {
    if (nonObject)
      reject(
        'search_type',
        'Timeframe and relationship searches require an object-record resource.'
      );
    if (hasQuery || hasFilters)
      reject(
        'query',
        'Timeframe and relationship searches cannot combine query or filters.'
      );
  } else if (contentRoute) {
    if (nonObject)
      reject(
        'content_fields',
        'content_fields requires an object-record resource.'
      );
    if (hasFilters)
      reject(
        'filters',
        'Content-field searches cannot combine additional filters.'
      );
  } else {
    if (hasFilters && [R.TASKS, R.LISTS].includes(resource)) {
      reject('filters', 'Task and list searches do not support filters.');
    }
    if (resource === R.NOTES) {
      const parentKeys = [
        'parent_object',
        'parent_record_id',
        'linked_record_type',
        'linked_record_id',
      ];
      if (Object.keys(filters ?? {}).some((key) => !parentKeys.includes(key))) {
        reject(
          'filters',
          'Note searches support only parent_object/parent_record_id or linked_record_type/linked_record_id filters.'
        );
      }
      if (!parentKeys.some((key) => filters?.[key])) {
        reject(
          'filters',
          'Workspace-wide note search is not supported. Supply parent filters or use notes_list.'
        );
      }
      if (
        (filters?.parent_object &&
          filters?.linked_record_type &&
          filters.parent_object !== filters.linked_record_type) ||
        (filters?.parent_record_id &&
          filters?.linked_record_id &&
          filters.parent_record_id !== filters.linked_record_id)
      ) {
        reject('filters', 'Conflicting note parent filters are not supported.');
      }
    }
    if (hasQuery && objectStrategy && hasFilters) {
      reject(
        'query',
        'Text query and filters cannot be combined. Put text conditions inside filters instead.'
      );
    }
    if (
      hasQuery &&
      !objectStrategy &&
      ![R.LISTS, R.NOTES].includes(resource) &&
      !(resource === R.TASKS && type === SearchType.CONTENT)
    ) {
      reject(
        'query',
        'Text query is not supported for this resource and search_type.'
      );
    }
    if (!nonObject && filters?.list_membership !== undefined) {
      reject(
        'filters',
        'list_membership is not supported for object-record searches.'
      );
    }
  }
  if (params.fields?.length && !strategyContent)
    reject('fields', 'fields requires a strategy-based content query.');
  if (
    params.match_type != null &&
    (!strategyContent || params.match_type === 'fuzzy')
  ) {
    reject(
      'match_type',
      'match_type supports exact or partial only for strategy-based content queries.'
    );
  }
}
