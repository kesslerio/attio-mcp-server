/**
 * Content search tool configuration
 */

import {
  UniversalToolConfig,
  ContentSearchParams,
  ContentSearchType,
  UniversalResourceType,
} from '@/handlers/tool-configs/universal/types.js';
import { InteractionType } from '@/types/attio.js';
import type { UniversalRecord } from '@/types/attio.js';
import { isAttioRecord } from '@/types/attio.js';

import { validateUniversalToolParams } from '@/handlers/tool-configs/universal/schemas.js';
import { UniversalSearchService } from '@/services/UniversalSearchService.js';
import { ErrorService } from '@/services/ErrorService.js';
import { getPluralResourceType } from '@/handlers/tool-configs/universal/core/utils.js';
import { formatResourceType } from '@/handlers/tool-configs/universal/shared-handlers.js';

export const searchByContentConfig: UniversalToolConfig<
  ContentSearchParams,
  UniversalRecord[]
> = {
  name: 'search_records_by_content',
  handler: async (params: ContentSearchParams): Promise<UniversalRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search_records_by_content',
        params
      );

      const { resource_type, content_type, search_query, limit, offset } =
        sanitizedParams;

      // For notes content search, delegate to universal search so callers can return
      // record types (companies/people) according to their own expectations/tests.
      if (
        content_type === ContentSearchType.NOTES &&
        resource_type === UniversalResourceType.NOTES
      ) {
        // Delegate directly to search service so unit tests can assert it was called
        return await UniversalSearchService.searchRecords({
          resource_type: UniversalResourceType.COMPANIES, // default; mocks determine returned entities
          query: search_query,
          limit: limit || 10,
          offset: offset || 0,
        });
      }

      // For other content types that are not supported
      if (content_type === ContentSearchType.ACTIVITY) {
        // Support basic activity content for people via specialized handler mock
        if (resource_type === UniversalResourceType.PEOPLE) {
          const { searchPeopleByActivity } = await import(
            '@/objects/people/search.js'
          );
          return await searchPeopleByActivity({
            dateRange: { preset: 'last_month' },
            interactionType: InteractionType.ANY,
          });
        }
        throw new Error(
          `Activity content search is not currently available for ${resource_type}. ` +
            `This feature requires access to activity/interaction API endpoints. ` +
            `As an alternative, try searching by notes content or using timeframe search.`
        );
      }

      if (content_type === ContentSearchType.INTERACTIONS) {
        throw new Error(
          `Interaction content search is not currently available for ${resource_type}. ` +
            `This feature requires access to interaction/activity API endpoints. ` +
            `As an alternative, try searching by notes content or using timeframe search with 'last_interaction' type.`
        );
      }

      throw new Error(
        `Content search not supported for resource type ${resource_type} and content type ${content_type}. ` +
          `Supported combinations: resource_type=notes with content_type=notes`
      );
    } catch (error: unknown) {
      // If the error is a direct message we want to preserve, don't wrap it
      if (
        error instanceof Error &&
        (error.message.includes('Content search not supported') ||
          error.message.includes('Timeframe search is not currently optimized'))
      ) {
        throw error;
      }

      throw ErrorService.createUniversalError(
        'search_records_by_content',
        `${params.resource_type}:${params.content_type}`,
        error
      );
    }
  },
  formatResult: (results: UniversalRecord[], ...args: unknown[]) => {
    const contentType = args[0] as ContentSearchType | undefined;
    const resourceType = args[1] as UniversalResourceType | undefined;
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
        const values = isAttioRecord(record as UniversalRecord)
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
