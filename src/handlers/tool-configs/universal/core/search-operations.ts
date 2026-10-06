import { normalizeRecordCollection } from '@/handlers/tool-configs/universal/read-result-adapters.js';
import {
  UniversalToolConfig,
  UniversalSearchParams,
  UniversalResourceType,
} from '@/handlers/tool-configs/universal/types.js';
import {
  extractResourceTypeFromFormatArgs,
  getPluralResourceLabel,
} from '@/handlers/tool-configs/universal/core/utils.js';
import type { UniversalRecordResult } from '@/types/attio.js';
import { isAttioRecord } from '@/types/attio.js';
import {
  validateUniversalToolParams,
  searchRecordsSchema,
} from '@/handlers/tool-configs/universal/schemas.js';
import { recordSearchResultContract } from '@/handlers/tools/result-schemas.js';
import { ErrorService } from '@/services/ErrorService.js';
import { handleUniversalSearchPage } from '@/handlers/tool-configs/universal/shared-handlers.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';

/**
 * Universal search records tool configuration.
 * Consolidates: search-companies, search-people, list-records, list-tasks.
 * Issue #1068: Lists returned in list-native format (UniversalRecordResult[])
 * U5: cursor-bearing calls continue through searchRecordsPage (KTD6).
 */
export const searchRecordsConfig: UniversalToolConfig<
  UniversalSearchParams,
  | UniversalRecordResult[]
  | {
      data: UniversalRecordResult[];
      next_cursor?: string | null;
      pagination?: Record<string, unknown>;
    }
> = {
  name: 'search_records',
  ...recordSearchResultContract,
  handler: async (
    params: UniversalSearchParams
  ): Promise<
    | UniversalRecordResult[]
    | {
        data: UniversalRecordResult[];
        next_cursor?: string | null;
        pagination?: Record<string, unknown>;
      }
  > => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search_records',
        params
      ) as UniversalSearchParams;
      // U5 (KTD6): every collection call pages through the continuation seam so
      // lookahead evidence exists on the first page too; a null next_cursor
      // then means proven exhaustion, not unknown truncation.
      return await handleUniversalSearchPage(sanitizedParams);
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'search',
        params?.resource_type ?? '',
        error
      );
    }
  },
  formatResult: (
    results: UniversalRecordResult[] | { data: UniversalRecordResult[] },
    ...args: unknown[]
  ): string => {
    const resourceType = extractResourceTypeFromFormatArgs(args);
    if (!results) {
      const typeName = getPluralResourceLabel(resourceType);
      return `Found 0 ${typeName}`;
    }

    const recordsArray = Array.isArray(results)
      ? results
      : (results?.data ?? []);

    if (!Array.isArray(recordsArray) || recordsArray.length === 0) {
      const typeName = getPluralResourceLabel(resourceType);
      return `Found 0 ${typeName}`;
    }

    const typeName = getPluralResourceLabel(resourceType);

    const formattedResults = recordsArray
      .map((record, index) => {
        let identifier: string;

        // Extract ID with list_id fallback (Issue #1068 - lists use list_id)
        let id = String(
          record.id?.list_id || record.id?.record_id || 'unknown'
        );

        // Check if values has content (Issue #1068 - lists have empty values)
        const hasValues =
          isAttioRecord(record) && Object.keys(record.values).length > 0;
        const values = hasValues ? record.values : {};

        const getFirstValue = (field: unknown): string | undefined => {
          if (!field || !Array.isArray(field) || field.length === 0)
            return undefined;
          const firstItem = field[0] as { value?: string };
          return firstItem &&
            typeof firstItem === 'object' &&
            firstItem !== null &&
            'value' in firstItem
            ? String(firstItem.value)
            : undefined;
        };

        // Handle lists explicitly (top-level fields, not values wrapper)
        if (resourceType === UniversalResourceType.LISTS) {
          const recordObj = record as Record<string, unknown>;
          const name =
            (typeof recordObj.name === 'string' ? recordObj.name : undefined) ||
            (typeof recordObj.title === 'string'
              ? recordObj.title
              : undefined) ||
            'Unnamed';
          const objectSlug = recordObj.object_slug
            ? ` [${recordObj.object_slug}]`
            : '';
          identifier = `${name}${objectSlug}`;
          id = String(record.id?.list_id || 'unknown');
        } else if (resourceType === UniversalResourceType.TASKS) {
          identifier =
            typeof values.content === 'string'
              ? values.content
              : getFirstValue(values.content) || 'Unnamed';
          id = String(record.id?.task_id || record.id?.record_id || 'unknown');
        } else if (resourceType === UniversalResourceType.PEOPLE) {
          const valuesAny = values as Record<string, unknown>;
          const name =
            (valuesAny?.name as { full_name?: string }[] | undefined)?.[0]
              ?.full_name ||
            (valuesAny?.name as { value?: string }[] | undefined)?.[0]?.value ||
            (valuesAny?.name as { formatted?: string }[] | undefined)?.[0]
              ?.formatted ||
            (valuesAny?.full_name as { value?: string }[] | undefined)?.[0]
              ?.value ||
            getFirstValue(values.name) ||
            'Unnamed';

          const emailValue =
            (
              valuesAny?.email_addresses as
                | { email_address?: string }[]
                | undefined
            )?.[0]?.email_address ||
            (
              valuesAny?.email_addresses as { value?: string }[] | undefined
            )?.[0]?.value ||
            getFirstValue(values.email) ||
            getFirstValue(valuesAny.email_addresses);

          identifier = emailValue ? `${name} (${emailValue})` : name;
        } else if (resourceType === UniversalResourceType.COMPANIES) {
          const name =
            typeof values.name === 'string'
              ? values.name
              : getFirstValue(values.name) || 'Unnamed';
          const website = getFirstValue(values.website);
          const domain =
            values.domains &&
            Array.isArray(values.domains) &&
            values.domains.length > 0
              ? (values.domains[0] as { domain?: string }).domain
              : undefined;
          const email = getFirstValue(values.email);
          const contactInfo = website || domain || email;
          identifier = contactInfo ? `${name} (${contactInfo})` : name;
        } else {
          const nameValue = getFirstValue(values.name);
          const titleValue = getFirstValue(values.title);
          identifier = nameValue || titleValue || 'Unnamed';
        }

        return `${index + 1}. ${identifier} (ID: ${id})`;
      })
      .join('\n');

    return `Found ${recordsArray.length} ${typeName}:\n${formattedResults}`;
  },
  structuredOutput: normalizeRecordCollection,
};

export const searchRecordsDefinition = {
  name: 'search_records',
  description: formatToolDescription({
    capability: 'Search across companies, people, deals, tasks, and records',
    boundaries: 'create or modify records',
    constraints:
      'Returns max 100 results (default: 10). Pass the sealed next_cursor from a previous page to continue this exact query; never combine cursor with offset. Ranked relevance sorts are a bounded view, not a stable page sequence.',
    recoveryHint: 'use discover_record_attributes to find searchable fields',
  }),
  inputSchema: searchRecordsSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};
