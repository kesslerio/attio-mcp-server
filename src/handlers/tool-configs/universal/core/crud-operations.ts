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
import { formatToolDescription } from '@/handlers/tools/standards/index.js';

/**
 * Normalize record data for structured output
 * - Companies: values.name → string (from array)
 * - Tasks: id.workspace_id must exist
 */
function normalizeRecordForOutput(
  record: AttioRecord,
  resourceType?: string
): Record<string, unknown> {
  if (!record) return {};

  const result: Record<string, unknown> = { ...record };

  // Normalize company name to string
  if (resourceType === 'companies' && record.values) {
    const values = record.values as Record<string, unknown>;
    const nameArray = values.name;
    if (Array.isArray(nameArray) && nameArray[0]?.value) {
      result.values = {
        ...values,
        name: nameArray[0].value,
      };
    }
  }

  // Ensure tasks have workspace_id on id object
  if (resourceType === 'tasks') {
    const id = record.id as Record<string, unknown> | undefined;
    const workspaceId =
      id?.workspace_id ||
      (record as Record<string, unknown>).workspace_id ||
      'default';
    result.id = {
      ...id,
      workspace_id: workspaceId,
    };
  }

  return result;
}

export const createRecordConfig: UniversalToolConfig<
  UniversalCreateParams,
  AttioRecord
> = {
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
  formatResult: (record: AttioRecord, ...args: unknown[]): string => {
    const resourceType = args[0] as UniversalResourceType | undefined;
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
  structuredOutput: (
    record: AttioRecord,
    resourceType?: string
  ): Record<string, unknown> => {
    return normalizeRecordForOutput(record, resourceType);
  },
};

export const updateRecordConfig: UniversalToolConfig<
  UniversalUpdateParams,
  EnhancedAttioRecord
> = {
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
  formatResult: (record: EnhancedAttioRecord, ...args: unknown[]): string => {
    const resourceType = args[0] as UniversalResourceType | undefined;
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
  structuredOutput: (
    record: EnhancedAttioRecord,
    resourceType?: string
  ): Record<string, unknown> => {
    return normalizeRecordForOutput(record as AttioRecord, resourceType);
  },
};

export const deleteRecordConfig: UniversalToolConfig<
  UniversalDeleteParams,
  { success: boolean; record_id: string }
> = {
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
    ...args: unknown[]
  ): string => {
    const resourceType = args[0] as UniversalResourceType | undefined;
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
  description: formatToolDescription({
    capability: 'Create new Attio records (companies, people, deals, tasks).',
    boundaries:
      'update existing records, attach files, or bypass required fields.',
    constraints:
      'Requires resource_type/objectSlug plus attributes map that matches records_discover_attributes output.',
    requiresApproval: true,
    recoveryHint:
      'If validation fails, call records_discover_attributes to confirm required fields and enums.',
  }),
  inputSchema: createRecordSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
};

export const updateRecordDefinition = {
  name: 'update-record',
  description: formatToolDescription({
    capability:
      'Update existing Attio record fields across all supported resource types.',
    boundaries: 'create new records, delete data, or manage list memberships.',
    constraints:
      'Requires record_id and attributes payload; supports partial updates with schema validation.',
    requiresApproval: true,
    recoveryHint:
      'Call records_get_details first to inspect the latest values before editing.',
  }),
  inputSchema: updateRecordSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
};

export const deleteRecordDefinition = {
  name: 'delete-record',
  description: formatToolDescription({
    capability:
      'Delete an Attio record from its object (company, person, deal, task).',
    boundaries:
      'cascade delete related data or clean up list memberships automatically.',
    constraints:
      'Requires record_id and resource_type; operation is irreversible once confirmed.',
    requiresApproval: true,
    recoveryHint:
      'If uncertain, fetch with records_get_details to confirm the target before deletion.',
  }),
  inputSchema: deleteRecordSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
  },
};
