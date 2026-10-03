import { batchResultContract } from '@/handlers/tools/result-schemas.js';
import { normalizeBatch } from '@/handlers/tool-configs/universal/read-result-adapters.js';
/**
 * Batch operations tool configuration
 */

import {
  UniversalToolConfig,
  UniversalResourceType,
  BatchOperationType,
} from '@/handlers/tool-configs/universal/types.js';
import { validateUniversalToolParams } from '@/handlers/tool-configs/universal/schemas.js';
import { ErrorService } from '@/services/ErrorService.js';
import { formatBatchResult } from '@/handlers/tool-configs/universal/operations/batch-format.js';
import { executeOperationsArray } from '@/handlers/tool-configs/universal/operations/operations-array.js';
import { executeLegacyBatch } from '@/handlers/tool-configs/universal/operations/legacy-handlers.js';
import type { JsonObject } from '@/types/attio.js';

export const batchOperationsConfig: UniversalToolConfig<
  Record<string, unknown>,
  Record<string, unknown> | Record<string, unknown>[]
> = {
  name: 'batch_records',
  ...batchResultContract,
  structuredOutput: (result) => normalizeBatch(result),
  handler: async (
    params: Record<string, unknown>
  ): Promise<Record<string, unknown> | Record<string, unknown>[]> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'batch_records',
        params
      ) as JsonObject;

      const resourceType =
        sanitizedParams.resource_type as UniversalResourceType;
      const operations = sanitizedParams.operations as JsonObject[] | undefined;

      if (operations && operations.length > 0) {
        return await executeOperationsArray(resourceType, operations);
      }

      return await executeLegacyBatch({
        resourceType,
        params: sanitizedParams,
      });
    } catch (error: unknown) {
      const typedParams = params as Record<string, unknown>;
      throw ErrorService.createUniversalError(
        'batch_records',
        `${typedParams?.resource_type}:${typedParams?.operation_type}`,
        error
      );
    }
  },
  formatResult: (
    results: Record<string, unknown> | Record<string, unknown>[],
    ...args: unknown[]
  ) => {
    const first = args[0];
    const params =
      first && typeof first === 'object'
        ? (first as Record<string, unknown>)
        : undefined;
    const operationType = (params ? params.operation_type : first) as
      | BatchOperationType
      | undefined;
    const resourceType = (params ? params.resource_type : args[1]) as
      | UniversalResourceType
      | undefined;
    return formatBatchResult(
      results as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | undefined,
      operationType,
      resourceType
    );
  },
};
