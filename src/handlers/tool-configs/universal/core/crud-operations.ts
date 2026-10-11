import { defineOperationTool } from '@/handlers/tools/operation-descriptor.js';
import {
  recordWriteResultContract,
  recordDeleteResultContract,
} from '@/handlers/tools/result-schemas.js';
import {
  UniversalToolConfig,
  UniversalCreateParams,
  UniversalUpdateParams,
  UniversalDeleteParams,
} from '@/handlers/tool-configs/universal/types.js';
import type { UniversalRecord } from '@/types/attio.js';
import { isAttioRecord } from '@/types/attio.js';
import {
  createRecordSchema,
  updateRecordSchema,
  deleteRecordSchema,
  validateUniversalToolParams,
} from '@/handlers/tool-configs/universal/schemas.js';
import {
  handleUniversalCreate,
  handleUniversalUpdate,
  handleUniversalDelete,
  getSingularResourceType,
} from '@/handlers/tool-configs/universal/shared-handlers.js';
import {
  handleCreateError,
  handleUpdateError,
  handleDeleteError,
} from '@/handlers/tool-configs/universal/core/error-utils.js';
import {
  extractResourceTypeFromFormatArgs,
  extractDisplayName,
  formatValidationDetails,
  ValidationMetadata,
} from '@/handlers/tool-configs/universal/core/utils.js';

/**
 * Normalize record data for structured output
 * - Companies: values.name → string (from array)
 * - Tasks: id.workspace_id must exist
 */
function normalizeRecordForOutput(
  record: UniversalRecord,
  resourceType?: string
): Record<string, unknown> {
  if (!record) return {};

  const result: Record<string, unknown> = { ...record };

  // Normalize company name to string
  if (resourceType === 'companies' && isAttioRecord(record)) {
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
  UniversalRecord
> = {
  name: 'records_create',
  ...recordWriteResultContract,
  handler: async (params: UniversalCreateParams): Promise<UniversalRecord> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'records_create',
        params
      );

      const { CrossResourceValidator } =
        await import('@/handlers/tool-configs/universal/schemas.js');
      await CrossResourceValidator.validateRecordRelationships(
        sanitizedParams.resource_type,
        sanitizedParams.record_data
      );

      const result = await handleUniversalCreate(sanitizedParams);
      try {
        if (sanitizedParams.resource_type === 'tasks') {
          const { logTaskDebug, inspectTaskRecordShape } =
            await import('@/utils/task-debug.js');
          logTaskDebug('mcp.records_create', 'Returning MCP task record', {
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
  formatResult: (record: UniversalRecord, ...args: unknown[]): string => {
    const resourceType = extractResourceTypeFromFormatArgs(args);
    if (!record) {
      return 'Record creation failed';
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';

    // For lists, fields are at top level (no values wrapper)
    // For other records, fields are in values wrapper
    const hasValues =
      isAttioRecord(record) && Object.keys(record.values).length > 0;
    const inferredName = extractDisplayName(
      hasValues
        ? (record.values as Record<string, unknown>)
        : (record as Record<string, unknown>),
      resourceType
    );
    const displayName =
      inferredName === 'Unnamed' ? `New ${resourceTypeName}` : inferredName;

    // Issue #1068: Extract ID based on resource type (list_id for lists, record_id for others)
    const id = String(
      record.id?.list_id ||
        record.id?.record_id ||
        (record as { record_id?: string }).record_id ||
        'unknown'
    );

    return `✅ Successfully created ${resourceTypeName}: ${displayName} (ID: ${id})`;
  },
  structuredOutput: (
    record: UniversalRecord,
    resourceType?: string
  ): Record<string, unknown> => {
    return normalizeRecordForOutput(record, resourceType);
  },
};

export const updateRecordConfig: UniversalToolConfig<
  UniversalUpdateParams,
  UniversalRecord
> = {
  name: 'records_update',
  ...recordWriteResultContract,
  handler: async (params: UniversalUpdateParams): Promise<UniversalRecord> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'records_update',
        params
      );

      const { CrossResourceValidator } =
        await import('@/handlers/tool-configs/universal/schemas.js');
      await CrossResourceValidator.validateRecordRelationships(
        sanitizedParams.resource_type,
        sanitizedParams.record_data
      );

      let result: UniversalRecord;
      if (sanitizedParams.resource_type === 'deals') {
        const { UniversalUpdateService } =
          await import('@/services/UniversalUpdateService.js');
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
        };
      } else {
        const standardResult = await handleUniversalUpdate(sanitizedParams);
        result = { ...standardResult };
      }

      try {
        if (sanitizedParams.resource_type === 'tasks') {
          const { logTaskDebug, inspectTaskRecordShape } =
            await import('@/utils/task-debug.js');
          logTaskDebug('mcp.records_update', 'Returning MCP task record', {
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
  formatResult: (record: UniversalRecord, ...args: unknown[]): string => {
    const resourceType = extractResourceTypeFromFormatArgs(args);
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

    // For lists, fields are at top level (no values wrapper)
    // For other records, fields are in values wrapper
    const hasValues =
      isAttioRecord(record) && Object.keys(record.values).length > 0;
    const name = extractDisplayName(
      hasValues
        ? (record.values as Record<string, unknown>)
        : (record as Record<string, unknown>),
      resourceType
    );
    const id = String(record.id?.record_id || record.id?.list_id || 'unknown');
    const hasWarnings = Boolean(metadata?.warnings?.length);

    const baseMessage = hasWarnings
      ? `⚠️  Updated ${resourceTypeName} with warnings: ${name} (ID: ${id})`
      : `✅ Successfully updated ${resourceTypeName}: ${name} (ID: ${id})`;

    return `${baseMessage}${formatValidationDetails(metadata)}`;
  },
  structuredOutput: (
    record: UniversalRecord,
    resourceType?: string
  ): Record<string, unknown> => {
    return normalizeRecordForOutput(record, resourceType);
  },
};

export const deleteRecordConfig: UniversalToolConfig<
  UniversalDeleteParams,
  { success: boolean; record_id: string }
> = {
  name: 'records_delete',
  ...recordDeleteResultContract,
  structuredOutput: (result) => ({ ...result }),
  handler: async (
    params: UniversalDeleteParams
  ): Promise<{ success: boolean; record_id: string }> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'records_delete',
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
    const resourceType = extractResourceTypeFromFormatArgs(args);
    if (!result.success) {
      return `❌ Failed to delete ${
        resourceType ? getSingularResourceType(resourceType) : 'record'
      } with ID: ${result.record_id}`;
    }

    const resourceTypeName = resourceType
      ? getSingularResourceType(resourceType)
      : 'record';
    return `✅ Successfully deleted ${resourceTypeName} with ID: ${result.record_id}`;
  },
};

export const createRecordDefinition = defineOperationTool({
  name: 'records_create',
  facts: {
    operation: {
      authRequired: true,
      pagination: { kind: 'none', supported: false, cap: null },
      action: 'write',
      resourceTypes: [
        'companies',
        'people',
        'deals',
        'tasks',
        'records',
        'notes',
      ],
      customObjectSlugs: true,
      readOnly: false,
      destructive: false,
      idempotent: false,
    },
    guidance: {
      capability:
        'Create supported records, including configured custom objects; prefer companies_create/deals_create.',
      boundaries: 'update, attach files or bypass required fields.',
      constraints:
        'Host approval may be required. Requires resource_type, record_data matching discovered schema; notes need content, parent_object, parent_record_id. Read back uncertain writes.',
      recovery:
        'Confirm required fields/enums; retry corrected values once. See docs/universal-tools/api-reference.md#record-write-guidance.',
      alternatives: [
        'companies_create',
        'deals_create',
        'records_upsert',
        'records_batch',
      ],
    },
  },
  inputSchema: createRecordSchema,
});

export const updateRecordDefinition = defineOperationTool({
  name: 'records_update',
  facts: {
    operation: {
      authRequired: true,
      pagination: { kind: 'none', supported: false, cap: null },
      action: 'write',
      resourceTypes: ['companies', 'people', 'deals', 'tasks', 'records'],
      customObjectSlugs: true,
      readOnly: false,
      destructive: true,
      idempotent: true,
    },
    guidance: {
      capability:
        'Patch company/person/deal/task/record or configured custom object; prefer companies_update/deals_update.',
      boundaries:
        'create/delete, manage list memberships or update notes/lists.',
      constraints:
        'Host approval may be required. Requires resource_type, record_id, record_data; partial updates validated against schema.',
      recovery:
        'Inspect current values, then retry same patch. See docs/universal-tools/api-reference.md#record-write-guidance.',
      alternatives: ['companies_update', 'deals_update', 'records_batch'],
    },
  },
  inputSchema: updateRecordSchema,
});

export const deleteRecordDefinition = defineOperationTool({
  name: 'records_delete',
  facts: {
    operation: {
      authRequired: true,
      pagination: { kind: 'none', supported: false, cap: null },
      action: 'write',
      resourceTypes: [
        'companies',
        'people',
        'deals',
        'tasks',
        'records',
        'notes',
      ],
      customObjectSlugs: true,
      readOnly: false,
      destructive: true,
      idempotent: true,
    },
    guidance: {
      capability: 'Delete one record from its object type.',
      boundaries:
        'cascade to related data or clean up list memberships automatically.',
      constraints:
        'May require explicit user approval from the host. Requires resource_type and record_id; irreversible once confirmed. Custom resource slugs must be configured in this server.',
      recovery: 'Confirm the target with records_get_details before deleting.',
      alternatives: ['list_entries_remove'],
    },
  },
  inputSchema: deleteRecordSchema,
});
