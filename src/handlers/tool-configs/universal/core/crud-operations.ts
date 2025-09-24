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
import { handleCoreOperationError } from '../../../../utils/axios-error-mapper.js';

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
      return await handleCoreOperationError(
        error,
        'create',
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

    let displayName = `New ${resourceTypeName}`;

    if (resourceType === UniversalResourceType.PEOPLE && record.values) {
      const valuesAny = record.values as Record<string, unknown>;
      displayName =
        (valuesAny?.name as { full_name?: string }[] | undefined)?.[0]
          ?.full_name ||
        (valuesAny?.name as { value?: string }[] | undefined)?.[0]?.value ||
        (valuesAny?.name as { formatted?: string }[] | undefined)?.[0]
          ?.formatted ||
        (valuesAny?.full_name as { value?: string }[] | undefined)?.[0]
          ?.value ||
        `New ${resourceTypeName}`;
    } else if (record.values) {
      const coerce = (v: unknown): string | undefined => {
        if (v == null) return undefined;
        if (typeof v === 'string') return v;
        if (Array.isArray(v)) {
          const first = v[0] as { value?: string };
          if (typeof first === 'string') return first;
          if (first && typeof first === 'object' && 'value' in first)
            return String(first.value);
        }
        if (typeof v === 'object' && v !== null && 'value' in v)
          return String((v as { value: string }).value);
        return undefined;
      };
      const valuesRecord = record.values as Record<string, unknown>;
      displayName =
        coerce(valuesRecord?.name) ||
        coerce(valuesRecord?.title) ||
        coerce(valuesRecord?.content) ||
        `New ${resourceTypeName}`;
    }

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
      return await handleCoreOperationError(
        error,
        'update',
        params.resource_type,
        params.record_data as Record<string, unknown>
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

    const metadata = record.validationMetadata || {
      warnings: [],
      suggestions: [],
    };

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';

    let name = 'Unnamed';

    if (resourceType === UniversalResourceType.PEOPLE && record.values) {
      const valuesAny = record.values as Record<string, unknown>;
      name =
        (valuesAny?.name as { full_name?: string }[] | undefined)?.[0]
          ?.full_name ||
        (valuesAny?.name as { value?: string }[] | undefined)?.[0]?.value ||
        (valuesAny?.name as { formatted?: string }[] | undefined)?.[0]
          ?.formatted ||
        (valuesAny?.full_name as { value?: string }[] | undefined)?.[0]
          ?.value ||
        'Unnamed';
    } else if (record.values) {
      name =
        (record.values?.name &&
          Array.isArray(record.values.name) &&
          (record.values.name as { value: string }[])[0]?.value) ||
        (record.values?.title &&
          Array.isArray(record.values.title) &&
          (record.values.title as { value: string }[])[0]?.value) ||
        (record.values?.content && typeof record.values.content === 'string'
          ? record.values.content
          : undefined) ||
        'Unnamed';
    }

    const id = String(record.id?.record_id || 'unknown');

    const hasWarnings = metadata?.warnings && metadata.warnings.length > 0;
    const hasSuggestions =
      metadata?.suggestions && metadata.suggestions.length > 0;

    let result = hasWarnings
      ? `⚠️  Updated ${resourceTypeName} with warnings: ${name} (ID: ${id})`
      : `✅ Successfully updated ${resourceTypeName}: ${name} (ID: ${id})`;

    if (hasWarnings) {
      result += '\n\nWarnings:';
      metadata!.warnings.forEach((warning: string) => {
        result += `\n• ${warning}`;
      });
    }

    if (
      hasSuggestions &&
      metadata!.suggestions.some((s: string) => !metadata!.warnings.includes(s))
    ) {
      result += hasWarnings ? '\n' : '\n\n';
      result += 'Suggestions:';
      metadata!.suggestions
        .filter((s: string) => !metadata!.warnings.includes(s))
        .forEach((suggestion: string) => {
          result += `\n• ${suggestion}`;
        });
    }

    if (
      hasWarnings &&
      metadata?.actualValues &&
      Object.keys(metadata.actualValues).length > 0
    ) {
      result += '\n\nActual persisted values:';
      Object.entries(metadata.actualValues).forEach(([key, value]) => {
        let displayValue: string;
        if (Array.isArray(value) && value.length > 0) {
          displayValue =
            value[0]?.value || value[0]?.full_name || JSON.stringify(value);
        } else if (typeof value === 'object' && value !== null) {
          displayValue = JSON.stringify(value);
        } else {
          displayValue = String(value);
        }
        result += `\n• ${key}: ${displayValue}`;
      });
    }

    return result;
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
      return await handleCoreOperationError(
        error,
        'delete record',
        params.resource_type
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
