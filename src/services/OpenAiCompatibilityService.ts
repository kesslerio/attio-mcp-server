/**
 * OpenAI compatibility helpers – expose the universal search + retrieval stack
 * using the `search`/`fetch` contract that non-Developer-Mode ChatGPT accounts
 * expect. All logic delegates to the existing universal services so we keep a
 * single behaviour surface for every client.
 */
import { UniversalSearchService } from '@/services/UniversalSearchService.js';
import { UniversalRetrievalService } from '@/services/UniversalRetrievalService.js';
import {
  UniversalResourceType,
  UniversalSearchParams,
  SearchType,
  MatchType,
  SortType,
} from '@/handlers/tool-configs/universal/types.js';
import { SearchUtilities } from '@/services/search-utilities/SearchUtilities.js';
import type { UniversalRecordResult } from '@/types/attio.js';
import { safeJsonStringify } from '@/utils/json-serializer.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

const RESOURCE_API_PATH: Partial<Record<UniversalResourceType, string>> = {
  [UniversalResourceType.COMPANIES]: 'objects/companies/records',
  [UniversalResourceType.PEOPLE]: 'objects/people/records',
  [UniversalResourceType.LISTS]: 'lists',
  [UniversalResourceType.TASKS]: 'tasks',
};

const SEARCH_RESOURCE_MAP: Record<
  'companies' | 'people' | 'lists' | 'tasks' | 'all',
  UniversalResourceType[]
> = {
  companies: [UniversalResourceType.COMPANIES],
  people: [UniversalResourceType.PEOPLE],
  lists: [UniversalResourceType.LISTS],
  tasks: [UniversalResourceType.TASKS],
  all: [
    UniversalResourceType.COMPANIES,
    UniversalResourceType.PEOPLE,
    UniversalResourceType.LISTS,
    UniversalResourceType.TASKS,
  ],
};

export interface OpenAiSearchParams {
  query: string;
  type?: keyof typeof SEARCH_RESOURCE_MAP;
  limit?: number;
}

export interface OpenAiSearchResult {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  metadata?: Record<string, unknown>;
}

export interface OpenAiFetchResult {
  id: string;
  title: string;
  url: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export class OpenAiCompatibilityService {
  static async search(
    params: OpenAiSearchParams
  ): Promise<OpenAiSearchResult[]> {
    const query = params.query?.trim();
    if (!query) {
      throw new Error('Query must be provided');
    }

    const typeKey = (
      params.type ?? 'all'
    ).toLowerCase() as keyof typeof SEARCH_RESOURCE_MAP;
    const resourceTypes =
      SEARCH_RESOURCE_MAP[typeKey] ?? SEARCH_RESOURCE_MAP.all;

    const requestedLimit = params.limit ?? DEFAULT_LIMIT;
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);
    const perTypeLimit = Math.max(1, Math.ceil(limit / resourceTypes.length));

    const aggregated: OpenAiSearchResult[] = [];

    for (const resourceType of resourceTypes) {
      const searchParams: UniversalSearchParams = {
        resource_type: resourceType,
        query,
        limit: perTypeLimit,
        search_type: SearchType.BASIC,
        match_type: MatchType.PARTIAL,
        sort: SortType.RELEVANCE,
      };

      const records = await UniversalSearchService.searchRecords(searchParams);
      aggregated.push(
        ...records.map((record) =>
          transformRecordToSearchResult(resourceType, record)
        )
      );
    }

    return aggregated.slice(0, limit);
  }

  static async fetch(id: string): Promise<OpenAiFetchResult> {
    const { resourceType, recordId } = parseCompoundId(id);

    const record = await UniversalRetrievalService.getRecordDetails({
      resource_type: resourceType,
      record_id: recordId,
    });

    return transformRecordToFetchResult(resourceType, record);
  }
}

function parseCompoundId(id: string): {
  resourceType: UniversalResourceType;
  recordId: string;
} {
  if (!id || !id.includes(':')) {
    throw new Error(
      'Expected identifier format "<resource_type>:<record_id>" (e.g. companies:1234)'
    );
  }

  const [rawType, ...rest] = id.split(':');
  const recordId = rest.join(':');
  if (!recordId) {
    throw new Error('Record identifier is missing');
  }

  const resourceType = normalizeResourceType(rawType);
  return { resourceType, recordId };
}

function normalizeResourceType(value: string): UniversalResourceType {
  switch (value.toLowerCase()) {
    case 'companies':
      return UniversalResourceType.COMPANIES;
    case 'people':
      return UniversalResourceType.PEOPLE;
    case 'lists':
      return UniversalResourceType.LISTS;
    case 'tasks':
      return UniversalResourceType.TASKS;
    default:
      throw new Error(`Unsupported resource type: ${value}`);
  }
}

function transformRecordToSearchResult(
  resourceType: UniversalResourceType,
  record: UniversalRecordResult
): OpenAiSearchResult {
  // Support list_id for lists (Issue #1068 - lists use list_id, not record_id)
  const recordId = (record.id?.list_id || record.id?.record_id) ?? 'unknown';
  return {
    id: `${resourceType}:${recordId}`,
    title: buildTitle(resourceType, record),
    url: buildApiUrl(resourceType, String(recordId)),
    snippet: buildSnippet(resourceType, record),
    metadata: {
      resource_type: resourceType,
    },
  };
}

function transformRecordToFetchResult(
  resourceType: UniversalResourceType,
  record: UniversalRecordResult
): OpenAiFetchResult {
  // Support list_id for lists (Issue #1068 - lists use list_id, not record_id)
  const recordId = (record.id?.list_id || record.id?.record_id) ?? 'unknown';
  return {
    id: `${resourceType}:${recordId}`,
    title: buildTitle(resourceType, record),
    url: buildApiUrl(resourceType, String(recordId)),
    text: safeJsonStringify(record, { indent: 2 }),
    metadata: {
      resource_type: resourceType,
    },
  };
}

function buildTitle(
  resourceType: UniversalResourceType,
  record: UniversalRecordResult
): string {
  switch (resourceType) {
    case UniversalResourceType.COMPANIES:
      return (
        SearchUtilities.getFieldValue(record, 'name') ||
        SearchUtilities.getFieldValue(record, 'legal_name') ||
        `Company ${record.id?.record_id ?? ''}`.trim()
      );
    case UniversalResourceType.PEOPLE:
      return (
        SearchUtilities.getFieldValue(record, 'name') ||
        SearchUtilities.getFieldValue(record, 'full_name') ||
        `Person ${record.id?.record_id ?? ''}`.trim()
      );
    case UniversalResourceType.LISTS:
      // Issue #1068: Lists use list_id, not record_id
      return (
        SearchUtilities.getFieldValue(record, 'name') ||
        SearchUtilities.getFieldValue(record, 'title') ||
        `List ${(record.id as { list_id?: string })?.list_id ?? ''}`.trim()
      );
    case UniversalResourceType.TASKS:
      return (
        SearchUtilities.getFieldValue(record, 'content') ||
        SearchUtilities.getFieldValue(record, 'title') ||
        `Task ${record.id?.record_id ?? ''}`.trim()
      );
    default:
      return `Record ${record.id?.record_id ?? ''}`.trim();
  }
}

function buildSnippet(
  resourceType: UniversalResourceType,
  record: UniversalRecordResult
): string | undefined {
  if (resourceType === UniversalResourceType.COMPANIES) {
    return firstNonEmpty([
      SearchUtilities.getFieldValue(record, 'description'),
      SearchUtilities.getFieldValue(record, 'about'),
      SearchUtilities.getFieldValue(record, 'industry'),
    ]);
  }

  if (resourceType === UniversalResourceType.PEOPLE) {
    return firstNonEmpty([
      SearchUtilities.getFieldValue(record, 'job_title'),
      SearchUtilities.getFieldValue(record, 'role'),
      SearchUtilities.getFieldValue(record, 'headline'),
    ]);
  }

  if (resourceType === UniversalResourceType.TASKS) {
    return firstNonEmpty([
      SearchUtilities.getFieldValue(record, 'status'),
      SearchUtilities.getFieldValue(record, 'due_date'),
    ]);
  }

  return undefined;
}

function firstNonEmpty(values: Array<string | undefined>): string | undefined {
  return values.find((value) => value && value.trim().length > 0);
}

function buildApiUrl(
  resourceType: UniversalResourceType,
  recordId: string
): string {
  const path = RESOURCE_API_PATH[resourceType];
  if (!path) {
    return `https://api.attio.com/v2/${recordId}`;
  }
  return `https://api.attio.com/v2/${path}/${recordId}`;
}
