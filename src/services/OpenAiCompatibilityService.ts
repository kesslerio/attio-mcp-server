/**
 * OpenAI compatibility service – bridges universal Attio tooling with the
 * constrained set of tools that OpenAI's MCP client expects (search + fetch).
 *
 * The implementation reuses existing universal search/retrieval services so we
 * do not duplicate data-access logic or drift from Anthropic compatibility.
 */
import { UniversalSearchService } from './UniversalSearchService.js';
import { UniversalRetrievalService } from './UniversalRetrievalService.js';
import {
  UniversalResourceType,
  UniversalSearchParams,
  SearchType,
  MatchType,
  SortType,
} from '../handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../types/attio.js';
import { SearchUtilities } from './search-utilities/SearchUtilities.js';
import { safeJsonStringify } from '../utils/json-serializer.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

const SUPPORTED_RESOURCE_TYPES: Record<
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

const RESOURCE_API_PATH: Partial<Record<UniversalResourceType, string>> = {
  [UniversalResourceType.COMPANIES]: 'objects/companies/records',
  [UniversalResourceType.PEOPLE]: 'objects/people/records',
  [UniversalResourceType.LISTS]: 'lists',
  [UniversalResourceType.TASKS]: 'tasks',
};

type SupportedTypeKey = keyof typeof SUPPORTED_RESOURCE_TYPES;

export interface OpenAiSearchParams {
  query: string;
  type?: SupportedTypeKey;
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
    const { query } = params;
    if (!query || !query.trim()) {
      throw new Error('Query must be provided');
    }

    const normalizedType: SupportedTypeKey = (
      params.type || 'all'
    ).toLowerCase() as SupportedTypeKey;
    const resourceTypes =
      SUPPORTED_RESOURCE_TYPES[normalizedType] ?? SUPPORTED_RESOURCE_TYPES.all;

    const requestedLimit = params.limit ?? DEFAULT_LIMIT;
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);
    const perTypeLimit = Math.max(1, Math.ceil(limit / resourceTypes.length));

    const results: OpenAiSearchResult[] = [];

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
      results.push(
        ...records.map((record) =>
          transformRecordToSearchResult(resourceType, record)
        )
      );
    }

    return results.slice(0, limit);
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
  const normalized = value.toLowerCase();
  switch (normalized) {
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
  record: AttioRecord
): OpenAiSearchResult {
  const recordId = record.id?.record_id || 'unknown';
  const title = buildTitle(resourceType, record);
  const snippet = buildSnippet(resourceType, record);

  return {
    id: `${resourceType}:${recordId}`,
    title,
    url: buildApiUrl(resourceType, recordId),
    snippet,
    metadata: {
      resource_type: resourceType,
    },
  };
}

function transformRecordToFetchResult(
  resourceType: UniversalResourceType,
  record: AttioRecord
): OpenAiFetchResult {
  const recordId = record.id?.record_id || 'unknown';
  const title = buildTitle(resourceType, record);
  const text = safeJsonStringify(record, { indent: 2 });

  return {
    id: `${resourceType}:${recordId}`,
    title,
    url: buildApiUrl(resourceType, recordId),
    text,
    metadata: {
      resource_type: resourceType,
    },
  };
}

function buildTitle(
  resourceType: UniversalResourceType,
  record: AttioRecord
): string {
  switch (resourceType) {
    case UniversalResourceType.COMPANIES:
      return (
        SearchUtilities.getFieldValue(record, 'name') ||
        SearchUtilities.getFieldValue(record, 'legal_name') ||
        `Company ${record.id?.record_id || ''}`.trim()
      );
    case UniversalResourceType.PEOPLE:
      return (
        SearchUtilities.getFieldValue(record, 'name') ||
        SearchUtilities.getFieldValue(record, 'full_name') ||
        `Person ${record.id?.record_id || ''}`.trim()
      );
    case UniversalResourceType.LISTS:
      return (
        SearchUtilities.getFieldValue(record, 'name') ||
        `List ${record.id?.record_id || ''}`.trim()
      );
    case UniversalResourceType.TASKS:
      return (
        SearchUtilities.getFieldValue(record, 'content') ||
        SearchUtilities.getFieldValue(record, 'title') ||
        `Task ${record.id?.record_id || ''}`.trim()
      );
    default:
      return `Record ${record.id?.record_id || ''}`.trim();
  }
}

function buildSnippet(
  resourceType: UniversalResourceType,
  record: AttioRecord
): string | undefined {
  if (resourceType === UniversalResourceType.COMPANIES) {
    return extractFirstNonEmpty([
      SearchUtilities.getFieldValue(record, 'description'),
      SearchUtilities.getFieldValue(record, 'about'),
      SearchUtilities.getFieldValue(record, 'industry'),
    ]);
  }

  if (resourceType === UniversalResourceType.PEOPLE) {
    return extractFirstNonEmpty([
      SearchUtilities.getFieldValue(record, 'job_title'),
      SearchUtilities.getFieldValue(record, 'role'),
      SearchUtilities.getFieldValue(record, 'headline'),
    ]);
  }

  if (resourceType === UniversalResourceType.TASKS) {
    return extractFirstNonEmpty([
      SearchUtilities.getFieldValue(record, 'status'),
      SearchUtilities.getFieldValue(record, 'due_date'),
    ]);
  }

  return undefined;
}

function extractFirstNonEmpty(
  values: Array<string | undefined>
): string | undefined {
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
