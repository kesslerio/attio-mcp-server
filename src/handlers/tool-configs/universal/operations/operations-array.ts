import type { JsonObject } from '../../../../types/attio.js';
import type { UniversalResourceType } from '../types.js';
import {
  handleUniversalCreate,
  handleUniversalUpdate,
  handleUniversalDelete,
} from '../shared-handlers.js';
import { validateBatchOperation } from '../../../../utils/batch-validation.js';
import { BATCH_CONFIG } from '../../../../config/batch-constants.js';

const { DEFAULT_CHUNK_SIZE, DEFAULT_MAX_BATCH } = BATCH_CONFIG;

export function extractRecordId(recordData: JsonObject): string {
  const rawId = recordData.id;
  if (typeof rawId === 'string') {
    return rawId;
  }

  if (rawId && typeof rawId === 'object') {
    const nestedId = (rawId as JsonObject).record_id;
    if (typeof nestedId === 'string') {
      return nestedId;
    }
  }

  return String(rawId ?? '');
}

export async function executeOperationsArray(
  resourceType: UniversalResourceType,
  operations: JsonObject[]
): Promise<JsonObject> {
  if (operations.length > DEFAULT_MAX_BATCH) {
    throw new Error(
      `Batch size (${operations.length}) exceeds maximum allowed (${DEFAULT_MAX_BATCH})`
    );
  }

  validateOperationGroups(resourceType, operations);

  const results: JsonObject[] = [];
  for (let chunkStart = 0; chunkStart < operations.length; chunkStart += DEFAULT_CHUNK_SIZE) {
    const chunk = operations.slice(chunkStart, chunkStart + DEFAULT_CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map(async (operationInput, chunkIndex) => {
        const index = chunkStart + chunkIndex;
      try {
        const operation = operationInput.operation as string;
        const recordData = operationInput.record_data as JsonObject;

        switch (operation) {
          case 'create': {
            const result = await handleUniversalCreate({
              resource_type: resourceType,
              record_data: recordData,
              return_details: true,
            });

            return {
              index,
              success: true,
              result,
            } as JsonObject;
          }

          case 'update': {
            if (!recordData || !recordData.id) {
              throw new Error('Record ID is required for update operation');
            }

            const recordId = extractRecordId(recordData);
            if (!recordId) {
              throw new Error('Record ID is required for update operation');
            }

            // Remove id field from record_data to avoid sending it as an attribute update
            const { id, ...updateData } = recordData;

            const result = await handleUniversalUpdate({
              resource_type: resourceType,
              record_id: recordId,
              record_data: updateData as JsonObject,
              return_details: true,
            });

            return {
              index,
              success: true,
              result,
            } as JsonObject;
          }

          case 'delete': {
            if (!recordData || !recordData.id) {
              throw new Error('Record ID is required for delete operation');
            }

            const recordId = extractRecordId(recordData);
            if (!recordId) {
              throw new Error('Record ID is required for delete operation');
            }

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
          }

          default:
            throw new Error(`Unsupported operation: ${operation}`);
        }
      } catch (error) {
        return {
          index,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        } as JsonObject;
      }
      })
    );
    results.push(...chunkResults);
  }

  const summary = {
    total: results.length,
    successful: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success).length,
  };

  return {
    operations: results,
    summary,
  } as JsonObject;
}

function validateOperationGroups(
  resourceType: UniversalResourceType,
  operations: JsonObject[]
): void {
  const createRecords: JsonObject[] = [];
  const updateRecords: JsonObject[] = [];
  const deleteIds: string[] = [];

  for (const operationInput of operations) {
    const operation = operationInput.operation as string;
    const recordData = operationInput.record_data as JsonObject;

    if (operation === 'create') {
      createRecords.push(recordData);
    } else if (operation === 'update') {
      updateRecords.push(recordData);
    } else if (operation === 'delete') {
      const recordId = extractRecordId(recordData);
      if (recordId) deleteIds.push(recordId);
    }
  }

  const createValidation = validateBatchOperation({
    items: createRecords,
    operationType: 'create',
    resourceType,
    checkPayload: true,
  });
  if (!createValidation.isValid) throw new Error(createValidation.error);

  const updateValidation = validateBatchOperation({
    items: updateRecords,
    operationType: 'update',
    resourceType,
    checkPayload: true,
  });
  if (!updateValidation.isValid) throw new Error(updateValidation.error);

  const deleteValidation = validateBatchOperation({
    items: deleteIds,
    operationType: 'delete',
    resourceType,
    checkPayload: false,
  });
  if (!deleteValidation.isValid) throw new Error(deleteValidation.error);
}
