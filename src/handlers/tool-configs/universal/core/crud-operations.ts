import {
  UniversalToolConfig,
  UniversalCreateParams,
  UniversalUpdateParams,
  UniversalDeleteParams,
  UniversalResourceType,
} from '../types.js';
import { AttioRecord, EnhancedAttioRecord } from '../../../../types/attio.js';
import {
  createRecordSchema,
  updateRecordSchema,
  deleteRecordSchema,
  validateUniversalToolParams,
} from '../schemas.js';
import {
  handleUniversalCreate,
  handleUniversalUpdate,
  handleUniversalDelete,
  getSingularResourceType,
} from '../shared-handlers.js';
import {
  handleCreateError,
  handleUpdateError,
  handleDeleteError,
} from './error-utils.js';
import {
  extractDisplayName,
  formatValidationDetails,
  ValidationMetadata,
} from './utils.js';

export const createRecordConfig: UniversalToolConfig = {
  name: 'create-record',
  handler: async (params: UniversalCreateParams): Promise<AttioRecord> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'create-record',
        params
      );

      const { CrossResourceValidator } = await import('../schemas.js');
      await CrossResourceValidator.validateRecordRelationships(
        sanitizedParams.resource_type,
        sanitizedParams.record_data
      );

      const result = await handleUniversalCreate(sanitizedParams);
      try {
        if (sanitizedParams.resource_type === 'tasks') {
          const { logTaskDebug, inspectTaskRecordShape } = await import(
            '../../../../utils/task-debug.js'
          );
          logTaskDebug('mcp.create-record', 'Returning MCP task record', {
            shape: inspectTaskRecordShape(result),
          });
        }
      } catch {
        // Ignore formatting errors
      }

      return result;
    } catch (error: unknown) {
      return await handleCreateError(
        error,
        params.resource_type,
        params.record_data as Record<string, unknown>
      );
    }
  },
  formatResult: (
    record: AttioRecord,
    resourceType?: UniversalResourceType
  ): string => {
    if (!record) {
      return 'Record creation failed';
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';

    const inferredName = extractDisplayName(
      record.values as Record<string, unknown> | undefined,
      resourceType
    );
    const displayName =
      inferredName === 'Unnamed' ? `New ${resourceTypeName}` : inferredName;

    const id = String(
      record.id?.record_id ||
        (record as { record_id?: string }).record_id ||
        'unknown'
    );

    return `✅ Successfully created ${resourceTypeName}: ${displayName} (ID: ${id})`;
  },
};

export const updateRecordConfig: UniversalToolConfig = {
  name: 'update-record',
  handler: async (
    params: UniversalUpdateParams
  ): Promise<EnhancedAttioRecord> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'update-record',
        params
      );

      const { CrossResourceValidator } = await import('../schemas.js');
      await CrossResourceValidator.validateRecordRelationships(
        sanitizedParams.resource_type,
        sanitizedParams.record_data
      );

      let result: EnhancedAttioRecord;
      if (sanitizedParams.resource_type === 'deals') {
        try {
          const { UniversalUpdateService } = await import(
            '../../../../services/UniversalUpdateService.js'
          );
          const enhancedResult =
            await UniversalUpdateService.updateRecordWithValidation(
              sanitizedParams
            );

          result = {
            ...enhancedResult.record,
            validationMetadata: {
              warnings: enhancedResult.validation.warnings,
              suggestions: enhancedResult.validation.suggestions,
              actualValues: enhancedResult.validation.actualValues,
            },
          } as EnhancedAttioRecord;
        } catch (error: unknown) {
          const standardResult = await handleUniversalUpdate(sanitizedParams);
          result = { ...standardResult } as EnhancedAttioRecord;
        }
      } else {
        const standardResult = await handleUniversalUpdate(sanitizedParams);
        result = { ...standardResult } as EnhancedAttioRecord;
      }

      try {
        if (sanitizedParams.resource_type === 'tasks') {
          const { logTaskDebug, inspectTaskRecordShape } = await import(
            '../../../../utils/task-debug.js'
          );
          logTaskDebug('mcp.update-record', 'Returning MCP task record', {
            shape: inspectTaskRecordShape(result),
          });
        }
      } catch {
        // Ignore formatting errors
      }
      return result;
    } catch (error: unknown) {
      return await handleUpdateError(
        error,
        params.resource_type,
        params.record_data as Record<string, unknown>,
        params.record_id,
        undefined // validation metadata not available in error case
      );
    }
  },
  formatResult: (
    record: EnhancedAttioRecord,
    resourceType?: UniversalResourceType
  ): string => {
    if (!record) {
      return 'Record update failed';
    }

    const metadata = (record.validationMetadata ??
      (record.metadata as ValidationMetadata | undefined)) as
      | ValidationMetadata
      | undefined;

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';

    const name = extractDisplayName(
      record.values as Record<string, unknown> | undefined,
      resourceType
    );
    const id = String(record.id?.record_id || 'unknown');
    const hasWarnings = Boolean(metadata?.warnings?.length);

    const baseMessage = hasWarnings
      ? `⚠️  Updated ${resourceTypeName} with warnings: ${name} (ID: ${id})`
      : `✅ Successfully updated ${resourceTypeName}: ${name} (ID: ${id})`;

    return `${baseMessage}${formatValidationDetails(metadata)}`;
  },
};

export const deleteRecordConfig: UniversalToolConfig = {
  name: 'delete-record',
  handler: async (
    params: UniversalDeleteParams
  ): Promise<{ success: boolean; record_id: string }> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'delete-record',
        params
      );
      return await handleUniversalDelete(sanitizedParams);
    } catch (error: unknown) {
      return await handleDeleteError(
        error,
        params.resource_type,
        params.record_id
      );
    }
  },
  formatResult: (
    result: { success: boolean; record_id: string },
    resourceType?: UniversalResourceType
  ): string => {
    if (!result.success) {
      return `❌ Failed to delete ${resourceType ? getSingularResourceType(resourceType) : 'record'} with ID: ${result.record_id}`;
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';
    return `✅ Successfully deleted ${resourceTypeName} with ID: ${result.record_id}`;
  },
};

export const createRecordDefinition = {
  name: 'create-record',
  description: 'Create a new record of any supported type',
  inputSchema: createRecordSchema,
};

export const updateRecordDefinition = {
  name: 'update-record',
  description: 'Update an existing record of any supported type',
  inputSchema: updateRecordSchema,
};

export const deleteRecordDefinition = {
  name: 'delete-record',
  description: 'Delete a record of any supported type',
  inputSchema: deleteRecordSchema,
};
