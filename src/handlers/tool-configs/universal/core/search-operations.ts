import { defineOperationTool } from '@/handlers/tools/operation-descriptor.js';
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
  name: 'records_search',
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
        'records_search',
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

export const searchRecordsDefinition = defineOperationTool({
  name: 'records_search',
  facts: {
    operation: {
      authRequired: true,
      action: 'search',
      resourceTypes: [
        'companies',
        'people',
        'deals',
        'tasks',
        'lists',
        'records',
        'notes',
      ],
      customObjectSlugs: true,
      readOnly: true,
      destructive: false,
      idempotent: true,
      pagination: { kind: 'cursor', supported: false, cap: 100 },
    },
    guidance: {
      capability: 'Find records across any supported object type.',
      boundaries:
        'create or modify records, or return more than one page per call.',
      constraints:
        'Cursor continuation is conditional: query/timeframe routes support it, as do empty-query object searches excluding tasks, lists, and notes. Nonempty text queries outside those routes and basic tasks/lists/notes searches are bounded and return pagination.supported=false with no cursor. Supported pages cap at 100; defaults vary by resource and route; never mix cursor with offset. Nested attribute filtering applies to companies, people, deals, records, and configured custom objects. Task and list routes reject filters; basic notes routes use only parent_object/parent_record_id (or linked_record_type/linked_record_id), not nested groups; workspace-wide note search is rejected. Explicit sort is accepted only as relevance for strategy-based content queries. People and companies reject updated_at/modified_at timeframe searches; use created_at or last_interaction instead. Timeframe and relationship query routes target object-record endpoints, not task, list, or note endpoints, and reject additional filters or text query. Custom resource slugs must be configured in this server. On strategy-based routes, text query is rejected for records and configured custom objects; tasks accept it only with search_type=content. Companies, people, and deals reject text query when filters are supplied.',
      recovery:
        'If attributes are unknown or a page is empty, discover searchable fields.',
      alternatives: [
        'records_search_advanced',
        'records_get_details',
        'search',
      ],
    },
  },
  inputSchema: searchRecordsSchema,
});
