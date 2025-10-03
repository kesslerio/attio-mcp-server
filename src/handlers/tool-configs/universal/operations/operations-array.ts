import type { JsonObject } from '../../../../types/attio.js';
import type { UniversalResourceType } from '../types.js';
import {
  handleUniversalCreate,
  handleUniversalUpdate,
  handleUniversalDelete,
} from '../shared-handlers.js';

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
  const results = await Promise.all(
    operations.map(async (operationInput, index) => {
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
