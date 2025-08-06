/**
 * Advanced universal operations tool configurations
 *
 * These 5 tools provide sophisticated search and batch capabilities
 * across all resource types.
 */

// Import specialized handlers
import {
  searchCompaniesByNotes,
  searchCompaniesByPeople,
} from '../../../objects/companies/index.js';
import {
  searchPeopleByCompany,
  searchPeopleByNotes,
} from '../../../objects/people/index.js';
// Import date-related functions directly from search module to avoid potential circular imports
import {
  searchPeopleByActivity,
  searchPeopleByCreationDate,
  searchPeopleByLastInteraction,
  searchPeopleByModificationDate,
} from '../../../objects/people/search.js';
import {
  ActivityFilter,
  AttioRecord,
  InteractionType,
} from '../../../types/attio.js';
import { validateAndCreateDateRange } from '../../../utils/date-utils.js';
import {
  advancedSearchSchema,
  batchOperationsSchema,
  searchByContentSchema,
  searchByRelationshipSchema,
  searchByTimeframeSchema,
  validateUniversalToolParams,
} from './schemas.js';
import {
  createUniversalError,
  formatResourceType,
  handleUniversalCreate,
  handleUniversalDelete,
  handleUniversalGetDetails,
  handleUniversalSearch,
  handleUniversalUpdate,
} from './shared-handlers.js';
import {
  AdvancedSearchParams,
  BatchOperationsParams,
  BatchOperationType,
  ContentSearchParams,
  ContentSearchType,
  RelationshipSearchParams,
  RelationshipType,
  TimeframeSearchParams,
  TimeframeType,
  UniversalResourceType,
  UniversalToolConfig,
} from './types.js';

// Performance and safety constants
const MAX_BATCH_SIZE = 50; // Maximum number of records per batch operation
const BATCH_DELAY_MS = 100; // Delay between API calls to respect rate limits
const MAX_CONCURRENT_REQUESTS = 5; // Maximum number of concurrent API requests

/**
 * Validates batch operation size for performance and safety
 */
function validateBatchSize(items: any[], operationType: string): void {
  if (items && items.length > MAX_BATCH_SIZE) {
    throw new Error(
      `Batch ${operationType} size (${items.length}) exceeds maximum allowed (${MAX_BATCH_SIZE}). ` +
        `Please split into smaller batches for performance and safety.`
    );
  }
}

/**
 * Adds a small delay between API calls to respect rate limits
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processes items in parallel with controlled concurrency and error isolation
 * Each item's success/failure is tracked independently for batch operations
 */
async function processInParallelWithErrorIsolation<T>(
  items: T[],
  processor: (item: T, index: number) => Promise<any>,
  maxConcurrency: number = MAX_CONCURRENT_REQUESTS
): Promise<
  Array<{ success: boolean; result?: any; error?: string; data?: T }>
> {
  const results: Array<{
    success: boolean;
    result?: any;
    error?: string;
    data?: T;
  }> = [];

  // Process items in chunks to control concurrency
  for (let i = 0; i < items.length; i += maxConcurrency) {
    const chunk = items.slice(i, i + maxConcurrency);

    // Process chunk in parallel with Promise.allSettled for error isolation
    const chunkPromises = chunk.map(async (item, chunkIndex) => {
      try {
        const result = await processor(item, i + chunkIndex);
        return { success: true, result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          data: item,
        };
      }
    });

    const chunkResults = await Promise.allSettled(chunkPromises);

    // Add results from this chunk (allSettled results are always fulfilled)
    for (const settledResult of chunkResults) {
      if (settledResult.status === 'fulfilled') {
        results.push(settledResult.value);
      } else {
        // This should rarely happen since we handle errors in the inner promise
        results.push({
          success: false,
          error: `Unexpected processing error: ${settledResult.reason}`,
        });
      }
    }

    // Add delay between chunks to respect rate limits
    if (i + maxConcurrency < items.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return results;
}

/**
 * Universal advanced search tool
 * Consolidates complex filtering across all resource types
 */
export const advancedSearchConfig: UniversalToolConfig = {
  name: 'advanced-search',
  handler: async (params: AdvancedSearchParams): Promise<AttioRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'advanced-search',
        params
      );

      const { resource_type, query, filters, limit, offset } = sanitizedParams;

      // Use the universal search handler with advanced filtering
      return await handleUniversalSearch({
        resource_type,
        query,
        filters,
        limit,
        offset,
      });
    } catch (error) {
      throw createUniversalError(
        'advanced search',
        params.resource_type,
        error
      );
    }
  },
  formatResult: (
    results: AttioRecord[],
    resourceType?: UniversalResourceType
  ) => {
    if (!Array.isArray(results)) {
      return 'No results found';
    }

    const resourceTypeName = resourceType
      ? formatResourceType(resourceType)
      : 'record';
    // Handle proper pluralization
    let plural = resourceTypeName;
    if (results.length !== 1) {
      if (resourceTypeName === 'company') {
        plural = 'companies';
      } else if (resourceTypeName === 'person') {
        plural = 'people';
      } else {
        plural = `${resourceTypeName}s`;
      }
    }

    return `Advanced search found ${results.length} ${plural}:\n${results
      .map((record: any, index: number) => {
        const name =
          record.values?.name?.[0]?.value ||
          record.values?.name?.[0]?.full_name ||
          record.values?.full_name?.[0]?.value ||
          record.values?.title?.[0]?.value ||
          'Unnamed';
        const id = record.id?.record_id || 'unknown';

        // Include additional context for advanced search results
        const website = record.values?.website?.[0]?.value;
        const email = record.values?.email?.[0]?.value;
        const industry = record.values?.industry?.[0]?.value;
        const location = record.values?.location?.[0]?.value;

        let context = '';
        if (industry) context += ` [${industry}]`;
        if (location) context += ` (${location})`;
        if (website) context += ` - ${website}`;
        else if (email) context += ` - ${email}`;

        return `${index + 1}. ${name}${context} (ID: ${id})`;
      })
      .join('\n')}`;
  },
};

/**
 * Universal search by relationship tool
 * Handles cross-entity relationship searches
 */
export const searchByRelationshipConfig: UniversalToolConfig = {
  name: 'search-by-relationship',
  handler: async (params: RelationshipSearchParams): Promise<AttioRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search-by-relationship',
        params
      );

      const { relationship_type, source_id } = sanitizedParams;

      switch (relationship_type) {
        case RelationshipType.COMPANY_TO_PEOPLE:
          return await searchPeopleByCompany(source_id);

        case RelationshipType.PEOPLE_TO_COMPANY:
          return await searchCompaniesByPeople(source_id);

        case RelationshipType.PERSON_TO_TASKS:
        case RelationshipType.COMPANY_TO_TASKS:
          // Task relationship search requires filtering tasks by linked records
          // This functionality depends on the Attio API's task filtering capabilities
          throw new Error(
            `Task relationship search (${relationship_type}) is not currently available. ` +
              `This feature requires enhanced API filtering capabilities. ` +
              `As a workaround, you can use the 'search-records' tool with resource_type='tasks' to find all tasks, ` +
              `then filter the results programmatically.`
          );

        default:
          throw new Error(
            `Unsupported relationship type: ${relationship_type}`
          );
      }
    } catch (error) {
      throw createUniversalError(
        'relationship search',
        params.relationship_type,
        error
      );
    }
  },
  formatResult: (
    results: AttioRecord[],
    relationshipType?: RelationshipType
  ) => {
    if (!Array.isArray(results)) {
      return 'No related records found';
    }

    const relationshipName = relationshipType
      ? relationshipType.replace(/_/g, ' ')
      : 'relationship';

    return `Found ${results.length} records for ${relationshipName}:\n${results
      .map((record: any, index: number) => {
        const name =
          record.values?.name?.[0]?.value ||
          record.values?.name?.[0]?.full_name ||
          record.values?.full_name?.[0]?.value ||
          record.values?.title?.[0]?.value ||
          'Unnamed';
        const id = record.id?.record_id || 'unknown';
        const email = record.values?.email?.[0]?.value;
        const role =
          record.values?.role?.[0]?.value ||
          record.values?.position?.[0]?.value;

        let details = '';
        if (role) details += ` (${role})`;
        if (email) details += ` - ${email}`;

        return `${index + 1}. ${name}${details} (ID: ${id})`;
      })
      .join('\n')}`;
  },
};

/**
 * Universal search by content tool
 * Searches within notes, activity, and interactions
 */
export const searchByContentConfig: UniversalToolConfig = {
  name: 'search-by-content',
  handler: async (params: ContentSearchParams): Promise<AttioRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search-by-content',
        params
      );

      const { resource_type, content_type, search_query } = sanitizedParams;

      switch (content_type) {
        case ContentSearchType.NOTES:
          if (resource_type === UniversalResourceType.COMPANIES) {
            return await searchCompaniesByNotes(search_query);
          } else if (resource_type === UniversalResourceType.PEOPLE) {
            return await searchPeopleByNotes(search_query);
          }
          break;

        case ContentSearchType.ACTIVITY:
          if (resource_type === UniversalResourceType.PEOPLE) {
            // Create proper ActivityFilter with required dateRange property
            const activityFilter: ActivityFilter = {
              dateRange: {
                preset: 'last_month', // Default to last month for activity search
              },
              interactionType: InteractionType.ANY, // Search all interaction types
            };
            return await searchPeopleByActivity(activityFilter);
          }
          break;

        case ContentSearchType.INTERACTIONS:
          // Interaction-based content search requires access to interaction/activity APIs
          // This functionality may require additional Attio API endpoints
          throw new Error(
            `Interaction content search is not currently available for ${resource_type}. ` +
              `This feature requires access to interaction/activity API endpoints. ` +
              `As an alternative, try searching by notes content or using timeframe search with 'last_interaction' type.`
          );

        default:
          throw new Error(`Unsupported content type: ${content_type}`);
      }

      throw new Error(
        `Content search not supported for resource type ${resource_type} and content type ${content_type}`
      );
    } catch (error) {
      throw createUniversalError(
        'content search',
        `${params.resource_type}:${params.content_type}`,
        error
      );
    }
  },
  formatResult: (
    results: AttioRecord[],
    contentType?: ContentSearchType,
    resourceType?: UniversalResourceType
  ) => {
    if (!Array.isArray(results)) {
      return 'No content matches found';
    }

    const contentTypeName = contentType ? contentType : 'content';
    const resourceTypeName = resourceType
      ? formatResourceType(resourceType)
      : 'record';

    return `Found ${results.length} ${resourceTypeName}s with matching ${contentTypeName}:\n${results
      .map((record: any, index: number) => {
        const name =
          record.values?.name?.[0]?.value ||
          record.values?.name?.[0]?.full_name ||
          record.values?.full_name?.[0]?.value ||
          record.values?.title?.[0]?.value ||
          'Unnamed';
        const id = record.id?.record_id || 'unknown';

        return `${index + 1}. ${name} (ID: ${id})`;
      })
      .join('\n')}`;
  },
};

/**
 * Universal search by timeframe tool
 * Handles temporal filtering across resource types
 */
export const searchByTimeframeConfig: UniversalToolConfig = {
  name: 'search-by-timeframe',
  handler: async (params: TimeframeSearchParams): Promise<AttioRecord[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'search-by-timeframe',
        params
      );

      const { resource_type, timeframe_type, start_date, end_date } =
        sanitizedParams;

      if (resource_type === UniversalResourceType.PEOPLE) {
        switch (timeframe_type) {
          case TimeframeType.CREATED:
            return await searchPeopleByCreationDate({
              start: start_date,
              end: end_date,
            });

          case TimeframeType.MODIFIED:
            return await searchPeopleByModificationDate({
              start: start_date,
              end: end_date,
            });

          case TimeframeType.LAST_INTERACTION: {
            // Validate and create date range object
            const dateRange = validateAndCreateDateRange(start_date, end_date);
            if (!dateRange) {
              throw new Error(
                'At least one date (start or end) is required for last interaction search'
              );
            }
            return await searchPeopleByLastInteraction(dateRange);
          }

          default:
            throw new Error(
              `Unsupported timeframe type for people: ${timeframe_type}`
            );
        }
      } else {
        // For other resource types, use basic date filtering approach
        // This is a simplified implementation that may need enhancement based on API capabilities
        switch (resource_type) {
          case UniversalResourceType.COMPANIES:
          case UniversalResourceType.RECORDS:
          case UniversalResourceType.TASKS:
            throw new Error(
              `Timeframe search is not currently optimized for ${resource_type}. ` +
                `The Attio API does not provide native date filtering for this resource type. ` +
                `As a workaround, you can use 'advanced-search' with custom filter conditions or retrieve all records and filter programmatically.`
            );

          default:
            throw new Error(
              `Timeframe search not supported for resource type: ${resource_type}`
            );
        }
      }
    } catch (error) {
      throw createUniversalError(
        'timeframe search',
        `${params.resource_type}:${params.timeframe_type}`,
        error
      );
    }
  },
  formatResult: (
    results: AttioRecord[],
    timeframeType?: TimeframeType,
    resourceType?: UniversalResourceType
  ) => {
    if (!Array.isArray(results)) {
      return 'No records found in timeframe';
    }

    const timeframeName = timeframeType
      ? timeframeType.replace(/_/g, ' ')
      : 'timeframe';
    const resourceTypeName = resourceType
      ? formatResourceType(resourceType)
      : 'record';

    return `Found ${results.length} ${resourceTypeName}s by ${timeframeName}:\n${results
      .map((record: any, index: number) => {
        const name =
          record.values?.name?.[0]?.value ||
          record.values?.name?.[0]?.full_name ||
          record.values?.full_name?.[0]?.value ||
          record.values?.title?.[0]?.value ||
          'Unnamed';
        const id = record.id?.record_id || 'unknown';

        // Try to show relevant date information
        const created = record.created_at;
        const modified = record.updated_at;
        let dateInfo = '';

        if (timeframeType === TimeframeType.CREATED && created) {
          dateInfo = ` (created: ${new Date(created).toLocaleDateString()})`;
        } else if (timeframeType === TimeframeType.MODIFIED && modified) {
          dateInfo = ` (modified: ${new Date(modified).toLocaleDateString()})`;
        }

        return `${index + 1}. ${name}${dateInfo} (ID: ${id})`;
      })
      .join('\n')}`;
  },
};

/**
 * Universal batch operations tool
 * Handles bulk operations across resource types
 */
export const batchOperationsConfig: UniversalToolConfig = {
  name: 'batch-operations',
  handler: async (params: BatchOperationsParams): Promise<any> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'batch-operations',
        params
      );

      const {
        resource_type,
        operation_type,
        records,
        record_ids,
        limit,
        offset,
      } = sanitizedParams;

      switch (operation_type) {
        case BatchOperationType.CREATE:
          if (!records || records.length === 0) {
            throw new Error(
              'Records array is required for batch create operation'
            );
          }

          // Validate batch size for performance and safety
          validateBatchSize(records, 'create');

          // Use parallel processing with controlled concurrency
          return await processInParallelWithErrorIsolation(
            records,
            async (recordData: Record<string, any>) => {
              return await handleUniversalCreate({
                resource_type,
                record_data: recordData,
                return_details: true,
              });
            }
          );

        case BatchOperationType.UPDATE:
          if (!records || records.length === 0) {
            throw new Error(
              'Records array is required for batch update operation'
            );
          }

          // Validate batch size for performance and safety
          validateBatchSize(records, 'update');

          // Use parallel processing with controlled concurrency
          return await processInParallelWithErrorIsolation(
            records,
            async (recordData: Record<string, any>) => {
              if (!recordData.id) {
                throw new Error('Record ID is required for update operation');
              }

              return await handleUniversalUpdate({
                resource_type,
                record_id: recordData.id,
                record_data: recordData,
                return_details: true,
              });
            }
          );

        case BatchOperationType.DELETE:
          if (!record_ids || record_ids.length === 0) {
            throw new Error(
              'Record IDs array is required for batch delete operation'
            );
          }

          // Validate batch size for performance and safety
          validateBatchSize(record_ids, 'delete');

          // Use parallel processing with controlled concurrency
          return await processInParallelWithErrorIsolation(
            record_ids,
            async (recordId: string) => {
              return await handleUniversalDelete({
                resource_type,
                record_id: recordId,
              });
            }
          );

        case BatchOperationType.GET:
          if (!record_ids || record_ids.length === 0) {
            throw new Error(
              'Record IDs array is required for batch get operation'
            );
          }

          // Validate batch size for performance and safety
          validateBatchSize(record_ids, 'get');

          // Use parallel processing with controlled concurrency
          return await processInParallelWithErrorIsolation(
            record_ids,
            async (recordId: string) => {
              return await handleUniversalGetDetails({
                resource_type,
                record_id: recordId,
              });
            }
          );

        case BatchOperationType.SEARCH:
          // Batch search is essentially the same as regular search with pagination
          return await handleUniversalSearch({
            resource_type,
            limit,
            offset,
          });

        default:
          throw new Error(
            `Unsupported batch operation type: ${operation_type}`
          );
      }
    } catch (error) {
      throw createUniversalError(
        'batch operations',
        `${params.resource_type}:${params.operation_type}`,
        error
      );
    }
  },
  formatResult: (
    results: any,
    operationType?: BatchOperationType,
    resourceType?: UniversalResourceType
  ) => {
    if (!results) {
      return 'Batch operation failed';
    }

    const operationName = operationType ? operationType : 'operation';
    const resourceTypeName = resourceType
      ? formatResourceType(resourceType)
      : 'record';

    if (Array.isArray(results)) {
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      let summary = `Batch ${operationName} completed: ${successCount} successful, ${failureCount} failed\n\n`;

      if (operationType === BatchOperationType.SEARCH) {
        // Format as search results
        return `Batch search found ${results.length} ${resourceTypeName}s:\n${results
          .map((record: any, index: number) => {
            const name =
              record.values?.name?.[0]?.value ||
              record.values?.title?.[0]?.value ||
              'Unnamed';
            const id = record.id?.record_id || 'unknown';
            return `${index + 1}. ${name} (ID: ${id})`;
          })
          .join('\n')}`;
      }

      // Show details for successful operations
      const successful = results.filter((r) => r.success);
      if (successful.length > 0) {
        summary += `Successful operations:\n${successful
          .map((op: any, index: number) => {
            const name =
              op.result?.values?.name?.[0]?.value ||
              op.result?.values?.title?.[0]?.value ||
              op.result?.record_id ||
              'Unknown';
            return `${index + 1}. ${name}`;
          })
          .join('\n')}`;
      }

      // Show errors for failed operations
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        summary += `\n\nFailed operations:\n${failed
          .map((op: any, index: number) => {
            const identifier = op.record_id || op.data?.name || 'Unknown';
            return `${index + 1}. ${identifier}: ${op.error}`;
          })
          .join('\n')}`;
      }

      return summary;
    }

    return `Batch ${operationName} result: ${JSON.stringify(results)}`;
  },
};

/**
 * Advanced operations tool definitions for MCP protocol
 */
export const advancedOperationsToolDefinitions = {
  'advanced-search': {
    name: 'advanced-search',
    description:
      'Advanced search with complex filtering across all resource types',
    inputSchema: advancedSearchSchema,
  },
  'search-by-relationship': {
    name: 'search-by-relationship',
    description: 'Search records by their relationships to other entities',
    inputSchema: searchByRelationshipSchema,
  },
  'search-by-content': {
    name: 'search-by-content',
    description: 'Search within notes, activity, and interaction content',
    inputSchema: searchByContentSchema,
  },
  'search-by-timeframe': {
    name: 'search-by-timeframe',
    description:
      'Search records by temporal criteria (creation, modification, interaction dates)',
    inputSchema: searchByTimeframeSchema,
  },
  'batch-operations': {
    name: 'batch-operations',
    description:
      'Perform bulk operations (create, update, delete, get, search)',
    inputSchema: batchOperationsSchema,
  },
};

/**
 * Advanced operations tool configurations
 */
export const advancedOperationsToolConfigs = {
  'advanced-search': advancedSearchConfig,
  'search-by-relationship': searchByRelationshipConfig,
  'search-by-content': searchByContentConfig,
  'search-by-timeframe': searchByTimeframeConfig,
  'batch-operations': batchOperationsConfig,
};
