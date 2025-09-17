/**
 * Dedicated batch search tool configuration
 * Provides a clean API for batch search operations with multiple queries
 */

import { UniversalToolConfig, UniversalResourceType } from './types.js';

import { validateUniversalToolParams } from './schemas.js';

import { formatResourceType } from './shared-handlers.js';

// Import ErrorService for error handling
import { ErrorService } from '../../../services/ErrorService.js';

import { AttioRecord } from '../../../types/attio.js';
import { validateBatchOperation } from '../../../utils/batch-validation.js';

// Import enhanced batch API for optimized performance (Issue #471)
import {
  universalBatchSearch,
  UniversalBatchSearchResult,
} from '../../../api/operations/batch.js';

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
  name: 'batch-search',
  handler: async (
    params: BatchSearchParams
  ): Promise<UniversalBatchSearchResult[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'batch-search',
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
        'batch search',
        params.resource_type,
        error
      );
    }
  },
  formatResult: (
    results: UniversalBatchSearchResult[] | unknown,
    resourceType?: UniversalResourceType
  ) => {
    if (!results || !Array.isArray(results)) {
      return 'Batch search failed or returned no results';
    }

    // Cast to the proper type for enhanced batch search results
    const batchResults = results as UniversalBatchSearchResult[];

    const resourceTypeName = resourceType
      ? formatResourceType(resourceType)
      : 'record';

    // Handle proper pluralization (same logic as core-operations.ts)
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

          summary += `\n${index + 1}. Query: "${query}" - Found ${records.length} ${getPluralForm(records.length, resourceTypeName)}\n`;

          if (Array.isArray(records) && records.length > 0) {
            // Show first few results for each query
            const displayCount = Math.min(records.length, 3);
            records
              .slice(0, displayCount)
              .forEach((record: AttioRecord, recordIndex: number) => {
                const values = record.values as Record<string, unknown>;
                const recordId = record.id as Record<string, unknown>;
                const name =
                  (values?.name as Record<string, unknown>[])?.[0]?.value ||
                  (values?.title as Record<string, unknown>[])?.[0]?.value ||
                  'Unnamed';
                const id = recordId?.record_id || 'unknown';

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
};

/**
 * Batch search tool definition for MCP protocol
 */
export const batchSearchToolDefinition = {
  name: 'batch-search',
  description:
    'Perform batch search operations with multiple queries in parallel',
  inputSchema: batchSearchSchema,
};
