/**
 * Batch operations tool configuration
 */

import {
  UniversalToolConfig,
  UniversalResourceType,
  BatchOperationType,
} from '../types.js';
import { validateUniversalToolParams } from '../schemas.js';
import { ErrorService } from '../../../../services/ErrorService.js';
import { formatBatchResult } from './batch-format.js';
import { executeOperationsArray } from './operations-array.js';
import { executeLegacyBatch } from './legacy-handlers.js';
import type { JsonObject } from '../../../../types/attio.js';

export const batchOperationsConfig: UniversalToolConfig = {
  name: 'batch-operations',
  handler: async (
    params: Record<string, unknown>
  ): Promise<Record<string, unknown> | Record<string, unknown>[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'batch-operations',
        params
      ) as JsonObject;

      const resourceType =
        sanitizedParams.resource_type as UniversalResourceType;
      const operations = sanitizedParams.operations as JsonObject[] | undefined;

      if (operations && operations.length > 0) {
        return executeOperationsArray(resourceType, operations);
      }

      return executeLegacyBatch({
        resourceType,
        params: sanitizedParams,
      });
    } catch (error: unknown) {
      const typedParams = params as Record<string, unknown>;
      throw ErrorService.createUniversalError(
        'batch operations',
        `${typedParams?.resource_type}:${typedParams?.operation_type}`,
        error
      );
    }
  },
  formatResult: (
    results: Record<string, unknown> | Record<string, unknown>[],
    operationType?: BatchOperationType,
    resourceType?: UniversalResourceType
  ) =>
    formatBatchResult(
      results as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | undefined,
      operationType,
      resourceType
    ),
};
