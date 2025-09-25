import type { JsonObject } from '../../../../types/attio.js';
import { UniversalResourceType, BatchOperationType } from '../types.js';
import {
  handleUniversalCreate,
  handleUniversalUpdate,
  handleUniversalDelete,
  handleUniversalGetDetails,
} from '../shared-handlers.js';
import {
  validateBatchOperation,
  validateSearchQuery,
} from '../../../../utils/batch-validation.js';
import {
  universalBatchSearch,
  type UniversalBatchSearchResult,
} from '../../../../api/operations/batch.js';
import { extractRecordId } from './operations-array.js';
import { BATCH_CONFIG } from '../../../../config/batch-constants.js';

const {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MAX_BATCH,
  TEST_DELAY_MS,
  SEARCH_CHUNK_SIZE,
  SEARCH_TEST_DELAY_MS,
} = BATCH_CONFIG;

type LegacyBatchParams = {
  resourceType: UniversalResourceType;
  params: JsonObject;
};

function sleep(ms: number): Promise<void> {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function coerceNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export async function executeLegacyBatch({
  resourceType,
  params,
}: LegacyBatchParams): Promise<JsonObject | JsonObject[]> {
  const operationType = params.operation_type as BatchOperationType | undefined;

  if (!operationType) {
    throw new Error('operation_type is required for legacy batch operations');
  }

  switch (operationType) {
    case BatchOperationType.CREATE:
      return executeCreateBatch(resourceType, params);
    case BatchOperationType.UPDATE:
      return executeUpdateBatch(resourceType, params);
    case BatchOperationType.DELETE:
      return executeDeleteBatch(resourceType, params);
    case BatchOperationType.GET:
      return executeGetBatch(resourceType, params);
    case BatchOperationType.SEARCH:
      return executeSearchBatch(resourceType, params);
    default:
      throw new Error(`Unsupported batch operation type: ${operationType}`);
  }
}

async function executeCreateBatch(
  resourceType: UniversalResourceType,
  params: JsonObject
): Promise<JsonObject> {
  const records = params.records as JsonObject[] | undefined;
  if (!records?.length) {
    throw new Error('Records array is required for batch create operation');
  }

  if (records.length > DEFAULT_MAX_BATCH) {
    throw new Error(
      `Batch size (${records.length}) exceeds maximum allowed (${DEFAULT_MAX_BATCH})`
    );
  }

  const delayMs = process.env.NODE_ENV === 'test' ? TEST_DELAY_MS : 0;

  const operations = await processRecordChunks(
    records,
    async (record, index) => {
      try {
        const result = await handleUniversalCreate({
          resource_type: resourceType,
          record_data: record,
          return_details: true,
        });

        return {
          index,
          success: true,
          result,
        } as JsonObject;
      } catch (error) {
        return {
          index,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        } as JsonObject;
      }
    },
    delayMs
  );

  return buildSummary(operations);
}

async function executeUpdateBatch(
  resourceType: UniversalResourceType,
  params: JsonObject
): Promise<JsonObject> {
  const records = params.records as JsonObject[] | undefined;
  if (!records?.length) {
    throw new Error('Records array is required for batch update operation');
  }

  if (records.length > DEFAULT_MAX_BATCH) {
    throw new Error(
      `Batch size (${records.length}) exceeds maximum allowed (${DEFAULT_MAX_BATCH})`
    );
  }

  const validation = validateBatchOperation({
    items: records,
    operationType: 'update',
    resourceType,
    checkPayload: true,
  });

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const delayMs = process.env.NODE_ENV === 'test' ? TEST_DELAY_MS : 0;

  const operations = await processRecordChunks(
    records,
    async (record, index) => {
      try {
        const recordId = extractRecordId(record);
        if (!recordId) {
          throw new Error('Record ID is required for update operation');
        }

        const result = await handleUniversalUpdate({
          resource_type: resourceType,
          record_id: recordId,
          record_data: record,
          return_details: true,
        });

        return {
          index,
          success: true,
          result,
        } as JsonObject;
      } catch (error) {
        return {
          index,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        } as JsonObject;
      }
    },
    delayMs
  );

  return buildSummary(operations);
}

async function executeDeleteBatch(
  resourceType: UniversalResourceType,
  params: JsonObject
): Promise<JsonObject> {
  const recordIds = params.record_ids as string[] | undefined;
  if (!recordIds?.length) {
    throw new Error('Record IDs array is required for batch delete operation');
  }

  if (recordIds.length > DEFAULT_MAX_BATCH) {
    throw new Error(
      `Batch size (${recordIds.length}) exceeds maximum allowed (${DEFAULT_MAX_BATCH})`
    );
  }

  const delayMs = process.env.NODE_ENV === 'test' ? TEST_DELAY_MS : 0;

  const operations = await processIdChunks(
    recordIds,
    async (recordId, index) => {
      try {
        const result = await handleUniversalDelete({
          resource_type: resourceType,
          record_id: recordId,
        });

        return {
          index,
          success: true,
          result,
          record_id: recordId,
        } as JsonObject;
      } catch (error) {
        return {
          index,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          record_id: recordId,
        } as JsonObject;
      }
    },
    delayMs
  );

  return buildSummary(operations);
}

async function executeGetBatch(
  resourceType: UniversalResourceType,
  params: JsonObject
): Promise<JsonObject> {
  const recordIds = params.record_ids as string[] | undefined;
  if (!recordIds?.length) {
    throw new Error('Record IDs array is required for batch get operation');
  }

  if (recordIds.length > DEFAULT_MAX_BATCH) {
    throw new Error(
      `Batch size (${recordIds.length}) exceeds maximum allowed (${DEFAULT_MAX_BATCH})`
    );
  }

  const validation = validateBatchOperation({
    items: recordIds,
    operationType: 'get',
    resourceType,
    checkPayload: false,
  });

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const delayMs = process.env.NODE_ENV === 'test' ? TEST_DELAY_MS : 0;

  const operations = await processIdChunks(
    recordIds,
    async (recordId, index) => {
      try {
        const result = await handleUniversalGetDetails({
          resource_type: resourceType,
          record_id: recordId,
        });

        return {
          index,
          success: true,
          result,
          record_id: recordId,
        } as JsonObject;
      } catch (error) {
        return {
          index,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          record_id: recordId,
        } as JsonObject;
      }
    },
    delayMs
  );

  return buildSummary(operations);
}

async function executeSearchBatch(
  resourceType: UniversalResourceType,
  params: JsonObject
): Promise<JsonObject[] | JsonObject> {
  const queries = params.queries as string[] | undefined;

  if (queries && Array.isArray(queries) && queries.length > 0) {
    if (queries.length > DEFAULT_MAX_BATCH) {
      throw new Error(
        `Batch size (${queries.length}) exceeds maximum allowed (${DEFAULT_MAX_BATCH})`
      );
    }

    const validation = validateBatchOperation({
      items: queries,
      operationType: 'search',
      resourceType,
      checkPayload: false,
    });

    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const delayMs = process.env.NODE_ENV === 'test' ? SEARCH_TEST_DELAY_MS : 0;

    const aggregated: UniversalBatchSearchResult[] = [];
    for (let i = 0; i < queries.length; i += SEARCH_CHUNK_SIZE) {
      const chunk = queries.slice(i, i + SEARCH_CHUNK_SIZE);
      const chunkResults = await universalBatchSearch(resourceType, chunk, {
        limit: coerceNumber(params.limit),
        offset: coerceNumber(params.offset),
      });
      aggregated.push(...chunkResults);
      if (delayMs && i + SEARCH_CHUNK_SIZE < queries.length) {
        await sleep(delayMs);
      }
    }

    return aggregated.flatMap((result) => {
      const records = (result as unknown as JsonObject).result;
      return Array.isArray(records)
        ? (records.filter(
            (entry): entry is JsonObject =>
              typeof entry === 'object' && entry !== null
          ) as JsonObject[])
        : [];
    });
  }

  const validation = validateSearchQuery(undefined, {
    resource_type: resourceType,
    limit: coerceNumber(params.limit),
    offset: coerceNumber(params.offset),
  });

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const { handleUniversalSearch } = await import('../shared-handlers.js');
  const searchResults = await handleUniversalSearch({
    resource_type: resourceType,
    limit: coerceNumber(params.limit),
    offset: coerceNumber(params.offset),
  });
  return searchResults as unknown as JsonObject[];
}

async function processRecordChunks(
  records: JsonObject[],
  handler: (record: JsonObject, index: number) => Promise<JsonObject>,
  delayMs: number
): Promise<JsonObject[]> {
  const results: JsonObject[] = [];

  for (let i = 0; i < records.length; i += DEFAULT_CHUNK_SIZE) {
    const chunk = records.slice(i, i + DEFAULT_CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map((record, offsetIdx) => handler(record, i + offsetIdx))
    );
    results.push(...chunkResults);

    if (delayMs && i + DEFAULT_CHUNK_SIZE < records.length) {
      await sleep(delayMs);
    }
  }

  return results;
}

async function processIdChunks(
  recordIds: string[],
  handler: (recordId: string, index: number) => Promise<JsonObject>,
  delayMs: number
): Promise<JsonObject[]> {
  const results: JsonObject[] = [];

  for (let i = 0; i < recordIds.length; i += DEFAULT_CHUNK_SIZE) {
    const chunk = recordIds.slice(i, i + DEFAULT_CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map((recordId, offsetIdx) => handler(recordId, i + offsetIdx))
    );
    results.push(...chunkResults);

    if (delayMs && i + DEFAULT_CHUNK_SIZE < recordIds.length) {
      await sleep(delayMs);
    }
  }

  return results;
}

function buildSummary(operations: JsonObject[]): JsonObject {
  return {
    operations,
    summary: {
      total: operations.length,
      successful: operations.filter((op) => op.success).length,
      failed: operations.filter((op) => !op.success).length,
    },
  } as JsonObject;
}
