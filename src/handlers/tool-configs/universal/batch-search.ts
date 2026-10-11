import { extractResourceTypeFromFormatArgs } from '@/handlers/tool-configs/universal/core/utils.js';
import { batchSearchResultContract } from '@/handlers/tools/result-schemas.js';
import { normalizeBatch } from '@/handlers/tool-configs/universal/read-result-adapters.js';
/**
 * Dedicated batch search tool configuration
 * Provides a clean API for batch search operations with multiple queries
 */
import { defineOperationTool } from '@/handlers/tools/operation-descriptor.js';

import {
  universalBatchSearch,
  UniversalBatchSearchResult,
} from '@/api/operations/batch.js';
import {
  UniversalToolConfig,
  UniversalResourceType,
} from '@/handlers/tool-configs/universal/types.js';
import { formatResourceType } from '@/handlers/tool-configs/universal/shared-handlers.js';
import { validateUniversalToolParams } from '@/handlers/tool-configs/universal/schemas.js';
import { ErrorService } from '@/services/ErrorService.js';
import { isAttioRecord, type UniversalRecordResult } from '@/types/attio.js';
import { validateBatchOperation } from '@/utils/batch-validation.js';

// Note: Batch processing is now handled by the optimized universalBatchSearch API

/**
 * Batch search parameters interface
 */
export interface BatchSearchParams {
  resource_type: UniversalResourceType;
  queries: string[];
  limit?: number;
  offset?: number;
}

/**
 * Universal batch search tool
 * Handles multiple search queries in parallel with error isolation
 * Enhanced for Issue #471 with optimized batch API
 */
export const batchSearchConfig = {
  name: 'records_batch_search',
  ...batchSearchResultContract,
  structuredOutput: (result: unknown) => normalizeBatch(result, true),
  handler: async (
    params: BatchSearchParams
  ): Promise<UniversalBatchSearchResult[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'records_batch_search',
        params
      );

      const { resource_type, queries, limit, offset } = sanitizedParams;

      if (!queries || !Array.isArray(queries) || queries.length === 0) {
        throw new Error('Queries array is required and must not be empty');
      }

      // Validate batch operation with comprehensive checks
      const searchValidation = validateBatchOperation({
        items: queries,
        operationType: 'search',
        resourceType: resource_type,
        checkPayload: false, // Queries don't need payload size check
      });
      if (!searchValidation.isValid) {
        throw new Error(searchValidation.error);
      }

      // Use optimized universal batch search API (Issue #471)
      return await universalBatchSearch(resource_type, queries, {
        limit,
        offset,
      });
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'records_batch_search',
        params?.resource_type ?? '',
        error
      );
    }
  },
  formatResult: (
    results: UniversalBatchSearchResult[] | unknown,
    resourceOrArgs?: UniversalResourceType | Record<string, unknown>
  ) => {
    const resourceType = extractResourceTypeFromFormatArgs([resourceOrArgs]);
    if (!results || !Array.isArray(results)) {
      return 'Batch search failed or returned no results';
    }

    // Cast to the proper type for enhanced batch search results
    const batchResults = results as UniversalBatchSearchResult[];

    const resourceTypeName = resourceType
      ? formatResourceType(resourceType as UniversalResourceType)
      : 'record';

    // Handle proper pluralization (reuse helper logic from core/index.ts)
    const getPluralForm = (count: number, singular: string): string => {
      if (count === 1) return singular;
      if (singular === 'company') return 'companies';
      if (singular === 'person') return 'people';
      return `${singular}s`;
    };

    const successCount = batchResults.filter((r) => r.success).length;
    const failureCount = batchResults.length - successCount;

    let summary = `Batch search completed: ${successCount} successful, ${failureCount} failed\n\n`;

    // Show successful search results
    const successful = batchResults.filter((r) => r.success);
    if (successful.length > 0) {
      summary += `Successful searches:\n`;
      successful.forEach(
        (searchResult: UniversalBatchSearchResult, index: number) => {
          const query = searchResult.query;
          const records = searchResult.result || [];

          summary += `\n${index + 1}. Query: "${query}" - Found ${
            records.length
          } ${getPluralForm(records.length, resourceTypeName)}\n`;

          if (Array.isArray(records) && records.length > 0) {
            // Show first few results for each query
            const displayCount = Math.min(records.length, 3);
            records
              .slice(0, displayCount)
              .forEach((record: UniversalRecordResult, recordIndex: number) => {
                const values = isAttioRecord(record)
                  ? (record.values as Record<string, unknown>)
                  : (record as Record<string, unknown>);
                const recordId = record.id as Record<string, unknown>;
                const name =
                  (values?.name as Record<string, unknown>[])?.[0]?.value ||
                  (values?.title as Record<string, unknown>[])?.[0]?.value ||
                  (typeof values?.name === 'string'
                    ? values.name
                    : undefined) ||
                  'Unnamed';
                const id =
                  recordId?.record_id || recordId?.list_id || 'unknown';

                summary += `   ${recordIndex + 1}. ${name} (ID: ${id})\n`;
              });

            if (records.length > displayCount) {
              summary += `   ... and ${records.length - displayCount} more\n`;
            }
          }
        }
      );
    }

    // Show errors for failed searches
    const failed = batchResults.filter((r) => !r.success);
    if (failed.length > 0) {
      summary += `\nFailed searches:\n`;
      failed.forEach(
        (searchResult: UniversalBatchSearchResult, index: number) => {
          const query = searchResult.query || 'Unknown query';
          const error = searchResult.error || 'Unknown error';
          summary += `${index + 1}. Query: "${query}" - Error: ${error}\n`;
        }
      );
    }

    return summary;
  },
} as unknown as UniversalToolConfig;

/**
 * Batch search schema definition
 */
export const batchSearchSchema = {
  type: 'object' as const,
  properties: {
    resource_type: {
      type: 'string' as const,
      enum: Object.values(UniversalResourceType),
      description:
        'Resource type to search (companies, people, records, tasks, deals)',
    },
    queries: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Array of search query strings',
      minItems: 1,
    },
    limit: {
      type: 'number' as const,
      minimum: 1,
      maximum: 100,
      description: 'Maximum number of results per query (default: 20)',
    },
    offset: {
      type: 'number' as const,
      minimum: 0,
      description: 'Number of results to skip per query (default: 0)',
    },
  },
  required: ['resource_type' as const, 'queries' as const],
  additionalProperties: false,
  examples: [
    {
      resource_type: 'companies',
      queries: ['Acme', 'Globex'],
      limit: 10,
    },
  ],
};

/**
 * Batch search tool definition for MCP protocol
 */
export const batchSearchToolDefinition = defineOperationTool({
  name: 'records_batch_search',
  facts: {
    operation: {
      customObjectSlugs: false,
      authRequired: true,
      action: 'batch',
      resourceTypes: [
        'companies',
        'people',
        'deals',
        'tasks',
        'lists',
        'records',
      ],
      readOnly: true,
      destructive: false,
      idempotent: true,
      pagination: { kind: 'offset', supported: false, cap: null },
    },
    guidance: {
      capability:
        'Run several searches together and return grouped outcomes per query.',
      boundaries: 'mutate or import data; use records_batch for writes.',
      constraints:
        'Provide a queries array (1-10 recommended) and resource_type; per-query failures are reported. limit/offset are forwarded only for lists, records, tasks, and deals; companies and people ignore them; no continuation cursor or universal page cap is guaranteed. Query-array searches for records and tasks ignore each text query, so distinct queries can return the same records. Company, person, and deal searches ignore text query when filters are supplied.',
      recovery: 'Retry a failed query on its own with records_search.',
      alternatives: ['records_batch', 'records_search'],
    },
  },
  inputSchema: batchSearchSchema,
});
