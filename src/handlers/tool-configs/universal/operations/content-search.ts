import { normalizeRecordCollection } from '@/handlers/tool-configs/universal/read-result-adapters.js';
import { recordSearchResultContract } from '@/handlers/tools/result-schemas.js';
/**
 * Content search tool configuration
 */

import {
  UniversalToolConfig,
  ContentSearchParams,
  ContentSearchType,
  UniversalResourceType,
} from '@/handlers/tool-configs/universal/types.js';
import type { UniversalRecordResult } from '@/types/attio.js';
import { isAttioRecord } from '@/types/attio.js';

import { validateUniversalToolParams } from '@/handlers/tool-configs/universal/schemas.js';
import { UniversalValidationError } from '@/handlers/tool-configs/universal/errors/validation-errors.js';
import { ErrorService } from '@/services/ErrorService.js';
import {
  getPluralResourceType,
  extractResourceTypeFromFormatArgs,
} from '@/handlers/tool-configs/universal/core/utils.js';
import { formatResourceType } from '@/handlers/tool-configs/universal/shared-handlers.js';

export const searchByContentConfig: UniversalToolConfig<
  ContentSearchParams,
  UniversalRecordResult[]
> = {
  name: 'records_search_by_content',
  ...recordSearchResultContract,
  structuredOutput: normalizeRecordCollection,
  handler: async (
    params: ContentSearchParams
  ): Promise<UniversalRecordResult[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'records_search_by_content',
        params
      );

      throw new UniversalValidationError(
        `Content search not supported for resource type ${sanitizedParams.resource_type} and content type ${sanitizedParams.content_type}. ` +
          'Note, activity, and interaction body search is not supported. Use notes_list for notes on a known record or records_get_interactions for interaction metadata.',
        undefined,
        { field: 'content_type' }
      );
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'records_search_by_content',
        `${params.resource_type}:${params.content_type}`,
        error
      );
    }
  },
  formatResult: (results: UniversalRecordResult[], ...args: unknown[]) => {
    const first = args[0];
    const contentType =
      first && typeof first === 'object' && 'content_type' in first
        ? (first.content_type as ContentSearchType | undefined)
        : (first as ContentSearchType | undefined);
    const resourceType =
      first && typeof first === 'object'
        ? (extractResourceTypeFromFormatArgs(args) as
            | UniversalResourceType
            | undefined)
        : (args[1] as UniversalResourceType | undefined);
    if (!Array.isArray(results)) {
      return 'Found 0 records (content search)\nTip: Ensure your workspace has notes/content for this query.';
    }

    const contentTypeName = contentType ? contentType : 'content';
    const resultCount = results.length;
    const resourceTypeName = resourceType
      ? resultCount === 1
        ? formatResourceType(resourceType)
        : getPluralResourceType(resourceType)
      : resultCount === 1
        ? 'record'
        : 'records';

    return `Found ${
      results.length
    } ${resourceTypeName} with matching ${contentTypeName}:\n${results
      .map((record: Record<string, unknown>, index: number) => {
        const values = isAttioRecord(record as UniversalRecordResult)
          ? ((record as { values?: Record<string, unknown> }).values as Record<
              string,
              unknown
            >)
          : (record as Record<string, unknown>);
        const recordId = (record as { id?: Record<string, unknown> }).id;
        const name =
          (values?.name as Record<string, unknown>[])?.[0]?.value ||
          (values?.name as Record<string, unknown>[])?.[0]?.full_name ||
          (values?.full_name as Record<string, unknown>[])?.[0]?.value ||
          (values?.title as Record<string, unknown>[])?.[0]?.value ||
          (typeof values?.name === 'string' ? values.name : undefined) ||
          'Unnamed';
        const id =
          recordId?.record_id ||
          recordId?.list_id ||
          (typeof recordId === 'string' ? recordId : 'unknown');

        return `${index + 1}. ${name} (ID: ${id})`;
      })
      .join('\n')}`;
  },
};
